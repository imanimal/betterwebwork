"""Build the website from site/ into dist/site/ (stdlib only).

    python tools/site.py        dist/site/, ready for GitHub Pages or any static host
    python tools/site.py --url https://example.org/   the address it's served at (canonical links, sitemap)

The page runs the extension's own code: src/lib/themes.js, icons.js and advice.js are copied in as they are, so the
"Try a wrong answer" notes and the theme strip are always the extension's. The fonts, icons and two store
screenshots come along too. Pages use {{site}} (the address, ending in /), {{version}} (manifest.json's) and
{{date}}. Until both store links below are filled in, the store buttons come out and the load-it-yourself steps
(marked data-until-stores) stay; once both are, it's the other way around."""
import argparse
import datetime
import json
import os
import re
import shutil
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "site")
OUT = os.path.join(ROOT, "dist", "site")
URL = "https://imanimal.github.io/betterwebwork/"
# The listings, once they're live
STORES = {
    "firefox": "https://addons.mozilla.org/firefox/addon/betterwebwork/",
    "chrome": "https://chromewebstore.google.com/detail/betterwebwork/hogfngmddcjkemnfmdamdhegaioakcan",
}
COPY = {
    "lib/themes.js": "src/lib/themes.js",
    "lib/icons.js": "src/lib/icons.js",
    "lib/advice.js": "src/lib/advice.js",
    "img/icon-32.png": "icons/icon-32.png",
    "img/icon-96.png": "icons/icon-96.png",
    "img/icon-128.png": "icons/icon-128.png",
    "img/problem-checked.png": "store/screenshots/1-problem-checked.png",
    "img/problem-dark.png": "store/screenshots/2-problem-dark.png",
    "img/set.png": "store/screenshots/3-set.png",
    "img/social.png": "store/promo/marquee-promo-1400x560.png",
}
# The demo: the test fixtures (WeBWorK 2.18 pages running the extension's scripts, with tests/fixtures/shim.js in place
# of the browser's extension APIs) and src/, under demo/. The fixtures' root paths move with them; the shim finds its
# root from the kit.css link, so fonts go in demo/fonts too.
DEMO = {"/tests/fixtures/webwork2/": "demo/webwork2/", "/tests/fixtures/": "demo/fixtures/", "/src/": "demo/src/"}
FONTS = ["atkinson-next.woff2", "atkinson-next-italic.woff2", "atkinson-mono.woff2", "space-grotesk.woff2",
         "space-mono-400.woff2", "space-mono-700.woff2", "doto.woff2"]
PAGES = (".html", ".xml", ".txt")


def strip(html, attr):
    """Drop every element carrying `attr` (the ones here hold no nested element of the same tag)."""
    return re.sub(rf'<(\w+)\b[^>]*\b{attr}\b[^>]*>.*?</\1>\s*', "", html, flags=re.S)


def fill(text, values, live):
    for k, v in values.items():
        text = text.replace("{{" + k + "}}", v)
    left = re.findall(r"\{\{\w+\}\}", text)
    if left:
        raise SystemExit(f"Unfilled {sorted(set(left))}")
    return strip(text, "data-until-stores") if live else strip(text, "data-store")


def demo(base):
    """Copy the fixtures and src/ into demo/, the fixtures' root paths moved under `base` (the site's path, ending in /)."""
    for frm, to in DEMO.items():
        src = os.path.join(ROOT, frm.strip("/"))
        for d, dirs, files in os.walk(src):
            if frm == "/tests/fixtures/" and os.path.relpath(d, src).split(os.sep)[0] == "webwork2":
                dirs.clear()
                continue
            for name in files:
                path = os.path.join(d, name)
                dst = os.path.join(OUT, to, os.path.relpath(path, src))
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                if name.endswith(".html") and frm != "/src/":
                    with open(path, encoding="utf-8") as f:
                        text = f.read()
                    for a, b in DEMO.items():
                        text = text.replace('="' + a, '="' + base + b)
                    with open(dst, "w", encoding="utf-8", newline="\n") as f:
                        f.write(text)
                else:
                    shutil.copyfile(path, dst)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", default=URL, help="where the site is served, ending in /")
    a = ap.parse_args()
    url = a.url if a.url.endswith("/") else a.url + "/"
    with open(os.path.join(ROOT, "manifest.json"), encoding="utf-8") as f:
        version = json.load(f)["version"]
    live = all(STORES.values())
    values = {"site": url, "version": version, "date": datetime.date.today().isoformat(),
              "firefox": STORES["firefox"] or "#install", "chrome": STORES["chrome"] or "#install"}

    shutil.rmtree(OUT, ignore_errors=True)
    for d, _, files in os.walk(SRC):
        for name in files:
            src = os.path.join(d, name)
            dst = os.path.join(OUT, os.path.relpath(src, SRC))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if name.endswith(PAGES):
                with open(src, encoding="utf-8") as f:
                    text = fill(f.read(), values, live)
                with open(dst, "w", encoding="utf-8", newline="\n") as f:
                    f.write(text)
            else:
                shutil.copyfile(src, dst)
    for to, frm in COPY.items():
        os.makedirs(os.path.dirname(os.path.join(OUT, to)), exist_ok=True)
        shutil.copyfile(os.path.join(ROOT, frm), os.path.join(OUT, to))
    for to in ("fonts", "demo/fonts"):
        os.makedirs(os.path.join(OUT, to), exist_ok=True)
        for name in FONTS + [n for n in os.listdir(os.path.join(ROOT, "fonts")) if n.startswith("OFL")]:
            shutil.copyfile(os.path.join(ROOT, "fonts", name), os.path.join(OUT, to, name))
    demo(urllib.parse.urlparse(url).path)
    n = sum(len(fs) for _, _, fs in os.walk(OUT))
    print(f"dist/site/: {n} files for {url}" + ("" if live else " (store links not set: showing the load-it-yourself steps)"))


if __name__ == "__main__":
    main()
