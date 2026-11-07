# BetterWebWork

A Firefox and Chrome extension that gives WeBWorK a cleaner, calmer page. It restyles the page you already have, in your browser: the problem sits centered at a readable width, the navigation is one click away, and the "incorrect" table becomes a list that tells you what WeBWorK read and what to try. Nothing about how WeBWorK grades changes. Every form posts exactly as WeBWorK wrote it.

It works on any WeBWorK whose address has `/webwork2/` in it (built against 2.18, the version UCSB runs, and reads 2.19's feedback too).

- **Website:** https://imanimal.github.io/betterwebwork/
- **Live demo, no install or WeBWorK login:** [a sample homework problem](https://imanimal.github.io/betterwebwork/demo/webwork2/math4a-01-f26-blee/Week_1/3/), a saved WeBWorK 2.18 page running the extension's own scripts. Problems 1, 3 and 4, the set, the course and the course list are there too. Answers there go nowhere.
- **Install:** [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/betterwebwork/), [Chrome Web Store](https://chromewebstore.google.com/detail/betterwebwork/hogfngmddcjkemnfmdamdhegaioakcan) (Edge installs from there too).

## What changes

**Problem pages**

- One bar on top: the course, the set and the problem as breadcrumbs, then settings and log out. WeBWorK's sidebar becomes a menu you open when you need it.
- The problem is centered on a single sheet. An equation wider than the sheet widens it instead of scrolling (only one wider than the window scrolls). Graphs get a light panel on dark themes so their lines stay visible.
- A blank stays on the same line as the maths that labels it (`y(x) =` and its box wrap together), and a part that starts on a new line, like "(2) The unique solution…", gets a little room above it. The Equation Editor opens over the page, never cut off inside the sheet.
- The set's problems sit in a strip above the sheet, each marked correct, partly correct, wrong or not started. `[` and `]` move between them.
- Score, attempts, attempts left and the due date sit in one row instead of a paragraph. Once a problem is at 100%, "You can earn partial credit on this problem" goes away.
- After you check or submit, each blank gets a mark beside it. The results list shows what you typed, how WeBWorK read it, WeBWorK's own message, and short notes on common slips: `e^-2x` read as `(e^-2)·x`, `sin x` without parentheses, `x^1/2`, unbalanced brackets, symbols WeBWorK doesn't take, rounding too early. The notes are labeled as BetterWebWork's, not WeBWorK's, and stay quiet when there's nothing certain to say. Some problems don't say which answers are right on a submit, only whether all of them are; the list says that too.
- If you type an answer that was already marked wrong, a small notice says when.
- What you type in the blanks is kept until you submit it, so a refresh or a trip to another problem doesn't lose it. When it's put back, a note says so, with Undo.
- On your last attempt, Submit asks for a second press.
- Your attempts on each problem are logged in this browser, so you can see what you already tried.

**Set and course pages**

- A set shows its due date in words ("Thu 11:59 PM, in 4 days"), the reduced-credit window, your progress in points, and a key to the next unfinished problem.
- A course groups its sets: open (soonest due first), not open yet, closed.
- The course list puts the courses you've opened first, groups the rest by quarter, and has a filter (`/`).

**Look and settings**

- Settings are one click away: the gear in the bar, the toolbar button (`Alt+Shift+W`), or the add-on's options page.
- Paper is the default: a plain light theme with Paper Dark at night. Night can follow the system, a schedule, or stay on or off.
- The Pocket themes from Collegiapp (Cream, Night, Gaucho, Pistachio, Ink) bring the handheld look, with its fonts and pixel icons.
- Every theme can be adjusted color by color, with contrast checks and a "Fix contrast" button.
- Themes import from a file, a paste, or a chatbot: the settings can open a chatbot with a prompt that asks for a theme in the right format.
- Reading settings: typeface (Atkinson Hyperlegible or your system's), problem text size, page width, how graphs show on dark themes, motion, 24-hour clock.
- Turn it off for one site from the toolbar button; the page goes back to WeBWorK's own look without a reload.

## How it works

A Manifest V3 extension in plain JavaScript and CSS: no framework, no bundler, no npm. One source tree and one `manifest.json` load in both Firefox and Chrome, and `tools/build.py` writes each store's package from them.

- **Restyle, never replace.** The content scripts hide or move WeBWorK's own elements and never delete them, so every form posts exactly as WeBWorK wrote it, and turning the extension off puts the page back without a reload.
- **No flash of the old page.** `boot.js` runs before the page draws and paints the saved look from a copy in the page's own storage; `app.js` builds the rest once the page is ready.
- **Reading WeBWorK.** `ww.js` reads the route, set statuses, score lines and attempt results out of WeBWorK's HTML. `advice.js` turns what you typed and how WeBWorK parsed it into notes, and only says what's certain. `page.js` runs inside the page itself, the only way to reach its MathJax and MathQuill.
- **Drafts.** What you type is written synchronously to the page's localStorage as you type and when the page closes, since an asynchronous write may not land before the page goes.
- **Tests.** `tests/core.test.js` (Node's test runner) covers the parsing, the notes, themes and drafts. `tests/fixtures/` holds saved WeBWorK 2.18 pages that load the real content scripts with a stand-in for the browser's extension APIs; the website's live demo is those same pages.
- **Shipping.** GitHub Actions publish the website to GitHub Pages on every push to `main`, and a version tag sends the packages to the Chrome Web Store (its API) and Firefox Add-ons (`web-ext sign`).

## Keyboard

| Keys | Does |
| --- | --- |
| `Ctrl+Enter` (`⌘ Enter`) | Preview my answers |
| `Ctrl+Alt+Enter` | Check answers, when the course allows it |
| `Ctrl+Shift+Enter` | Submit answers |
| `[` and `]` | Previous and next problem |
| `/` | Filter the course list |
| `?` | Show the shortcuts |
| `Esc` | Close a menu or panel |

## Install

BetterWebWork runs in Firefox 128+ and Chrome 111+ (Edge too) from the same files. Get it from [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/betterwebwork/) or the [Chrome Web Store](https://chromewebstore.google.com/detail/betterwebwork/hogfngmddcjkemnfmdamdhegaioakcan) (Edge installs from there too). To run it from this folder instead:

- **Firefox:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on** and pick `manifest.json`. It lasts until Firefox restarts.
- **Chrome or Edge:** open `chrome://extensions` (`edge://extensions`), turn on **Developer mode**, click **Load unpacked** and pick this folder.

For a permanent install, tagged releases go to the Chrome Web Store and addons.mozilla.org (see [Releases](#releases)); the Chrome zip also goes, unchanged, to Edge Add-ons. To hand out a signed Firefox file yourself instead, build with `--self-hosted` and choose **On your own** on addons.mozilla.org.

## Privacy

BetterWebWork reads WeBWorK pages in your browser and sends nothing anywhere. It has no server and no analytics. Your settings, themes, attempt log and the sets it remembers for the toolbar's "Due this week" stay in the browser's extension storage on your computer. Answers you've typed and not yet submitted are kept in the WeBWorK site's own storage in your browser, because that's the one place a page can save to as it closes; turning off **Keep what you type** forgets them. It asks for access only to addresses containing `/webwork2/`. The full policy is in [PRIVACY.md](PRIVACY.md).

## Themes

Themes use the shared Pocket theme format, the same one Collegiapp and PocketCanvas read:

```json
{
  "pocketTheme": 1,
  "name": "Harbor",
  "look": "standard",
  "scheme": "dark",
  "tokens": {
    "bg": "#0f1b24", "surface": "#16252f", "line": "#2a3d48",
    "text": "#e6eef2", "text2": "#9fb3bf", "accent": "#4fb3a9", "on-accent": "#06201d"
  }
}
```

`look` is `standard` (plain) or `pocket` (the handheld look). There are 27 tokens; any you leave out are filled from Paper or Paper Dark, and the import says which. Pasting a whole chatbot reply works: the JSON is found inside it. A list of CSS custom properties (`--bg: #0f1b24;`) works too. Themes can't load images or fonts from anywhere.

## Development

Plain classic scripts on a `globalThis.BW` namespace. No npm, no bundler, no build step to run it.

```bash
node --test tests/core.test.js
```

```bash
python tests/make_fixtures.py
```

```bash
python -m http.server 4799 --bind 127.0.0.1
```

The fixtures are WeBWorK 2.18 pages (course list, a course, a set, a problem after Check answers, the next problem opened fresh, one with every kind of blank) that load the extension's real scripts with `tests/fixtures/shim.js` standing in for the browser's extension APIs. With the server running, open `http://127.0.0.1:4799/tests/fixtures/webwork2/`.

```bash
python tools/build.py
```

That writes both store packages from the one `manifest.json`: `dist/betterwebwork-<version>-firefox.zip` for addons.mozilla.org and `dist/betterwebwork-<version>-chrome.zip` for the Chrome Web Store and Edge Add-ons. Each keeps only its own browser's manifest keys (Firefox's `background.scripts` and add-on ID; Chrome's service worker and minimum version). `--self-hosted` also writes `betterwebwork-<version>-firefox-self-hosted.zip`, whose manifest points Firefox at the latest GitHub release's `updates.json` for updates, and writes that `updates.json` too. Mozilla refuses that update address on a listed add-on, so only this build carries it.

What to enter in the Chrome Web Store dashboard (description, permission justifications, privacy answers) is in [store/chrome-web-store.md](store/chrome-web-store.md). `tools/gen_icons.py` draws the icons and `tools/vendor_fonts.py` fetches the fonts (both already run; their output is checked in).

## Releases

Pushing a tag `v<version>` releases that version to both stores. [.github/workflows/release.yml](.github/workflows/release.yml) runs the tests, checks the tag against `manifest.json`, builds the two zips, then:

- **Chrome:** `tools/cws.py` uploads the `-chrome.zip` through the Chrome Web Store API and submits it. It goes out when Google's review passes.
- **Firefox:** `web-ext sign --channel listed` submits the `-firefox.zip` to addons.mozilla.org. Mozilla signs and reviews it and sends it to installed copies. The first one also creates the listing from [store/amo-metadata.json](store/amo-metadata.json).
- **GitHub:** a release for the tag with both zips.

```bash
python tools/build.py --bump 0.2.0
```

```bash
git commit -am "Release 0.2.0" && git tag v0.2.0 && git push origin main v0.2.0
```

Edge Add-ons isn't automated: upload the same `-chrome.zip` in Partner Center by hand.

### One-time setup

Chrome Web Store:

1. The item has to exist first, because the API only updates an item. BetterWebWork's first version (0.1.3) was uploaded by hand, with the Store listing and Privacy tabs filled in from [store/chrome-web-store.md](store/chrome-web-store.md). Each later tag needs a higher version than the store has. A version still in review can block a new submission, so tag the next one after that review ends.
2. Turn on 2-step verification for the Google account. Google requires it to publish.
3. In the [Google Cloud console](https://console.cloud.google.com/), create or pick a project, search for "Chrome Web Store API" and enable it.
4. In [IAM & Admin > Service accounts](https://console.cloud.google.com/iam-admin/serviceaccounts), create a service account. It needs no roles. Open it, go to **Keys > Add key > Create new key > JSON**, and keep the downloaded file for step 7.
5. In the Developer Dashboard's **Account** section, add the service account's email (the `...@...iam.gserviceaccount.com` address). A publisher can have one.
6. Note the publisher ID (Developer Dashboard, **Publisher > Settings**) and the item ID (the 32-letter ID of the BetterWebWork item, shown under its name in the dashboard and at the end of its store address).
7. Store them in the repository, then delete the downloaded key file:

```bash
gh secret set CWS_SERVICE_ACCOUNT_JSON -R imanimal/betterwebwork < path/to/key.json
```

```bash
gh variable set CWS_PUBLISHER_ID -R imanimal/betterwebwork
```

```bash
gh variable set CWS_ITEM_ID -R imanimal/betterwebwork
```

addons.mozilla.org: one API key covers every add-on on the account, so PocketCanvas's key works here too ([get or regenerate it](https://addons.mozilla.org/developers/addon/api/key/)). `gh` asks for each value:

```bash
gh secret set AMO_JWT_ISSUER -R imanimal/betterwebwork
```

```bash
gh secret set AMO_JWT_SECRET -R imanimal/betterwebwork
```

The first tagged release creates the AMO listing, so nothing is uploaded there by hand. Screenshots (the same ones in `store/screenshots/`) and a longer description can be added on the listing later.

If the Chrome Web Store's visibility settings are changed in the dashboard, publish once by hand with the new setting before the API can publish again.

## Website

The site at https://imanimal.github.io/betterwebwork/ is built from `site/`: the home page and a guide to typing answers in WeBWorK (`site/answers/`). It runs the extension's own `themes.js`, `icons.js` and `advice.js`, copied in by the build, so its "Try a wrong answer" notes and theme picker are the extension's. The build also copies the fixtures and `src/` into `demo/`, the live demo, moving their root paths under the site's address (`tests/fixtures/shim.js` finds its root from the page's `kit.css` link).

```bash
python tools/site.py
```

That writes `dist/site/`. Serve that folder to look at it (`python -m http.server 4807 --directory dist/site`). [.github/workflows/pages.yml](.github/workflows/pages.yml) builds and publishes it on every push to `main` that touches it; turn on **Settings > Pages > Source: GitHub Actions** once. The store addresses live in `STORES` in `tools/site.py`; each install key on the site goes to the store for the browser it's opened in. Emptying them brings back the load-it-yourself steps.

## Credits

Fonts, all under the SIL Open Font License (texts in `fonts/`): Atkinson Hyperlegible Next and Mono (Braille Institute), Space Grotesk (Florian Karsten), Space Mono (Colophon Foundry) and Doto (Oliver Lalan). The Pocket themes come from Collegiapp's UI kit.

MIT license.
