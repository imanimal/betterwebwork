"""Send a Chrome zip to the Chrome Web Store and submit it for review (stdlib plus the openssl command).

    python tools/cws.py dist/betterwebwork-<version>-chrome.zip

Reads three environment variables: CWS_SERVICE_ACCOUNT_JSON (the text of a Google Cloud service account's JSON key;
the account's email is added in the dashboard's Account section), CWS_PUBLISHER_ID and CWS_ITEM_ID. It signs a JWT
with the key (RS256, through openssl), trades it for an access token, uploads the package to the Chrome Web Store
API v2, waits while the store processes it, then publishes it: the version goes to review and out once it passes.
The release workflow runs it; it never prints the key or the token."""
import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPE = "https://www.googleapis.com/auth/chromewebstore"
API = "https://chromewebstore.googleapis.com"
WAIT = 300  # seconds to let the store process an upload


def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def jwt(key, now=None):
    now = int(now or time.time())
    header = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    claims = b64url(json.dumps({
        "iss": key["client_email"], "scope": SCOPE, "aud": TOKEN_URL, "iat": now, "exp": now + 1800,
    }).encode())
    signing_input = f"{header}.{claims}".encode()
    fd, pem = tempfile.mkstemp(suffix=".pem")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(key["private_key"])
        sig = subprocess.run(["openssl", "dgst", "-sha256", "-sign", pem], input=signing_input,
                             capture_output=True, check=True).stdout
    finally:
        os.remove(pem)
    return f"{header}.{claims}.{b64url(sig)}"


def request(method, url, token=None, body=None, ctype=None):
    req = urllib.request.Request(url, data=body, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if ctype:
        req.add_header("Content-Type", ctype)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {url.split('?')[0]} failed: HTTP {e.code}\n{e.read().decode(errors='replace')}")


def access_token(key):
    form = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": jwt(key),
    }).encode()
    token = request("POST", TOKEN_URL, body=form, ctype="application/x-www-form-urlencoded")["access_token"]
    if os.environ.get("GITHUB_ACTIONS"):
        print(f"::add-mask::{token}")
    return token


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    missing = [n for n in ("CWS_SERVICE_ACCOUNT_JSON", "CWS_PUBLISHER_ID", "CWS_ITEM_ID") if not os.environ.get(n)]
    if missing:
        sys.exit("not set: " + ", ".join(missing))
    with zipfile.ZipFile(path) as z:
        version = json.loads(z.read("manifest.json"))["version"]
    item = f"publishers/{os.environ['CWS_PUBLISHER_ID']}/items/{os.environ['CWS_ITEM_ID']}"
    token = access_token(json.loads(os.environ["CWS_SERVICE_ACCOUNT_JSON"]))

    with open(path, "rb") as f:
        up = request("POST", f"{API}/upload/v2/{item}:upload", token, f.read(), "application/zip")
    state = up.get("uploadState")
    print(f"upload: {state}")
    deadline = time.time() + WAIT
    # The reference says UPLOAD_IN_PROGRESS and the UploadState enum says IN_PROGRESS; take either.
    while state in ("IN_PROGRESS", "UPLOAD_IN_PROGRESS"):
        if time.time() > deadline:
            sys.exit(f"the store was still processing the upload after {WAIT} seconds")
        time.sleep(5)
        state = request("GET", f"{API}/v2/{item}:fetchStatus", token).get("lastAsyncUploadState")
        print(f"upload: {state}")
    if state != "SUCCEEDED":
        sys.exit(f"upload failed:\n{json.dumps(up, indent=2)}")
    if up.get("crxVersion") and up["crxVersion"] != version:
        sys.exit(f"the store read version {up['crxVersion']}, the zip says {version}")

    pub = request("POST", f"{API}/v2/{item}:publish", token,
                  json.dumps({"publishType": "DEFAULT_PUBLISH"}).encode(), "application/json")
    for w in (pub.get("warningInfo") or {}).get("warnings", []):
        print(f"warning: {w.get('reason')}: {w.get('description')}")
    print(f"publish: {pub.get('state')} (version {version})")
    if pub.get("state") in ("REJECTED", "CANCELLED", None):
        sys.exit(json.dumps(pub, indent=2))


if __name__ == "__main__":
    main()
