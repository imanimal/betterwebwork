/* BetterWebWork: the WeBWorK page, rebuilt in place at document_idle. boot.js has already painted the look from the
   page's cached copy; this checks it against the saved settings (repainting if it was stale), adds the bar, then
   enhances the page by kind (html[data-bw-page]):
     problem  a header with the points and previous/next keys, the set's problems as a rail, the numbers (score,
              attempts, attempts left, due), the results (what you typed, how WeBWorK read it, its message, notes on
              common slips, the correct answer when shown) with a mark beside each blank, the answer keys with
              shortcuts and a last-attempt check, your local attempt log, and what you've typed, kept through a
              refresh or a page swap until you submit it
     set      the dates in words, progress, the problems as a list, and a key to the next unfinished one
     course   the sets grouped: open by due date, not open yet, closed
     courses  a filter, the courses you opened first, then the rest by quarter
     login    a plain card
   WeBWorK's nodes are hidden (.bw-hidden) or moved, never deleted, and every form posts exactly as WeBWorK wrote it.
   Everything we add carries data-bw-x (see webwork.css). Only the top frame gets the bar and the page changes. */
(function () {
  const BW = globalThis.BW, api = BW.api, u = BW.u, ww = BW.ww, T = BW.themes, K = BW.kit, esc = u.esc;
  const root = document.documentElement;
  if (!(document.contentType || "").includes("html") || !document.body) return;
  const R = ww.route(location.href);
  if (!R) return;
  const TOP = window.top === window;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const ic = (n, c) => BW.ic(n, c);
  const hide = (el) => el && el.classList.add("bw-hidden");
  const show = (el) => el && el.classList.remove("bw-hidden");
  const mk = (html) => { const e = K.el(html); e.setAttribute("data-bw-x", ""); return e; };
  const now = () => Date.now();
  const setLabel = (id) => String(id || "").replace(/_/g, " ");
  // what a mark beside an answer goes after: a choice's label, or MathView's wrapper so it lands outside the box and its key
  const beside = (el) => (el.type === "radio" || el.type === "checkbox" ? el.closest("label") : el.closest(".mv-container.input-group")) || el;
  // changes to WeBWorK's own nodes, each with its undo: off() puts the page back as WeBWorK drew it, refresh() redoes them
  const swaps = [];
  let swapped = true;
  const swap = (on, off) => { swaps.push({ on, off }); on(); };
  const unswap = () => { if (swapped) { swapped = false; for (const s of swaps.slice().reverse()) s.off(); } };
  const reswap = () => { if (!swapped) { swapped = true; for (const s of swaps) s.on(); } };
  const carry = (nodes, into) => {
    let from = [];
    swap(() => { from = nodes.map((n) => [n.parentNode, n.nextSibling]); into.append(...nodes); },
      () => { for (let i = nodes.length - 1; i >= 0; i--) { const [p, nx] = from[i]; if (p) p.insertBefore(nodes[i], nx && nx.parentNode === p ? nx : null); } });
  };
  const skipTo = () => { const a = $('a[href="#page-title"]'); if (a) swap(() => a.setAttribute("href", "#bw-title"), () => a.setAttribute("href", "#page-title")); };

  const ICON = { ok: "check", bad: "close", part: "partial", none: "ring", essay: "note" };
  const WORD = { ok: "Correct", bad: "Incorrect", essay: "Graded by your instructor" };

  let S = null, DATA = null, PAGE = R.kind, enhanced = false, railOn = false, drawer = null;
  const all = () => T.BUILTIN.concat(DATA.themes);

  // ── look ──
  function paint() {
    const was = root.dataset.bwLook;
    T.look(S, all(), root);
    const d = root.dataset;
    d.bwPage = PAGE; d.bwTips = S.tips ? "on" : "off"; d.bwHist = S.history ? "on" : "off";
    if (enhanced) d.bwReady = "";
    if (railOn) d.bwRail = "";
    d.bwOn = "";
    if (!document.getElementById("bw-fonts")) {
      const st = document.createElement("style"); st.id = "bw-fonts";
      st.textContent = BW.fontCss((f) => api.runtime.getURL("fonts/" + f));
      (document.head || root).append(st);
    }
    if (was && was !== d.bwLook) BW.reicon(document);
    cache();
  }
  /** The page's own copy of the look, for boot.js on the next load. */
  function cache() {
    const s = {};
    for (const k of ["theme", "nightTheme", "night", "nightFrom", "nightTo", "type", "width", "img", "motion", "zoom", "sticky"]) s[k] = S[k];
    BW.boot.write({ off: !!S.off[R.host], s, themes: DATA.themes.filter((t) => t.id === S.theme || t.id === S.nightTheme) });
  }
  function off() { if (P.ui) destroyResults(); unswap(); if (root.hasAttribute("data-bw-on")) T.unlook(root); root.style.removeProperty("--bw-fit"); cache(); }

  async function refresh() {
    DATA = await BW.store.all(); S = DATA.settings; u.setClock24(S.clock24);
    if (!S.drafts) BW.drafts.clear();
    if (S.off[R.host]) { off(); return; }
    if (BW.previewing) return;
    paint();
    if (!enhanced) enhance();
    else reswap();
    if (enhanced && P.form) { if (S.feedback && !P.ui) buildResults(); else if (!S.feedback && P.ui) destroyResults(); }
  }

  // ── the page ──
  function enhance() {
    enhanced = true;
    PAGE = $("#login_form") ? "login" : R.kind;
    root.dataset.bwPage = PAGE;
    if (TOP) {
      try {
        // WeBWorK's placeholder info boxes ("This file is at htdocs/site_info.txt…") say nothing to a student
        for (const b of $$(".info-box")) if (/This\s+file\s+is\s+at\s+\S*info\.txt/i.test(b.textContent)) hide(b.closest("#info-panel-right") || b);
        if ($("#content")) bar();
        if (PAGE === "problem") problem();
        else if (PAGE === "set") setPage();
        else if (PAGE === "course") course();
        else if (PAGE === "courses") courses();
        fitMaths();
      } catch (e) { console.error("BetterWebWork:", e); }
      keys();
    }
    root.dataset.bwReady = "";
  }

  // ── the bar: menu, where you are, who you are, settings, log out ──
  function bar() {
    const who = ww.who(document) || {}, cr = ww.crumbs(document).slice(1), nav = $("#site-navigation");
    const label = (c, i) => (i === 0 && R.course && c.text === R.course ? ww.code(c.text) : /^\d+(\.\d+)*$/.test(c.text) ? `Problem ${c.text}` : setLabel(c.text));
    const sep = `<span class="bw-sep" aria-hidden="true">${ic("chevr", "sm")}</span>`;
    const crumbs = cr.map((c, i) => {
      const last = i === cr.length - 1, l = esc(label(c, i));
      return (i ? sep : "") + (last || !c.href ? `<span class="bw-cur"${last ? ' aria-current="page"' : ""} title="${esc(c.text)}">${l}</span>` : `<a href="${esc(c.href)}" title="${esc(c.text)}">${l}</a>`);
    }).join("");
    const b = mk(`<header class="bw-topbar bw-ui">
      ${nav ? K.key({ icon: "bars", title: "Menu", cls: "ghost", act: "menu", attrs: 'aria-expanded="false" aria-controls="site-navigation"' }) : ""}
      <a class="bw-brand" href="${esc(R.base)}/" title="All courses"><span class="bw-logo" aria-hidden="true">W</span><span class="bw-bn">WeBWorK</span></a>
      <nav class="bw-crumbs" aria-label="Where you are">${crumbs}</nav>
      ${who.acting ? `<span class="bw-tag soon" title="${esc(who.text)}">Acting as ${esc(who.acting)}</span>${who.stopActing ? K.key({ label: "Stop", cls: "ghost sm", href: who.stopActing }) : ""}` : ""}
      ${who.name ? `<span class="bw-who" title="${esc(who.text)}">${esc(who.name)}</span>` : ""}
      ${K.key({ icon: "gear", title: "BetterWebWork settings", cls: "ghost", act: "settings" })}
      ${who.logout ? K.key({ icon: "logout", title: "Log out", cls: "ghost", href: who.logout }) : ""}
    </header>`);
    document.body.prepend(b);
  }

  function menu(open) {
    const nav = $("#site-navigation"); if (!nav) return;
    const on = open == null ? !root.classList.contains("bw-nav-open") : open;
    root.classList.toggle("bw-nav-open", on);
    if (!$(".bw-navhead")) document.body.append(mk(`<div class="bw-navhead bw-ui"><span>Menu</span>${K.key({ icon: "close", title: "Close the menu", cls: "ghost", act: "menu-close" })}</div>`));
    const key = $('.bw-topbar [data-act="menu"]'), scrim = $(".bw-navscrim");
    if (key) key.setAttribute("aria-expanded", String(on));
    if (on) {
      if (!scrim) { const s = mk('<div class="bw-scrim bw-navscrim bw-ui"></div>'); s.addEventListener("click", () => menu(false)); document.body.append(s); }
      const f = $("a[href], button", nav); if (f) f.focus();
    } else { if (scrim) scrim.remove(); if (key) key.focus(); }
  }

  // ── wide maths: the column grows to fit it ──
  /* MathJax 3 doesn't break lines, so an equation (or a table of them) can be wider than the reading column. Rather
     than scroll it, the column widens by what the widest one needs (--bw-fit in webwork.css), up to the window; only
     past that does the sheet or a results row scroll. It's measured from the column at its set width every time, so
     a resize, MathJax's typesetting or a new text size gives one answer and the observer settles at once. */
  let fitting = 0;
  function fit() {
    fitting = 0;
    root.style.removeProperty("--bw-fit");
    if (!root.hasAttribute("data-bw-on")) return;
    let extra = 0;
    for (const s of $$(".problem-content")) {
      const r = s.getBoundingClientRect(), edge = r.left + s.clientLeft + s.clientWidth - parseFloat(getComputedStyle(s).paddingRight);
      for (const el of $$("mjx-container, table, pre, img, canvas", s)) {
        if (el.closest(".popover, .dropdown-menu")) continue; // MathView's editor floats over the page
        const e = el.getBoundingClientRect();
        extra = Math.max(extra, e.left + Math.max(e.width, el.scrollWidth) + s.scrollLeft - edge);
      }
    }
    for (const v of $$(".bw-pv")) extra = Math.max(extra, v.scrollWidth - v.clientWidth);
    const col = $(".problem-content, .bw-results"), row = col && col.closest("#content > *");
    if (extra > 1 && row) root.style.setProperty("--bw-fit", `${Math.ceil(row.getBoundingClientRect().width + extra)}px`);
  }
  function fitMaths() {
    const c = $("#content");
    if (!c || !$(".problem-content") || typeof ResizeObserver !== "function") return;
    new ResizeObserver(() => { if (!fitting) fitting = requestAnimationFrame(fit); }).observe(c);
  }

  // ── the problem's text: blanks stay with their labels, parts get room ──
  /* PG writes a label and its blank as two inline things ("\(y(x) =\) [blank]"), so a line can end on the label and
     leave the blank alone on the next; and old-style problems start part (2) after a bare <br>, flush against part (1).
     Once MathJax has drawn the page: an inline equation right before a blank goes into one span.bw-glue with it (an
     inline-block, see webwork.css), carried there so off() puts both back; and a line after a <br> that opens with a
     part label ("(2)", "(b)", "1.", "Part 3", bold or not) gets a span.bw-gap before it, unless a blank line, a
     paragraph or display maths already sits there. */
  const blankText = (n) => n.nodeType === 8 || (n.nodeType === 3 && !n.data.trim());
  function tidy() {
    if (!swapped || !root.hasAttribute("data-bw-on")) return;
    for (const sheet of $$(".problem-content")) {
      const boxes = new Set();
      for (const el of $$("input[type=text], input:not([type]), select, .mq-editable-field", sheet)) {
        if (el.closest(".popover, .bw-glue") || (el.matches("input") && !el.closest(".mv-container") && !el.getClientRects().length)) continue;
        boxes.add(el.closest(".mv-container, .mq-editable-field") || el);
      }
      for (const box of boxes) {
        // back over spaces and hidden fields (PG's previous_ answers, MathQuill's source input) to the label
        const between = [];
        let p = box.previousSibling;
        while (p && (blankText(p) || (p.nodeType === 1 && p.nodeName !== "MJX-CONTAINER" && !p.getClientRects().length))) { between.unshift(p); p = p.previousSibling; }
        if (!p || p.nodeName !== "MJX-CONTAINER" || p.getAttribute("display") === "true") continue;
        const g = mk('<span class="bw-glue"></span>');
        p.before(g); carry([p, ...between, box], g);
      }
      for (const br of $$("br", sheet)) {
        if (br.closest(".popover")) continue;
        let n = br.nextSibling, p = br.previousSibling;
        while (n && blankText(n)) n = n.nextSibling;
        while (p && blankText(p)) p = p.previousSibling;
        const text = !n ? "" : n.nodeType === 3 ? n.data : /^(B|STRONG)$/.test(n.nodeName) ? n.textContent : "";
        if (!ww.part(text) || !p || p.nodeName === "BR" || (p.nodeType === 1 && !getComputedStyle(p).display.startsWith("inline"))) continue;
        br.after(mk('<span class="bw-gap" aria-hidden="true"></span>'));
      }
    }
  }

  // ── a problem ──
  const P = {};
  function problem() {
    const form = $("#problemMainForm"); if (!form) return;
    P.form = form;
    P.sc = ww.score(ww.txt($("#score_summary")));
    P.res = ww.results(document);
    P.set = DATA.sets[`${R.host}/${R.course}/${R.set}`] || null;
    const t = ww.txt($("#page-title")).match(/Problem\s+([\d.]+)/i);
    P.n = t ? t[1] : R.problem;
    const sib = ww.siblings(document);
    head(ww.nav(document));
    if (sib.length > 1) rail(sib);
    stats();
    notes();
    const pb = $("#problem_body");
    if (pb) pb.before(mk(`<div class="bw-sheetband bw-ui">${ic("note")}<span>Problem ${esc(P.n)}</span><span>${esc(P.pts || "")}</span></div>`));
    if (S.feedback) buildResults();
    answerKeys();
    record();
    historyLog();
    again();
    drafts();
    maths().then(tidy).catch((e) => console.error("BetterWebWork:", e));
  }

  function head(nv) {
    const title = $("#page-title"); if (!title) return;
    const sub = $(".problem-sub-header", title), pm = sub && ww.txt(sub).match(/\(([\d.]+)\s+points?\)/i);
    P.pts = pm ? u.plural(+pm[1], "point") : "";
    const list = (nv && nv.list) || `${R.base}/${R.course}/${R.set}/`;
    const prev = nv && nv.prev ? `<a class="bw-key icon" data-dir="prev" href="${esc(nv.prev)}" title="Previous problem ([)" aria-label="Previous problem">${ic("chevl")}</a>`
      : `<button type="button" class="bw-key icon" disabled aria-label="No previous problem">${ic("chevl")}</button>`;
    const next = nv && nv.next ? `<a class="bw-key" data-dir="next" href="${esc(nv.next)}" title="Next problem (])"><span class="bw-kl">Next</span>${ic("chevr")}</a>`
      : `<a class="bw-key" href="${esc(list)}"><span class="bw-kl">Back to the set</span></a>`;
    const h = mk(`<div class="bw-head bw-ui">
      <div class="bw-ht"><span class="bw-kicker"><a href="${esc(list)}">${esc(setLabel(R.set))}</a> · ${esc(ww.code(R.course))}</span>
        <h1 id="bw-title" tabindex="-1">Problem ${esc(P.n)}${P.pts ? ` <span class="bw-pts">${esc(P.pts)}</span>` : ""}</h1></div>
      <div class="bw-pnav">${prev}${next}</div></div>`);
    // instructors' Edit and tag keys live in WeBWorK's sub-header; they come along
    const tools = sub ? [...sub.querySelectorAll("a, button")] : [];
    if (tools.length) { const box = mk('<span class="bw-tools"></span>'); h.querySelector(".bw-pnav").prepend(box); carry(tools, box); }
    const row = title.closest(".row") || title;
    row.before(h); hide(row);
    const navBox = $(".sticky-nav > .submit-buttons-container");
    if (nv && navBox) { hide(navBox); const r = navBox.parentElement; if (![...r.children].some((c) => !c.classList.contains("bw-hidden"))) hide(r); }
    skipTo();
    P.head = h;
  }

  function track(cls) {
    const n = cls.length || 1, c = (k) => cls.filter((x) => x === k).length, ok = c("ok"), part = c("part"), bad = c("bad");
    return `<div class="bw-bar-track" role="img" aria-label="${ok} correct, ${part} partly correct, ${bad} incorrect, ${cls.length - ok - part - bad} not tried">${[["ok", ok], ["part", part], ["bad", bad]]
      .filter((x) => x[1]).map(([k, v]) => `<i class="${k}" style="width:${(v / n) * 100}%"></i>`).join("")}</div>`;
  }

  function rail(sib) {
    const done = sib.filter((p) => p.status === "ok").length;
    // WeBWorK marks the current problem only when the course shows the progress bar
    if (!sib.some((p) => p.current)) for (const p of sib) p.current = p.n === String(P.n);
    const r = mk(`<nav class="bw-rail bw-ui" aria-label="Problems in this set">
      <div class="bw-rh"><b>${esc(setLabel(R.set))}</b><span>${done} of ${sib.length} correct</span>${track(sib.map((p) => p.status))}</div>
      <ol>${sib.map((p) => `<li><a class="bw-pk ${p.status}${p.current ? " cur" : ""}${p.locked ? " locked" : ""}" href="${esc(p.href || "#")}"${p.current ? ' aria-current="page"' : ""} title="Problem ${esc(p.n)}${p.status === "none" ? "" : ": " + (p.status === "part" ? "partly correct" : WORD[p.status].toLowerCase())}"><span class="bw-st">${ic(p.locked ? "lock" : ICON[p.status], "sm")}</span><span class="bw-pkn">${esc(p.n)}</span><span class="bw-pkl">Problem ${esc(p.n)}</span></a></li>`).join("")}</ol></nav>`);
    if (P.head) P.head.before(r); else $("#content").prepend(r);
    railOn = true; root.dataset.bwRail = "";
    strip(r.querySelector("ol"));
  }

  /** A strip of keys that scrolls sideways: by wheel too, fading only on the side with more. */
  function strip(ol) {
    const upd = () => { const max = ol.scrollWidth - ol.clientWidth; ol.parentElement.dataset.more = (ol.scrollLeft > 2 ? "l " : "") + (ol.scrollLeft < max - 2 ? "r" : ""); };
    ol.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    ol.addEventListener("wheel", (e) => {
      const max = ol.scrollWidth - ol.clientWidth;
      if (max <= 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const next = Math.max(0, Math.min(max, ol.scrollLeft + e.deltaY));
      if (next === ol.scrollLeft) return;
      ol.scrollLeft = next; e.preventDefault();
    }, { passive: false });
    const cur = ol.querySelector(".cur");
    if (cur && ol.scrollWidth > ol.clientWidth) ol.scrollLeft += cur.getBoundingClientRect().left - ol.getBoundingClientRect().left - ol.clientWidth / 2 + cur.offsetWidth / 2;
    upd();
  }

  function stats() {
    const sc = P.sc, set = P.set, t = now(), items = [];
    if (sc.overall != null) items.push(K.stat("Score", sc.overall + "%", sc.overall >= 100 ? "ok" : ""));
    if (sc.attempts != null) items.push(K.stat("Attempts", String(sc.attempts)));
    if (sc.remaining != null) items.push(sc.remaining === Infinity ? K.stat("Left", "No limit") : K.stat("Left", String(sc.remaining), sc.remaining === 0 ? "bad" : sc.remaining === 1 ? "hot" : ""));
    if (sc.closed || (set && set.closed)) items.push(K.stat("Set", "Closed"));
    else if (set && set.due) {
      const d = u.due(set.due, t);
      if (d.c === "over" && set.lateDue && set.lateDue > t) {
        const l = u.due(set.lateDue, t);
        items.push(K.stat("Late credit until", l.c ? l.t : u.day(set.lateDue, t), "hot", l.c ? "" : u.time(set.lateDue), l.abs));
      } else items.push(K.stat(d.c === "over" ? "Was due" : "Due", d.c ? d.t : u.day(set.due, t), d.c === "hot" || d.c === "over" ? "hot" : "", d.c ? "" : u.time(set.due), d.abs));
    }
    if (!items.length) return;
    // the sentences that didn't become numbers stay, as words
    const box = $("#score_summary"), KNOWN = /attempted this problem|score of \d+\s*% for this attempt|overall recorded score|attempts? remaining|homework set is closed/i;
    const rest = box ? ww.txt(box).split(/(?<=\.)\s+/).filter((s) => s && !KNOWN.test(s) && !(done() && PARTIAL.test(s))).join(" ") : "";
    const el = mk(`<div class="bw-stats bw-ui">${items.join("")}${rest ? `<span class="bw-snote">${esc(rest)}</span>` : ""}</div>`);
    if (P.head) P.head.after(el); else P.form.before(el);
    if (sc.known) hide(box);
  }

  // PG's grader says "You can earn partial credit on this problem." under every problem with more than one blank, and
  // WeBWorK keeps saying it (as a Note under the problem) after you've earned all of it
  const PARTIAL = /^(?:Note:\s*)?You can earn partial credit on this problem\.?$/i;
  const done = () => P.sc.overall != null && P.sc.overall >= 100;
  function notes() {
    if (!done()) return;
    for (const p of $$(".problem > p", P.form)) if (PARTIAL.test(ww.txt(p))) hide(p);
  }

  // results: one panel above the problem, a mark beside each blank
  let pageJs = null;
  /** page.js, the one script that runs in the page itself, added once: resolves when it's listening (or failed to load). */
  const inPage = () => pageJs || (pageJs = new Promise((done) => {
    const s = document.createElement("script");
    s.src = api.runtime.getURL("src/content/page.js"); s.onload = s.onerror = () => done();
    (document.head || root).append(s);
  }));
  const typeset = () => inPage().then(() => document.dispatchEvent(new CustomEvent("bww-typeset")));
  /** Resolves once WeBWorK's MathJax has drawn the page, as page.js hears it (or after 5 s, whatever's drawn by then). */
  const maths = () => inPage().then(() => new Promise((done) => {
    document.addEventListener("bww-maths-done", done, { once: true }); setTimeout(done, 5000);
    document.dispatchEvent(new CustomEvent("bww-maths"));
  }));
  /** HTML from WeBWorK 2.19's popovers, without anything that runs (MathJax's math/tex scripts stay). */
  function clean(html) {
    const d = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    d.querySelectorAll("script:not([type^='math/tex']), iframe, object, embed, link, style, meta, base, form").forEach((n) => n.remove());
    for (const n of d.querySelectorAll("*")) for (const a of [...n.attributes]) if (/^on/i.test(a.name) || (/(href|src|action)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
    const f = document.createDocumentFragment(); f.append(...d.body.childNodes); return f;
  }
  // kept: WeBWorK graded the answers but says only whether all of them are right (the problem keeps which to itself)
  const partWord = (p, kind, kept) => (p.result === "part" ? `${p.pct}% correct` : WORD[p.result] || (kind === "preview" ? "Not checked" : kept ? "" : "No result"));
  const partName = (p, many) => (many ? `Answer ${p.n}` : "Your answer");

  function buildResults() {
    const res = P.res; if (!res || !res.parts.length) return;
    const ui = { moved: [], hidden: [], chips: [] };
    const move = (nodes, into) => { for (const n of nodes) ui.moved.push({ n, parent: n.parentNode, next: n.nextSibling }); into.append(...nodes); };
    const kind = res.kind, many = res.parts.length > 1, graded = res.parts.filter((p) => p.result && p.result !== "essay");
    // a submit on a problem that marks no answer on its own: WeBWorK's summary is the whole result
    const kept = kind !== "preview" && !res.parts.some((p) => p.result) && (res.summary === "ok" || res.summary === "bad");
    const nOk = graded.filter((p) => p.result === "ok").length, allOk = kept ? res.summary === "ok" : graded.length > 0 && nOk === graded.length;
    const head = res.rejected ? "Attempt not accepted" : kind === "preview" ? "Preview" : allOk ? (many ? "All correct" : "Correct")
      : kept ? (many ? "Not all correct" : "Not correct")
      : graded.length ? (many ? `${nOk} of ${graded.length} correct` : partWord(graded[0], kind)) : "Results";
    const tag = kind === "check" ? '<span class="bw-tag quiet">Not recorded</span>'
      : kind === "submit" && P.sc.recorded === true ? '<span class="bw-tag quiet">Recorded</span>'
      : kind === "submit" && P.sc.recorded === false ? '<span class="bw-tag bad">Not recorded</span>' : "";
    const foot = kind === "preview" ? "Nothing was checked or recorded. This is how WeBWorK reads what you typed."
      : [kept && many ? "This problem doesn't say which answers are right, only whether they all are." : "",
        kind === "check" ? "Checking doesn't use an attempt."
        : P.sc.thisScore != null ? `This attempt scored ${P.sc.thisScore}%${P.sc.overall != null ? `; your recorded score is ${P.sc.overall}%` : ""}.` : ""].filter(Boolean).join(" ");
    const el = mk(`<section class="bw-mod bw-results bw-ui ${kind || ""}${allOk && !res.rejected ? " all-ok" : ""}" aria-label="Answer results">
      <div class="bw-band"><span class="bw-bt">${ic(kind === "preview" ? "eye" : res.rejected ? "warn" : allOk ? "check" : "grade")}${esc(head)}</span>${tag}<span class="bw-sp"></span></div>
      <ol class="bw-parts"></ol>${foot ? `<div class="bw-rfoot">${esc(foot)}</div>` : ""}</section>`);
    const list = el.querySelector(".bw-parts");
    let math = false;
    res.parts.forEach((p, i) => {
      const r = p.result || "none", word = partWord(p, kind, kept);
      const li = K.el(`<li class="bw-part ${r}" id="bw-part-${i}" tabindex="-1">
        <span class="bw-pi">${ic(ICON[r] || "ring", "sm")}</span>
        <div class="bw-ph2"><button type="button" class="bw-pn" data-i="${i}" title="Go to this blank">${esc(partName(p, many))}</button>${word ? `<span class="bw-pr">${esc(word)}</span>` : ""}</div>
        <div class="bw-pbody"><div class="bw-pgrid"></div></div></li>`);
      const grid = li.querySelector(".bw-pgrid"), body = li.querySelector(".bw-pbody");
      const row = (label) => { grid.append(u.frag(`<span class="bw-pl">${esc(label)}</span><span class="bw-pv"></span>`)); return grid.lastElementChild; };
      const runs = p.runs && p.runs.length ? p.runs : [{ t: p.entered || "" }];
      row("You entered").append(u.frag(p.entered ? `<code>${runs.map((x) => (x.hi ? `<mark>${esc(x.t)}</mark>` : esc(x.t))).join("")}</code>` : '<span class="bw-note">Blank</span>'));
      const html = (label, h) => { const v = row(label); v.append(clean(h)); v.dataset.bwTypeset = ""; math = true; };
      if (p.previewEl) move([p.previewEl], row("Read as"));
      else if (p.previewHtml && p.previewHtml.trim()) html("Read as", p.previewHtml);
      if (p.correctEl) move([p.correctEl], row("Correct answer"));
      else if (p.correctHtml && p.correctHtml.trim()) html("Correct answer", p.correctHtml);
      if (p.message) {
        const m = K.el('<div class="bw-msg"><span class="bw-ml">WeBWorK says</span></div>');
        if (p.messageEl) move([...p.messageEl.childNodes], m); else { m.append(clean(p.messageHtml || esc(p.message))); m.dataset.bwTypeset = ""; math = true; }
        body.append(m);
      }
      const tips = BW.advice(p);
      if (tips.length) body.append(K.el(`<div class="bw-tips">${tips.map((x) => `<div class="bw-tip">${ic("tip", "sm")}<span>${esc(x.t)}</span></div>`).join("")}<span class="bw-tipby">Notes from BetterWebWork, not from WeBWorK</span></div>`));
      list.append(li);
      // the mark beside the blank
      if (!p.result) return;
      let at = p.btn || ww.answerEl(P.form, p.id);
      if (!at) return;
      at = beside(at);
      const chip = mk(`<button type="button" class="bw-fb ${r}" data-i="${i}" title="${esc(word)}" aria-label="${esc(`${partName(p, many)}: ${word}. Show details`)}">${ic(ICON[r], "sm")}${p.message || tips.length ? '<span class="bw-fbm" aria-hidden="true"></span>' : ""}</button>`);
      at.after(chip); ui.chips.push(chip);
      if (p.btn) { hide(p.btn); ui.hidden.push(p.btn); }
    });
    const sum = $("#output_summary");
    if (sum) {
      for (const t of $$("table.attemptResults, .attemptResultsHeader, .attemptResultsSummary", sum)) { const x = t.closest(".table-responsive") || t; hide(x); ui.hidden.push(x); }
      for (const x of $$(":scope > .ResultsWithError, :scope > .alert-danger", sum)) if (/PREVIEW ONLY|ONLY CHECKED|NOT ACCEPTED/i.test(x.textContent)) { hide(x); ui.hidden.push(x); }
      sum.prepend(el);
    } else ($(".problem", P.form) || P.form).before(el);
    ui.el = el; P.ui = ui;
    if (math) typeset();
  }
  function destroyResults() {
    const ui = P.ui; if (!ui) return;
    for (const m of ui.moved.reverse()) if (m.parent) m.parent.insertBefore(m.n, m.next && m.next.parentNode === m.parent ? m.next : null);
    ui.el.remove(); ui.chips.forEach((c) => c.remove()); ui.hidden.forEach(show);
    P.ui = null;
  }
  function reveal(i) {
    const li = $(`#bw-part-${i}`); if (!li) return;
    li.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches || S.motion === "off" ? "auto" : "smooth" });
    li.focus({ preventScroll: true });
    li.classList.remove("bw-flash"); void li.offsetWidth; li.classList.add("bw-flash");
  }
  function goToBlank(i) {
    const p = P.res && P.res.parts[i], at = p && (p.btn ? p.btn.previousElementSibling : ww.answerEl(P.form, p.id));
    if (!at) return;
    at.scrollIntoView({ block: "center" });
    const f = at.matches(".mq-editable-field") ? at.querySelector("textarea") : at;
    if (f && f.focus) f.focus({ preventScroll: true });
  }

  // the answer keys: plain words, shortcuts, Submit as the one accent, and a second press for a last attempt
  function answerKeys() {
    const box = $(".submit-buttons-container", P.form); if (!box) return;
    const pv = $("#previewAnswers_id"), ck = $("#checkAnswers_id"), sb = $("#submitAnswers_id");
    const label = (b, text, combo, cls) => {
      if (!b) return;
      const v = b.value, t = b.title, plain = b.tagName === "INPUT" && /^(Preview My Answers|Check Answers|Submit Answers)$/.test(v);
      swap(() => { if (plain) b.value = text; b.title = `${b.value} (${K.combo(combo)})`; if (cls) b.classList.add(cls); },
        () => { b.value = v; b.title = t; if (cls) b.classList.remove(cls); });
    };
    label(pv, "Preview my answers", "Mod+Enter");
    label(ck, "Check answers", "Mod+Alt+Enter");
    if (sb && sb.name === "submitAnswers") label(sb, "Submit answers", "Mod+Shift+Enter", "bw-primary");
    const sc = P.sc;
    const info = sc.remaining === Infinity ? ["", "Unlimited attempts"] : sc.remaining === 1 ? ["warn", "<b>Last attempt</b>"] : sc.remaining === 0 ? ["bad", "<b>No attempts left</b>"]
      : sc.remaining != null ? ["", `<b>${sc.remaining} attempts left</b>`] : null;
    if (info) box.prepend(mk(`<span class="bw-abinfo bw-ui ${info[0]}">${info[1]}</span>`));
    if (!sb) return;
    // capture on window runs before WeBWorK's own submit handlers, so a stopped submit does nothing at all
    window.addEventListener("submit", (e) => {
      const b = e.submitter;
      if (e.target !== P.form || !b || b.name !== "submitAnswers" || !S.lastGuard || P.sc.remaining !== 1 || !root.hasAttribute("data-bw-on") || sb.dataset.bwArmed) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const was = sb.value;
      sb.dataset.bwArmed = "1"; sb.classList.add("bw-armed");
      if (sb.tagName === "INPUT") sb.value = "Press again to use your last attempt";
      sb.focus();
      setTimeout(() => { delete sb.dataset.bwArmed; sb.classList.remove("bw-armed"); if (sb.tagName === "INPUT") sb.value = was; }, 5000);
    }, true);
  }

  // your attempts, kept in this browser (storage.local history)
  function record() {
    const res = P.res;
    if (!S.history || !(res.kind === "submit" || res.kind === "check") || res.rejected || !res.parts.length) return;
    const list = (DATA.history[R.key] || []).slice(), last = list[list.length - 1];
    const e = { at: now(), k: res.kind, n: P.sc.attempts, s: P.sc.thisScore, p: res.parts.map((p) => ({ id: p.id, e: p.entered || "", r: p.result || null, pct: p.pct })) };
    // the same results page seen again (reload, back button) isn't a new attempt
    const same = last && last.k === e.k && last.p.length === e.p.length && last.p.every((x, i) => ww.same(x.e, e.p[i].e));
    if (same && (e.k === "submit" && e.n != null ? last.n === e.n : e.at - last.at < 10 * u.MIN)) return;
    list.push(e);
    while (list.length > 40) list.shift();
    DATA.history[R.key] = list;
    const keys = Object.keys(DATA.history);
    if (keys.length > 800) keys.map((k) => [k, DATA.history[k][DATA.history[k].length - 1].at]).sort((a, b) => a[1] - b[1]).slice(0, keys.length - 800).forEach(([k]) => delete DATA.history[k]);
    api.storage.local.set({ history: DATA.history });
  }
  function historyLog() {
    const old = $(".bw-history"); if (old) old.remove();
    const list = DATA.history[R.key] || []; if (!list.length) return;
    const t = now();
    const rows = list.slice().reverse().map((h) => `<li class="bw-hrow"><div class="bw-hw"><b>${h.k === "submit" ? "Submitted" : "Checked"}</b><span>${esc(u.day(h.at, t))}, ${esc(u.time(h.at))}</span>${h.s != null ? `<span>${esc(h.s)}%</span>` : ""}</div>
      <div class="bw-hans">${h.p.map((p) => `<span>${p.r ? `<span class="bw-tag ${p.r === "essay" ? "quiet" : esc(p.r)}" title="${esc(WORD[p.r] || p.pct + "% correct")}">${ic(ICON[p.r] || "ring", "sm")}</span>` : ""}<code title="${esc(p.e)}">${esc(p.e || "(blank)")}</code></span>`).join("")}</div></li>`).join("");
    const el = mk(`<details class="bw-history bw-ui"><summary>${ic("clock")}<span>Your attempts on this problem</span><span class="bw-tag quiet">${list.length}</span><span class="bw-sp"></span></summary>
      <ol class="bw-hlist">${rows}</ol>
      <div class="bw-hfoot"><span>Kept in this browser only.</span>${K.key({ label: "Clear", cls: "ghost sm", act: "clear-hist" })}</div></details>`);
    ($("#problemFooter") || P.form).after(el);
  }
  // an answer you already tried and got wrong, said before you spend an attempt on it
  function again() {
    const wrong = {};
    for (const h of DATA.history[R.key] || []) for (const p of h.p) if (p.r === "bad" && p.e) (wrong[p.id] = wrong[p.id] || []).push({ e: p.e, at: h.at });
    if (!Object.keys(wrong).length) return;
    const notes = {}, val = (id) => { const e = P.form.elements.namedItem(id); return e ? String(e.value || "") : ""; };
    // only blanks the student has changed, so a check's own wrong answers don't each get a second warning
    const touched = new Set();
    const check = u.debounce(() => {
      for (const id of touched) {
        if (!wrong[id]) continue;
        const v = S.again && root.hasAttribute("data-bw-on") ? val(id) : "";
        const hit = v && wrong[id].slice().reverse().find((w) => ww.same(w.e, v));
        if (hit && !notes[id]) {
          let at = ww.answerEl(P.form, id); if (!at) continue;
          at = beside(at);
          if (at.nextElementSibling && at.nextElementSibling.matches(".bw-fb")) at = at.nextElementSibling;
          const d = u.day(hit.at, now()), when = /^(Today|Yesterday)$/.test(d) ? d.toLowerCase() : "on " + d;
          notes[id] = mk(`<span class="bw-again bw-ui" role="status">${ic("warn", "sm")}Marked incorrect ${esc(when)}</span>`);
          at.after(notes[id]);
        } else if (!hit && notes[id]) { notes[id].remove(); delete notes[id]; }
      }
    }, 250);
    const mark = (e) => {
      const t = e.target, mq = t && t.closest && t.closest("[id^='mq-answer-']");
      const id = (t && t.name) || (mq && mq.id.slice(10));
      if (id) { touched.add(id); check(); }
    };
    for (const ev of ["input", "keyup", "change"]) P.form.addEventListener(ev, mark);
    // blanks drafts() filled count as typed
    P.again = (ids) => { for (const id of ids) touched.add(id); check(); };
  }

  // what you type in the blanks, kept in this browser until WeBWorK has it, so a refresh or a trip to another problem
  // doesn't lose it (BW.drafts in util.js: where it's kept and when it's stale)
  const SEP = "\u001f";
  /** The blanks a draft keeps: each answer's text field, select, radios or checkboxes, plus a MathQuill box's LaTeX.
      Hidden answers (graphs, drag and drop) are left alone: their widgets drew themselves from the page as it loaded. */
  function blanks(form) {
    const out = [];
    for (const id of ww.answerIds(form)) {
      const els = $$(`[name="${CSS.escape(id)}"]`, form).filter((e) => !e.disabled && !e.readOnly);
      const t = els.length && els[0].type;
      if (!(t === "radio" || t === "checkbox" ? els.every((e) => e.type === t) : els.length === 1 && /^(text|textarea|select-one|select-multiple|number|search)$/.test(t))) continue;
      out.push({ name: id, els });
      const lx = form.querySelector(`input[type="hidden"][name="MaThQuIlL_${CSS.escape(id)}"]`);
      if (lx) out.push({ name: lx.name, els: [lx], mq: id });
    }
    return out;
  }
  /** A blank as one string: as it is now, or as WeBWorK filled it (sent). */
  function readBlank(f, sent) {
    const e = f.els[0];
    if (e.type === "radio" || e.type === "checkbox") return f.els.filter((x) => (sent ? x.defaultChecked : x.checked)).map((x) => x.value).join(SEP);
    if (e.tagName === "SELECT") {
      const on = [...e.options].filter((o) => (sent ? o.defaultSelected : o.selected)).map((o) => o.value);
      return (on.length || e.multiple || !e.options.length ? on : [e.options[0].value]).join(SEP);
    }
    return sent ? e.defaultValue : e.value;
  }
  function writeBlank(f, v) {
    const e = f.els[0], vs = v.split(SEP);
    if (e.type === "radio" || e.type === "checkbox") for (const x of f.els) x.checked = vs.includes(x.value);
    else if (e.tagName === "SELECT") for (const o of e.options) o.selected = vs.includes(o.value);
    else e.value = v;
  }
  /** Redraw MathQuill boxes from their LaTeX fields (page.js does it: the boxes are the page's own objects).
      → the answers whose box couldn't be redrawn. */
  function redraw(fields) {
    const lx = fields.filter((f) => f.mq).map((f) => f.els[0]);
    if (!lx.length) return Promise.resolve(new Set());
    return inPage().then(() => {
      for (const e of lx) e.setAttribute("data-bw-quill", "");
      document.dispatchEvent(new CustomEvent("bww-quill"));
      const bad = new Set(lx.filter((e) => e.getAttribute("data-bw-quill") !== "ok").map((e) => e.name.slice("MaThQuIlL_".length)));
      for (const e of lx) e.removeAttribute("data-bw-quill");
      return bad;
    });
  }

  function drafts() {
    const fields = blanks(P.form); if (!fields.length) return;
    const who = ww.who(document) || {}, key = `${R.key}/${who.acting || who.name || ""}`;
    const values = (sent) => { const v = {}; for (const f of fields) v[f.name] = readBlank(f, sent); return v; };
    const sent = values(true), res = P.res, d = S.drafts ? BW.drafts.get(key) : null, tied = {};
    for (const f of fields) if (f.mq) tied[f.name] = f.mq;
    // a browser that restores fields on reload (Firefox) rewrites a hidden LaTeX field's value attribute, so what
    // WeBWorK sent there comes from its answer: no LaTeX for an empty answer, else what the draft saw with that answer
    for (const [n, a] of Object.entries(tied)) {
      if (sent[a] === "") sent[n] = "";
      else if (d && d.b && n in d.b && d.b[a] === sent[a]) sent[n] = d.b[n];
    }
    const plan = BW.drafts.plan(d, { view: !res.kind, kept: res.kind === "submit" && !res.rejected && P.sc.recorded !== false, attempts: P.sc.attempts, sent, tied }, now());
    const base = plan.base, asBase = (v) => !!base && Object.keys(v).every((n) => n in tied || v[n] === base[n]);
    let filled = fields.filter((f) => f.name in plan.fill);
    for (const f of filled) writeBlank(f, plan.fill[f.name]);
    if (d && (plan.drop || asBase(values()))) BW.drafts.put(key, null);

    let last = JSON.stringify(values());
    const save = () => {
      if (!S.drafts || S.off[R.host]) return;
      const v = values(), s = JSON.stringify(v);
      if (s === last) return;
      last = s;
      BW.drafts.put(key, asBase(v) ? null : { at: now(), n: P.sc.attempts ?? null, b: base, v });
    };
    const soon = u.debounce(save, 400);
    for (const ev of ["input", "change", "focusout"]) P.form.addEventListener(ev, soon);
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });
    window.addEventListener("submit", (e) => { if (e.target === P.form) save(); }, true);

    // a MathQuill box that can't be redrawn gets WeBWorK's answer back, so what you see is what's sent
    redraw(filled).then((bad) => {
      if (bad.size) {
        const back = filled.filter((f) => bad.has(f.mq || f.name));
        for (const f of back) writeBlank(f, sent[f.name]);
        filled = filled.filter((f) => !back.includes(f));
        last = JSON.stringify(values());
      }
      const ids = [...new Set(filled.map((f) => f.mq || f.name))];
      if (!ids.length) return;
      if (P.again) P.again(ids);
      const day = u.day(d.at, now()), when = `${/^(Today|Yesterday)$/.test(day) ? day.toLowerCase() : "on " + day} at ${u.time(d.at)}`;
      const note = mk(`<div class="bw-drafted bw-ui" role="status">${ic("clock", "sm")}<span>Put back ${ids.length === 1 ? "the answer" : `${ids.length} answers`} you typed ${esc(when)}. ${ids.length === 1 ? "It isn't" : "They aren't"} submitted yet.</span>${K.key({ label: "Undo", cls: "ghost sm", act: "draft-undo" })}</div>`);
      ($(".bw-sheetband", P.form) || $("#problem_body") || $(".problem", P.form) || P.form.firstElementChild).before(note);
      P.undoDraft = () => {
        for (const f of filled) writeBlank(f, sent[f.name]);
        redraw(filled);
        BW.drafts.put(key, null);
        last = JSON.stringify(values());
        note.remove(); P.undoDraft = null;
        K.toast(ids.length === 1 ? "Put back WeBWorK's answer" : "Put back WeBWorK's answers");
      };
    });
  }

  // ── a set: dates in words, progress, the problems ──
  const fmt = (x) => String(Math.round(x * 10) / 10);
  function saveSet(key, v) {
    DATA.sets[key] = Object.assign({}, DATA.sets[key], v, { course: R.course, base: R.base, at: now() });
    const old = now() - 200 * u.DAY;
    for (const k in DATA.sets) if (DATA.sets[k].at < old) delete DATA.sets[k];
  }
  function whenHtml(st, t) {
    const out = [];
    if (st.closed) out.push(`${ic("lock", "sm")} <b>Closed</b>`);
    else if (st.opens && st.opens > t) { const d = u.due(st.opens, t); out.push(`${ic("clock", "sm")} Opens <b>${esc(d.abs)}</b> <span class="bw-tag quiet">${esc(d.t)}</span>`); }
    else if (st.due) { const d = u.due(st.due, t); out.push(`${ic("clock", "sm")} ${d.c === "over" ? "Was due" : "Due"} <b>${esc(d.abs)}</b> <span class="bw-tag ${d.c || "quiet"}">${esc(d.t)}</span>`); }
    if (!out.length) return "";
    if (st.lateDue && !st.closed) out.push(`<span class="bw-sub">After that, reduced credit${st.reduced != null ? ` (${st.reduced}%)` : ""} until ${esc(u.due(st.lateDue, t).abs)}.</span>`);
    else if (st.inReduced && !st.closed) out.push(`<span class="bw-sub">This set is in its reduced credit period${st.reduced != null ? `: work counts for ${st.reduced}%` : ""}.</span>`);
    return out.join("");
  }
  const statusOf = (r) => (r.status >= 100 ? "ok" : r.status > 0 ? "part" : r.attempts > 0 ? "bad" : "none");
  function prow(r, c) {
    const a = r.href && !r.locked;
    const left = r.remaining === Infinity || c === "ok" ? "" : r.remaining === 0 ? "no attempts left" : `${r.remaining} left`;
    const mc = c === "ok" ? "" : r.remaining === 0 ? "bad" : r.remaining === 1 ? "warn" : "";
    const meta = [r.attempts ? u.plural(r.attempts, "attempt") : "Not started", left, r.worth ? u.plural(r.worth, "pt") : ""].filter(Boolean).join(" · ");
    return `<li><${a ? "a" : "div"} class="bw-prow ${c}${r.locked ? " locked" : ""}"${a ? ` href="${esc(r.href)}"` : ""} data-depth="${r.depth}"><span class="bw-st">${ic(r.locked ? "lock" : ICON[c], "sm")}</span><span class="bw-pt">Problem ${esc(r.n)}</span><span class="bw-pm ${mc}">${esc(meta)}</span><span class="bw-ps">${r.attempts || r.status ? r.status + "%" : ""}</span></${a ? "a" : "div"}></li>`;
  }
  function setPage() {
    const title = $("#page-title"), name = setLabel(R.set), t = now();
    const alertEl = $("#content .body .alert-info") || $("#content .alert-info");
    const st = alertEl ? ww.setAlert(ww.txt(alertEl)) : {};
    saveSet(`${R.host}/${R.course}/${R.set}`, { name, href: `${R.base}/${R.course}/${R.set}/`, due: st.due || null, opens: st.opens || null, lateDue: st.lateDue || null, closed: !!st.closed, reduced: st.reduced == null ? null : st.reduced });
    api.storage.local.set({ sets: DATA.sets });
    const rows = ww.problemTable(document), cls = rows ? rows.map(statusOf) : [];
    let sum = "";
    if (rows) {
      const ok = cls.filter((c) => c === "ok").length, tw = rows.reduce((a, r) => a + (r.worth || 0), 0), got = rows.reduce((a, r) => a + ((r.worth || 0) * r.status) / 100, 0);
      sum = `<div class="bw-sum">${track(cls)}<span><b>${ok}</b> of ${rows.length} correct${tw ? ` · <b>${fmt(got)}</b> of ${fmt(tw)} points` : ""}</span></div>`;
    }
    const when = whenHtml(st, t);
    const h = mk(`<div class="bw-sethead bw-ui"><span class="bw-kicker"><a href="${esc(R.base)}/${esc(R.course)}/">${esc(ww.code(R.course))}</a></span><h1 id="bw-title" tabindex="-1">${esc(name)}</h1>${when ? `<div class="bw-when">${when}</div>` : ""}${sum}</div>`);
    if (title) { const row = title.closest(".row") || title; row.before(h); hide(row); skipTo(); }
    else $("#content").prepend(h);
    if (when && alertEl) hide(alertEl);
    if (!rows) return;
    const table = $("#content table.problem_set_table"), wrap = table.closest(".table-responsive") || table;
    const list = mk(`<ol class="bw-plist bw-ui" aria-label="Problems">${rows.map((r, i) => prow(r, cls[i])).join("")}</ol>`);
    wrap.before(list); hide(wrap);
    const next = rows.find((r, i) => cls[i] !== "ok" && r.href && !r.locked);
    if (next) list.after(mk(`<div class="bw-setacts bw-ui">${K.key({ label: rows.some((r) => r.attempts) ? `Continue with problem ${next.n}` : `Start with problem ${next.n}`, href: next.href })}</div>`));
  }

  // ── a course: its sets, grouped ──
  function srow(s, t) {
    let note = s.status, tag = "";
    if (s.closed) note = s.answers ? `Closed. Answers ${u.due(s.answers, t).abs}` : "Closed";
    else if (s.opens && s.opens > t) { const d = u.due(s.opens, t); note = `Opens ${d.abs}`; tag = `<span class="bw-tag quiet">opens ${esc(d.t)}</span>`; }
    else if (s.due) {
      const d = u.due(s.due, t);
      if (d.c === "over" && s.lateDue && s.lateDue > t) { const l = u.due(s.lateDue, t); note = `Reduced credit until ${l.abs}`; tag = `<span class="bw-tag soon">late, ${esc(l.t)}</span>`; }
      else { note = `Due ${d.abs}${s.lateDue ? `, reduced credit until ${u.due(s.lateDue, t).abs}` : ""}`; tag = `<span class="bw-tag ${d.c || "quiet"}">${esc(d.t)}</span>`; }
    }
    const name = `${s.timed ? ic("clock", "sm") : ""}${esc(setLabel(s.name))}`;
    return `<li class="bw-srow${s.closed ? " closed" : ""}"><div class="bw-sm2">${s.href ? `<a class="bw-sname" href="${esc(s.href)}"${s.note ? ` title="${esc(s.note)}"` : ""}>${name}</a>` : `<span class="bw-sname">${name}</span>`}<span class="bw-snote">${esc(note)}</span></div><span class="bw-sabs">${tag}</span>${s.hardcopy ? K.key({ icon: "download", title: "Download this set as a PDF", cls: "ghost sm bw-hc", href: s.hardcopy }) : "<span></span>"}</li>`;
  }
  function course() {
    DATA.courses[`${R.host}/${R.course}`] = { name: R.course, base: R.base, at: now() };
    const list = ww.setList(document, R.base);
    if (!list) { api.storage.local.set({ courses: DATA.courses }); return; }
    const t = now();
    for (const s of list) saveSet(`${R.host}/${R.course}/${s.id}`, { name: setLabel(s.name), href: s.href ? new URL(s.href, location.href).href : null, due: s.due, opens: s.opens, lateDue: s.lateDue, closed: s.closed });
    api.storage.local.set({ courses: DATA.courses, sets: DATA.sets });
    const eff = (s) => (s.due && s.due < t && s.lateDue > t ? s.lateDue : s.due == null ? Infinity : s.due);
    const open = list.filter((s) => !s.closed && !(s.opens && s.opens > t)).sort((a, b) => eff(a) - eff(b));
    const soon = list.filter((s) => !s.closed && s.opens && s.opens > t).sort((a, b) => a.opens - b.opens);
    const closed = list.filter((s) => s.closed).sort((a, b) => (b.due || 0) - (a.due || 0));
    const ul = (arr) => `<ul class="bw-slist">${arr.map((s) => srow(s, t)).join("")}</ul>`;
    const grp = (title, arr) => (arr.length ? `<div class="bw-grp">${title}<span class="bw-gc">${arr.length}</span></div>${ul(arr)}` : "");
    const el = mk(`<div class="bw-ui" id="bw-sets">${grp("Open", open)}${grp("Not open yet", soon)}
      ${closed.length ? `<details class="bw-closed"${open.length || soon.length ? "" : " open"}><summary class="bw-grp">Closed<span class="bw-gc">${closed.length}</span></summary>${ul(closed)}</details>` : ""}
      ${list.length ? "" : '<div class="bw-empty"><b>No sets yet</b><span>Your instructor hasn\'t assigned any homework here.</span></div>'}</div>`);
    const table = $("#content table.problem_set_table"), wrap = table.closest(".table-responsive") || table;
    wrap.before(el); hide(wrap);
  }

  // ── the course list: a filter, yours first, then by quarter ──
  function courses() {
    const ul = $("ul.courses-list"); if (!ul) return;
    const items = $$("a[href]", ul).map((a) => ({ id: ww.txt(a), href: a.getAttribute("href") }));
    if (!items.length) return;
    const card = (c) => { const q = ww.quarter(c.id); return `<li data-q="${esc([c.id, ww.code(c.id), q ? q.label : ""].join(" ").toLowerCase())}"><a href="${esc(c.href)}"><b>${esc(ww.code(c.id))}</b><span title="${esc(c.id)}">${esc(c.id)}</span></a></li>`; };
    const mine = Object.entries(DATA.courses).filter(([k]) => k.startsWith(R.host + "/")).sort((a, b) => b[1].at - a[1].at)
      .map(([, v]) => items.find((i) => i.id === v.name)).filter(Boolean).slice(0, 8);
    const groups = new Map();
    for (const c of items) { const q = ww.quarter(c.id), k = q ? q.label : "Other"; if (!groups.has(k)) groups.set(k, { sort: q ? q.sort : -1, list: [] }); groups.get(k).list.push(c); }
    const sorted = [...groups.entries()].sort((a, b) => b[1].sort - a[1].sort);
    const el = mk(`<div class="bw-ui" id="bw-courses">
      <label class="bw-cfind">${ic("search")}<input type="search" placeholder="Filter courses, like math 4a or f26" aria-label="Filter courses" autocomplete="off"><kbd>/</kbd></label>
      ${mine.length ? `<div class="bw-grp" data-g>Your courses</div><ul class="bw-clist">${mine.map(card).join("")}</ul>` : ""}
      ${sorted.map(([k, g]) => `<div class="bw-grp" data-g>${esc(k)}<span class="bw-gc">${g.list.length}</span></div><ul class="bw-clist">${g.list.map(card).join("")}</ul>`).join("")}
      <div class="bw-empty bw-hidden"><b>No courses match</b><span>Try the subject and number, like math 4a.</span></div></div>`);
    ul.before(el); hide(ul);
    const input = $("input", el), empty = $(".bw-empty", el);
    input.addEventListener("input", () => {
      const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      let any = false;
      for (const list of $$(".bw-clist", el)) {
        let n = 0;
        for (const li of list.children) { const hit = words.every((w) => li.dataset.q.includes(w)); li.classList.toggle("bw-hidden", !hit); if (hit) n++; }
        list.classList.toggle("bw-hidden", !n); list.previousElementSibling.classList.toggle("bw-hidden", !n);
        any = any || n > 0;
      }
      empty.classList.toggle("bw-hidden", any);
    });
  }

  // ── settings and keys ──
  function openSettings(section) {
    if (drawer) return;
    let panel = null;
    drawer = K.drawer({ title: "BetterWebWork settings", icon: "gear", onClose: () => { if (panel) panel.destroy(); drawer = null; } });
    panel = BW.settings.mount(drawer.body, { site: R.host, section });
  }
  function clearHist() {
    delete DATA.history[R.key];
    api.storage.local.set({ history: DATA.history });
    const h = $(".bw-history"); if (h) h.remove();
  }

  let keysOn = false;
  function keys() {
    if (keysOn) return; keysOn = true;
    document.addEventListener("click", (e) => {
      const a = e.target.closest(".bw-fb, .bw-pn, [data-act]");
      if (!a || a.closest(".bw-drawer")) return;
      if (a.matches(".bw-fb")) reveal(+a.dataset.i);
      else if (a.matches(".bw-pn")) goToBlank(+a.dataset.i);
      else if (a.dataset.act === "menu") menu();
      else if (a.dataset.act === "menu-close") menu(false);
      else if (a.dataset.act === "settings") openSettings();
      else if (a.dataset.act === "clear-hist") K.twice(a, "Clear this log?", clearHist);
      else if (a.dataset.act === "draft-undo" && P.undoDraft) P.undoDraft();
    });
    document.addEventListener("keydown", (e) => {
      if (!root.hasAttribute("data-bw-on") || drawer || e.defaultPrevented) return;
      if (e.key === "Escape" && root.classList.contains("bw-nav-open")) { e.preventDefault(); menu(false); return; }
      if (!S.keys) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "Enter" && P.form) {
        const b = e.shiftKey ? $("#submitAnswers_id") : e.altKey ? $("#checkAnswers_id") : $("#previewAnswers_id");
        if (b && !b.disabled) { e.preventDefault(); b.click(); }
        return;
      }
      if (mod || e.altKey || (e.target.closest && e.target.closest("input, textarea, select, [contenteditable], .mq-editable-field"))) return;
      if (e.key === "[" || e.key === "]") { const a = $(`.bw-pnav [data-dir="${e.key === "[" ? "prev" : "next"}"]`); if (a) { e.preventDefault(); location.href = a.href; } }
      else if (e.key === "/" && $("#bw-courses input")) { e.preventDefault(); $("#bw-courses input").focus(); }
      else if (e.key === "?") { e.preventDefault(); openSettings("keys"); }
    });
  }

  // ── start ──
  api.storage.onChanged.addListener((ch, area) => { if (area === "local" && (ch.settings || ch.themes)) refresh(); });
  const repaint = () => { if (S && !S.off[R.host] && !BW.previewing) paint(); };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", repaint);
  setInterval(() => { if (S && S.night === "schedule") repaint(); }, 60e3);
  // answered through sendResponse, which Firefox and Chrome both take (Chrome ignores a returned Promise)
  if (TOP) api.runtime.onMessage.addListener((m, sender, reply) => {
    if (m && m.type === "bw-open-settings") { if (root.hasAttribute("data-bw-on")) openSettings(m.section); reply(root.hasAttribute("data-bw-on")); }
    else if (m && m.type === "bw-page") reply({ host: R.host, kind: PAGE, course: R.course, set: R.set, problem: R.problem, on: root.hasAttribute("data-bw-on") });
  });
  BW.store.all().then((d) => {
    DATA = d; S = d.settings; u.setClock24(S.clock24);
    if (!S.drafts) BW.drafts.clear();
    if (S.off[R.host]) { off(); return; }
    paint();
    enhance();
  }).catch((e) => console.error("BetterWebWork:", e));
})();
