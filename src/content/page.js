/* BetterWebWork: the one script that runs in the page itself, because content scripts can't reach the page's own
   objects (Chrome walls them off entirely). app.js adds it when it needs one of two things:
     "bww-typeset"  draw the maths app.js marked [data-bw-typeset] (WeBWorK 2.19's feedback, copied out of a popover)
                    with WeBWorK's own MathJax
     "bww-quill"    redraw each MathQuill box whose LaTeX field app.js marked [data-bw-quill] (a draft put back) from
                    that field, through WeBWorK's window.answerQuills, and mark the field "ok" when it could
     "bww-maths"    answer "bww-maths-done" once WeBWorK's MathJax has drawn the page (at once when there's none)
   It sends nothing anywhere. */
(function () {
  function typeset() {
    const MJ = window.MathJax, els = Array.from(document.querySelectorAll("[data-bw-typeset]"));
    if (!els.length || !MJ) return;
    const ready = MJ.startup && MJ.startup.promise ? MJ.startup.promise : Promise.resolve();
    ready.then(() => (MJ.typesetPromise ? MJ.typesetPromise(els) : null)).then(() => els.forEach((e) => e.removeAttribute("data-bw-typeset"))).catch(() => {});
  }
  function quill() {
    for (const lx of document.querySelectorAll("input[data-bw-quill]")) {
      const id = lx.name.slice("MaThQuIlL_".length), q = window.answerQuills && window.answerQuills[id];
      try {
        // no box drawn yet: MathQuill draws it from the field when it gets there
        if (!document.getElementById("mq-answer-" + id)) lx.dataset.bwQuill = "ok";
        else if (q && q.mathField) { q.mathField.latex(lx.value); lx.dataset.bwQuill = "ok"; }
      } catch (e) { /* stays unmarked: app.js puts WeBWorK's answer back */ }
    }
  }
  function maths() {
    const MJ = window.MathJax, done = () => document.dispatchEvent(new CustomEvent("bww-maths-done"));
    // MathJax's startup promise settles after its first typeset; before its script has run, only the config is there
    if (MJ && MJ.startup && MJ.startup.promise) MJ.startup.promise.then(done, done);
    else if (MJ && document.readyState !== "complete") window.addEventListener("load", maths, { once: true });
    else done();
  }
  document.addEventListener("bww-typeset", typeset);
  document.addEventListener("bww-quill", quill);
  document.addEventListener("bww-maths", maths);
})();
