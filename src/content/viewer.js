/* BetterWebWork: the image viewer. WeBWorK opens a graph (.image-view-elt) in a Bootstrap modal that greys the page
   and blocks it; app.js catches that click first and calls BW.viewer.open(el) instead. This is a window that moves by
   its bar, resizes from any edge or corner, and leaves the page usable around it. The image lifts off the page and
   flies into the window, and back to its spot when the window closes (the spot stays held while it's out). Inside,
   the wheel or a pinch zooms at the pointer, a click zooms in (at the most zoom it goes back to fit), dragging pans,
   and + − 0 and the arrow keys do the same from the keyboard. Each image gets its own window; with the extension off
   for the site, they hide (data-bw-x) and WeBWorK's own viewer is back. */
(function (g) {
  const BW = (g.BW = g.BW || {}), K = BW.kit, esc = BW.u.esc;
  const root = document.documentElement;
  const MINW = 240, MINH = 180, ZMAX = 8, Z0 = 2147482100, EASE = "cubic-bezier(.2, .9, .3, 1)";
  const open = new Map(); // page element → its window's close()
  const stack = [];       // windows, back to front
  let hinted = false, made = 0;
  const calm = () => root.dataset.bwMotion === "off" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // an animation's end, or a moment after it should have ended (a background tab may never run it)
  const ended = (a) => Promise.race([a.finished.catch(() => {}), new Promise((r) => setTimeout(r, a.effect.getTiming().duration + 250))]);
  const seen = (r) => r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;

  /** The image's own size: an <img>'s pixels, or an SVG's view box (in points, as PG's viewer reads it). */
  function natural(src, r) {
    if (src.tagName.toLowerCase() === "img") return { w: src.naturalWidth || r.width || 300, h: src.naturalHeight || r.height || 200 };
    const vb = src.viewBox && src.viewBox.baseVal;
    return vb && vb.width ? { w: (vb.width * 4) / 3, h: (vb.height * 4) / 3 } : { w: r.width || 300, h: r.height || 200 };
  }

  /** A copy for the window, without the sizes WeBWorK gave it; an SVG's ids get a prefix so they don't clash. */
  function copy(src) {
    const c = src.cloneNode(true);
    c.classList.remove("image-view-elt", "bw-figure", "bw-lifted");
    for (const a of ["tabindex", "role", "width", "height", "style", "id"]) c.removeAttribute(a);
    if (c.tagName.toLowerCase() !== "svg") { c.draggable = false; return c; }
    let html = c.outerHTML;
    const ids = (html.match(/\bid="[^"]*"/g) || []).map((m) => m.slice(4, -1)).sort((a, b) => b.length - a.length);
    for (const id of ids) html = html.replaceAll(id, `bwv${made}-${id}`);
    return BW.u.frag(html).firstElementChild;
  }

  function toFront(v) {
    const i = stack.indexOf(v); if (i >= 0) stack.splice(i, 1);
    stack.push(v);
    stack.forEach((w, n) => (w.style.zIndex = String(Z0 + n)));
  }

  /** A copy of the image flying from one rect to another (it sits at `to`; `clip` trims where it starts). */
  function fly(pic, from, to, clip) {
    const gh = pic.cloneNode(true);
    gh.className = "bw-vghost"; gh.setAttribute("data-bw-x", ""); gh.removeAttribute("style");
    Object.assign(gh.style, { left: to.left + "px", top: to.top + "px", width: to.width + "px", height: to.height + "px" });
    document.body.append(gh);
    const at = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    const a = gh.animate([{ transform: at, clipPath: clip || "inset(0px)" }, { transform: "none", clipPath: "inset(0px)" }], { duration: 380, easing: EASE });
    return ended(a).then(() => gh.remove());
  }

  function view(src) {
    if (open.has(src)) { open.get(src).front(); return; }
    made++;
    const r0 = src.getBoundingClientRect(), nat = natural(src, r0);
    const alt = (src.getAttribute("alt") || src.getAttribute("aria-label") || "").trim();
    const name = alt && alt.length <= 48 ? alt : "Image";
    const v = K.el(`<section class="bw-view bw-ui" data-bw-x role="dialog" aria-label="${esc(name)}" tabindex="-1">
      <header class="bw-vbar"><span class="bw-vt">${esc(name)}</span>
        <span class="bw-vzoom" role="group" aria-label="Zoom">${K.key({ icon: "dash", title: "Zoom out (−)", cls: "ghost sm", attrs: 'data-v="out"' })}<button type="button" class="bw-vpct" data-v="fit" title="Fit to the window (0)">100%</button>${K.key({ icon: "plus", title: "Zoom in (+)", cls: "ghost sm", attrs: 'data-v="in"' })}</span>
        ${K.key({ icon: "close", title: "Close (Esc)", cls: "ghost sm", attrs: 'data-v="close"' })}</header>
      <div class="bw-vstage"></div>
      ${["n", "e", "s", "w", "ne", "se", "sw", "nw"].map((e) => `<span class="bw-vedge" data-e="${e}" aria-hidden="true"></span>`).join("")}
      <span class="bw-vgrip" aria-hidden="true">${BW.ic("grip")}</span>
    </section>`);
    const bar = v.querySelector(".bw-vbar"), stage = v.querySelector(".bw-vstage"), pct = v.querySelector(".bw-vpct");
    const pic = copy(src);
    pic.classList.add("bw-vpic");
    stage.append(pic);
    document.body.append(v);
    toFront(v);

    const s = { z: 1, x: 0, y: 0, fit: true, L: 0, T: 0, W: 0, H: 0 };
    const barH = bar.offsetHeight;
    const vw = () => root.clientWidth || innerWidth;
    const st = () => ({ w: stage.clientWidth, h: stage.clientHeight });
    const fitZ = () => { const a = st(); return Math.max(.01, Math.min(a.w / nat.w, a.h / nat.h)); };
    const zmin = () => Math.min(fitZ(), 1) / 2, zmax = () => Math.max(ZMAX, fitZ());

    /** The window where s says, kept so its bar can always be reached. */
    function frame() {
      s.W = Math.min(s.W, vw()); s.H = Math.min(s.H, innerHeight);
      s.L = clamp(s.L, 72 - s.W, vw() - 72); s.T = clamp(s.T, 0, innerHeight - barH);
      Object.assign(v.style, { left: s.L + "px", top: s.T + "px", width: s.W + "px", height: s.H + "px" });
    }
    /** The image where s says: centred along a side where it's smaller than the window, never leaving a gap where it's bigger. */
    function place() {
      const a = st(), w = nat.w * s.z, h = nat.h * s.z;
      s.x = w <= a.w ? (a.w - w) / 2 : clamp(s.x, a.w - w, 0);
      s.y = h <= a.h ? (a.h - h) / 2 : clamp(s.y, a.h - h, 0);
      Object.assign(pic.style, { width: w + "px", height: h + "px", transform: `translate(${s.x}px, ${s.y}px)` });
      pct.textContent = Math.round(s.z * 100) + "%";
      stage.classList.toggle("at-max", s.z >= zmax() - 1e-3);
      stage.classList.toggle("big", w > a.w + 1 || h > a.h + 1);
    }
    function fit() { s.z = fitZ(); s.fit = true; place(); }
    /** Zoom to z keeping the stage point (px, py) still: the pointer, or the middle. */
    function zoomTo(z, px, py) {
      const a = st();
      if (px == null) { px = a.w / 2; py = a.h / 2; }
      z = clamp(z, zmin(), zmax());
      const k = z / s.z;
      s.x = px - (px - s.x) * k; s.y = py - (py - s.y) * k; s.z = z; s.fit = false;
      place();
    }
    let glideT = 0;
    const glide = (fn) => { if (!calm()) { pic.classList.add("glide"); clearTimeout(glideT); glideT = setTimeout(() => pic.classList.remove("glide"), 240); } fn(); };
    const at = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

    // the first size: the image a bit bigger than on the page, within most of the screen, centred where it was
    const grow = Math.min(1.6, Math.max(1, 520 / nat.w, (r0.width * 1.2) / nat.w));
    const k = Math.min(1, (vw() * 0.86) / (nat.w * grow), (innerHeight * 0.82 - barH) / (nat.h * grow));
    s.W = Math.max(MINW, Math.round(nat.w * grow * k)); s.H = Math.max(MINH, Math.round(nat.h * grow * k + barH));
    s.L = r0.left + r0.width / 2 - s.W / 2; s.T = r0.top + r0.height / 2 - s.H / 2;
    frame(); fit();

    // ── zoom and pan ──
    let hint = null;
    const unhint = () => { if (hint) { hint.remove(); hint = null; } };
    if (!hinted) {
      hinted = true;
      hint = K.el('<span class="bw-vhint" aria-hidden="true">Scroll or click to zoom, drag to move around</span>');
      stage.append(hint); setTimeout(unhint, 3200);
    }
    stage.addEventListener("wheel", (e) => {
      e.preventDefault(); unhint();
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) { s.x -= e.deltaX; s.fit = false; place(); return; }
      const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1) * (e.ctrlKey ? 4 : 1);
      zoomTo(s.z * Math.exp(-d * 0.0018), ...at(e));
    }, { passive: false });
    const pts = new Map();
    let drag = null, pinch = null, moved = false;
    const spread = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    stage.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault(); toFront(v); unhint();
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, sx: s.x, sy: s.y }; moved = false; }
      else if (pts.size === 2) { pinch = { d: spread(), z: s.z }; moved = true; }
    });
    stage.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        zoomTo((pinch.z * spread()) / pinch.d, ...at({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }));
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true; stage.classList.add("grabbing");
      s.x = drag.sx + dx; s.y = drag.sy + dy; s.fit = false; place();
    });
    const lift = (e) => {
      if (!pts.delete(e.pointerId)) return;
      if (pts.size < 2) pinch = null;
      if (pts.size === 1) { const p = [...pts.values()][0]; drag = { x: p.x, y: p.y, sx: s.x, sy: s.y }; return; }
      if (pts.size) return;
      stage.classList.remove("grabbing");
      if (e.type === "pointerup" && drag && !moved) {
        const p = at(e);
        glide(() => (e.shiftKey || e.altKey ? zoomTo(s.z / 2, ...p) : s.z >= zmax() - 1e-3 ? fit() : zoomTo(s.z * 2, ...p)));
      }
      drag = null;
    };
    stage.addEventListener("pointerup", lift);
    stage.addEventListener("pointercancel", lift);

    // ── move by the bar, resize by the edges ──
    bar.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("button")) return;
      e.preventDefault(); toFront(v);
      const ox = e.clientX - s.L, oy = e.clientY - s.T;
      bar.setPointerCapture(e.pointerId); v.classList.add("moving");
      const mv = (e) => { s.L = e.clientX - ox; s.T = e.clientY - oy; frame(); };
      bar.addEventListener("pointermove", mv);
      bar.addEventListener("lostpointercapture", () => { bar.removeEventListener("pointermove", mv); v.classList.remove("moving"); }, { once: true });
    });
    for (const h of v.querySelectorAll(".bw-vedge")) h.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault(); toFront(v); unhint();
      const ed = h.dataset.e, o = { x: e.clientX, y: e.clientY, L: s.L, T: s.T, W: s.W, H: s.H, sx: s.x, sy: s.y };
      h.setPointerCapture(e.pointerId); v.classList.add("sizing");
      const mv = (e) => {
        const dx = e.clientX - o.x, dy = e.clientY - o.y;
        if (ed.includes("e")) s.W = Math.max(MINW, o.W + dx);
        if (ed.includes("s")) s.H = Math.max(MINH, o.H + dy);
        if (ed.includes("w")) { s.W = Math.max(MINW, o.W - dx); s.L = o.L + o.W - s.W; }
        if (ed.includes("n")) { s.H = Math.min(o.T + o.H, Math.max(MINH, o.H - dy)); s.T = o.T + o.H - s.H; }
        frame();
        if (s.fit) fit(); else { s.x = o.sx - (s.L - o.L); s.y = o.sy - (s.T - o.T); place(); }
      };
      h.addEventListener("pointermove", mv);
      h.addEventListener("lostpointercapture", () => { h.removeEventListener("pointermove", mv); v.classList.remove("sizing"); }, { once: true });
    });
    const onResize = () => { frame(); if (s.fit) fit(); else place(); };
    window.addEventListener("resize", onResize);

    // ── keys ──
    v.addEventListener("pointerdown", () => { toFront(v); if (!v.contains(document.activeElement)) v.focus({ preventScroll: true }); }, true);
    v.addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]"); if (!b) return;
      const act = b.dataset.v;
      if (act === "close") close();
      else glide(() => (act === "fit" ? fit() : zoomTo(s.z * (act === "in" ? 1.5 : 1 / 1.5))));
    });
    v.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const pan = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }[e.key];
      if (e.key === "Escape") close();
      else if (e.key === "+" || e.key === "=") glide(() => zoomTo(s.z * 1.5));
      else if (e.key === "-" || e.key === "_") glide(() => zoomTo(s.z / 1.5));
      else if (e.key === "0") glide(fit);
      else if (pan && !e.target.closest("button")) glide(() => { s.x += pan[0]; s.y += pan[1]; s.fit = false; place(); });
      else return;
      e.preventDefault(); e.stopPropagation();
    });

    // ── in and out: the image leaves its spot on the page for the window, and goes back ──
    src.classList.add("bw-lifted");
    if (calm() || !seen(r0)) v.classList.add("pop");
    else {
      const to = pic.getBoundingClientRect(); // before the window's own entrance moves it
      pic.style.visibility = "hidden";
      v.animate([{ opacity: 0, transform: "scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: EASE });
      fly(pic, r0, to).then(() => (pic.style.visibility = ""));
    }
    v.focus({ preventScroll: true });

    let shut = false;
    function close() {
      if (shut) return; shut = true;
      open.delete(src); stack.splice(stack.indexOf(v), 1);
      window.removeEventListener("resize", onResize);
      const back = v.contains(document.activeElement);
      const done = () => { v.remove(); src.classList.remove("bw-lifted"); };
      const to = src.isConnected ? src.getBoundingClientRect() : null;
      if (back && src.isConnected) src.focus({ preventScroll: true });
      if (calm() || !to || !seen(to)) {
        if (calm()) done(); else ended(v.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(.97)" }], { duration: 160, easing: EASE, fill: "forwards" })).then(done);
        return;
      }
      // what shows of the image in the window, as an inset of its whole rect, so the copy starts trimmed like it
      const p = pic.getBoundingClientRect(), a = stage.getBoundingClientRect(), fx = to.width / p.width, fy = to.height / p.height;
      const clip = `inset(${Math.max(0, a.top - p.top) * fy}px ${Math.max(0, p.right - a.right) * fx}px ${Math.max(0, p.bottom - a.bottom) * fy}px ${Math.max(0, a.left - p.left) * fx}px)`;
      pic.style.visibility = "hidden";
      v.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(.97)" }], { duration: 200, easing: EASE, fill: "forwards" });
      fly(pic, p, to, clip).then(done);
    }
    const ctl = { close, front: () => { toFront(v); v.focus({ preventScroll: true }); v.animate([{ transform: "scale(1.015)" }, { transform: "none" }], { duration: calm() ? 0 : 180, easing: EASE }); } };
    open.set(src, ctl);
    return ctl;
  }

  BW.viewer = { open: view, closeAll: () => { for (const c of [...open.values()]) c.close(); } };
})(globalThis);
