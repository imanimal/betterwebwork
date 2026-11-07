"""Write the fixture pages (stdlib only): WeBWorK 2.18 pages as UCSB serves them (math4 theme, Bootstrap 5.2), with
the extension's scripts in the order the manifest injects them and tests/fixtures/shim.js standing in for Firefox.

    python tests/make_fixtures.py
    python -m http.server 4799        (from the repo root), then open
    http://127.0.0.1:4799/tests/fixtures/webwork2/                              the course list
    http://127.0.0.1:4799/tests/fixtures/webwork2/math4a-01-f26-blee/           a course
    http://127.0.0.1:4799/tests/fixtures/webwork2/math4a-01-f26-blee/Week_1/    a set
    http://127.0.0.1:4799/tests/fixtures/webwork2/math4a-01-f26-blee/Week_1/1/  a problem after Submit, all correct, not marked one by one
    http://127.0.0.1:4799/tests/fixtures/webwork2/math4a-01-f26-blee/Week_1/3/  a problem after Check Answers
    http://127.0.0.1:4799/tests/fixtures/webwork2/math4a-01-f26-blee/Week_1/4/  the next problem, opened fresh

The markup follows WeBWorK's templates (system.html.ep, Problem.html.ep, AttemptsTable.pm, ProblemSet, ProblemSets);
tests/fixtures/mathjax.js stands in for MathJax (maths shows as TeX, in the mjx-container elements MathJax makes);
tests/fixtures/mathview.js stands in for PG's MathView on answers (a) and (b), page watcher included. Keep the script lists in step with manifest.json."""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = os.path.join(ROOT, "tests", "fixtures", "webwork2")
B = "/tests/fixtures/webwork2"
C = "math4a-01-f26-blee"


def scripts(run_at):
    m = json.load(open(os.path.join(ROOT, "manifest.json"), encoding="utf-8"))
    cs = next(c for c in m["content_scripts"] if c["run_at"] == run_at)
    return cs


def page(title, crumbs, body, nav="", sidebar=True, info=None, problem_nav=""):
    start, idle = scripts("document_start"), scripts("document_idle")
    css = "\n".join(f'<link rel="stylesheet" href="/{p}">' for p in start["css"])
    js_start = "\n".join(f'<script src="/{p}"></script>' for p in start["js"])
    js_idle = "\n".join(f'<script src="/{p}"></script>' for p in idle["js"])
    crumb_html = "".join(
        f'<li class="breadcrumb-item"><a href="{h}">{t}</a></li>' if h else f'<li class="breadcrumb-item active">{t}</li>' for t, h in crumbs)
    side = f"""<nav id="site-navigation" class="d-flex flex-column bg-light" aria-label="main navigation">
  <div id="site-links"><ul class="nav flex-column">
    <li class="list-group-item nav-item"><a href="{B}/" class="nav-link">Courses</a></li>
    <li class="list-group-item nav-item"><a href="{B}/{C}/" class="nav-link">Homework Sets</a></li>
    <li class="list-group-item nav-item"><a href="{B}/{C}/options/" class="nav-link">Account Settings</a></li>
    <li class="list-group-item nav-item"><a href="{B}/{C}/grades/" class="nav-link">Grades</a></li>
  </ul></div>{nav}
</nav>""" if sidebar else ""
    info_html = f'<div id="info-panel-right" class="col-md-4 mb-md-0 mb-2 order-md-last order-first"><div class="info-box bg-light">{info}</div></div>' if info else ""
    return f"""<!DOCTYPE html>
<html lang="en-US" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/tests/fixtures/vendor/bootstrap.css">
<link rel="stylesheet" href="/tests/fixtures/vendor/math4.css">
<!-- BetterWebWork at document_start -->
{css}
<script src="/tests/fixtures/shim.js"></script>
<script src="/tests/fixtures/mathjax.js"></script>
{js_start}
<title>WeBWorK : {title}</title>
</head>
<body>
<a href="#page-title" class="visually-hidden-focusable bg-white p-2 m-3 position-absolute">Skip to main content</a>
<div class="masthead" role="banner">
  <div class="webwork-logo"><button type="button" class="navbar-toggler ms-3 me-2 p-0 fa-2x" id="toggle-sidebar" aria-controls="site-navigation"><span id="toggle-sidebar-icon">=</span></button><a href="{B}/">WeBWorK</a></div>
  <div class="institution-logo"></div>
  <div class="login-status">Logged in as Alex K. <a href="{B}/{C}/logout/" class="btn btn-light btn-sm ms-2">Log Out</a></div>
</div>
{side}
<div class="d-flex">
<div id="content" class="container-fluid flex-grow-1">
  <div id="breadcrumb-row" class="row my-2"><div class="col-12 d-flex align-items-center"><nav id="breadcrumb-navigation" aria-label="breadcrumb navigation" class="w-100 bg-light"><ol class="breadcrumb">{crumb_html}</ol></nav></div></div>
  {problem_nav}
  <div class="row"><div class="col-12"><h1 id="page-title" class="page-title">{title}</h1></div></div>
  <div id="message" class="message"></div>
  <div class="row"><div class="body {'col-md-8' if info else 'col-12'}">
{body}
  </div>{info_html}</div>
  <div id="message_bottom" class="message"></div>
  <div id="footer" role="contentinfo">Page generated at 11/01/2026 at 09:00pm PST. WeBWorK 2.18.</div>
</div>
</div>
<!-- BetterWebWork at document_idle -->
{js_idle}
</body>
</html>
"""


