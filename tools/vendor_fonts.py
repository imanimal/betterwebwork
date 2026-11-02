"""Download the web fonts into fonts/ (stdlib only), so the extension never loads anything from the network.

    python tools/vendor_fonts.py

Every font is under the SIL Open Font License 1.1; each family's OFL.txt is saved beside it. Only the Latin subset is
kept. The names here are the ones util.js's FONTS and pages/page.css expect:
    atkinson-next.woff2, atkinson-next-italic.woff2   Atkinson Hyperlegible Next (Standard's text)
    atkinson-mono.woff2                               Atkinson Hyperlegible Mono (answer fields)
    space-grotesk.woff2, space-mono-400/700.woff2     Space Grotesk, Space Mono (Pocket's text)
    doto.woff2                                        Doto (Pocket's LCD numerals)"""
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "fonts")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"  # asks Google for woff2

# (css2 family query, google/fonts directory, {(style, weight-range): file})
FAMILIES = [
    ("Atkinson+Hyperlegible+Next:ital,wght@0,200..800;1,200..800", "atkinsonhyperlegiblenext",
     {("normal", "200 800"): "atkinson-next.woff2", ("italic", "200 800"): "atkinson-next-italic.woff2"}),
    ("Atkinson+Hyperlegible+Mono:wght@200..800", "atkinsonhyperlegiblemono", {("normal", "200 800"): "atkinson-mono.woff2"}),
    ("Space+Grotesk:wght@300..700", "spacegrotesk", {("normal", "300 700"): "space-grotesk.woff2"}),
    ("Space+Mono:wght@400;700", "spacemono", {("normal", "400"): "space-mono-400.woff2", ("normal", "700"): "space-mono-700.woff2"}),
    ("Doto:wght@100..900", "doto", {("normal", "100 900"): "doto.woff2"}),
]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    os.makedirs(OUT, exist_ok=True)
    for query, folder, files in FAMILIES:
        css = get(f"https://fonts.googleapis.com/css2?family={query}&display=swap").decode("utf-8")
        # blocks look like: /* latin */ @font-face { font-style: normal; font-weight: 200 800; src: url(...) format('woff2'); ... }
        for subset, body in re.findall(r"/\*\s*([\w-]+)\s*\*/\s*@font-face\s*\{([^}]*)\}", css):
            if subset != "latin":
                continue
            style = re.search(r"font-style:\s*(\w+)", body).group(1)
            weight = re.search(r"font-weight:\s*([\d ]+);", body).group(1).strip()
            name = files.get((style, weight))
            if not name:
                continue
            url = re.search(r"src:\s*url\(([^)]+)\)", body).group(1)
            with open(os.path.join(OUT, name), "wb") as f:
                f.write(get(url))
            print(f"fonts/{name}")
        lic = get(f"https://raw.githubusercontent.com/google/fonts/main/ofl/{folder}/OFL.txt")
        with open(os.path.join(OUT, f"OFL-{folder}.txt"), "wb") as f:
            f.write(lic)
        print(f"fonts/OFL-{folder}.txt")


if __name__ == "__main__":
    main()
