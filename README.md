# BetterWebWork

A browser extension that makes WeBWorK nicer to use. It redraws the homework page you already have so it's easier to read, and when an answer gets marked wrong it tells you if WeBWorK read what you typed differently from what you meant. To WeBWorK, `e^-2x` means `(e^-2)·x`, for example.

It doesn't change how anything is graded. Your answers go to WeBWorK exactly as they would without it.

Get it for [Firefox](https://addons.mozilla.org/firefox/addon/betterwebwork/) or [Chrome](https://chromewebstore.google.com/detail/betterwebwork/hogfngmddcjkemnfmdamdhegaioakcan) (Edge can install the Chrome one). You can also [try a sample homework](https://imanimal.github.io/betterwebwork/demo/webwork2/math4a-01-f26-blee/Week_1/3/) without installing anything, or look at [the website](https://imanimal.github.io/betterwebwork/).

## What it does

- The problem sits in the middle of the page at a width you can read, with the rest of the set in a strip above it. `[` and `]` move between problems.
- After you check or submit, a wrong answer gets a short note about how WeBWorK read it. Notes only show up when the cause is certain, and they're labeled as BetterWebWork's so you don't mistake them for WeBWorK's.
- What you've typed survives a refresh or a trip to another problem.
- Set pages give the due date in words, like "Thu 11:59 PM, in 4 days", and show how far along you are.
- On your last attempt, Submit wants a second press.
- It has a dark mode and a handful of other themes, which you can tweak or import. They use the Pocket theme format that Collegiapp and PocketCanvas also read.

It runs on any address with `/webwork2/` in it. I built it against WeBWorK 2.18 as UCSB runs it, and it reads 2.19 too. `Ctrl+Enter` previews your answers, `Ctrl+Shift+Enter` submits, and `?` lists the other shortcuts.

## Privacy

There's no server and no account, and it doesn't collect anything. Settings stay in your browser. [PRIVACY.md](PRIVACY.md) has the details.

## Working on it

It's plain JavaScript and CSS with no npm or bundler. To run it from this folder, load `manifest.json` from `about:debugging#/runtime/this-firefox` in Firefox, or turn on Developer mode at `chrome://extensions` and use **Load unpacked**.

```bash
node --test tests/core.test.js
```

`tests/fixtures/` holds saved WeBWorK pages that run the real scripts. Serve the repo with `python -m http.server 4799` and open `http://127.0.0.1:4799/tests/fixtures/webwork2/`. `python tests/make_fixtures.py` rebuilds them.

```bash
python tools/build.py
```

That builds the Firefox and Chrome zips into `dist/`. `python tools/site.py` builds the website into `dist/site/`, and it publishes to GitHub Pages whenever `main` changes. Releases go out from a version tag; [RELEASING.md](RELEASING.md) covers that.

## Credits

The fonts are under the SIL Open Font License (texts in `fonts/`): Atkinson Hyperlegible Next and Mono, Space Grotesk, Space Mono and Doto. The Pocket themes come from Collegiapp. MIT license.
