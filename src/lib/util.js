/* BetterWebWork: shared helpers for every context (WeBWorK pages, popup, options, background). Classic scripts on
   globalThis.BW, no bundler and no npm. Load order: util → themes → ww → (boot) and icons → advice → kit → settings
   → the context's own script. The manifest, the <script> tags in src/pages/*.html and tests/make_fixtures.py stay in step.

   Storage is all storage.local (themes and the attempt log are too big for sync):
     settings  the options below (DEFAULTS)
     themes    imported and edited themes, in the shared Pocket theme format (../collegiapp/docs/THEMES.md)
     history   "<host>/<course>/<set>/<problem>" → your checked and submitted attempts, newest last (ww.js)
     sets      "<host>/<course>/<set>" → { name, due, opens, lateDue, closed, at }: dates read from set pages
     courses   "<host>/<course>" → { name, at }: courses you opened, for the course list
   Each WeBWorK page also keeps a copy of the look in its own localStorage ("bww.boot"), so boot.js can paint the
   theme before the page draws (no flash of the old look), and what you've typed in a problem's blanks and not yet
   submitted ("bww.drafts", below), so a refresh or a trip to another problem doesn't lose it. */
(function (g) {
  const BW = (g.BW = g.BW || {});
  const api = (BW.api = g.browser || g.chrome);
  const MIN = 60e3, HR = 60 * MIN, DAY = 24 * HR;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const txt = (el) => (el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "");
  /** Our own markup (anything dynamic already through esc()) as a fragment, parsed in an inert document the way a
      <template> parses it. Everything we draw goes in through this, never innerHTML or insertAdjacentHTML, which
      addons.mozilla.org's linter flags. */
  const frag = (html) => new DOMParser().parseFromString(`<template>${html}</template>`, "text/html").querySelector("template").content;

  const DEFAULTS = {
    v: 1,
    // look (the theme browser; night: off | auto (with the system) | schedule | on)
    theme: "paper", nightTheme: "paper-dark", night: "auto", nightFrom: "20:00", nightTo: "07:00",
    off: {},              // host → true: leave that WeBWorK as it is
    type: "hyper",        // Standard's typeface: hyper (Atkinson Hyperlegible) | system
    zoom: 100,            // text size, %
    width: "medium",      // problem column: narrow | medium | wide | full
    img: "panel",         // graphs in dark themes: panel (on a light card) | invert | none
    motion: "full",       // full | off
    // problems
    feedback: true,       // results next to each answer and in a panel above the problem
    tips: true,           // plain-language notes on common mistakes (advice.js)
    again: true,          // say so when you type an answer you already tried and got wrong
    drafts: true,         // keep what you type in the blanks through a refresh or a page swap, until you submit
    history: true,        // keep a local log of checked and submitted attempts
    lastGuard: true,      // Submit on your last attempt takes a second press
    sticky: true,         // the answer keys stay on screen while you scroll
    keys: true,           // keyboard shortcuts
    clock24: false,
  };

  const store = {
    async settings() { const r = await api.storage.local.get("settings"); return Object.assign({}, DEFAULTS, r.settings || {}); },
    async set(patch) { const cur = await store.settings(); const next = Object.assign(cur, patch); await api.storage.local.set({ settings: next }); return next; },
    async local(k, d) { const r = await api.storage.local.get(k); return r[k] === undefined ? d : r[k]; },
    async setLocal(k, v) { await api.storage.local.set({ [k]: v }); },
    /** Everything a surface draws from, in one read. */
    async all() {
      const r = await api.storage.local.get(["settings", "themes", "history", "sets", "courses"]);
      return { settings: Object.assign({}, DEFAULTS, r.settings || {}), themes: r.themes || [], history: r.history || {}, sets: r.sets || {}, courses: r.courses || {} };
    },
  };

  // ── the page's own copy of the look, read by boot.js at document_start ──
  const BOOT = "bww.boot";
  const boot = {
    read() { try { return JSON.parse(g.localStorage.getItem(BOOT) || "null"); } catch (e) { return null; } },
    write(v) { try { g.localStorage.setItem(BOOT, JSON.stringify(v)); } catch (e) { /* storage blocked: the next load flashes, nothing worse */ } },
  };

  // ── what you type in a problem's blanks, kept until WeBWorK has it (app.js drafts()). It sits in the page's own
  //    localStorage beside the look's copy, not in storage.local, because it's written as the page goes away (a link, a
  //    refresh, a closed tab) and only a synchronous write is sure to land first. "bww.drafts": "<problem key>" →
  //    { at, n: the attempt count then, b: what WeBWorK fills the blanks with by itself (null when not known),
  //    v: each blank as you left it }. Older than 60 days or past the newest 200, a draft is forgotten. ──
  const DRAFTS = "bww.drafts", DRAFT_AGE = 60 * DAY, DRAFT_MAX = 200;
  /**
   * What a problem page does with its draft. page: { view: a plain view (not a preview, check or submit),
   * kept: a submit WeBWorK recorded, attempts, sent: { blank: value } as WeBWorK filled them, tied: { blank: the blank
   * it follows } (a MathQuill box's LaTeX field) }.
   * → { fill: { blank: value } to put back, base: what WeBWorK will fill by itself next time (null: not known), drop }.
   * A draft is stale, and dropped, when it's too old, has none of these blanks, an attempt was recorded since (here or
   * on another computer), or a plain view fills a blank with something that's neither the draft nor what WeBWorK filled
   * before. A tied blank goes back whenever the blank it follows does and never decides staleness: it's a hidden field,
   * and a browser that restores fields on reload (Firefox) rewrites what a hidden field says it was sent.
   */
  function draftPlan(d, page, now) {
    const sent = page.sent, tied = page.tied || {}, base = page.view || page.kept ? sent : null;
    if (!d || !d.v) return { fill: {}, base, drop: false };
    const names = Object.keys(sent).filter((n) => n in d.v), own = names.filter((n) => !(n in tied));
    const stale = !(now - d.at < DRAFT_AGE) || !own.length
      || (d.n != null && page.attempts != null && d.n !== page.attempts)
      || (page.view && d.b && own.some((n) => sent[n] !== d.b[n] && sent[n] !== d.v[n]));
    if (stale) return { fill: {}, base, drop: true };
    const fill = {};
    for (const n of own) if (sent[n] !== d.v[n]) fill[n] = d.v[n];
    for (const n of names) if (n in tied && (sent[n] !== d.v[n] || tied[n] in fill)) fill[n] = d.v[n];
    return { fill, base: base || d.b || null, drop: false };
  }
  const drafts = {
    all() { try { return JSON.parse(g.localStorage.getItem(DRAFTS) || "{}") || {}; } catch (e) { return {}; } },
    get(k) { return drafts.all()[k] || null; },
    /** Keep a draft, or forget it (d null). */
    put(k, d, now = Date.now()) {
      const a = drafts.all();
      if (d) a[k] = d; else delete a[k];
      const keep = Object.entries(a).filter(([, x]) => x && now - x.at < DRAFT_AGE).sort((p, q) => q[1].at - p[1].at).slice(0, DRAFT_MAX);
      try {
        if (keep.length) g.localStorage.setItem(DRAFTS, JSON.stringify(Object.fromEntries(keep)));
        else g.localStorage.removeItem(DRAFTS);
      } catch (e) { /* storage full or blocked: this draft isn't kept */ }
    },
    clear() { try { g.localStorage.removeItem(DRAFTS); } catch (e) { /* blocked */ } },
    plan: draftPlan,
  };

  // ── time and words (Collegiapp's UIKit § 10: "9:30 AM", "Today", "Mon", "Mon, Nov 3", "in 3h", "2h overdue") ──
  const DNM = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MNM = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  let H24 = false;
  const time = (t) => { const d = new Date(t), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0"); return H24 ? `${String(h).padStart(2, "0")}:${m}` : `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`; };
  function day(t, now) {
    const diff = Math.round((sod(t) - sod(now)) / DAY), d = new Date(t);
    if (diff === 0) return "Today"; if (diff === 1) return "Tomorrow"; if (diff === -1) return "Yesterday";
    return diff > 0 && diff < 7 ? DNM[d.getDay()] : `${DNM[d.getDay()]}, ${MNM[d.getMonth()]} ${d.getDate()}`;
  }
  const span = (ms) => { const h = Math.abs(ms) / HR; return h < 1 ? Math.max(1, Math.round(h * 60)) + "m" : h < 48 ? Math.round(h) + "h" : Math.round(h / 24) + "d"; };
  /** A due date as words: { t: "in 3h" | "Fri" | "2h overdue", c: "" | soon | hot | over, abs: "Fri 11:59 PM" }. */
  function due(t, now) {
    if (t == null) return null;
    const d = t - now, abs = `${day(t, now)} ${time(t)}`;
    if (d < 0) return { t: span(d) + " ago", c: "over", abs };
    if (d < 3 * HR) return { t: "in " + span(d), c: "hot", abs };
    if (d < DAY) return { t: "in " + span(d), c: "soon", abs };
    return { t: "in " + span(d), c: "", abs };
  }
  /** "2:14:08" under a day, "3D 4H" beyond (Collegiapp's cdText), for LCDs. */
  function countdown(ms) {
    if (ms <= 0) return "NOW";
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    if (d) return `${d}D ${h}H`;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
  }
  const plural = (n, w, ws) => `${n} ${n === 1 ? w : ws || w + "s"}`;
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  /** A short, stable hash of a string (for keys, not security). */
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  // ── fonts (fonts/, downloaded by tools/vendor_fonts.py; all SIL OFL). A missing file falls back to the next family in
  //    kit.css's stacks. `url(file)` makes the address: runtime.getURL in WeBWorK pages, a relative path in our own. ──
  const FONTS = [["BW Hyperlegible", "atkinson-next.woff2", "200 800", "normal"], ["BW Hyperlegible", "atkinson-next-italic.woff2", "200 800", "italic"],
    ["BW Hyperlegible Mono", "atkinson-mono.woff2", "200 800", "normal"], ["BW Space Grotesk", "space-grotesk.woff2", "300 700", "normal"],
    ["BW Space Mono", "space-mono-400.woff2", "400", "normal"], ["BW Space Mono", "space-mono-700.woff2", "700", "normal"], ["BW Doto", "doto.woff2", "100 900", "normal"]];
  const fontCss = (url) => FONTS.map(([f, file, w, s]) => `@font-face{font-family:"${f}";src:url("${url(file)}") format("woff2");font-weight:${w};font-style:${s};font-display:swap}`).join("\n");

  BW.u = { esc, txt, frag, MIN, HR, DAY, sod, time, day, due, span, countdown, plural, debounce, hash, setClock24: (v) => (H24 = !!v), DNM, MNM };
  BW.FONTS = FONTS;
  BW.fontCss = fontCss;
  BW.DEFAULTS = DEFAULTS;
  BW.store = store;
  BW.boot = boot;
  BW.drafts = drafts;
})(globalThis);
