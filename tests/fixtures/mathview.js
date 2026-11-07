/* A stand-in for PG 2.18's MathView (htdocs/js/MathView/mathview.js) on the problem fixture: it wraps the answers
   marked data-mv the way MathView does (div.mv-container.input-group around the input and button.codeshard-btn, the
   popover inside the same div) and opens the Equation Editor popover and its Operations menu without Bootstrap's JS,
   placed where Popper puts them (the popover to the right of the key, the menu under its toggle, start-aligned).
   Like MathView, it then watches the page and wraps the answers inside any element added later, skipping only an added
   element that is itself marked data-mv-initialized: moving an answer's div.mv-container makes a new one around it,
   which is added in turn, without end (here it stops at 40 and says so in the console). */
(function () {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
  const CATS = { Basic: ["a+b", "a-b", "a·b", "a/b", "|a|", "√a"], Exponents: ["a^b", "e^a"], Trigonometry: ["sin", "cos", "tan"], "Inverse Trig": ["asin", "acos"], Logarithms: ["ln", "log"], Intervals: ["(a,b)", "[a,b]"], Others: ["π", "∞"] };
  let n = 0;
  for (const field of document.querySelectorAll("input[data-mv]")) attach(field);
  new MutationObserver((list) => {
    for (const m of list) for (const node of m.addedNodes) {
      if (!(node instanceof Element) || node.dataset.mvInitialized === "true") continue;
      if (node.matches("input[data-mv]")) attach(node);
      else node.querySelectorAll("input[data-mv]").forEach(attach);
    }
  }).observe(document.body, { childList: true, subtree: true });

  function attach(field) {
    if (n >= 40) { if (n++ === 40) console.error("fixture MathView: still wrapping answers after 40 editors; something keeps moving one"); return; }
    field.dataset.mvInitialized = "true";
    const id = `mv${n++}`;
    const container = el("div", "mv-container input-group d-inline-flex flex-nowrap w-auto");
    field.after(container);
    const button = el("button", "btn btn-sm btn-secondary codeshard-btn");
    button.type = "button";
    button.setAttribute("aria-label", "Equation Editor");
    button.append(el("i", "fa-solid fa-th"));
    container.append(field, button);

    const pop = el("div", "popover bs-popover-auto fade show");
    pop.id = `popover_${id}`;
    pop.setAttribute("role", "tooltip");
    pop.dataset.popperPlacement = "right";
    const header = el("h3", "popover-header"), title = el("span", "d-flex align-items-center justify-content-between");
    const close = el("button", "btn-close");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    title.append(el("span", "", "Equation Editor"), close);
    header.append(title);
    const body = el("div", "popover-body"), content = el("div");
    const row = el("div", "d-flex justify-content-center align-items-center"), nav = el("ul", "nav nav-tabs"), li = el("li", "dropdown");
    nav.setAttribute("role", "tablist");
    li.setAttribute("role", "presentation");
    const toggle = el("button", "btn btn-secondary dropdown-toggle", "Operations"), menu = el("ul", "dropdown-menu");
    toggle.type = "button";
    menu.setAttribute("role", "menu");
    li.append(toggle, menu); nav.append(li); row.append(nav);
    const tabs = el("div", "tab-content");
    Object.keys(CATS).forEach((cat, i) => {
      const item = el("a", "dropdown-item" + (i ? "" : " active"), cat);
      item.href = `#mvtab_${id}_${i}`;
      const mi = el("li"); mi.append(item); menu.append(mi);
      const pane = el("div", "tab-pane fade" + (i ? "" : " active show")), grid = el("ul", "mvthumbnails d-flex flex-wrap justify-content-evenly m-0 p-0 list-unstyled");
      pane.id = `mvtab_${id}_${i}`;
      for (const t of CATS[cat]) { const g = el("li", "mvspan3 mx-2 mb-3"), a = el("a", "mvthumbnail text-center", t); a.href = "#"; g.append(a); grid.append(g); }
      pane.append(grid); tabs.append(pane);
      item.addEventListener("click", (e) => {
        e.preventDefault();
        for (const x of menu.querySelectorAll(".dropdown-item")) x.classList.toggle("active", x === item);
        for (const x of tabs.children) x.classList.toggle("active", x === pane), x.classList.toggle("show", x === pane);
        shut();
      });
    });
    const card = el("div", "card bg-light p-2 overflow-auto"), viewer = el("div", "mviewer d-flex justify-content-center align-items-center");
    card.append(viewer);
    content.append(row, tabs, card);
    body.append(content);
    pop.append(el("div", "popover-arrow"), header, body);

    const shut = () => { menu.classList.remove("show"); toggle.classList.remove("show"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
      if (menu.classList.toggle("show")) {
        toggle.classList.add("show"); toggle.setAttribute("aria-expanded", "true");
        Object.assign(menu.style, { position: "absolute", inset: "0px auto auto 0px", margin: "0px", transform: `translate(0px, ${toggle.offsetHeight + 2}px)` });
      } else shut();
    });
    const hide = () => { pop.remove(); button.removeAttribute("aria-describedby"); shut(); };
    close.addEventListener("click", hide);
    button.addEventListener("click", () => {
      if (pop.isConnected) return hide();
      viewer.textContent = "`" + field.value + "`";
      container.append(pop);
      button.setAttribute("aria-describedby", pop.id);
      const left = button.offsetLeft + button.offsetWidth + 8, top = button.offsetTop + button.offsetHeight / 2 - pop.offsetHeight / 2;
      Object.assign(pop.style, { position: "absolute", inset: "0px auto auto 0px", margin: "0px", transform: `translate(${left}px, ${Math.round(top)}px)` });
    });
  }
})();
