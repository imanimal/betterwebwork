// BetterWebWork's pure parts: themes, WeBWorK's text (addresses, course ids, dates, set and score sentences), the
// notes on answers and when a draft of your answers is put back. Run: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
for (const f of ["util", "themes", "ww", "advice"]) require(path.join(__dirname, "..", "src", "lib", f + ".js"));
const { themes: T, ww, advice, u } = globalThis.BW;

test("every built-in theme passes its contrast checks", () => {
  for (const t of T.BUILTIN) {
    assert.equal(Object.keys(t.tokens).length, T.KEYS.length, t.id);
    assert.deepEqual(T.checks(t.tokens).map((c) => `${c.f}/${c.b}`), [], t.id);
  }
});

test("the default is Paper, with Paper Dark at night", () => {
  const all = T.BUILTIN;
  assert.equal(T.pick({ theme: "paper", nightTheme: "paper-dark", night: "off" }, all).id, "paper");
  assert.equal(T.pick({ theme: "paper", nightTheme: "paper-dark", night: "on" }, all).id, "paper-dark");
  assert.equal(T.pick({ theme: "gone", nightTheme: "gone", night: "off" }, all).id, "paper");
  assert.equal(T.byId("paper").look, "standard");
});

test("night on a schedule wraps past midnight", () => {
  const s = { night: "schedule", nightFrom: "20:00", nightTo: "07:00" };
  const at = (h, m = 0) => new Date(2026, 10, 1, h, m).getTime();
  assert.equal(T.isNight(s, at(21)), true);
  assert.equal(T.isNight(s, at(3)), true);
  assert.equal(T.isNight(s, at(7, 0)), false);
  assert.equal(T.isNight(s, at(12)), false);
  assert.equal(T.isNight({ night: "schedule", nightFrom: "13:00", nightTo: "15:00" }, at(14)), true);
});

test("normalize reads a chatbot reply, fills gaps and flags contrast", () => {
  const reply = 'Sure! Here it is:\n```json\n{"pocketTheme":1,"name":"Late Blue","look":"standard","scheme":"dark","tokens":{"bg":"#101520","surface":"#161c2a","text":"#eef2f8","text2":"#c8d0dc","text3":"#98a3b4","accent":"#7aa5ff","on-accent":"#0b1020"}}\n```\nEnjoy.';
  const r = T.normalize(reply);
  assert.equal(r.error, undefined);
  assert.equal(r.theme.id, "late-blue");
  assert.equal(r.theme.scheme, "dark");
  assert.equal(r.theme.tokens.bg, "#101520");
  assert.equal(r.theme.tokens.ok, T.byId("paper-dark").tokens.ok, "missing tokens come from the built-in of the same look and scheme");
  assert.match(r.warnings[0], /missing/);
  assert.ok(T.normalize("no json here").error);
  assert.ok(T.normalize('{"tokens":{"bg":"red"}}').error);
});

test("normalize takes Collegiapp v1 packs and PocketCanvas/BetterWebWork custom properties", () => {
  const v1 = T.normalize({ name: "Pack", palette: { tokens: { "p-surface": "#ffffff", "p-text": "#111111", "p-acc": "#ff5b1f" } } });
  assert.equal(v1.theme.look, "pocket");
  assert.equal(v1.theme.tokens.surface, "#ffffff");
  assert.equal(v1.theme.tokens.accent, "#ff5b1f");
  const css = T.normalize({ name: "Vars", tokens: { "--pc-bg": "#eeeeee", "--bw-text": "#000000" } });
  assert.equal(css.theme.tokens.bg, "#eeeeee");
  assert.equal(css.theme.tokens.text, "#000000");
  assert.equal(T.normalize({ name: "Paper", tokens: { bg: "#fff" } }).theme.id, "my-paper", "a built-in's id is never taken");
});

test("theme CSS can't load anything", () => {
  const s = T.safeCss('@import "https://x.test/a.css"; a { background: url(https://x.test/i.png) } b { background: url("data:image/png;base64,AA") }');
  assert.doesNotMatch(s, /@import|x\.test/);
  assert.match(s, /data:image/);
});