def write(rel, html):
    path = os.path.join(FIX, rel, "index.html")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    print(os.path.relpath(path, ROOT))


COURSES = ["math108b-01-f26-tcrossett", "math108b-01-w25-hosseinkhan", "math117-01-s25-ye", "math119a-1-f25-klam", "math2a-01-f24-porter",
           "math2a-01-f25-porter", "math2a-01-f26-blee", C, "math34a-02-f26-garcia", "math3b-01-w26-kim", "math4b-01-s26-ortiz", "pstat120a-01-f26-wu", "sandbox"]


def courses():
    items = "".join(f'<li><a href="{B}/{c}/">{c}</a></li>' for c in COURSES)
    body = f"""<p>Welcome to WeBWorK!</p>
<h2>Courses</h2>
<ul class="courses-list">{items}</ul>"""
    info = """<p>Instructors can use this file to post notes.</p>
<p>The default site_info.txt is replaced by setting $webworkFiles{site_info} in localOverrides.conf.  This will prevent the file
from being overwritten. This file is at htdocs/site_info.txt.  Use it to display information for the entire WeBWorK site which will be viewed at login time.</p>"""
    write("", page("Courses", [("WeBWorK", None)], body, sidebar=False, info=info))


SETS = [
    ("Week_0", "Week 0", "Closed, answers on 10/20/2026 at 08:00am PDT.", False, "Review"),
    ("Week_1", "Week 1", "Open, due 11/05/2026 at 11:59pm PST. Afterward reduced credit can be earned until 11/08/2026 at 11:59pm PST.", False, "Limits and continuity"),
    ("Week_2", "Week 2", "Open, closes 11/02/2026 at 09:00am PST.", False, "Derivatives"),
    ("Quiz_1", "Quiz 1", "Open, closes 11/12/2026 at 11:59pm PST.", True, "Timed quiz: 50 minutes"),
    ("Week_3", "Week 3", "Will open on 11/09/2026 at 08:00am PST.", False, ""),
    ("Week_00", "Week 00", "Due date 10/27/2026 at 11:59pm PDT has passed. Reduced credit can still be earned until 11/03/2026 at 11:59pm PST.", False, "Pretest"),
]


