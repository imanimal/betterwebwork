/* BetterWebWork: the options page. The same settings panel as the drawer on WeBWorK pages (ui/settings.js), painted
   in the theme it sets. #welcome (opened once, on install) adds the three things to know first. */
(function () {
  const BW = globalThis.BW, api = BW.api, T = BW.themes, root = document.documentElement;
  async function paint() {
    if (BW.previewing) return;
    const d = await BW.store.all(), was = root.dataset.bwLook;
    T.look(d.settings, T.BUILTIN.concat(d.themes), root);
    if (was && was !== root.dataset.bwLook) BW.reicon(document);
  }
  api.storage.onChanged.addListener((ch, area) => { if (area === "local" && (ch.settings || ch.themes)) paint(); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paint);
  paint().then(() => {
    if (location.hash === "#welcome") document.getElementById("welcome").hidden = false;
    BW.settings.mount(document.getElementById("panel"), { site: null, section: location.hash.slice(1) || null });
  });
})();
