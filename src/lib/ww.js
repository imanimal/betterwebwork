/* BetterWebWork: reading WeBWorK. Everything here only reads the page WeBWorK sent; nothing writes to WeBWorK.

   Written against WeBWorK 2.18 (UCSB: webwork.math.ucsb.edu, theme math4, Bootstrap 5.2) and its templates:
   system.html.ep (masthead, #site-navigation, #breadcrumb-navigation, #content), Problem.html.ep (#output_summary,
   #problemMainForm, #problem_body.problem-content, .submit-buttons-container, #score_summary), the attempts table
   (HTML/AttemptsTable.pm: table.attemptResults, a[data-answer-id], .answer-preview, .FeedbackMessage, .parsehilight),
   ProblemSet (set_status's .alert-info, table.problem_set_table) and ProblemSets (the set list). WeBWorK 2.19 swapped
   the attempts table for a feedback button beside each answer (.ww-feedback-btn, its popover in data-bs-content);
   results() reads both. Sentences (score summary, set status) are read in English; anything that doesn't match is
   left on the page as WeBWorK wrote it. The text parsers (route, code, quarter, date, setStatus, setAlert, score) are
   pure and tested in tests/core.test.js; the rest read the DOM. */
(function (g) {
  const BW = (g.BW = g.BW || {});
  const txt = (el) => (el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "");

  // ── addresses ──
  // second path segments that are pages of a course, not sets
  const PAGES = new Set(["options", "grades", "hardcopy", "instructor", "achievements", "feedback", "logout", "show_me_another", "equation_display", "render_rpc",
    "answer_log", "send_mail", "test_proctor", "achievements_leaderboard"]);
  const QUIZ = new Set(["quiz_mode", "proctored_quiz_mode"]);
  const NOT_COURSE = new Set(["admin", "ltiadvantage", "ltiadvanced", "lti", "html2xml", "render_rpc", "instructorXMLHandler", "images", "htdocs", "login", "logout", "course_admin"]);

  /** What a WeBWorK address is: { base, host, course, set, problem, kind: courses | course | set | problem | quiz | page, page, key } */
  function route(u) {
    let url; try { url = new URL(u); } catch (e) { return null; }
    const segs = url.pathname.split("/").filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch (e) { return s; } });
    const at = segs.indexOf("webwork2");
    if (at < 0) return null;
    const base = `${url.origin}/${segs.slice(0, at + 1).join("/")}`, rest = segs.slice(at + 1);
    const r = { base, host: url.host, course: null, set: null, problem: null, kind: "courses", page: null, key: url.host };
    if (!rest.length) return r;
    if (NOT_COURSE.has(rest[0])) return Object.assign(r, { kind: "page", page: rest[0] });
    r.course = rest[0]; r.key = `${url.host}/${r.course}`; r.kind = "course";
    if (rest.length === 1) return r;
    if (PAGES.has(rest[1])) return Object.assign(r, { kind: "page", page: rest[1] });
    if (QUIZ.has(rest[1])) return Object.assign(r, { kind: "quiz", page: rest[1], set: rest[2] || null, key: rest[2] ? `${r.key}/${rest[2]}` : r.key });
    r.set = rest[1]; r.key = `${r.key}/${r.set}`; r.kind = "set";
    if (rest.length >= 3 && /^\d+$/.test(rest[2])) { r.problem = rest[2]; r.key = `${r.key}/${r.problem}`; r.kind = "problem"; }
    return r;
  }

  /** "math34A-01-f26-blee" → "MATH 34A" (Collegiapp's course_code) */
  function code(id) {
    const first = String(id || "").split(/[-_\s]/)[0], d = first.search(/\d/);
    return (d > 0 && /^[a-z]+$/i.test(first.slice(0, d)) ? `${first.slice(0, d)} ${first.slice(d)}` : first).toUpperCase();
  }
  /** "math34A-01-f26-blee" → { label: "Fall 2026", sort: 2026.9 }; null when the id doesn't name a quarter */
  function quarter(id) {
    const m = String(id || "").toLowerCase().match(/(?:^|[-_\s])(f|fa|fall|w|wi|win|s|sp|spr|m\d?|su|sum|sims)[-_]?(\d{2})(?=$|[-_\s])/);
    if (!m) return null;
    const k = m[1][0], y = 2000 + +m[2];
    const [label, at] = { w: ["Winter", 0.1], s: m[1] === "sims" || m[1].startsWith("su") ? ["Summer", 0.6] : ["Spring", 0.3], m: ["Summer", 0.6], f: ["Fall", 0.9] }[k];
    return { label: `${label} ${y}`, sort: y + at };
  }

  // ── dates as WeBWorK prints them ("11/05/2026 at 11:59pm PST", "November 5, 2026 at 11:59:00 PM PST") ──
  const ZONES = { UTC: 0, GMT: 0, Z: 0, PST: -8, AKDT: -8, PDT: -7, MST: -7, MDT: -6, CST: -6, CDT: -5, EST: -5, EDT: -4, AKST: -9, HST: -10 };
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  // California's offset at a local time: daylight from the second Sunday of March to the first of November, 2 a.m.
  function pacific(y, mo, d, h) {
    const sunday = (m, n) => { const f = new Date(Date.UTC(y, m, 1)).getUTCDay(); return 1 + ((7 - f) % 7) + 7 * (n - 1); };
    const t = Date.UTC(y, mo, d, h), from = Date.UTC(y, 2, sunday(2, 2), 2), to = Date.UTC(y, 10, sunday(10, 1), 2);
    return t >= from && t < to ? -7 : -8;
  }
  const DATE_RE = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+at)?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([aApP][mM])?(?:\s+([A-Z]{1,4}|[+-]\d{2}:?\d{2})\b)?|([A-Z][a-z]{2,8})\.? (\d{1,2}), (\d{4})(?:,| at)\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)(?:\s+([A-Z]{1,4}|[+-]\d{2}:?\d{2})\b)?/;
  /** → ms, or null. No zone reads as Pacific. */
  function date(s) {
    const m = String(s || "").match(DATE_RE); if (!m) return null;
    let y, mo, d, h, mi, ap, z;
    if (m[1]) [y, mo, d, h, mi, ap, z] = [+m[3], +m[1] - 1, +m[2], +m[4], +m[5], m[6], m[7]];
    else { mo = MONTHS.indexOf(m[8].slice(0, 3).toLowerCase()); if (mo < 0) return null; [y, d, h, mi, ap, z] = [+m[10], +m[9], +m[11], +m[12], m[13], m[14]]; }
    if (ap) { ap = ap.toLowerCase(); if (h === 12) h = 0; if (ap === "pm") h += 12; }
    let off;
    if (z && ZONES[z.toUpperCase()] != null) off = ZONES[z.toUpperCase()] * 60;
    else if (z && /^[+-]/.test(z)) { const dd = z.replace(":", ""); off = (dd[0] === "-" ? -1 : 1) * (+dd.slice(1, 3) * 60 + +dd.slice(3, 5)); }
    else off = pacific(y, mo, d, h) * 60;
    return Date.UTC(y, mo, d, h, mi) - off * 60e3;
  }

  /** A set-list row's status: "Open, closes D." · "Open, due D. Afterward reduced credit can be earned until D2." ·
      "Due date D has passed. Reduced credit can still be earned until D2." · "Will open on D." · "Closed, answers on D." */
  function setStatus(status) {
    const set = { opens: null, due: null, lateDue: null, closed: false, answers: null };
    for (const raw of String(status || "").split(/\.\s+|\.$/)) {
      const s = raw.trim(), l = s.toLowerCase();
      if (l.startsWith("will open on")) set.opens = date(s);
      else if (/^open, (closes|due)\b/.test(l) || l.startsWith("due date")) set.due = date(s);
      else if (l.includes("reduced credit") && l.includes(" until ")) set.lateDue = date(s.slice(l.lastIndexOf(" until ")));
      else if (l.startsWith("closed")) { set.closed = true; if (l.includes("answers on")) set.answers = date(s); }
    }
    return set;
  }

  /** A set page's status box (Base/set_status.html.ep): "Set closes on D." · "Set is due on D." · "Set opens on D." ·
      "Set is closed." plus the reduced scoring sentence. */
  function setAlert(text) {
    const s = String(text || ""), l = s.toLowerCase(), out = { opens: null, due: null, lateDue: null, closed: false, reduced: null, inReduced: false };
    const at = (re) => { const m = s.match(re); return m ? date(s.slice(m.index + m[0].length, m.index + m[0].length + 60)) : null; };
    out.opens = at(/set opens on\s*/i);
    out.due = at(/set (?:closes|is due) on\s*/i);
    out.closed = /set is closed/i.test(s);
    const pct = s.match(/counts for (\d+)\s*%/i);
    if (pct) out.reduced = +pct[1];
    if (/enters a reduced scoring period until it closes on/i.test(l)) out.lateDue = at(/until it closes on\s*/i);
    out.inReduced = /is in its reduced scoring period/i.test(l);
    return out;
  }

  /** The problem page's score lines (Problem.pm output_score_summary). Unknown numbers stay null. */
  function score(text) {
    const s = String(text || "").replace(/\s+/g, " "), num = (re) => { const m = s.match(re); return m ? +m[1] : null; };
    const out = {
      attempts: num(/attempted this problem (\d+) times?/i),
      remaining: /unlimited attempts remaining/i.test(s) ? Infinity : num(/You have (\d+) attempts? remaining/i),
      thisScore: num(/score of (\d+)\s*% for this attempt/i),
      overall: num(/overall recorded score is (\d+)\s*%/i),
      recorded: /score was recorded/i.test(s) ? true : /not recorded/i.test(s) ? false : null,
      closed: /homework set is closed/i.test(s),
      notOpen: /not yet open/i.test(s),
      noCount: /will not count towards your grade/i.test(s),
    };
    out.known = out.attempts != null || out.remaining != null || out.overall != null;
    return out;
  }

  // ── DOM readers ──

  /** The answer names in page order, from PG's hidden previous_<name> fields (one per answer rule). */
  function answerIds(root) {
    const seen = new Set(), out = [];
    for (const i of root.querySelectorAll('input[type="hidden"][name^="previous_"]')) { const n = i.name.slice(9); if (n && !seen.has(n)) { seen.add(n); out.push(n); } }
    if (!out.length) for (const i of root.querySelectorAll(".problem-content input[name], .problem-content select[name], .problem-content textarea[name]")) {
      if (i.type === "hidden" || seen.has(i.name)) continue; seen.add(i.name); out.push(i.name);
    }
    return out;
  }

  /** The visible element for an answer: its text field, select or MathQuill box (or the first radio of its group). */
  function answerEl(root, id) {
    const byId = root.querySelector(`#${CSS.escape(id)}`);
    if (byId && byId.type !== "hidden") {
      const mq = byId.parentElement && byId.parentElement.querySelector(`.mq-editable-field[data-answer-id="${CSS.escape(id)}"]`);
      if (mq) return mq;
      if (getComputedStyle(byId).display === "none") { const next = byId.nextElementSibling; if (next && next.matches(".mq-editable-field, span.mq-editable-field")) return next; }
      return byId;
    }
    const named = root.querySelectorAll(`[name="${CSS.escape(id)}"]:not([type="hidden"])`);
    return named.length ? named[named.length - 1] : byId;
  }

  const RESULT_CLASS = (td) => (td.classList.contains("ResultsWithoutError") ? "ok" : td.classList.contains("ResultsWithError") ? "bad" : null);
  const pctOf = (s) => { const m = String(s || "").match(/(\d+(?:\.\d+)?)\s*%/); return m ? +m[1] : null; };

  /** Text with WeBWorK's syntax-error highlight kept: [{ t, hi }] runs. */
  function runs(el) {
    const out = [];
    for (const n of el.childNodes) {
      if (n.nodeType === 3) out.push({ t: n.textContent, hi: false });
      else if (n.nodeType === 1) out.push({ t: n.textContent, hi: n.classList.contains("parsehilight") });
    }
    return out.filter((r) => r.t !== "");
  }

  /**
   * This page's answer results: { v: "2.18" | "2.19" | null, kind: submit | check | preview | null, parts }.
   * A part: { id, n, entered, runs, previewEl | previewHtml, result: ok | bad | part | essay | null, pct, message,
   * messageEl | messageHtml, correctEl | correctHtml, correctText }. Elements are WeBWorK's own (the app moves them).
   */
  function results(doc) {
    const out = { v: null, kind: null, parts: [] };
    const sum = doc.getElementById("output_summary");
    const banner = sum ? [...sum.querySelectorAll(".ResultsWithError")].map(txt).join(" ") : "";
    if (/PREVIEW ONLY/i.test(banner)) out.kind = "preview";
    else if (/ONLY CHECKED/i.test(banner)) out.kind = "check";
    out.rejected = /NOT ACCEPTED/i.test(banner);
    const form = doc.getElementById("problemMainForm") || doc;
    const ids = answerIds(form);

    const table = doc.querySelector("table.attemptResults");
    if (table) {
      out.v = "2.18";
      const rows = [...table.rows];
      const head = rows.length && rows[0].querySelector("th") ? [...rows.shift().cells].map((c) => txt(c).toLowerCase()) : [];
      const ROLE = { "#": "num", entered: "entered", "answer preview": "preview", result: "result", "correct answer": "correct", message: "message" };
      let roles = head.map((h) => ROLE[h] || null);
      rows.forEach((tr, i) => {
        const cells = [...tr.cells];
        let rs = roles;
        if (rs.length !== cells.length || rs.some((r) => !r)) {
          // headers in another language: tell the columns apart by what's in them (AttemptsTable.pm's formatAnswerRow)
          rs = cells.map(() => null);
          const res = cells.findIndex((c) => c.querySelector("a[data-answer-id]"));
          if (res >= 0) rs[res] = "result";
          rs[cells.length - 1] = rs[cells.length - 1] || "message";
          const prevs = cells.map((c, k) => (c.querySelector("div.answer-preview") ? k : -1)).filter((k) => k >= 0);
          if (prevs.length) { rs[prevs[0]] = "preview"; if (prevs[1] != null) rs[prevs[1]] = "correct"; }
          const first = rs.indexOf(null); if (first >= 0 && first < (prevs[0] ?? cells.length)) rs[first] = "entered";
        }
        const cell = (role) => { const k = rs.indexOf(role); return k >= 0 ? cells[k] : null; };
        const resTd = cell("result"), link = resTd && resTd.querySelector("a[data-answer-id]");
        const p = { id: (link && link.dataset.answerId) || ids[i] || `part${i + 1}`, n: i + 1, result: null, pct: null };
        if (resTd) {
          const t = txt(resTd);
          p.result = RESULT_CLASS(resTd) || (pctOf(t) != null ? "part" : /ungraded/i.test(t) ? "essay" : null);
          p.pct = p.result === "ok" ? 100 : p.result === "bad" ? 0 : pctOf(t);
        }
        const ent = cell("entered"), pv = cell("preview"), cor = cell("correct"), msg = cell("message");
        const pvDiv = pv && pv.querySelector("div.answer-preview");
        if (ent) { p.entered = txt(ent); p.runs = runs(ent); }
        else if (pvDiv) p.entered = pvDiv.getAttribute("data-bs-content") || "";
        else p.entered = "";
        if (p.entered === " ") p.entered = "";
        if (pvDiv && txt(pvDiv) !== "" || (pvDiv && pvDiv.querySelector("script, mjx-container, img"))) p.previewEl = pvDiv;
        const corDiv = cor && cor.querySelector("div.answer-preview");
        if (corDiv) { p.correctEl = corDiv; p.correctText = corDiv.getAttribute("data-bs-content") || txt(corDiv); }
        if (msg && txt(msg)) { p.message = txt(msg); p.messageEl = msg; }
        out.parts.push(p);
      });
    } else {
      const btns = doc.querySelectorAll(".ww-feedback-btn");
      if (btns.length) {
        out.v = "2.19";
        const P = new DOMParser();
        [...btns].forEach((b, i) => {
          const c = b.className, label = b.getAttribute("aria-label") || "";
          const p = { id: b.dataset.answerLabel || ids[i] || `part${i + 1}`, n: i + 1, pct: pctOf(label), btn: b };
          p.result = /btn-success/.test(c) ? "ok" : /btn-danger/.test(c) ? "bad" : /btn-warning/.test(c) ? "part" : null;
          if (p.result === "ok") p.pct = 100; else if (p.result === "bad") p.pct = 0;
          const d = P.parseFromString(`<body>${b.getAttribute("data-bs-content") || ""}</body>`, "text/html");
          const msg = d.querySelector(".feedback-message");
          if (msg) { p.message = txt(msg); p.messageHtml = msg.innerHTML; }
          const rest = [...d.querySelectorAll(".card-body")].filter((x) => x !== msg);
          for (const body of rest) {
            const h = txt(body.previousElementSibling && body.previousElementSibling.matches(".card-header") ? body.previousElementSibling : null).toLowerCase();
            const role = /entered/.test(h) ? "entered" : /preview/.test(h) ? "preview" : /correct/.test(h) ? "correct"
              : body.querySelector("script, mjx-container, .reveal-correct-btn") ? (p.previewHtml == null ? "preview" : "correct") : p.entered == null ? "entered" : "preview";
            if (role === "entered") p.entered = txt(body);
            else if (role === "preview") p.previewHtml = body.innerHTML;
            else { const rv = body.querySelector(".reveal-correct-btn"); if (rv) rv.remove(); body.querySelectorAll(".d-none").forEach((x) => x.classList.remove("d-none")); p.correctHtml = body.innerHTML; p.correctText = txt(body); }
          }
          if (p.entered == null) { const el = answerEl(form, p.id); p.entered = el && "value" in el ? el.value : ""; }
          out.parts.push(p);
        });
        if (!out.kind) out.kind = out.parts.every((p) => p.result == null) ? "preview" : null;
      }
    }
    if (out.parts.length && !out.kind) out.kind = out.parts.some((p) => p.result) ? "submit" : "preview";
    return out;
  }

  /** Previous problem, problem list, next problem: the three links Problem.pm's nav() writes, in that order. */
  function nav(doc) {
    const box = doc.querySelector(".sticky-nav > .submit-buttons-container, .sticky-nav .submit-buttons-container:not(.user-nav)");
    if (!box) return null;
    const items = [...box.children].filter((x) => x.matches("a, span"));
    if (items.length < 3) return null;
    const href = (el) => (el.tagName === "A" && !el.classList.contains("disabled") ? el.getAttribute("href") : null);
    return { prev: href(items[0]), list: href(items[1]), next: href(items[2]), labels: items.map(txt) };
  }

  /** The set's problems from the problem page's side list (Problem.pm siblings): [{ n, label, href, status, current }]. */
  function siblings(doc) {
    const out = [];
    for (const a of doc.querySelectorAll("#site-navigation .problem-list .nav-link, #siblings .problem-list .nav-link")) {
      const t = txt(a), m = t.match(/(\d+(?:\.\d+)*)/);
      out.push({
        n: m ? m[1] : String(out.length + 1),
        label: t.replace(/\s*[✓✗…]\s*$/, ""),
        href: a.getAttribute("href"),
        status: /✓/.test(t) ? "ok" : /✗/.test(t) ? "bad" : /…/.test(t) ? "part" : "none",
        current: a.classList.contains("active"),
        locked: a.classList.contains("disabled-problem"),
        depth: (a.className.match(/nested-problem-(\d)/) || [0, 0])[1] | 0,
      });
    }
    return out;
  }

  /** A set page's problem table: [{ n, href, attempts, remaining, worth, status, locked, depth }]. */
  function problemTable(doc) {
    const table = doc.querySelector("#content table.problem_set_table");
    if (!table || table.querySelector("input[type=checkbox]")) return null;
    const out = [];
    for (const tr of table.querySelectorAll("tbody tr")) {
      const td = tr.querySelectorAll("td"); if (td.length < 5) continue;
      const a = td[0].querySelector("a[href]"), t = txt(td[0]), m = t.match(/(\d+(?:\.\d+)*)/);
      const rem = txt(td[2]), n = parseInt(rem, 10);
      out.push({
        n: m ? m[1] : String(out.length + 1), label: t, href: a ? a.getAttribute("href") : null,
        attempts: parseInt(txt(td[1]), 10) || 0, remaining: Number.isFinite(n) ? n : Infinity,
        worth: parseFloat(txt(td[3])), status: pctOf(txt(td[4])) ?? 0, locked: !a,
        depth: ((td[0].querySelector("[class*=nested-problem-]") || { className: "" }).className.match(/nested-problem-(\d)/) || [0, 0])[1] | 0,
      });
    }
    return out.length ? out : null;
  }

  /** A course home's set list: [{ id, name, href, status, timed, hardcopy, opens, due, lateDue, closed, answers }]. */
  function setList(doc, base) {
    const table = doc.querySelector("#content table.problem_set_table");
    if (!table || table.querySelector("input[type=checkbox]")) return null;
    const out = [];
    for (const tr of table.querySelectorAll("tbody tr")) {
      const td = tr.querySelectorAll("td"); if (td.length < 2) continue;
      const a = td[0].querySelector("a[href]"), name = txt(td[0]); if (!name) continue;
      const href = a ? a.getAttribute("href") : null, r = href ? route(new URL(href, base).href) : null;
      const hc = td[2] && td[2].querySelector("a[href]");
      const tip = a && (a.getAttribute("data-bs-title") || a.getAttribute("title"));
      out.push(Object.assign({ id: (r && r.set) || name.replace(/ /g, "_"), name, href, status: txt(td[1]), note: tip || "",
        timed: !!td[0].querySelector(".fa-clock"), hardcopy: hc ? hc.getAttribute("href") : null }, setStatus(txt(td[1]))));
    }
    return out;
  }

  /** "Logged in as Alex K." → { name, logout, acting } from the masthead. */
  function who(doc) {
    const box = doc.querySelector(".masthead .login-status");
    if (!box) return null;
    const t = txt(box), m = t.match(/Logged in as (.+?)\.(?:\s|$)/), act = t.match(/Acting as (.+?)\.(?:\s|$)/);
    const out = doc.querySelector('.masthead .login-status a[href*="logout"]'), stop = act && [...box.querySelectorAll("a")].find((a) => !/logout/.test(a.getAttribute("href") || ""));
    if (!m && !out) return { name: null, text: t };
    return { name: m ? m[1] : null, logout: out ? out.getAttribute("href") : null, acting: act ? act[1] : null, stopActing: stop ? stop.getAttribute("href") : null, text: t };
  }

  /** The breadcrumb trail: [{ text, href }]. */
  function crumbs(doc) {
    return [...doc.querySelectorAll("#breadcrumb-navigation .breadcrumb .breadcrumb-item")].map((li) => {
      const a = li.querySelector("a[href]");
      return { text: txt(li), href: a ? a.getAttribute("href") : null };
    });
  }

  /** Two answers that are the same as typed, give or take spaces. */
  const same = (a, b) => String(a || "").replace(/\s+/g, "") === String(b || "").replace(/\s+/g, "");

  BW.ww = { route, code, quarter, date, setStatus, setAlert, score, answerIds, answerEl, results, nav, siblings, problemTable, setList, who, crumbs, same, txt };
})(globalThis);
