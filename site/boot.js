/* Paints the theme before the page draws, the way the extension's boot.js does: the settings this page keeps in
   localStorage go through the extension's own BW.themes.look(), so the night rule and the themes are the real ones. */
(function (g) {
  const KEY = "bww.site";
  const DEFAULTS = { theme: "paper", nightTheme: "paper-dark", night: "auto" };
  let saved = {};
  try { saved = JSON.parse(g.localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  const site = (g.BWSite = { KEY, settings: Object.assign({}, DEFAULTS, saved) });
  site.save = () => { try { g.localStorage.setItem(KEY, JSON.stringify(site.settings)); } catch (e) { /* private window: it just won't remember */ } };
  site.paint = () => { const root = g.document.documentElement; root.dataset.bwOn = ""; return g.BW.themes.look(site.settings, null, root); };
  site.paint();
})(globalThis);
