/* BetterWebWork: the toolbar popup (Alt+Shift+W). This site (on or off, and the settings on the page), the Day and
   Night themes (a slot opens the theme browser), and what's due soon across your courses, from the dates the course
   and set pages showed (storage.local sets). */
(function () {
  const BW = globalThis.BW, api = BW.api, T = BW.themes, K = BW.kit, u = BW.u, esc = u.esc, ic = (n, c) => BW.ic(n, c);
  const app = document.getElementById("app"), root = document.documentElement;
  let tab = null, R = null, D = null;

  async function draw() {
    D = await BW.store.all();
    const S = D.settings, all = T.BUILTIN.concat(D.themes), find = (id) => all.find((t) => t.id === id);
    u.setClock24(S.clock24);
    T.look(S, all, root);
    const on = R && !S.off[R.host];
    const site = R
      ? `<div class="pp-sec"><label class="pp-row"><div><b>${esc(R.host)}</b><span>${on ? "Restyled by BetterWebWork" : "Shown as WeBWorK draws it"}</span></div><input type="checkbox" class="bw-switch" id="site" aria-label="Restyle ${esc(R.host)}"${on ? " checked" : ""}></label>
         ${on ? K.key({ label: "Settings on this page", icon: "gear", cls: "sm", act: "here" }) : ""}</div>`
      : `<div class="pp-sec"><p class="bw-note">Open a WeBWorK page, one with /webwork2/ in its address, and BetterWebWork restyles it.</p></div>`;
    const nightOn = S.night !== "off", nowNight = nightOn && T.isNight(S);
    const slot = (which, t, label) => `<button type="button" class="bw-slot${(which === "night") === nowNight ? " on" : ""}" data-act="look">${K.preview(t)}<span class="bw-sh">${ic(which === "night" ? "moon" : "today", "sm")}${label}</span><span class="bw-snm">${esc(t.name)}</span></button>`;
    const look = `<div class="pp-sec"><div class="pp-h">${ic("palette", "sm")}Theme</div><div class="pp-slots">${slot("day", find(S.theme) || T.BUILTIN[0], nightOn ? "Day" : "Theme")}${nightOn ? slot("night", find(S.nightTheme) || T.byId("paper-dark"), "Night") : ""}</div></div>`;
    app.replaceChildren(u.frag(`<div class="pp-head"><span class="bw-logo" aria-hidden="true">W</span><b>BetterWebWork</b>${K.key({ icon: "gear", title: "All settings", cls: "ghost", act: "options" })}</div>${site}${look}${due()}`));
  }

  function due() {
    const t = Date.now(), soon = [];
    for (const [k, s] of Object.entries(D.sets)) {
      if (s.closed) continue;
      const late = s.due && s.due < t && s.lateDue > t, when = late ? s.lateDue : s.due;
      if (!when || when < t || when > t + 7 * u.DAY || (s.opens && s.opens > t)) continue;
      soon.push({ k, s, when, late });
    }
    soon.sort((a, b) => a.when - b.when);
    const rows = soon.slice(0, 6).map(({ s, when, late }) => {
      const d = u.due(when, t);
      return `<li><a href="${esc(s.href || `${s.base}/${s.course}/`)}" data-act="go"><b>${esc(s.name)}</b><span class="pp-c">${esc(BW.ww.code(s.course))} · ${esc(late ? "late credit until " + d.abs : d.abs)}</span><span class="bw-tag ${late ? "soon" : d.c || "quiet"}">${esc(d.t)}</span></a></li>`;
    }).join("");
    return `<div class="pp-sec"><div class="pp-h">${ic("clock", "sm")}Due this week</div>${rows ? `<ul class="pp-due">${rows}</ul>` : '<p class="bw-note">Nothing due in the next seven days that BetterWebWork has seen. Dates come from the course pages you open.</p>'}</div>`;
  }

  app.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-act]"); if (!a) return;
    const act = a.dataset.act;
    if (act === "options" || act === "look") { e.preventDefault(); await api.runtime.openOptionsPage(); window.close(); }
    else if (act === "here") { try { await api.tabs.sendMessage(tab.id, { type: "bw-open-settings" }); window.close(); } catch (err) { K.toast("Reload the page first, then try again."); } }
    else if (act === "go") { e.preventDefault(); if (R) await api.tabs.update(tab.id, { url: a.href }); else await api.tabs.create({ url: a.href }); window.close(); }
  });
  app.addEventListener("change", async (e) => {
    if (e.target.id !== "site" || !R) return;
    const off = Object.assign({}, D.settings.off);
    if (e.target.checked) delete off[R.host]; else off[R.host] = true;
    await BW.store.set({ off });
  });
  api.storage.onChanged.addListener((ch, area) => { if (area === "local" && (ch.settings || ch.themes || ch.sets)) draw(); });

  api.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
    tab = t || null;
    R = tab && tab.url ? BW.ww.route(tab.url) : null;
    draw();
  });
})();
