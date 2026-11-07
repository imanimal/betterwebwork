/* The site's parts. Everything that says something about answers or themes is the extension's own code
   (lib/advice.js, lib/themes.js, lib/icons.js, copied from src/lib by tools/site.py), so the demo can't drift from
   what the extension does. Nothing here is needed to read the page: with scripts off it's plain text and links. */
(function (g) {
  const BW = g.BW, site = g.BWSite, doc = g.document, root = doc.documentElement;
  const $ = (s, el) => (el || doc).querySelector(s), $$ = (s, el) => [...(el || doc).querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const on = () => "bwOn" in root.dataset;
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

  // ── the problem strip: what you've read, where you are, [ and ] ──
  const sections = $$("[data-problem]"), links = $$(".strip li a"), marks = $$("[data-mark]"), segs = $$(".segs i");
  const state = sections.map(() => "new"); // new, part, done
  let current = 0, tried = false, announced = false;
  function mark(i, s) {
    if (state[i] === "done" || state[i] === s) return;
    state[i] = s;
    const li = links[i].parentElement;
    li.classList.toggle("done", s === "done"); li.classList.toggle("part", s === "part");
    marks[i].innerHTML = BW.ic(s === "done" ? "check" : "partial");
    if (segs[i]) segs[i].className = s;
    links[i].title = s === "done" ? "Read" : "Partly correct: try an answer";
    const n = state.filter((x) => x === "done").length, p = state.filter((x) => x === "part").length;
    if (!$("#readcount")) return;
    $("#readcount").textContent = `${n} of ${sections.length} read`;
    $("#score").textContent = Math.round(((n + p / 2) / sections.length) * 100) + "%";
    if (n === sections.length && !announced) { announced = true; toast("100%. That's the whole set."); }
  }
  function seen(i) { mark(i, sections[i].id === "try" && !tried ? "part" : "done"); }
  function setCurrent(i) {
    current = i;
    links.forEach((a, j) => (j === i ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    $("#crumb").textContent = "Problem " + (i + 1);
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

  const dlg = $("#keys");
  doc.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (typing || e.ctrlKey || e.metaKey || e.altKey || !on()) return;
    if (e.key === "[" || e.key === "]") {
      const top = sections[current].getBoundingClientRect().top;
      // [ on a section you've scrolled into goes back to its top first, the way a page of problems feels
      const to = e.key === "]" ? Math.min(sections.length - 1, current + 1) : top < -10 ? current : Math.max(0, current - 1);
      sections[to].scrollIntoView({ block: "start" });
      links[to].focus({ preventScroll: true });
      e.preventDefault();
    } else if (e.key === "?" && dlg) { dlg.open ? dlg.close() : dlg.showModal(); e.preventDefault(); }
  });

  // ── Problem 2: an answer blank with the extension's notes ──
  if ($("#ans")) (function () {
    const ans = $("#ans"), msg = $("#msg"), out = $("#bw-out"), chips = $$(".chips button"), DRAFT = "bww.site.draft";
    function render() {
      const entered = ans.value, message = msg.value;
      $("#ww-entered").textContent = entered; $("#ww-msg").textContent = message;
      for (const c of chips) c.setAttribute("aria-pressed", String(c.textContent === entered));
      const v = $("#verdict"), empty = !entered.trim();
      v.className = "verdict " + (empty ? "idle" : "bad"); v.innerHTML = empty ? "" : BW.ic("close");
      ans.classList.toggle("bad", !empty);
      if (empty) { out.innerHTML = `<p class="quiet-note">Type something, or pick one of the examples.</p>`; return; }
      const notes = BW.advice({ entered, message, result: "bad" });
      out.innerHTML = `<p class="row"><span>You entered</span><code>${esc(entered)}</code></p>` +
        (message ? `<p class="says"><small>WeBWorK says</small><span>${esc(message)}</span></p>` : "") +
        (notes.length
          ? `<ul class="notes">${notes.map((n) => `<li data-why="${n.why}">${BW.ic("tip")}<span>${esc(n.t)}</span></li>`).join("")}</ul><p class="by">Notes from BetterWebWork, not from WeBWorK</p>`
          : `<p class="quiet-note">Nothing here is certain to be the problem, so BetterWebWork stays quiet. It might be the maths; WeBWorK's message is all you'd see.</p>`);
      // a note shown is Problem 2 answered
      if (notes.length && !tried) { tried = true; if (state[1] === "part") state[1] = "new"; mark(1, "done"); }
    }
    const save = () => store.set(DRAFT, { ans: ans.value, msg: msg.value });
    ans.addEventListener("input", () => { render(); save(); $("#restored").hidden = true; });
    msg.addEventListener("change", () => { render(); save(); });
    g.addEventListener("pagehide", save);
    for (const c of chips) c.addEventListener("click", () => { ans.value = c.textContent; render(); save(); ans.focus(); });
    // drafts: what you typed last time comes back, with Undo
    const d = store.get(DRAFT);
    if (d && d.ans) {
      ans.value = d.ans; if ([...msg.options].some((o) => o.value === d.msg)) msg.value = d.msg;
      $("#restored").hidden = false;
    }
    $("#undo").addEventListener("click", () => { ans.value = ""; msg.value = ""; save(); render(); $("#restored").hidden = true; ans.focus(); });
    render();
  })();

  // ── Problem 3: the settings' theme browser, Night first, then the Day/Night slots above the grid ──
  if ($("#grid")) (function () {
    const S = site.settings, T = BW.themes;
    let slot = T.isNight(S) ? "night" : "day";
    function paint() { site.paint(); site.save(); icons(); drawThemes(); }
    function drawThemes() {
      for (const b of $$("#night button")) b.setAttribute("aria-pressed", String(b.dataset.v === S.night));
      for (const b of $$("#slots button")) b.setAttribute("aria-pressed", String(b.dataset.v === slot));
      const mine = slot === "day" ? S.theme : S.nightTheme;
      $("#grid").innerHTML = T.BUILTIN.map((t) => {
        const k = t.tokens, tags = [t.id === S.theme && "Day", t.id === S.nightTheme && "Night"].filter(Boolean).join(", ");
        return `<li><button type="button" class="tcard" data-id="${t.id}" aria-pressed="${t.id === mine}" title="${esc(t.note)}">
          <span class="pv" style="background:${k.bg}" aria-hidden="true"><i class="sheet" style="background:${k.surface};box-shadow:0 0 0 1px ${k.line}"></i>
          <i class="ln" style="top:22px;width:44%;background:${k.text}"></i><i class="ln" style="top:32px;width:30%;background:${k.text3}"></i><i class="ln" style="top:42px;width:36%;background:${k.text3}"></i>
          <i class="key" style="background:${k.accent}"></i></span>
          <b>${esc(t.name)}${tags ? `<span class="slot">${tags}</span>` : ""}</b><small>${t.look === "pocket" ? "Pocket" : "Standard"}, ${t.scheme}</small></button></li>`;
      }).join("");
    }
    $("#grid").addEventListener("click", (e) => {
      const b = e.target.closest(".tcard"); if (!b) return;
      const t = T.byId(b.dataset.id);
      S[slot === "day" ? "theme" : "nightTheme"] = t.id;
      paint();
      $(`.tcard[data-id="${t.id}"]`).focus();
      if ((slot === "night") !== T.isNight(S)) toast(`${t.name} is your ${slot} theme. Set Night to ${slot === "night" ? "Always" : "Never"} to see it now.`);
    });
    $("#night").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      S.night = b.dataset.v; slot = T.isNight(S) ? "night" : "day"; paint();
    });
    $("#slots").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { slot = b.dataset.v; drawThemes(); } });
    g.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (on() && S.night === "auto") { slot = T.isNight(S) ? "night" : "day"; paint(); } });
    drawThemes();
  })();

  // ── installing: every install key goes straight to the store for the browser you're in, and that browser's card
  // comes first in Problem 4. Phones can't take it (no Android build), and other browsers keep the link to #install. ──
  const ua = g.navigator.userAgent, phone = /Mobi|Android|iPhone|iPad/.test(ua);
  const mine = phone ? null : /Firefox\//.test(ua) ? "firefox" : /Chrome\/|Edg\//.test(ua) ? "chrome" : null;
  const NAME = { firefox: "Firefox", chrome: /Edg\//.test(ua) ? "Edge" : "Chrome" };
  for (const a of $$("[data-get]")) {
    const url = mine && a.dataset[mine];
    if (!url || !/^https:/.test(url)) continue;
    a.href = url;
    if (a.classList.contains("btn")) $("span", a).textContent = "Add to " + NAME[mine];
  }
  for (const also of $$("[data-also]")) {
    const a = $("[data-get]", also.parentElement), other = mine === "firefox" ? "chrome" : "firefox", url = a && a.dataset[other];
    if (mine && url && /^https:/.test(url)) also.innerHTML = `Also for <a href="${url}">${other === "firefox" ? "Firefox" : "Chrome and Edge"}</a>`;
    else if (phone) also.textContent = "Install it on a computer, in Firefox, Chrome or Edge.";
    else if (!mine) also.textContent = "For Firefox, Chrome and Edge.";
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
