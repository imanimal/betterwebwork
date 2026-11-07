/* The site's parts. Everything that says something about answers or themes is the extension's own code
   (lib/advice.js, lib/themes.js, lib/icons.js, copied from src/lib by tools/site.py), so the demo can't drift from
   what the extension does. Nothing here is needed to read the page: with scripts off it's plain text and links. */
(function (g) {
  const BW = g.BW, site = g.BWSite, doc = g.document, root = doc.documentElement;
  const $ = (s, el) => (el || doc).querySelector(s), $$ = (s, el) => [...(el || doc).querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const on = () => "bwOn" in root.dataset;
  const still = () => !g.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const store = { get(k) { try { return JSON.parse(g.localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { g.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* not kept */ } } };

  // ── icons: drawn in the current look, redrawn when a theme of the other look is picked ──
  function icons() {
    for (const el of $$("[data-ic]")) {
      const n = el.dataset.ic, cls = el.dataset.icc || "";
      el.replaceWith(doc.createRange().createContextualFragment(BW.ic(n, cls)));
    }
  }

  let toastTimer;
  function toast(text) {
    const t = $("#toast");
    t.textContent = text; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3800);
  }

  // ── the switch: off takes BetterWebWork's attributes away (themes.unlook), nothing else ──
  const sw = $("#onoff");
  function setOn(v) {
    if (v) { site.paint(); icons(); } else BW.themes.unlook(root);
    sw.checked = v; sw.nextElementSibling.textContent = v ? "On" : "Off";
  }
  sw.addEventListener("change", () => setOn(sw.checked));
  $("#backon").addEventListener("click", () => { setOn(true); sw.focus(); });

  // ── the home page's screens: each one plays its data-rise parts the first time it scrolls in, and the dots on the
  // right follow the one you're on ──
  const screens = $$(".screen"), dots = $$(".dots a");
  const rise = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); rise.unobserve(e.target); }
  }, { threshold: 0.2 });
  for (const s of screens) {
    $$("[data-rise]", s).forEach((el, i) => el.style.setProperty("--i", i));
    rise.observe(s);
  }
  const here = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      const id = e.target.id;
      dots.forEach((a) => (a.getAttribute("href") === "#" + id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    }
  }, { rootMargin: "-45% 0px -45% 0px" });
  screens.forEach((s) => here.observe(s));

  // ── the guide's problem strip: what you've read, where you are, [ and ] ──
  const sections = $$("[data-problem]"), links = $$(".strip li a"), marks = $$("[data-mark]");
  if (sections.length) (function () {
    const state = sections.map(() => false);
    let current = 0;
    function seen(i) {
      if (state[i]) return;
      state[i] = true;
      links[i].parentElement.classList.add("done");
      marks[i].innerHTML = BW.ic("check");
      links[i].title = "Read";
    }
    function setCurrent(i) {
      current = i;
      links.forEach((a, j) => (j === i ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
      if ($("#crumb")) $("#crumb").textContent = "Problem " + (i + 1);
    }
    for (const m of marks) m.innerHTML = BW.ic("ring");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) seen(sections.indexOf(e.target));
    }, { rootMargin: "0px 0px -35% 0px", threshold: 0.35 });
    sections.forEach((s) => io.observe(s));
    // the section under the bar is the current one
    function whereAmI() {
      const y = 140; let i = 0;
      sections.forEach((s, j) => { if (s.getBoundingClientRect().top <= y) i = j; });
      if (g.innerHeight + g.scrollY >= doc.body.scrollHeight - 4) i = sections.length - 1;
      if (i !== current) setCurrent(i);
    }
    g.addEventListener("scroll", whereAmI, { passive: true });
    setCurrent(0); whereAmI();

    doc.addEventListener("keydown", (e) => {
      const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
      if (typing || e.ctrlKey || e.metaKey || e.altKey || !on() || (e.key !== "[" && e.key !== "]")) return;
      const top = sections[current].getBoundingClientRect().top;
      // [ on a section you've scrolled into goes back to its top first, the way a page of problems feels
      const to = e.key === "]" ? Math.min(sections.length - 1, current + 1) : top < -10 ? current : Math.max(0, current - 1);
      sections[to].scrollIntoView({ block: "start" });
      links[to].focus({ preventScroll: true });
      e.preventDefault();
    });
  })();

  // ── an answer blank with the extension's notes ──
  if ($("#ans")) (function () {
    const ans = $("#ans"), out = $("#bw-out"), chips = $$(".chips button"), DRAFT = "bww.site.draft";
    function render() {
      const entered = ans.value;
      $("#ww-entered").textContent = entered;
      for (const c of chips) c.setAttribute("aria-pressed", String(c.textContent === entered));
      const v = $("#verdict"), empty = !entered.trim();
      v.className = "verdict " + (empty ? "idle" : "bad"); v.innerHTML = empty ? "" : BW.ic("close");
      ans.classList.toggle("bad", !empty);
      if (empty) { out.innerHTML = `<p class="quiet-note">Type an answer or pick one of the examples.</p>`; return; }
      const notes = BW.advice({ entered, message: "", result: "bad" });
      out.innerHTML = `<p class="row"><span>WeBWorK says</span><b class="bad">Incorrect</b></p>` +
        (notes.length
          ? `<ul class="notes">${notes.map((n) => `<li data-why="${n.why}">${BW.ic("tip")}<span>${esc(n.t)}</span></li>`).join("")}</ul><p class="by">Notes from BetterWebWork, not from WeBWorK</p>`
          : `<p class="quiet-note">BetterWebWork only speaks up when it's sure what went wrong, and it isn't sure about this one. It might be the math itself.</p>`);
    }
    let typer = 0, touched = false;
    const stop = () => { clearInterval(typer); typer = 0; };
    // only what you typed is a draft, never the example the page typed for you
    const save = () => { touched = true; store.set(DRAFT, { ans: ans.value }); };
    ans.addEventListener("input", () => { stop(); render(); save(); $("#restored").hidden = true; });
    ans.addEventListener("pointerdown", stop);
    g.addEventListener("pagehide", () => { if (touched) save(); });
    for (const c of chips) c.addEventListener("click", () => { stop(); ans.value = c.textContent; render(); save(); ans.focus(); });
    // drafts: what you typed last time comes back, with Undo
    const d = store.get(DRAFT);
    if (d && d.ans) { ans.value = d.ans; $("#restored").hidden = false; }
    $("#undo").addEventListener("click", () => { ans.value = ""; save(); render(); $("#restored").hidden = true; ans.focus(); });
    render();
    // the first time the blank scrolls into view empty, it types an example itself (not saved as a draft)
    const card = ans.closest(".screen");
    if (!card || ans.value) return;
    const demo = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      demo.disconnect();
      if (ans.value || doc.activeElement === ans) return;
      const word = "e^-2x";
      if (still()) { ans.value = word; render(); return; }
      let n = 0;
      setTimeout(() => {
        if (ans.value) return;
        typer = setInterval(() => { ans.value = word.slice(0, ++n); render(); if (n >= word.length) stop(); }, 140);
      }, 700);
    }, { threshold: 0.6 });
    demo.observe(card);
  })();

  // ── themes: click a card and the page wears it right away; the reset goes back to Paper by day, Paper Dark at night ──
  if ($("#grid")) (function () {
    const S = site.settings, T = BW.themes;
    const showing = () => (T.isNight(S) ? S.nightTheme : S.theme);
    function draw() {
      const now = showing();
      $("#grid").innerHTML = T.BUILTIN.map((t, i) => {
        const k = t.tokens;
        return `<li style="--n:${i}"><button type="button" class="tcard" data-id="${t.id}" aria-pressed="${t.id === now}" title="${esc(t.note)}">
          <span class="pv" style="background:${k.bg}" aria-hidden="true"><i class="sheet" style="background:${k.surface};box-shadow:0 0 0 1px ${k.line}"></i>
          <i class="ln" style="top:22px;width:44%;background:${k.text}"></i><i class="ln" style="top:32px;width:30%;background:${k.text3}"></i><i class="ln" style="top:42px;width:36%;background:${k.text3}"></i>
          <i class="key" style="background:${k.accent}"></i></span>
          <b>${esc(t.name)}</b><small>${t.look === "pocket" ? "Pocket" : "Standard"}, ${t.scheme}</small></button></li>`;
      }).join("");
      $("#reset").hidden = ["theme", "nightTheme", "night"].every((k) => S[k] === site.DEFAULTS[k]);
    }
    function paint() { site.paint(); site.save(); icons(); draw(); }
    $("#grid").addEventListener("click", (e) => {
      const b = e.target.closest(".tcard"); if (!b) return;
      Object.assign(S, { theme: b.dataset.id, night: "off" });
      paint();
      $(`.tcard[data-id="${b.dataset.id}"]`).focus();
    });
    $("#reset").addEventListener("click", () => { Object.assign(S, site.DEFAULTS); paint(); toast("Back to Paper, and Paper Dark when your computer is dark."); });
    g.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (on() && S.night === "auto") paint(); });
    draw();
  })();

  // ── installing: every install key goes straight to the store for the browser you're in, and that browser's card
  // comes first. Phones can't take it (no Android build), and other browsers keep the link to #install. ──
  const ua = g.navigator.userAgent, phone = /Mobi|Android|iPhone|iPad/.test(ua);
  const mine = phone ? null : /Firefox\//.test(ua) ? "firefox" : /Chrome\/|Edg\//.test(ua) ? "chrome" : null;
  const NAME = { firefox: "Firefox", chrome: /Edg\//.test(ua) ? "Edge" : "Chrome" };
  for (const a of $$("[data-get]")) {
    const url = mine && a.dataset[mine];
    if (!url || !/^https:/.test(url)) continue;
    a.href = url;
    const label = $("[data-label]", a);
    if (label) label.textContent = "Add to " + NAME[mine];
  }
  for (const also of $$("[data-also]")) {
    const a = $("[data-get]", also.parentElement), other = mine === "firefox" ? "chrome" : "firefox", url = a && a.dataset[other];
    if (mine && url && /^https:/.test(url)) also.innerHTML = `It's free, and there's a <a href="${url}">${other === "firefox" ? "Firefox" : "Chrome and Edge"} version</a> too.`;
    else if (phone) also.textContent = "It runs on a computer, in Firefox, Chrome or Edge.";
    else if (!mine) also.textContent = "It's free, for Firefox, Chrome and Edge.";
    else continue;
    also.hidden = false;
  }
  if (mine && $("[data-browser]")) {
    const card = $(`[data-browser="${mine}"]`);
    card.classList.add("first"); $("[data-here]", card).hidden = false;
    card.parentElement.prepend(card);
  }

  icons();
})(globalThis);