test("fix brings every pair up to its minimum", () => {
  const t = Object.assign({}, T.byId("paper"), { tokens: Object.assign({}, T.byId("paper").tokens, { text3: "#d0ccc4", "on-accent": "#3050a0" }) });
  assert.ok(T.checks(t.tokens).length > 0);
  assert.deepEqual(T.checks(T.fix(t).tokens), []);
});

test("route reads WeBWorK addresses", () => {
  const h = "https://webwork.math.ucsb.edu/webwork2";
  assert.equal(ww.route(h + "/").kind, "courses");
  const c = ww.route(h + "/math4a-01-f26-blee/");
  assert.deepEqual([c.kind, c.course, c.key], ["course", "math4a-01-f26-blee", "webwork.math.ucsb.edu/math4a-01-f26-blee"]);
  const s = ww.route(h + "/math4a-01-f26-blee/Week_1/");
  assert.deepEqual([s.kind, s.set], ["set", "Week_1"]);
  const p = ww.route(h + "/math4a-01-f26-blee/Week_1/3/?effectiveUser=x");
  assert.deepEqual([p.kind, p.problem, p.key, p.base], ["problem", "3", "webwork.math.ucsb.edu/math4a-01-f26-blee/Week_1/3", h]);
  assert.equal(ww.route(h + "/math4a-01-f26-blee/options/").kind, "page");
  assert.deepEqual([ww.route(h + "/math4a/quiz_mode/Quiz_1/").kind, ww.route(h + "/math4a/quiz_mode/Quiz_1/").set], ["quiz", "Quiz_1"]);
  assert.equal(ww.route(h + "/admin").kind, "page");
  assert.equal(ww.route("https://example.com/canvas"), null);
});

test("course ids become codes and quarters", () => {
  assert.equal(ww.code("math34A-01-f26-blee"), "MATH 34A");
  assert.equal(ww.code("pstat120a-01-f26"), "PSTAT 120A");
  assert.deepEqual(ww.quarter("math2a-01-f24-porter"), { label: "Fall 2024", sort: 2024.9 });
  assert.equal(ww.quarter("math117-01-s25-ye").label, "Spring 2025");
  assert.equal(ww.quarter("math108b-01-w25-hosseinkhan").label, "Winter 2025");
  assert.equal(ww.quarter("math3a-m26-x").label, "Summer 2026");
  assert.equal(ww.quarter("sandbox"), null);
});

test("dates read in their zone, Pacific when none is given", () => {
  const nov5 = Date.UTC(2026, 10, 6, 7, 59);
  assert.equal(ww.date("11/05/2026 at 11:59pm PST"), nov5);
  assert.equal(ww.date("November 5, 2026 at 11:59:00 PM PST"), nov5);
  assert.equal(ww.date("11/05/2026 at 11:59pm"), nov5, "no zone in November is PST");
  assert.equal(ww.date("10/20/2026 at 11:59pm"), Date.UTC(2026, 9, 21, 6, 59), "no zone in October is PDT");
  assert.equal(ww.date("10/20/2026 at 11:59pm EDT"), Date.UTC(2026, 9, 21, 3, 59));
  assert.equal(ww.date("not a date"), null);
});

test("set list statuses", () => {
  assert.equal(ww.setStatus("Open, closes 11/05/2026 at 11:59pm PST.").due, Date.UTC(2026, 10, 6, 7, 59));
  assert.equal(ww.setStatus("Will open on 11/10/2026 at 08:00am PST.").opens, Date.UTC(2026, 10, 10, 16, 0));
  const c = ww.setStatus("Closed, answers on 11/12/2026 at 08:00am PST.");
  assert.equal(c.closed, true); assert.equal(c.answers, Date.UTC(2026, 10, 12, 16, 0));
  const r = ww.setStatus("Due date 10/30/2026 at 11:59pm PDT has passed. Reduced credit can still be earned until 11/02/2026 at 11:59pm PST.");
  assert.equal(r.due, Date.UTC(2026, 9, 31, 6, 59)); assert.equal(r.lateDue, Date.UTC(2026, 10, 3, 7, 59));
  const o = ww.setStatus("Open, due 11/05/2026 at 11:59pm PST. Afterward reduced credit can be earned until 11/08/2026 at 11:59pm PST.");
  assert.equal(o.due, Date.UTC(2026, 10, 6, 7, 59)); assert.equal(o.lateDue, Date.UTC(2026, 10, 9, 7, 59));
});

