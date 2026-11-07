/* BetterWebWork: paints the look at document_start, before WeBWorK draws anything, from the copy app.js leaves in the
   page's own localStorage (BW.boot: { off, s: settings that change the look, themes: the custom themes in use });
   a first visit gets the defaults. It sets html[data-bw-on] (every rule in kit.css and webwork.css hangs off it), the
   theme (themes.look), html[data-bw-page] from the address, and the fonts. app.js, at document_idle, checks all of
   this against the real settings and repaints if the copy was stale. */
(function () {
  const BW = globalThis.BW, root = document.documentElement;
  if (!root || !(document.contentType || "").includes("html")) return;
  const c = BW.boot.read();
  if (c && c.off) return;
  const s = Object.assign({}, BW.DEFAULTS, c && c.s);
  BW.themes.look(s, BW.themes.BUILTIN.concat((c && c.themes) || []), root);
  const r = BW.ww.route(location.href);
  root.dataset.bwPage = r ? r.kind : "page";
  root.dataset.bwOn = "";
  // here from the problem next door (app.js leave() left a note): come in the way that one went out. The content
  // waits unseen until app.js is ready, or two and a half seconds if it never is.
  if (r && r.kind === "problem" && window.top === window) try {
    const go = JSON.parse(sessionStorage.getItem("bww.go") || "null");
    if (go && go.t) {
      sessionStorage.setItem("bww.go", JSON.stringify({ m: go.m }));
      if (go.to === r.key && Date.now() - go.t < 5000 && root.dataset.bwMotion !== "off" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        root.dataset.bwEnter = go.m; root.dataset.bwDir = go.dir;
        setTimeout(() => { if (!root.hasAttribute("data-bw-ready")) delete root.dataset.bwEnter; }, 2500);
      }
    }
  } catch (e) { /* no session storage here */ }
  if (!document.getElementById("bw-fonts")) {
    const st = document.createElement("style");
    st.id = "bw-fonts";
    st.textContent = BW.fontCss((f) => BW.api.runtime.getURL("fonts/" + f));
    root.append(st);
  }
})();
