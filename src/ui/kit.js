/* BetterWebWork: the parts every surface builds (their classes are in ui/kit.css). Static parts are HTML strings,
   parts that listen are elements. Used by app.js inside WeBWorK, and by the popup and options pages. Everything we
   add to a WeBWorK page carries data-bw-x, so turning the extension off for a site hides it at once. */
(function (g) {
  const BW = (g.BW = g.BW || {}), esc = BW.u.esc;
  const MAC = /Mac|iPhone|iPad/.test(g.navigator.platform || g.navigator.userAgent || "");

  /** One element from an HTML string. */
  const el = (html) => BW.u.frag(String(html).trim()).firstElementChild;

  /** "Mod+Shift+Enter" as this platform writes it: "Ctrl+Shift+Enter", or "⌘⇧↩" on a Mac. */
  function combo(c) {
    const parts = c.split("+");
    if (!MAC) return parts.map((k) => (k === "Mod" ? "Ctrl" : k)).join("+");
    return parts.map((k) => ({ Mod: "⌘", Shift: "⇧", Alt: "⌥", Enter: "↩" }[k] || k)).join("");
  }

  /** A key: { label, icon, cls, title, href, act, id, kbd, attrs }. Icon-only keys need a title (it's also the label). */
  function key(o) {
    const iconOnly = !o.label;
    const cls = `bw-key${o.cls ? " " + o.cls : ""}${iconOnly ? " icon" : ""}`;
    const title = o.title || (o.kbd ? `${o.label} (${combo(o.kbd)})` : "");
    const a = `class="${cls}"${title ? ` title="${esc(title)}"` : ""}${iconOnly ? ` aria-label="${esc(o.title || "")}"` : ""}${o.act ? ` data-act="${esc(o.act)}"` : ""}${o.id ? ` data-id="${esc(o.id)}"` : ""}${o.attrs ? " " + o.attrs : ""}`;
    const inner = `${o.icon ? BW.ic(o.icon) : ""}${o.label ? `<span class="bw-kl">${esc(o.label)}</span>` : ""}${o.kbd && !iconOnly ? `<kbd>${esc(combo(o.kbd))}</kbd>` : ""}`;
    return o.href ? `<a href="${esc(o.href)}" ${a}>${inner}</a>` : `<button type="button" ${a}${o.disabled ? " disabled" : ""}>${inner}</button>`;
  }

  /** A number with its label: a plain figure in Standard, an LCD inlay in Pocket. */
  const stat = (label, value, cls, small, title) =>
    `<div class="bw-stat${cls ? " " + cls : ""} boot"${title ? ` title="${esc(title)}"` : ""}><span class="bw-sl">${esc(label)}</span><span class="bw-sn">${esc(value)}${small ? `<small>${esc(small)}</small>` : ""}</span></div>`;

  /** A small drawing of a theme, from its own tokens (the theme browser's cards and slots). */
  function preview(t) {
    const tk = t.tokens, v = ["bg", "bg2", "surface", "line", "text", "chrome-bg", "accent", "disp-bg"].map((k) => `--p-${k}:${tk[k]}`).join(";");
    return `<span class="bw-tpv" data-look="${t.look}" style="${v}" aria-hidden="true"><span class="pv-card"><span class="pv-band"></span><span class="pv-l1"></span><span class="pv-l2"></span><span class="pv-in"></span><span class="pv-key"></span>${t.look === "pocket" ? '<span class="pv-lcd"></span>' : ""}</span></span>`;
  }

  /** A short message at the bottom right: toast("Theme imported", { action: "Undo", onAction, ms }). */
  function toast(msg, o = {}) {
    let box = document.querySelector(".bw-toasts");
    if (!box) { box = el('<div class="bw-toasts bw-ui" data-bw-x role="status" aria-live="polite"></div>'); document.body.append(box); }
    const t = el(`<div class="bw-toast"><span>${esc(msg)}</span>${o.action ? key({ label: o.action, cls: "ghost sm" }) : ""}</div>`);
    const done = () => t.remove();
    if (o.action) t.querySelector("button").addEventListener("click", () => { done(); o.onAction && o.onAction(); });
    box.append(t);
    setTimeout(done, o.ms || 4200);
    return t;
  }

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /** A panel from the right with a scrim: { title, icon, onClose } → { el, body, close }. Esc and the scrim close it;
      focus stays inside while it's open and goes back where it was after. */
  function drawer(o) {
    const back = document.activeElement;
    const scrim = el('<div class="bw-scrim bw-ui" data-bw-x></div>');
    const d = el(`<aside class="bw-drawer bw-ui" data-bw-x role="dialog" aria-modal="true" aria-labelledby="bw-dh-t">
      <div class="bw-dh"><h2 id="bw-dh-t">${o.icon ? BW.ic(o.icon) : ""}${esc(o.title)}</h2>${key({ icon: "close", title: "Close", cls: "ghost", act: "close" })}</div>
      <div class="bw-dbody"></div></aside>`);
    let open = true;
    function close() {
      if (!open) return; open = false;
      document.removeEventListener("keydown", onKey, true);
      scrim.remove(); d.remove();
      if (back && back.focus) back.focus();
      o.onClose && o.onClose();
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key !== "Tab") return;
      const f = [...d.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      else if (!d.contains(document.activeElement)) { e.preventDefault(); f[0].focus(); }
    }
    scrim.addEventListener("click", close);
    d.querySelector('[data-act="close"]').addEventListener("click", close);
    document.addEventListener("keydown", onKey, true);
    document.body.append(scrim, d);
    d.querySelector('[data-act="close"]').focus();
    return { el: d, body: d.querySelector(".bw-dbody"), close };
  }

  /** A key that asks twice: the first press arms it (label `ask`), a second within `ms` runs `fn`. */
  function twice(btn, ask, fn, ms = 4000) {
    if (btn.classList.contains("armed")) { btn.classList.remove("armed"); clearTimeout(btn._bwT); fn(); return; }
    const lab = btn.querySelector(".bw-kl"), was = lab ? lab.textContent : "";
    btn.classList.add("armed"); if (lab) lab.textContent = ask;
    btn._bwT = setTimeout(() => { btn.classList.remove("armed"); if (lab) lab.textContent = was; }, ms);
  }

  /** Save a file the browser downloads. */
  function download(name, text, type = "application/json") {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el(`<a download="${esc(name)}" href="${url}" hidden data-bw-x></a>`);
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  BW.kit = { el, MAC, combo, key, stat, preview, toast, drawer, twice, download };
})(globalThis);