def course():
    rows = "".join(
        f'<tr><td><a href="{B}/{C}/{sid}/" class="set-id-tooltip" data-bs-toggle="tooltip" data-bs-title="{tip}">{name}</a>{" <i class=\"fa-solid fa-clock\"></i>" if timed else ""}</td>'
        f'<td>{status}</td><td class="hardcopy"><a href="{B}/{C}/hardcopy/{sid}/" class="hardcopy-link"><i class="far fa-arrow-alt-circle-down"></i></a></td></tr>'
        for sid, name, status, timed, tip in SETS)
    body = f"""<div class="table-responsive"><table class="problem_set_table table table-sm caption-top font-sm"><caption>Homework Sets</caption>
<thead class="table-group-divider"><tr><th scope="col"><a href="?sort=name">Name</a></th><th scope="col"><span>Status</span></th><th scope="col" class="hardcopy"><i class="icon far fa-arrow-alt-circle-down fa-lg"></i></th></tr></thead>
<tbody class="table-group-divider">{rows}</tbody></table></div>
<div><button type="button" class="btn btn-primary">Email Instructor</button></div>"""
    info = "<h2>Course Info</h2><p>Math 4A, Fall 2026. Homework is due Thursdays at 11:59 PM. Office hours: South Hall 6431, Tuesdays 2 to 3.</p>"
    write(C, page(C, [("WeBWorK", f"{B}/"), (C, None)], body, info=info))


PROBLEMS = [(1, 2, "unlimited", 1, 100), (2, 4, "unlimited", 1, 50), (3, 3, "1", 2, 33), (4, 0, "unlimited", 1, 0), (5, 1, "unlimited", 2, 0)]


def problem_set():
    rows = "".join(f'<tr><td><a class="fw-bold" href="{B}/{C}/Week_1/{n}/">Problem {n}</a></td><td>{a}</td><td>{r}</td><td>{w}</td><td>{s}%</td></tr>' for n, a, r, w, s in PROBLEMS)
    body = f"""<div class="alert alert-info mb-3"><p><strong>Set is due on 11/05/2026 at 11:59pm PST.</strong></p>
<p class="mb-0">After the due date this set enters a reduced scoring period until it closes on 11/08/2026 at 11:59pm PST.  All work completed during the reduced scoring period counts for 50% of its value.</p></div>
<div class="table-responsive"><table class="problem_set_table table caption-top font-sm"><caption>Problems</caption>
<thead class="table-group-divider"><tr><th>Name</th><th>Attempts</th><th>Remaining</th><th>Worth</th><th>Status</th></tr></thead>
<tbody class="table-group-divider">{rows}</tbody></table></div>
<div class="mb-3"><a href="{B}/{C}/hardcopy/Week_1/" class="btn btn-primary">Download PDF or TeX Hardcopy for Current Set</a></div>"""
    info = "<h2>Set Info</h2><p>Limits and continuity. Section 2.2 to 2.5.</p>"
    write(f"{C}/Week_1", page("Week 1", [("WeBWorK", f"{B}/"), (C, f"{B}/{C}/"), ("Week_1", None)], body, info=info))