test("a set page's status box", () => {
  const a = ww.setAlert("Set is due on 11/05/2026 at 11:59pm PST. After the due date this set enters a reduced scoring period until it closes on 11/08/2026 at 11:59pm PST.  All work completed during the reduced scoring period counts for 50% of its value.");
  assert.deepEqual([a.due, a.lateDue, a.reduced, a.closed], [Date.UTC(2026, 10, 6, 7, 59), Date.UTC(2026, 10, 9, 7, 59), 50, false]);
  assert.equal(ww.setAlert("Set closes on 11/05/2026 at 11:59pm PST.").due, Date.UTC(2026, 10, 6, 7, 59));
  assert.equal(ww.setAlert("Set opens on 11/10/2026 at 08:00am PST.").opens, Date.UTC(2026, 10, 10, 16, 0));
  assert.equal(ww.setAlert("Set is closed.").closed, true);
  assert.equal(ww.setAlert("Set closes on 11/08/2026 at 11:59pm PST. This set is in its reduced scoring period.  All work counts for 50% of its value.").inReduced, true);
});

test("score lines", () => {
  const s = ww.score("You have attempted this problem 3 times. You received a score of 50% for this attempt. Your overall recorded score is 50%. You have 2 attempts remaining.");
  assert.deepEqual([s.attempts, s.thisScore, s.overall, s.remaining, s.known], [3, 50, 50, 2, true]);
  assert.equal(ww.score("You have attempted this problem 1 time. You have unlimited attempts remaining.").remaining, Infinity);
  assert.equal(ww.score("You have 1 attempt remaining.").remaining, 1);
  assert.equal(ww.score("This homework set is closed.").closed, true);
  assert.equal(ww.score("").known, false);
});

test("what a results page is", () => {
  assert.equal(ww.kind("PREVIEW ONLY -- ANSWERS NOT RECORDED", false, false), "preview");
  assert.equal(ww.kind("ANSWERS ONLY CHECKED -- ANSWERS NOT RECORDED", true, true), "check");
  assert.equal(ww.kind("", true, true), "submit");
  // a submit on a problem that doesn't mark answers one by one (showPartialCorrectAnswers = 0): only the summary
  assert.equal(ww.kind("", false, true), "submit");
  assert.equal(ww.kind("", false, false), "preview");
});

test("part labels at the start of a line", () => {
  for (const s of ["(1) Let C1", " (2)", "(b) Find", "(iv) Show", "b) Find", "1. Find", "12. Then", "Part 3: Find", "Part (a)", "part b."]) assert.equal(ww.part(s), true, s);
  for (const s of ["a function", "(x+1) is", "(1, 2)", "3.5 is", "For −∞ type -inf", "Partial credit", "", null]) assert.equal(ww.part(s), false, String(s));
});

test("due dates in words", () => {
  const now = new Date(2026, 10, 2, 12, 0).getTime();
  assert.deepEqual([u.due(now + 2 * u.HR, now).t, u.due(now + 2 * u.HR, now).c], ["in 2h", "hot"]);
  assert.equal(u.due(now + 10 * u.HR, now).c, "soon");
  assert.equal(u.due(now + 3 * u.DAY, now).c, "");
  assert.deepEqual([u.due(now - 2 * u.HR, now).t, u.due(now - 2 * u.HR, now).c], ["2h ago", "over"]);
});

