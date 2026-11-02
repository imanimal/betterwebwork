// Stands in for WeBWorK's MathQuill editor (htdocs/js/MathQuill/mqeditor.js) on problem 4's answer (d), in the page
// itself as WeBWorK's is: it hides the answer's text field, draws a box (span#mq-answer-<id>.mq-editable-field) whose
// typing fills both that field and its MaThQuIlL_<id> LaTeX field, and lists the box in window.answerQuills with a
// mathField whose latex() redraws it. The "LaTeX" is just the typed text; real MathQuill writes TeX.
(function () {
  window.answerQuills = window.answerQuills || {};
  for (const lx of document.querySelectorAll("input[id^=MaThQuIlL_]")) {
    const id = lx.id.slice("MaThQuIlL_".length), input = document.getElementById(id);
    if (!input) continue;
    const box = document.createElement("span"), ta = document.createElement("textarea");
    box.id = "mq-answer-" + id; box.className = "mq-editable-field mq-math-mode";
    ta.rows = 1; ta.setAttribute("aria-label", input.getAttribute("aria-label") || id);
    box.append(ta);
    input.style.display = "none"; input.classList.add("mq-edit");
    input.after(box);
    ta.addEventListener("input", () => { input.value = lx.value = ta.value.trim(); });
    box.input = input; box.latexInput = lx;
    box.mathField = { latex(s) { if (s === undefined) return lx.value; ta.value = input.value = lx.value = s; return this; } };
    ta.value = lx.value;
    window.answerQuills[id] = box;
  }
})();