def problem():
    sib_items = []
    for n, mark in [(1, " &#x2713;"), (2, " &hellip;"), (3, " &#x2717;"), (4, ""), (5, " &#x2717;")]:
        cur = n == 3
        sib_items.append(f'<li class="nav-item"><a {"" if cur else f"href=\"{B}/{C}/Week_1/{n}/\" "}class="nav-link{" active" if cur else ""}">Problem {n}{mark}</a></li>')
    nav = f"""<div id="siblings"><div class="info-box bg-light"><h2>Problems</h2>
<div class="progress set-id-tooltip" role="figure"><div class="progress-bar correct-progress" style="width:20%"></div><div class="progress-bar inprogress-progress" style="width:20%"></div><div class="progress-bar incorrect-progress" style="width:40%"></div></div>
<ul class="nav flex-column problem-list">{"".join(sib_items)}</ul></div></div>"""
    pnav = f"""<div class="row sticky-nav" role="navigation" aria-label="problem navigation"><div class="d-flex submit-buttons-container">
<a href="{B}/{C}/Week_1/2/" class="btn btn-primary">Previous Problem</a><a href="{B}/{C}/Week_1/" class="btn btn-primary">Problem List</a><a href="{B}/{C}/Week_1/4/" class="btn btn-primary">Next Problem</a></div></div>"""
    graph = ("data:image/svg+xml," + "%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='180' viewBox='0 0 300 180'%3E%3Crect width='300' height='180' fill='white'/%3E"
             "%3Cpath d='M20 160H290M30 170V10' stroke='black'/%3E%3Cpath d='M30 150C90 140 150 40 280 20' stroke='%23224488' stroke-width='2' fill='none'/%3E%3C/svg%3E")
    body = f"""<div id="custom_edit_message" class="row"><div class="col-lg-10"></div></div>
<div class="row"><div id="output_summary" class="col-lg-10">
<div class="ResultsWithError d-inline-block mb-3">ANSWERS ONLY CHECKED -- ANSWERS NOT RECORDED</div>
<div class="table-responsive"><table class="attemptResults table table-sm table-bordered">
<tr><th>#</th><th>Entered</th><th>Answer Preview</th><th>Result</th><th>Message</th></tr>
<tr><td>1</td><td dir="auto">2x+1</td><td><div class="answer-preview" data-bs-toggle="popover" data-bs-content="2x+1">\\(2x+1\\)</div></td><td class="ResultsWithoutError"><a href="#" data-answer-id="AnSwEr0001">correct</a></td><td>&nbsp;</td></tr>
<tr><td>2</td><td dir="auto">e^-2x</td><td><div class="answer-preview" data-bs-toggle="popover" data-bs-content="e^-2x">\\(e^{{-2}}x\\)</div></td><td class="ResultsWithError"><a href="#" data-answer-id="AnSwEr0002">incorrect</a></td><td>&nbsp;</td></tr>
<tr><td>3</td><td dir="auto">sin x <span class="parsehilight">)</span></td><td><div class="answer-preview" data-bs-toggle="popover" data-bs-content="sin x )">&nbsp;</div></td><td class="ResultsWithError"><a href="#" data-answer-id="AnSwEr0003">incorrect</a></td><td class="FeedbackMessage">Unexpected close parenthesis</td></tr>
<tr><td>4</td><td dir="auto">0.33</td><td><div class="answer-preview" data-bs-toggle="popover" data-bs-content="0.33">\\(0.33\\)</div></td><td><a href="#" data-answer-id="AnSwEr0004">50% correct</a></td><td>&nbsp;</td></tr>
</table></div>
<div role="alert" class="attemptResultsSummary"><div class="ResultsWithError">At least one of the answers above is NOT correct.</div></div>
</div></div>
<div class="row"><div id="output_achievement_message" class="col-lg-10"></div></div>
<div class="row"><div id="output_comments" class="col-lg-10"></div></div>
<div class="row"><div id="output_grader" class="col-lg-10"></div></div>
<div class="row"><div class="col-lg-10">
<form action="" method="POST" name="problemMainForm" id="problemMainForm" class="problem-main-form">
<input type="hidden" name="user" value="alexk"><input type="hidden" name="startTime" value="1793595600">
<div class="problem"><div id="problem_body" class="problem-content" lang="en" dir="ltr"><div id="output_problem_body">
<p>Let \\(f(x) = (x+1)^2 - x^2\\).</p>
<p>(a) Simplify: \\(f(x) =\\) <input type="text" class="codeshard correct" size="20" name="AnSwEr0001" id="AnSwEr0001" aria-label="answer 1" data-mv value="2x+1" autocomplete="off" spellcheck="false"><input type="hidden" name="previous_AnSwEr0001" value="2x+1"></p>
<p>(b) Differentiate \\(g(x) = e^{{-2x}}\\): \\(g'(x) =\\) <input type="text" class="codeshard incorrect" size="20" name="AnSwEr0002" id="AnSwEr0002" aria-label="answer 2" data-mv value="e^-2x" autocomplete="off"><input type="hidden" name="previous_AnSwEr0002" value="e^-2x"></p>
<p>(c) Enter \\(\\sin(x)\\): <input type="text" class="codeshard incorrect" size="20" name="AnSwEr0003" id="AnSwEr0003" aria-label="answer 3" value="sin x )" autocomplete="off"><input type="hidden" name="previous_AnSwEr0003" value="sin x )"></p>
<p>(d) The graph below shows \\(h\\). Estimate \\(h(1)\\) to four significant digits: <input type="text" class="codeshard partially-correct" size="10" name="AnSwEr0004" id="AnSwEr0004" aria-label="answer 4" value="0.33" autocomplete="off"><input type="hidden" name="previous_AnSwEr0004" value="0.33"></p>
<p><img src="{graph}" class="image-view-elt" width="300" height="180" alt="Graph of h"></p>
<p><a class="knowl" data-bs-toggle="collapse" href="#hint1">Hint</a></p><div id="hint1" class="collapse"><div class="knowl-output"><div class="knowl-content">Expand the square first.</div></div></div>
</div></div>
<p><b>Note:</b> <i>You can earn partial credit on this problem.</i></p></div>
<script src="/tests/fixtures/mathview.js"></script>
<div class="checkboxes-container col-12 my-2"></div>
<div class="submit-buttons-container col-12 my-2">
<input type="submit" id="enter_key_submit" name="previewAnswers" value="Preview My Answers" class="visually-hidden-unfocusable" formtarget="_self">
<input type="submit" id="previewAnswers_id" name="previewAnswers" value="Preview My Answers" class="btn btn-primary mb-1" formtarget="_self">
<input type="submit" id="checkAnswers_id" name="checkAnswers" value="Check Answers" class="btn btn-primary mb-1" formtarget="_self">
<input type="submit" id="submitAnswers_id" name="submitAnswers" value="Submit Answers" class="btn btn-primary mb-1" formtarget="_self">
</div>
<div id="score_summary" class="scoreSummary"><p>You have attempted this problem 3 times.<br>Your overall recorded score is 33%.<br>You have 1 attempt remaining.</p></div>
</form></div></div>
<div id="problemFooter" class="problemFooter"><form method="POST" action="#"><button type="submit" class="btn btn-primary">Show Past Answers</button></form><form method="POST" action="#"><button type="submit" class="btn btn-primary">Email Instructor</button></form></div>"""
    title = '<span dir="ltr">Week 1</span>: Problem 3<span class="problem-sub-header d-block">(2 points)</span>'
    write(f"{C}/Week_1/3", page(title.replace('<span class="problem-sub-header d-block">(2 points)</span>', ""), [("WeBWorK", f"{B}/"), (C, f"{B}/{C}/"), ("Week_1", f"{B}/{C}/Week_1/"), ("3", None)], body, nav=nav, problem_nav=pnav)
          .replace('<h1 id="page-title" class="page-title">' + title.replace('<span class="problem-sub-header d-block">(2 points)</span>', ""), '<h1 id="page-title" class="page-title">' + title)
          .replace("<title>WeBWorK : " + title.replace('<span class="problem-sub-header d-block">(2 points)</span>', ""), f"<title>WeBWorK : {C} : Week_1 : 3"))


