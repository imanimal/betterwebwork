"""Package BetterWebWork for each browser from the one manifest.json (stdlib only).

    python tools/build.py                dist/betterwebwork-<version>-firefox.zip  addons.mozilla.org, "On this site"
                                         dist/betterwebwork-<version>-chrome.zip   Chrome Web Store (Edge Add-ons too)
    python tools/build.py --self-hosted  also dist/betterwebwork-<version>-firefox-self-hosted.zip and dist/updates.json
                                         for AMO's "On your own": that manifest gains an update_url pointing at the latest
                                         GitHub release's updates.json (AMO refuses update_url on listed add-ons)
    python tools/build.py --bump 0.2.0   set the version in manifest.json first; every zip carries the same number

manifest.json loads unpacked in both browsers as it is: Firefox runs background.scripts and Chrome the
service_worker, and Chrome only warns about browser_specific_settings. Each zip's manifest keeps just its own
browser's keys. Run tools/vendor_fonts.py once before the first build so the packages carry their fonts."""
import argparse
import copy
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "imanimal/betterwebwork"
UPDATE_URL = f"https://github.com/{REPO}/releases/latest/download/updates.json"
INCLUDE = ["LICENSE", "src", "icons", "fonts"]
CHROME_MIN = "111"  # color-mix() in the styles


def manifest():
    with open(os.path.join(ROOT, "manifest.json"), encoding="utf-8") as f:
        return json.load(f)


def for_firefox(m, self_hosted=False):
    m = copy.deepcopy(m)
    m["background"] = {"scripts": m["background"]["scripts"]}
    if self_hosted:
        m["browser_specific_settings"]["gecko"]["update_url"] = UPDATE_URL
    return m


def for_chrome(m):
    m = copy.deepcopy(m)
    m.pop("browser_specific_settings", None)
    m["background"] = {"service_worker": m["background"]["service_worker"]}
    m["minimum_chrome_version"] = CHROME_MIN
    return m


def bump(version):
    path = os.path.join(ROOT, "manifest.json")
    with open(path, encoding="utf-8") as f:
        text = f.read()
    old = json.loads(text)["version"]
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text.replace(f'"version": "{old}"', f'"version": "{version}"', 1))
    print(f"version {old} -> {version}")


def package(dist, name, m):
    out = os.path.join(dist, f"betterwebwork-{m['version']}-{name}.zip")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(m, indent=2, ensure_ascii=False) + "\n")
        for item in INCLUDE:
            full = os.path.join(ROOT, item)
            if os.path.isfile(full):
                z.write(full, item)
                continue
            for base, _, files in os.walk(full):
                for f in sorted(files):
                    p = os.path.join(base, f)
                    z.write(p, os.path.relpath(p, ROOT).replace(os.sep, "/"))
    print(out)
    return out


def updates(dist):
    m = manifest()
    gecko = m["browser_specific_settings"]["gecko"]
    v = m["version"]
    doc = {"addons": {gecko["id"]: {"updates": [{
        "version": v,
        "update_link": f"https://github.com/{REPO}/releases/download/v{v}/betterwebwork-{v}.xpi",
        "applications": {"gecko": {"strict_min_version": gecko.get("strict_min_version", "128.0")}},
    }]}}}
    out = os.path.join(dist, "updates.json")
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, indent=2)
    print(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--self-hosted", action="store_true")
    ap.add_argument("--bump")
    a = ap.parse_args()
    if a.bump:
        bump(a.bump)
    if not any(n.endswith(".woff2") for n in os.listdir(os.path.join(ROOT, "fonts"))):
        print("note: fonts/ has no .woff2 files; run tools/vendor_fonts.py (the extension falls back to system fonts)")
    dist = os.path.join(ROOT, "dist")
    os.makedirs(dist, exist_ok=True)
    m = manifest()
    package(dist, "firefox", for_firefox(m))
    package(dist, "chrome", for_chrome(m))
    if a.self_hosted:
        package(dist, "firefox-self-hosted", for_firefox(m, self_hosted=True))
        updates(dist)


if __name__ == "__main__":
    main()
