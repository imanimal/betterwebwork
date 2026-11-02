# BetterWebWork

A Firefox and Chrome extension that gives WeBWorK a cleaner, calmer page. It restyles the page you already have, in your browser: the problem sits centered at a readable width, the navigation is one click away, and the "incorrect" table becomes a list that tells you what WeBWorK read and what to try. Nothing about how WeBWorK grades changes. Every form posts exactly as WeBWorK wrote it.

It works on any WeBWorK whose address has `/webwork2/` in it (built against 2.18, the version UCSB runs, and reads 2.19's feedback too).

## What changes

**Problem pages**

- One bar on top: the course, the set and the problem as breadcrumbs, then settings and log out. WeBWorK's sidebar becomes a menu you open when you need it.
- The problem is centered on a single sheet. An equation wider than the sheet widens it instead of scrolling (only one wider than the window scrolls). Graphs get a light panel on dark themes so their lines stay visible.
- The set's problems sit in a strip above the sheet, each marked correct, partly correct, wrong or not started. `[` and `]` move between them.
- Score, attempts, attempts left and the due date sit in one row instead of a paragraph.
- After you check or submit, each blank gets a mark beside it. The results list shows what you typed, how WeBWorK read it, WeBWorK's own message, and short notes on common slips: `e^-2x` read as `(e^-2)·x`, `sin x` without parentheses, `x^1/2`, unbalanced brackets, symbols WeBWorK doesn't take, rounding too early. The notes are labeled as BetterWebWork's, not WeBWorK's, and stay quiet when there's nothing certain to say.
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

BetterWebWork runs in Firefox 128+ and Chrome 111+ (Edge too) from the same files. It isn't in either store yet. To try it from this folder:

- **Firefox:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on** and pick `manifest.json`. It lasts until Firefox restarts.
- **Chrome or Edge:** open `chrome://extensions` (`edge://extensions`), turn on **Developer mode**, click **Load unpacked** and pick this folder.

For a permanent install, build the zips (below) and submit them. On addons.mozilla.org choose **On this site** to list it there: Mozilla signs it, reviews it and sends updates. To hand out the signed file yourself instead, build with `--self-hosted` and choose **On your own**. The Chrome zip goes to the Chrome Web Store (a one-time $5 developer registration) and, unchanged, to Edge Add-ons (free).

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

A release is one command and two uploads:

```bash
python tools/build.py --bump 0.2.0
```

Upload the `-firefox.zip` as a new version on addons.mozilla.org and the `-chrome.zip` as a new package in the Chrome Web Store dashboard (and Edge Partner Center). Both carry the same version number. What to enter in the Chrome Web Store dashboard (description, permission justifications, privacy answers) is in [store/chrome-web-store.md](store/chrome-web-store.md). `tools/gen_icons.py` draws the icons and `tools/vendor_fonts.py` fetches the fonts (both already run; their output is checked in).

## Credits

Fonts, all under the SIL Open Font License (texts in `fonts/`): Atkinson Hyperlegible Next and Mono (Braille Institute), Space Grotesk (Florian Karsten), Space Mono (Colophon Foundry) and Doto (Oliver Lalan). The Pocket themes come from Collegiapp's UI kit.

MIT license.