def problem_done():
    """Problem 1 just after Submit Answers, all correct, on a problem that doesn't mark answers one by one
    (PG's showPartialCorrectAnswers = 0): WeBWorK 2.18 drops the Result column on a submit then, and only the summary
    under the table says the answers are right. The partial credit note stays under the problem, as WeBWorK writes it."""
    sib_items = []
    for n, mark in [(1, " &#x2713;"), (2, " &hellip;"), (3, " &#x2717;"), (4, ""), (5, " &#x2717;")]:
        cur = n == 1
        sib_items.append(f'<li class="nav-item"><a {"" if cur else f"href=\"{B}/{C}/Week_1/{n}/\" "}class="nav-link{" active" if cur else ""}">Problem {n}{mark}</a></li>')
    nav = f"""<div id="siblings"><div class="info-box bg-light"><h2>Problems</h2>
<ul class="nav flex-column problem-list">{"".join(sib_items)}</ul></div></div>"""
    pnav = f"""<div class="row sticky-nav" role="navigation" aria-label="problem navigation"><div class="d-flex submit-buttons-container">
<span class="btn btn-primary disabled">Previous Problem</span><a href="{B}/{C}/Week_1/" class="btn btn-primary">Problem List</a><a href="{B}/{C}/Week_1/2/" class="btn btn-primary">Next Problem</a></div></div>"""
    body = f"""<div id="custom_edit_message" class="row"><div class="col-lg-10"></div></div>
<div class="row"><div id="output_summary" class="col-lg-10">
<div class="table-responsive"><table class="attemptResults table table-sm table-bordered">
<tr><th>Entered</th><th>Answer Preview</th><th>Message</th></tr>
<tr><td dir="auto">[-1,1]</td><td><div class="answer-preview" data-bs-toggle="popover" data-bs-content="[-1,1]">\\([-1,1]\\)</div></td><td>&nbsp;</td></tr>
<tr><td dir="auto">0</td><td><div class="answer-preview" data-bs-toggle="popover" data-bs-content="0">\\(0\\)</div></td><td>&nbsp;</td></tr>
</table></div>
<div role="alert" class="attemptResultsSummary"><div class="ResultsWithoutError mb-2">All of the answers above are correct.</div></div>
</div></div>
<div class="row"><div class="col-lg-10">
<form action="" method="POST" name="problemMainForm" id="problemMainForm" class="problem-main-form">
<input type="hidden" name="user" value="alexk"><input type="hidden" name="startTime" value="1793595600">
<div class="problem"><div id="problem_body" class="problem-content" lang="en" dir="ltr"><div id="output_problem_body">
<p>Let \\(f(x) = \\sqrt{{1 - x^2}}\\).</p>
<p>(a) The domain of \\(f\\) is <input type="text" class="codeshard" size="20" name="AnSwEr0001" id="AnSwEr0001" aria-label="answer 1" value="[-1,1]" autocomplete="off"><input type="hidden" name="previous_AnSwEr0001" value="[-1,1]"></p>
<p>(b) \\(\\lim_{{x \\to 1^-}} f(x) =\\) <input type="text" class="codeshard" size="20" name="AnSwEr0002" id="AnSwEr0002" aria-label="answer 2" value="0" autocomplete="off"><input type="hidden" name="previous_AnSwEr0002" value="0"></p>
</div></div>
<p><b>Note:</b> <i>You can earn partial credit on this problem.</i></p></div>
<div class="checkboxes-container col-12 my-2"></div>
<div class="submit-buttons-container col-12 my-2">
<input type="submit" id="enter_key_submit" name="previewAnswers" value="Preview My Answers" class="visually-hidden-unfocusable" formtarget="_self">
<input type="submit" id="previewAnswers_id" name="previewAnswers" value="Preview My Answers" class="btn btn-primary mb-1" formtarget="_self">
<input type="submit" id="checkAnswers_id" name="checkAnswers" value="Check Answers" class="btn btn-primary mb-1" formtarget="_self">
<input type="submit" id="submitAnswers_id" name="submitAnswers" value="Submit Answers" class="btn btn-primary mb-1" formtarget="_self">
</div>
<div id="score_summary" class="scoreSummary"><p>Your score was recorded.<br>You have attempted this problem 2 times.<br>You received a score of 100% for this attempt.<br>Your overall recorded score is 100%.  <br>You have unlimited attempts remaining.</p></div>
</form></div></div>"""
    title = '<span dir="ltr">Week 1</span>: Problem 1'
    write(f"{C}/Week_1/1", page(title, [("WeBWorK", f"{B}/"), (C, f"{B}/{C}/"), ("Week_1", f"{B}/{C}/Week_1/"), ("1", None)], body, nav=nav, problem_nav=pnav)
          .replace(f'<h1 id="page-title" class="page-title">{title}', f'<h1 id="page-title" class="page-title">{title}<span class="problem-sub-header d-block">(1 point)</span>')
          .replace(f"<title>WeBWorK : {title}", f"<title>WeBWorK : {C} : Week_1 : 1"))


