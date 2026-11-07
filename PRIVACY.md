# BetterWebWork privacy policy

Effective November 2, 2026.

BetterWebWork is a browser extension that restyles WeBWorK pages. It has no server, no analytics and no accounts, and it never sends anything about you or your work anywhere.

## What it reads

Only pages whose address contains `/webwork2/`. On those pages it reads what WeBWorK shows you: the problem, your answers and WeBWorK's feedback on them, scores and attempts, set and course names, due dates, and the name WeBWorK shows for you. It reads them in your browser to draw the page.

## What it keeps, and where

Everything it keeps stays in your browser on your computer.

In the extension's own storage:

- Your settings and themes.
- A log of the answers you checked and submitted on each problem, so you can see what you already tried. Turn off **Keep a log of your attempts** or press **Clear the log** in the settings to remove it.
- The names and dates of the sets and courses you've opened, for the toolbar's "Due this week" and the course list.

In the WeBWorK site's own storage in your browser:

- A copy of your look, so the page doesn't flash WeBWorK's colors before the theme applies.
- Answers you've typed and not yet submitted, so a refresh or a trip to another problem doesn't lose them. Each is kept until you submit it, for at most 60 days, and only for your 200 most recent problems. They're filed under the problem and the WeBWorK name on the page, so two people sharing a computer don't get each other's answers. Turning off **Keep what you type** forgets them.

Removing the extension deletes its own storage. The copies in a WeBWorK site's storage go when you clear that site's data in your browser.

**Export** in the settings saves your settings, themes and attempt log to a file wherever you choose; that file goes nowhere else.

## What it sends

Nothing. Its fonts are inside the extension, and the only requests it makes are to the WeBWorK site you're on: on a problem page, your browser fetches the next problem ahead of time (and another problem when you rest the pointer on its link) so going to it is quick. That's the same page you'd get by clicking, from the same server, with nothing added. The only link out is in the theme settings: asking a chatbot for a theme opens that chatbot in a new tab with a prompt filled in. The prompt holds the theme format and any idea you typed for the theme, nothing about you or your WeBWorK work, and nothing opens unless you press it.

## Permissions

- **Storage**: to keep the settings, themes, attempt log and dates above.
- **Sites whose address contains `/webwork2/`**: to restyle those pages. WeBWorK runs at each school's own address, so the extension can't name the sites in advance; it runs on no other pages.

## Sharing

Nothing is sold, shared or transferred to anyone, and nothing is used for advertising, credit decisions or anything other than restyling WeBWorK for you.

## Changes

If the extension ever handles data differently, it will say so in the extension before the change applies, and this page will be updated.

## Contact

Questions go to the project's issues: https://github.com/imanimal/betterwebwork/issues
