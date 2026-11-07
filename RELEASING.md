# Releasing

Pushing a tag `v<version>` sends that version to both stores. [release.yml](.github/workflows/release.yml) runs the tests, checks the tag matches `manifest.json`, builds the two zips, and then:

- uploads the Chrome zip through the Chrome Web Store API (`tools/cws.py`), which goes live once Google's review passes;
- submits the Firefox zip to addons.mozilla.org with `web-ext sign --channel listed`, where Mozilla reviews and signs it;
- makes a GitHub release with both zips.

```bash
python tools/build.py --bump 0.2.0
```

```bash
git commit -am "Release 0.2.0" && git tag v0.2.0 && git push origin main v0.2.0
```

Edge Add-ons isn't automated, so upload the same Chrome zip in Partner Center by hand. To hand out a signed Firefox file yourself, build with `--self-hosted`, which also writes the `updates.json` it checks; AMO refuses that update address on a listed add-on, so only that build has it. Before any upload, run `npx web-ext@8 lint --source-dir <the unzipped folder>`.

The Chrome Web Store dashboard text (description, permission reasons, privacy answers) is in [store/chrome-web-store.md](store/chrome-web-store.md).

## One-time setup

### Chrome Web Store

1. The item has to exist before the API can update it. Version 0.1.3 was uploaded by hand. Each tag needs a higher version than the store has, and a version still in review can block the next one.
2. Turn on 2-step verification for the Google account. Google won't publish without it.
3. In the [Google Cloud console](https://console.cloud.google.com/), enable the Chrome Web Store API on a project.
4. Under [IAM & Admin > Service accounts](https://console.cloud.google.com/iam-admin/serviceaccounts), create a service account with no roles, then **Keys > Add key > Create new key > JSON**.
5. Add the service account's email in the Developer Dashboard's **Account** section.
6. Note the publisher ID (**Publisher > Settings**) and the item's 32-letter ID.
7. Store them, then delete the key file:

```bash
gh secret set CWS_SERVICE_ACCOUNT_JSON -R imanimal/betterwebwork < path/to/key.json
```

```bash
gh variable set CWS_PUBLISHER_ID -R imanimal/betterwebwork
```

```bash
gh variable set CWS_ITEM_ID -R imanimal/betterwebwork
```

If you change the item's visibility in the dashboard, publish once by hand before the API can publish again.

### addons.mozilla.org

One API key covers every add-on on the account, so PocketCanvas's key works here ([get or regenerate it](https://addons.mozilla.org/developers/addon/api/key/)):

```bash
gh secret set AMO_JWT_ISSUER -R imanimal/betterwebwork
```

```bash
gh secret set AMO_JWT_SECRET -R imanimal/betterwebwork
```

The first tagged release creates the listing from [store/amo-metadata.json](store/amo-metadata.json). Screenshots from `store/screenshots/` can be added on the listing afterward.

### Website

Turn on **Settings > Pages > Source: GitHub Actions** once. The store links on the site live in `STORES` in `tools/site.py`; emptying them brings back the load-it-yourself steps.
