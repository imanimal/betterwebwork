/* BetterWebWork: the background script. Its one job: open the settings once, on install, so the first thing you see
   is where everything is (the page explains the gear on every WeBWorK page). Firefox runs it as an event page,
   Chrome as the service worker, so it stands alone: no other script, no DOM. */
(function (g) {
  const api = g.browser || g.chrome;
  api.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") api.tabs.create({ url: api.runtime.getURL("src/pages/options.html#welcome") });
  });
})(globalThis);
