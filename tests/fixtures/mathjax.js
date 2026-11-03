/* A stand-in for WeBWorK's MathJax 3 (CHTML) on the fixture pages: once the page is parsed it turns \( \) and \[ \] in
   the text into mjx-container elements (display="true" for \[ \]) holding the TeX as it was typed, and settles
   MathJax.startup.promise, which is what page.js waits on before app.js's tidy() keeps blanks with their labels. */
(function () {
  let settle;
  window.MathJax = { startup: { promise: new Promise((r) => (settle = r)) }, typesetPromise: () => Promise.resolve() };
  const TEX = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g, HAS = /\\\(|\\\[/;
  function draw() {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest("script, style, textarea, mjx-container") || !HAS.test(n.data) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const found = [];
    for (let n = walk.nextNode(); n; n = walk.nextNode()) found.push(n);
    for (const n of found) {
      const out = document.createDocumentFragment();
      let at = 0;
      for (const m of n.data.matchAll(TEX)) {
        out.append(n.data.slice(at, m.index));
        const mj = document.createElement("mjx-container");
        mj.className = "MathJax"; mj.setAttribute("jax", "CHTML");
        if (m[2] != null) { mj.setAttribute("display", "true"); mj.style.display = "block"; mj.style.textAlign = "center"; }
        mj.textContent = m[1] != null ? m[1] : m[2];
        out.append(mj);
        at = m.index + m[0].length;
      }
      out.append(n.data.slice(at));
      n.replaceWith(out);
    }
    settle();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", draw, { once: true });
  else draw();
})();