def problem_view():
    """Problem 4 opened from a link, nothing previewed yet: a blank, a pop-up, a choice and a MathQuill box
    (tests/fixtures/mathquill.js), for the answers app.js keeps through a refresh or a trip to problem 3 and back
    (PG's PopUp and RadioButtons markup)."""
    sib_items = []
    for n, mark in [(1, " &#x2713;"), (2, " &hellip;"), (3, " &#x2717;"), (4, ""), (5, " &#x2717;")]:
        cur = n == 4
        sib_items.append(f'<li class="nav-item"><a {"" if cur else f"href=\"{B}/{C}/Week_1/{n}/\" "}class="nav-link{" active" if cur else ""}">Problem {n}{mark}</a></li>')
    nav = f"""<div id="siblings"><div class="info-box bg-light"><h2>Problems</h2>
<ul class="nav flex-column problem-list">{"".join(sib_items)}</ul></div></div>"""
    pnav = f"""<div class="row sticky-nav" role="navigation" aria-label="problem navigation"><div class="d-flex submit-buttons-container">
<a href="{B}/{C}/Week_1/3/" class="btn btn-primary">Previous Problem</a><a href="{B}/{C}/Week_1/" class="btn btn-primary">Problem List</a><a href="{B}/{C}/Week_1/5/" class="btn btn-primary">Next Problem</a></div></div>"""
    choices = "".join(f'<label class="form-check-label"><input type="radio" class="form-check-input" name="AnSwEr0003" id="AnSwEr0003{"" if i == 0 else f"_{i}"}" value="B{i}"> {t}</label><br>'
                      for i, t in enumerate(["\\(f\\) has a maximum at \\(x = 1\\)", "\\(f\\) has a minimum at \\(x = 1\\)", "Neither"]))
    body = f"""<div id="custom_edit_message" class="row"><div class="col-lg-10"></div></div>
<div class="row"><div id="output_summary" class="col-lg-10"></div></div>
<div class="row"><div class="col-lg-10">
<form action="" method="POST" name="problemMainForm" id="problemMainForm" class="problem-main-form">
<input type="hidden" name="user" value="alexk"><input type="hidden" name="startTime" value="1793595600">
<div class="problem"><div id="problem_body" class="problem-content" lang="en" dir="ltr"><div id="output_problem_body">
<p>Let \\(f(x) = x^3 - 3x\\).</p>
<p>(a) \\(f'(x) =\\) <input type="text" class="codeshard" size="20" name="AnSwEr0001" id="AnSwEr0001" aria-label="answer 1" value="" autocomplete="off" spellcheck="false"><input type="hidden" name="previous_AnSwEr0001" value=""></p>
<p>(b) On \\((-1, 1)\\), \\(f\\) is <select class="pg-select" name="AnSwEr0002" id="AnSwEr0002" aria-label="answer 2"><option value="?">?</option><option value="increasing">increasing</option><option value="decreasing">decreasing</option></select><input type="hidden" name="previous_AnSwEr0002" value=""></p>
<p>(c) Which is true?</p><p>{choices}<input type="hidden" name="previous_AnSwEr0003" value=""></p>
<p>(d) \\(f''(x) =\\) <input type="text" class="codeshard" size="20" name="AnSwEr0004" id="AnSwEr0004" aria-label="answer 4" value="" autocomplete="off"><input type="hidden" name="MaThQuIlL_AnSwEr0004" id="MaThQuIlL_AnSwEr0004" value=""><input type="hidden" name="previous_AnSwEr0004" value=""></p>
</div></div></div>
<script src="/tests/fixtures/mathquill.js"></script>
<div class="checkboxes-container col-12 my-2"></div>
<div class="submit-buttons-container col-12 my-2">
<input type="submit" id="enter_key_submit" name="previewAnswers" value="Preview My Answers" class="visually-hidden-unfocusable" formtarget="_self">
<input type="submit" id="previewAnswers_id" name="previewAnswers" value="Preview My Answers" class="btn btn-primary mb-1" formtarget="_self">
<input type="submit" id="checkAnswers_id" name="checkAnswers" value="Check Answers" class="btn btn-primary mb-1" formtarget="_self">
<input type="submit" id="submitAnswers_id" name="submitAnswers" value="Submit Answers" class="btn btn-primary mb-1" formtarget="_self">
</div>
<div id="score_summary" class="scoreSummary"><p>You have attempted this problem 0 times.<br>You have 3 attempts remaining.</p></div>
</form></div></div>"""
    title = '<span dir="ltr">Week 1</span>: Problem 4'
    write(f"{C}/Week_1/4", page(title, [("WeBWorK", f"{B}/"), (C, f"{B}/{C}/"), ("Week_1", f"{B}/{C}/Week_1/"), ("4", None)], body, nav=nav, problem_nav=pnav)
          .replace(f'<h1 id="page-title" class="page-title">{title}', f'<h1 id="page-title" class="page-title">{title}<span class="problem-sub-header d-block">(3 points)</span>')
          .replace(f"<title>WeBWorK : {title}", f"<title>WeBWorK : {C} : Week_1 : 4"))


if __name__ == "__main__":
    courses()
    course()
    problem_set()
    problem_done()
    problem()
    problem_view()