// one example that makes each note say something (advice.js's rules, in order)
const why = (entered, message, result = "bad") => advice({ entered, message, result }).map((x) => x.why);
test("notes on answers: each rule", () => {
  const cases = [
    ["empty", "", ""],
    ["isnt", "x+1", "Your answer isn't a number (it looks like a formula that returns a number)"],
    ["undefinedVar", "2X+1", "Variable 'X' is not defined in this context"],
    ["notAllowed", "sin(pi/6)", "Function 'sin' is not allowed in this context"],
    ["unexpected", "3×4", "Unexpected character '×'"],
    ["operand", "2*", "Missing operand after '*'"],
    ["parens", "(x+1]", "Mismatched parentheses: '(' and ']'"],
    ["inputs", "log(2,3)", "Function 'log' has too many inputs"],
    ["divzero", "1/(x-x)", "Division by zero"],
    ["points", "sqrt(-x)", "Can't generate enough valid points for comparison"],
    ["reduce", "2/4", "Your fraction is not reduced"],
    ["decimal", "0.5", "You are not allowed to type decimal numbers in this problem"],
    ["units", "12", "Your answer doesn't look like a number with units"],
    ["count", "1,2", "There should be more values in your list"],
    ["endpoints", "(5,2)", "The left endpoint of your interval must be less than the right"],
    ["dimension", "<1,2>", "The dimension of your result is incorrect"],
    ["unbalanced", "sin(x", ""],
    ["fracPow", "x^1/2", ""],
    ["expProduct", "e^2x", ""],
    ["expNeg", "e^-xy", ""],
    ["ambiguousDiv", "1/2x", ""],
    ["funcParens", "sin x", ""],
    ["log", "log(x)", ""],
    ["symbols", "π/2", ""],
    ["degrees", "30°", ""],
    ["thousands", "1,000", ""],
    ["label", "x = 5", ""],
    ["percent", "25%", ""],
    ["rounded", "0.33", ""],
  ];
  for (const [rule, e, m] of cases) assert.ok(why(e, m).includes(rule), `${rule}: ${JSON.stringify(e)} → ${why(e, m)}`);
  const covered = new Set(cases.map((c) => c[0]));
  assert.deepEqual(advice.RULES.filter((r) => !covered.has(r)), [], "every rule has a case");
});

test("notes stay quiet when there's nothing certain to say", () => {
  assert.deepEqual(why("2x+1", "", "ok"), []);
  assert.deepEqual(why("cos(x)", ""), []);
  assert.deepEqual(why("sinh(x)+log10(x)", ""), [], "sinh and log10 are functions too");
  assert.deepEqual(why("(2,5]", ""), [], "an interval isn't unbalanced");
  assert.deepEqual(why("0.3333", ""), []);
  assert.deepEqual(why("0.33", "", "part"), ["partial"]);
  assert.ok(advice({ entered: "", message: "x", result: "bad" }).length === 1, "an empty blank says only that");
  assert.ok(advice({ entered: "x^1/2 + sin x + 1,000 + e^2x", message: "", result: "bad" }).length <= 3);
});

test("power notes quote the answer and don't repeat each other", () => {
  assert.deepEqual(why("e^-2x", ""), ["expProduct"]);
  assert.match(advice({ entered: "e^-2x", result: "bad" })[0].t, /reads e\^-2x as \(e\^-2\)·x.*e\^\(-2x\)/);
  assert.match(advice({ entered: "e^-xy", result: "bad" })[0].t, /e\^\(-xy\), not e\^-xy/);
  assert.deepEqual(why("e^-x", ""), [], "one piece needs no parentheses");
  assert.doesNotMatch(advice({ entered: "1/2x", result: "bad" })[0].t, /…/);
});

test("funcParens names the input", () => {
  assert.match(advice({ entered: "sinx", result: "bad" })[0].t, /sin\(x\)/);
  assert.match(advice({ entered: "3*sqrt2", result: "bad" })[0].t, /sqrt\(2\)/);
});

// ── drafts: what you typed in the blanks, kept through a refresh or a page swap until WeBWorK has it ──
const D = globalThis.BW.drafts, DAY = u.DAY, NOW = Date.UTC(2026, 10, 2, 20);
const plan = (d, page) => D.plan(d, Object.assign({ view: true, kept: false, attempts: 2 }, page), NOW);
const draft = (v, o) => Object.assign({ at: NOW - 60e3, n: 2, b: { A1: "", A2: "yes" }, v }, o);

