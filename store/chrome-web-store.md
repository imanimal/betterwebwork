# Chrome Web Store listing

What to enter in the Chrome Web Store developer dashboard, tab by tab. Edge Add-ons (Partner Center) asks for the same things and takes the same zip and text. Keep this file in step with the extension: a new permission, a new kind of stored data or a new feature changes it, and so does `PRIVACY.md`.

Before the first submission:

- [ ] The GitHub repo `imanimal/betterwebwork` is public, so the privacy policy and homepage links below work.
- [ ] A developer account is registered (one-time $5 fee).
- [ ] 1 to 5 screenshots are taken (below).

## Package

Upload `dist/betterwebwork-<version>-chrome.zip` from `python tools/build.py`. The dashboard reads the name, the summary (the manifest's `description`), the icon and the permissions from it, so those aren't typed in. Later versions are a new upload on the Package tab; the text below stays.

## Store listing

**Description** (plain text, paste as is):

```text
BetterWebWork gives WeBWorK a cleaner, calmer page. It restyles the WeBWorK page you already have, right in your browser. Nothing about how WeBWorK grades changes, and every form posts exactly as WeBWorK wrote it.

It works on any WeBWorK site whose address contains /webwork2/.

Problem pages
• One bar on top: the course, the set and the problem, then settings and log out. WeBWorK's sidebar becomes a menu you open when you need it.
• The problem sits centered on one sheet at a readable width. Graphs get a light panel on dark themes so their lines stay visible.
• The set's problems sit in a strip above the sheet, each marked correct, partly correct, wrong or not started. [ and ] move between them.
• Score, attempts, attempts left and the due date share one row.
• After you check or submit, each blank gets a mark beside it. The results list shows what you typed, how WeBWorK read it, WeBWorK's own message, and short notes on common slips, like e^-2x read as (e^-2)·x or sin x without parentheses. The notes are labeled as BetterWebWork's and stay quiet when there's nothing certain to say.
• What you type in the blanks is kept until you submit it, so a refresh or a trip to another problem doesn't lose it.
• On your last attempt, Submit asks for a second press.
• Your attempts on each problem are logged in your browser, so you can see what you already tried.

Set and course pages
• Due dates in words ("Thu 11:59 PM, in 4 days"), the reduced-credit window, your progress in points, and a key to the next unfinished problem.
• Each course groups its sets: open, not open yet, closed.
• The course list puts the courses you've opened first and has a filter.

Look and settings
• Paper, a plain light theme, with Paper Dark at night. Night can follow your system or a schedule.
• Pocket themes with a handheld look, their own fonts and pixel icons.
• Adjust any theme color by color, with contrast checks. Import themes from a file or a paste, or ask a chatbot to make one.
• Typeface (Atkinson Hyperlegible or your system's), problem text size, page width, motion and a 24-hour clock.
• Settings open from the gear on every WeBWorK page or the toolbar button (Alt+Shift+W). Turn it off for one site from the toolbar button.

Privacy
BetterWebWork has no server and no analytics, and sends nothing anywhere. Settings, themes and your attempt log stay in the browser's extension storage on your computer. Answers you've typed but not submitted stay in the WeBWorK site's own storage in your browser until you submit them.

BetterWebWork is an independent project. It isn't affiliated with WeBWorK, the MAA or any school.
```

**Category:** Education.

**Language:** English (United States).

**Store icon:** `icons/icon-128.png`. Google suggests 96×96 artwork inside 16 px of transparent padding; this one fills the square, which the store accepts.

**Screenshots:** 1280×800 (or 640×400), 1 to 5, square corners. Take them in Chrome with DevTools' device toolbar set to 1280×800, then **Capture screenshot** from the ⋮ menu. Use a page with no real classmate or instructor names, or the fixture pages (`python -m http.server 4799` in this folder, then `http://127.0.0.1:4799/tests/fixtures/webwork2/`) after replacing the name in the bar. In order:

1. A problem after **Check answers**, with marks on the blanks and the results list (Paper).
2. The same page in Paper Dark.
3. A set page: due date in words, progress, the next-problem key.
4. A course's set list or the course list.
5. The settings drawer on the Themes section, with a Pocket theme applied.

**Promo tiles and video:** optional; leave empty.

**Homepage URL:** `https://github.com/imanimal/betterwebwork`

**Support URL:** `https://github.com/imanimal/betterwebwork/issues`

## Privacy practices

**Single purpose description:**

```text
Restyles WeBWorK homework pages so they're easier to read and use: the problem centered at a readable width, one-click navigation between problems, plain-language notes on answers, themes, and answers you've typed kept until you submit them. It changes only pages whose address contains /webwork2/.
```

**Permission justifications:**

`storage`

```text
Saves the user's settings, themes, a log of their own checked and submitted answers, and the names and due dates of WeBWorK sets they've opened (for the toolbar's "Due this week"), in chrome.storage.local on their computer. Nothing is sent anywhere.
```

Host permissions (`*://*/webwork2`, `*://*/webwork2/*`)

```text
WeBWorK is self-hosted: each school runs it at its own domain, always under the /webwork2/ path, so the domains can't be listed in advance. These patterns limit the extension to WeBWorK pages, where its content scripts restyle the page and the toolbar popup reads the current tab's address to show its course. It runs on no other pages and makes no network requests.
```

**Remote code:** No, I am not using remote code.

```text
All JavaScript is in the package. src/content/page.js, a packaged file listed in web_accessible_resources, is added to WeBWorK pages only to call the page's own MathJax and MathQuill, which content scripts can't reach.
```

**Data usage:** tick none of the data types. Nothing is collected: no data leaves the user's computer, and the developer never receives any. Google asks that data kept on the device still be disclosed; the privacy policy, the description's Privacy paragraph and the extension's welcome page do that. If a reviewer asks for the boxes anyway, the honest ticks are website content (pages read and set dates kept), user activity (typed answers kept until submitted) and personally identifiable information (the WeBWorK name on the page, used only to keep each person's drafts apart).

Tick all three certifications: no selling or transferring user data to third parties, no use unrelated to the single purpose, no use for creditworthiness or lending.

**Privacy policy URL:** `https://github.com/imanimal/betterwebwork/blob/main/PRIVACY.md`

## Distribution

Free, public, all regions.

## Test instructions (optional)

```text
Problem pages need a WeBWorK account at a school. Without one, open the course list of any public WeBWorK server (an address ending in /webwork2/) to see the restyled course list, then a course to see its restyled login page; the gear at the top right opens the settings on the page, and the toolbar button opens the popup. With a course that offers Guest Login, a guest can open a set and a problem, type an answer, refresh the page (the answer is put back, with a note and Undo), and press Check Answers to see the results list. The extension changes nothing on pages without /webwork2/ in the address.
```