test("a plain view puts back the blanks you changed", () => {
  const r = plan(draft({ A1: "2x+1", A2: "yes" }), { sent: { A1: "", A2: "yes" } });
  assert.deepEqual(r, { fill: { A1: "2x+1" }, base: { A1: "", A2: "yes" }, drop: false });
  assert.deepEqual(plan(null, { sent: { A1: "" } }), { fill: {}, base: { A1: "" }, drop: false }, "nothing kept, nothing to do");
  assert.deepEqual(plan(null, { view: false, sent: { A1: "x" } }).base, null, "a preview doesn't say what WeBWorK fills by itself");
});

test("a preview or check puts back what you typed after it, before a refresh sent it again", () => {
  const r = plan(draft({ A1: "2x+2", A2: "yes" }), { view: false, sent: { A1: "2x+1", A2: "no" } });
  assert.deepEqual(r.fill, { A1: "2x+2", A2: "yes" });
  assert.deepEqual(r.base, { A1: "", A2: "yes" }, "keeps what WeBWorK fills by itself from the plain view");
});

test("a draft is dropped once WeBWorK has something newer", () => {
  assert.equal(plan(draft({ A1: "x" }), { attempts: 3, sent: { A1: "" } }).drop, true, "an attempt recorded since");
  assert.equal(plan(draft({ A1: "x" }), { sent: { A1: "y" } }).drop, true, "WeBWorK fills something else now");
  assert.equal(plan(draft({ A1: "x" }), { sent: { A1: "x" } }).drop, false, "WeBWorK fills the draft itself");
  assert.equal(plan(draft({ A1: "x" }, { at: NOW - 61 * DAY }), { sent: { A1: "" } }).drop, true, "too old");
  assert.equal(plan(draft({ Z9: "x" }), { sent: { A1: "" } }).drop, true, "other blanks");
  const kept = plan(draft({ A1: "x" }), { view: false, kept: true, attempts: 3, sent: { A1: "x" } });
  assert.deepEqual(kept, { fill: {}, base: { A1: "x" }, drop: true }, "a recorded submit: WeBWorK has it");
  assert.equal(plan(draft({ A1: "x" }, { n: null }), { attempts: null, sent: { A1: "" } }).drop, false, "no attempt count to go on");
});

test("a MathQuill box's LaTeX field follows its answer and never makes a draft stale", () => {
  const tied = { L4: "A4" }, d = draft({ A4: "6x", L4: "6x" }, { b: { A4: "", L4: "" } });
  assert.equal(plan(d, { tied, sent: { A4: "", L4: "5x" } }).drop, false, "a LaTeX field the browser rewrote");
  assert.equal(plan(d, { sent: { A4: "", L4: "5x" } }).drop, true, "the same field, untied, would drop it");
  assert.deepEqual(plan(d, { tied, sent: { A4: "", L4: "6x" } }).fill, { A4: "6x", L4: "6x" }, "goes back with its answer");
  assert.deepEqual(plan(d, { tied, sent: { A4: "6x", L4: "" } }).fill, { L4: "6x" }, "or on its own when it differs");
  assert.equal(plan(draft({ L4: "6x" }), { tied, sent: { A4: "", L4: "" } }).drop, true, "a LaTeX field alone isn't a draft");
});

test("drafts keep the newest 200 and forget old ones", () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  try {
    D.put("old", { at: NOW - 70 * DAY, v: {} }, NOW - 70 * DAY);
    for (let i = 0; i < 205; i++) D.put("p" + i, { at: NOW - (205 - i) * 1000, v: { A1: String(i) } }, NOW);
    const all = D.all();
    assert.equal(Object.keys(all).length, 200);
    assert.equal(all.old, undefined);
    assert.equal(all.p4, undefined);
    assert.equal(D.get("p204").v.A1, "204");
    D.put("p204", null, NOW);
    assert.equal(D.get("p204"), null);
    D.clear();
    assert.equal(mem.size, 0);
  } finally { delete globalThis.localStorage; }
});
