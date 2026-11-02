/* BetterWebWork: the settings, one panel for the drawer on WeBWorK pages and for the options page.
   Sections: Look (when to switch to night first, then the Day and Night slots above the theme grid: a card fills the
   selected slot; then adjust, import and make a theme), Reading, Problems, Keyboard, Sites and data.
   Every change saves at once to storage.local and every open WeBWorK tab repaints from storage.onChanged. Only the
   color editor has a Save key; while it's open it previews on the page it's drawn on and sets BW.previewing, which
   tells app.js not to repaint over it.

   BW.settings.mount(host, { site, section }) → { destroy() }. `site` is the WeBWorK host the panel was opened on
   (null on the options page); `section` scrolls to one of SECTIONS. */
(function (g) {
  const BW = g.BW, api = BW.api, T = BW.themes, K = BW.kit, esc = BW.u.esc;

  const NAMES = { bg: "Page", bg2: "Answer fields", surface: "Cards", surface2: "Wells and keys", line: "Lines", text: "Text", text2: "Body text", text3: "Quiet text",
    "chrome-bg": "Bands", "chrome-fg": "Text on bands", accent: "Submit key", "on-accent": "Text on Submit", warn: "Due soon", bad: "Incorrect", "on-bad": "Text on incorrect",
    ok: "Correct", acc2: "Notes", "disp-bg": "LCD", "disp-fg": "LCD digits", "disp-hot": "LCD, due soon", "disp-bad": "LCD, overdue",
    k1: "Course 1", k2: "Course 2", k3: "Course 3", k4: "Course 4", k5: "Course 5", k6: "Course 6" };
  const MAIN = ["bg", "surface", "line", "text", "text2", "text3", "accent", "on-accent", "ok", "bad", "warn", "chrome-bg", "chrome-fg"];
  const SECTIONS = [["look", "Look"], ["reading", "Reading"], ["problems", "Problems"], ["keys", "Keyboard"], ["site", "Sites and data"]];

  function mount(host, ctx = {}) {
    const st = { S: null, mine: [], hist: 0, slot: null, edit: null, idea: "", paste: "", note: null, open: {} };
    const all = () => T.BUILTIN.concat(st.mine);
    // icons in the look the page is about to show, not the one it showed a moment ago
    const as = () => (BW.previewing && st.edit ? st.edit.look : T.pick(st.S, all()).look);
    const ic = (n, c) => BW.ic(n, c, as());
    const slotKey = () => (st.slot === "night" && st.S.night !== "off" ? "nightTheme" : "theme");
    const save = (patch) => BW.store.set(patch);

    async function load() {
      const d = await BW.store.all();
      st.S = d.settings; st.mine = d.themes; st.hist = Object.keys(d.history).length;
      if (st.S.night === "off") st.slot = "day";
      else if (!st.slot) st.slot = T.isNight(st.S) ? "night" : "day";
      render();
    }

    function render() {
      const f = document.activeElement, k = f && host.contains(f) ? f.dataset.k : null;
      host.replaceChildren(BW.u.frag(`<nav class="bw-set-nav" aria-label="Settings sections">${SECTIONS.map(([id, l]) => `<button type="button" class="bw-chip" data-act="jump" data-id="${id}">${l}</button>`).join("")}</nav>
        <div class="bw-set">${look()}${reading()}${problems()}${keyboard()}${site()}</div>`));
      if (k) { const n = host.querySelector(`[data-k="${CSS.escape(k)}"]`); if (n) n.focus({ preventScroll: true }); }
    }

    // ── parts ──
    const chips = (name, value, opts, label, act = "set") => `<div class="bw-seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, l]) =>
      `<button type="button" class="bw-chip${v === value ? " on" : ""}" role="radio" aria-checked="${v === value}" data-act="${act}" data-set="${name}" data-v="${esc(v)}" data-k="${act}-${name}-${esc(v)}">${esc(l)}</button>`).join("")}</div>`;
    const sw = (name, title, desc) => `<label class="bw-opt"><div><b>${esc(title)}</b><span class="bw-od">${esc(desc)}</span></div><input type="checkbox" class="bw-switch" data-set="${name}" data-k="sw-${name}"${st.S[name] ? " checked" : ""}></label>`;
    const pickOpt = (title, desc, chipHtml) => `<div class="bw-opt col"><div><b>${esc(title)}</b>${desc ? `<span class="bw-od">${esc(desc)}</span>` : ""}</div>${chipHtml}</div>`;
    const sec = (id, icon, title, lead, body) => `<section class="bw-sec" id="bw-s-${id}"><h3>${ic(icon)}${esc(title)}</h3>${lead ? `<p class="bw-lead">${esc(lead)}</p>` : ""}${body}</section>`;

    function look() {
      const S = st.S, find = (id) => all().find((t) => t.id === id);
      const nightOn = S.night !== "off", nowNight = nightOn && T.isNight(S);
      const dayT = find(S.theme) || T.BUILTIN[0], nightT = find(S.nightTheme) || T.byId("paper-dark");
      const sel = slotKey() === "nightTheme" ? S.nightTheme : S.theme;
      const slot = (which, t, label) => `<button type="button" class="bw-slot${st.slot === which ? " on" : ""}" role="tab" aria-selected="${st.slot === which}" data-act="slot" data-v="${which}" data-k="slot-${which}">${K.preview(t)}<span class="bw-sh">${ic(which === "night" ? "moon" : "today", "sm")}${label}${(which === "night") === nowNight ? '<span class="bw-now">Now</span>' : ""}</span><span class="bw-snm">${esc(t.name)}</span></button>`;
      const card = (t) => {
        const on = t.id === sel;
        return `<div class="bw-tcard${on ? " on" : ""}" role="button" tabindex="0" aria-pressed="${on}" data-act="pick" data-id="${esc(t.id)}" data-k="t-${esc(t.id)}" title="${esc(t.note || t.name)}">${K.preview(t)}
          <span class="bw-tn">${esc(t.name)}${t.scheme === "dark" ? `<span class="bw-tmark">${ic("moon", "sm")}</span>` : ""}</span>
          <span class="bw-tm">${t.look === "pocket" ? "Pocket" : "Standard"}${t.builtin ? "" : " · yours"}</span>
          <span class="bw-tacts">${K.key({ icon: "palette", title: "Adjust colors", cls: "sm", act: "adjust", id: t.id })}${K.key({ icon: "download", title: "Export", cls: "sm", act: "export", id: t.id })}${t.builtin ? "" : K.key({ icon: "trash", title: "Delete", cls: "sm", act: "del", id: t.id })}</span></div>`;
      };
      const times = S.night === "schedule" ? `<div class="bw-row2"><label class="bw-color">From <input type="time" data-set="nightFrom" value="${esc(S.nightFrom)}" data-k="from"></label><label class="bw-color">until <input type="time" data-set="nightTo" value="${esc(S.nightTo)}" data-k="to"></label></div>` : "";
      return sec("look", "palette", "Look", "Pick a theme for the day and one for night. Pocket themes are the handheld look from Collegiapp; Standard themes are plain.",
        `<div class="bw-opt col"><div><b>Switch to a night theme</b></div>${chips("night", S.night, [["off", "Never"], ["auto", "With the system"], ["schedule", "On a schedule"], ["on", "Always"]], "Switch to a night theme")}${times}</div>
        ${nightOn ? `<div class="bw-slots" role="tablist" aria-label="Theme slots">${slot("day", dayT, "Day")}${slot("night", nightT, "Night")}</div>` : ""}
        <div class="bw-pickhd" style="margin:14px 0 8px">${nightOn ? (st.slot === "night" ? "Night theme" : "Day theme") : "Theme"}${nightOn ? "<span>Click a theme to put it in this slot.</span>" : ""}</div>
        <div class="bw-themes">${all().map(card).join("")}</div>
        ${st.edit ? editor() : ""}${make()}`);
    }

    function editor() {
      const t = st.edit;
      const color = (k) => `<label class="bw-color"><input type="color" value="${t.tokens[k]}" data-tok="${k}" data-k="tok-${k}"><span>${esc(NAMES[k])}</span></label>`;
      return `<div class="bw-mod" id="bw-editor" style="margin-top:16px">
        <div class="bw-band"><span class="bw-bt">${ic("palette")}Adjust colors</span><span class="bw-sp"></span>${K.key({ icon: "close", title: "Cancel", cls: "ghost sm", act: "editCancel" })}</div>
        <div class="bw-mb" style="display:flex;flex-direction:column;gap:14px">
          <label class="bw-color">Name <input type="text" data-e="name" value="${esc(t.name)}" maxlength="48" style="flex:1" data-k="e-name"></label>
          <div class="bw-row2">${chips("look", t.look, [["standard", "Standard"], ["pocket", "Pocket"]], "Look", "eset")}${chips("scheme", t.scheme, [["light", "Light"], ["dark", "Dark"]], "Scheme", "eset")}</div>
          <div class="bw-colors">${MAIN.map(color).join("")}</div>
          <details class="bw-more" data-d="allc"${st.open.allc ? " open" : ""}><summary>All colors</summary><div class="bw-colors">${T.KEYS.filter((k) => !MAIN.includes(k)).map(color).join("")}</div></details>
          <div id="bw-checks">${checks(t)}</div>
          <div class="bw-row2">${K.key({ label: "Save theme", cls: "primary", act: "editSave" })}${K.key({ label: "Cancel", act: "editCancel" })}</div>
        </div></div>`;
    }
    const checks = (t) => {
      const bad = T.checks(t.tokens);
      return bad.length
        ? `<p class="bw-note bad">Hard to read: ${bad.map((c) => `${esc(NAMES[c.f])} on ${esc(NAMES[c.b]).toLowerCase()} (${c.r.toFixed(1)}:1, needs ${c.min}:1)`).join("; ")}.</p><div class="bw-row2" style="margin-top:6px">${K.key({ label: "Fix contrast", cls: "sm", act: "editFix" })}</div>`
        : '<p class="bw-note">Every text color reads clearly on its background.</p>';
    };

    function make() {
      return `<details class="bw-more" data-d="make" style="margin-top:16px"${st.open.make ? " open" : ""}><summary>Import or make a theme</summary><div>
        <p class="bw-note">Themes are JSON files in the shared Pocket format, so one made for Collegiapp or PocketCanvas works here too.</p>
        <textarea class="bw-code" data-f="paste" data-k="paste" placeholder="Paste a theme file, or a chatbot's whole reply" spellcheck="false">${esc(st.paste)}</textarea>
        <div class="bw-row2">${K.key({ label: "Import", cls: "sm", act: "import" })}<label class="bw-key sm ghost" data-k="file">${ic("download")}<span class="bw-kl">Open a file</span><input type="file" accept=".json,application/json,text/plain" data-act="file" hidden></label></div>
        ${st.note ? `<p class="bw-note${st.note.bad ? " bad" : ""}" role="status">${esc(st.note.t)}</p>` : ""}
        <div class="bw-opt col" style="padding-bottom:0"><div><b>Make one with a chatbot</b><span class="bw-od">Describe it, open the chatbot with the instructions filled in, then paste its reply above.</span></div>
          <input type="text" data-f="idea" data-k="idea" value="${esc(st.idea)}" placeholder="A calm blue for late nights">
          <div class="bw-row2"><a class="bw-key sm" data-k="bot" href="${esc(T.BOTS.claude(T.prompt(st.idea)))}" target="_blank" rel="noopener">${ic("ext")}<span class="bw-kl">Open in Claude</span></a>${K.key({ label: "Copy the instructions", cls: "sm ghost", act: "copyPrompt" })}</div>
        </div></div></details>`;
    }

    function reading() {
      const S = st.S;
      return sec("reading", "book", "Reading", "",
        pickOpt("Typeface", "Atkinson Hyperlegible was drawn for readers with low vision: 0 and O, 1, l and I, and b, d, p and q all look different, which helps when you copy an answer. Pocket themes use Space Grotesk.",
          chips("type", S.type, [["hyper", "Atkinson Hyperlegible"], ["system", "Your system's font"]], "Typeface"))
        + `<div class="bw-opt"><div><b>Problem text size</b><span class="bw-od">The problem and your answer fields; the rest of the page stays as it is.</span></div><output class="bw-note" id="bw-zoomv">${S.zoom}%</output><input type="range" class="bw-range" min="85" max="150" step="5" value="${S.zoom}" data-set="zoom" data-k="zoom" aria-label="Problem text size"></div>`
        + pickOpt("Problem width", "How wide the problem gets on a big screen.", chips("width", S.width, [["narrow", "Narrow"], ["medium", "Medium"], ["wide", "Wide"], ["full", "Full width"]], "Problem width"))
        + pickOpt("Graphs on dark themes", "Most WeBWorK graphs are drawn black on white.", chips("img", S.img, [["panel", "On a white card"], ["invert", "Inverted"], ["none", "As they are"]], "Graphs on dark themes"))
        + pickOpt("Motion", "Motion also stays off when your system asks for reduced motion.", chips("motion", S.motion, [["full", "On"], ["off", "Off"]], "Motion"))
        + sw("clock24", "24-hour clock", "Times like 23:59 instead of 11:59 PM."));
    }

    function problems() {
      return sec("problems", "sigma", "Problems", "",
        sw("feedback", "Show how each answer was read", "After you preview, check or submit: what you typed, how WeBWorK read it, its message, and the correct answer when your instructor shows it, with a mark beside each blank.")
        + sw("tips", "Notes on common slips", "Under WeBWorK's message, a short note when an answer has a slip WeBWorK often rejects, like x^1/2 for x^(1/2) or a comma in 1,000. They never guess the answer.")
        + sw("again", "Warn about answers you already tried", "Says so when you type an answer that was marked incorrect before, so you don't spend an attempt on it.")
        + sw("drafts", "Keep what you type", "What you type in the blanks stays through a refresh or a trip to another problem until you submit it. Kept in this browser only; turning this off forgets it.")
        + sw("lastGuard", "Confirm your last attempt", "Submit takes a second press when it's your last attempt.")
        + sw("sticky", "Keep the answer keys in view", "Preview, Check and Submit stay at the bottom of the window on long problems.")
        + `<div class="bw-opt"><div><b>Keep a log of your attempts</b><span class="bw-od">What you checked and submitted on each problem, kept in this browser only.${st.hist ? ` ${st.hist} ${st.hist === 1 ? "problem" : "problems"} so far.` : ""}</span>${st.hist ? `<div class="bw-row2" style="margin-top:6px">${K.key({ label: "Clear the log", cls: "sm", act: "clearHist" })}</div>` : ""}</div><input type="checkbox" class="bw-switch" data-set="history" data-k="sw-history" aria-label="Keep a log of your attempts"${st.S.history ? " checked" : ""}></div>`);
    }

    function keyboard() {
      const rows = [[[K.combo("Mod+Enter")], "Preview my answers"], [[K.combo("Mod+Alt+Enter")], "Check answers, when your course allows it"], [[K.combo("Mod+Shift+Enter")], "Submit answers"],
        [["[", "]"], "Previous and next problem"], [["/"], "Filter the course list"], [["?"], "Open this list"], [["Esc"], "Close a menu or this panel"]];
      return sec("keys", "keys", "Keyboard", "",
        sw("keys", "Keyboard shortcuts", "The answer keys work from inside an answer field; the rest work when you're not typing.")
        + `<div class="bw-kbd-list" style="padding:6px 0 12px">${rows.map(([ks, t]) => `<span>${ks.map((x) => `<kbd>${esc(x)}</kbd>`).join("")}</span><span>${esc(t)}</span>`).join("")}</div>`);
    }

    function site() {
      const S = st.S, offs = Object.keys(S.off || {}).filter((h) => S.off[h] && h !== ctx.site);
      const here = ctx.site ? `<label class="bw-opt"><div><b>Restyle ${esc(ctx.site)}</b><span class="bw-od">Turn off to see this WeBWorK as it is. Other sites keep BetterWebWork.</span></div><input type="checkbox" class="bw-switch" data-act="site" data-id="${esc(ctx.site)}" data-k="site"${S.off[ctx.site] ? "" : " checked"}></label>` : "";
      const list = offs.map((h) => `<div class="bw-opt"><div><b>${esc(h)}</b><span class="bw-od">Turned off</span></div>${K.key({ label: "Turn on", cls: "sm", act: "siteOn", id: h })}</div>`).join("");
      const ver = api.runtime.getManifest ? api.runtime.getManifest().version : "";
      return sec("site", "lock", "Sites and data", "BetterWebWork works on any WeBWorK whose address has /webwork2/ in it. It changes how pages look in your browser and sends nothing anywhere; your settings, themes and attempt log stay in this browser.",
        here + list
        + `<div class="bw-opt"><div><b>Back up</b><span class="bw-od">Your settings, themes and attempt log in one file.</span></div><div class="bw-row2">${K.key({ label: "Export", cls: "sm", act: "backup" })}<label class="bw-key sm" data-k="restore"><span class="bw-kl">Restore</span><input type="file" accept=".json,application/json" data-act="restore" hidden></label></div></div>
        <div class="bw-opt"><div><b>Start over</b><span class="bw-od">Every setting back to its default. Your themes and log stay.</span></div>${K.key({ label: "Reset settings", cls: "sm", act: "reset" })}</div>
        <p class="bw-note" style="padding-top:12px">BetterWebWork ${esc(ver)}. Not made by or affiliated with the WeBWorK project.</p>`);
    }

    // ── the color editor's live preview ──
    function preview() {
      const was = document.documentElement.dataset.bwLook;
      BW.previewing = true; T.apply(st.edit, document.documentElement);
      if (st.edit.look !== was) BW.reicon(document);
    }
    function stopPreview() {
      if (!BW.previewing) return;
      BW.previewing = false;
      const was = document.documentElement.dataset.bwLook;
      T.look(st.S, all(), document.documentElement);
      if (document.documentElement.dataset.bwLook !== was) BW.reicon(document);
    }

    // ── actions ──
    function adjust(id) {
      const base = all().find((t) => t.id === id); if (!base) return;
      const t = JSON.parse(JSON.stringify(base));
      if (base.builtin) { delete t.builtin; let n = `${base.id}-edited`, i = 2; while (all().some((x) => x.id === n)) n = `${base.id}-edited-${i++}`; t.id = n; t.name = `${base.name} (edited)`; t.by = ""; }
      st.edit = t; preview(); render();
      const ed = host.querySelector("#bw-editor"); if (ed) ed.scrollIntoView({ block: "nearest" });
    }
    async function saveEdit() {
      const t = T.file(st.edit), mine = st.mine.slice(), at = mine.findIndex((x) => x.id === t.id);
      if (at >= 0) mine[at] = t; else mine.push(t);
      st.edit = null; BW.previewing = false;
      await api.storage.local.set({ themes: mine });
      await save({ [slotKey()]: t.id });
      K.toast(`Saved ${t.name}`);
    }
    async function del(id) {
      const S = st.S, patch = {};
      if (S.theme === id) patch.theme = "paper";
      if (S.nightTheme === id) patch.nightTheme = "paper-dark";
      await api.storage.local.set({ themes: st.mine.filter((t) => t.id !== id) });
      if (Object.keys(patch).length) await save(patch);
    }
    async function importText(text) {
      const r = T.normalize(text || "");
      st.open.make = true;
      if (r.error) { st.note = { bad: true, t: r.error }; render(); return; }
      const t = r.theme; let id = t.id, n = 2;
      while (all().some((x) => x.id === id)) id = `${t.id}-${n++}`;
      t.id = id;
      st.note = { t: `Imported ${t.name} as your ${slotKey() === "nightTheme" ? "night theme" : st.S.night === "off" ? "theme" : "day theme"}.${r.warnings.length ? " " + r.warnings.join(" ") : ""}` }; st.paste = "";
      await api.storage.local.set({ themes: st.mine.concat(t) });
      await save({ [slotKey()]: t.id });
    }
    async function restore(text) {
      let o; try { o = JSON.parse(text); } catch (e) { o = null; }
      if (!o || o.betterWebWork !== 1) { K.toast("That isn't a BetterWebWork backup."); return; }
      // a backup is a file from anywhere: settings keep only known keys of the right type, themes go through the import
      const settings = Object.assign({}, BW.DEFAULTS);
      for (const k in BW.DEFAULTS) if (o.settings && o.settings[k] != null && typeof o.settings[k] === typeof BW.DEFAULTS[k]) settings[k] = o.settings[k];
      const themes = Array.isArray(o.themes) ? o.themes.map((t) => T.normalize(t).theme).filter(Boolean) : [];
      await api.storage.local.set({ settings, themes, history: o.history && typeof o.history === "object" ? o.history : {} });
      K.toast("Restored your backup");
    }
    async function backup() {
      const d = await BW.store.all();
      K.download("betterwebwork-backup.json", JSON.stringify({ betterWebWork: 1, at: new Date().toISOString(), settings: d.settings, themes: d.themes, history: d.history }, null, 2));
    }
    const setOff = (h, off) => { const o = Object.assign({}, st.S.off); if (off) o[h] = true; else delete o[h]; return save({ off: o }); };
    const readFile = (input) => { const f = input.files && input.files[0]; input.value = ""; return f ? f.text() : Promise.resolve(null); };
    const copy = (text) => navigator.clipboard.writeText(text).then(() => K.toast("Copied. Paste it into any chatbot."), () => K.toast("Couldn't copy here. Use Open in Claude instead."));

    function onClick(e) {
      const b = e.target.closest("[data-act]");
      if (!b || !host.contains(b) || b.tagName === "INPUT") return;
      const id = b.dataset.id;
      switch (b.dataset.act) {
        case "jump": { const s = host.querySelector(`#bw-s-${id}`); if (s) s.scrollIntoView({ block: "start" }); break; }
        case "set": save({ [b.dataset.set]: b.dataset.v }); break;
        case "slot": st.slot = b.dataset.v; render(); break;
        case "pick": save({ [slotKey()]: id }); break;
        case "adjust": adjust(id); break;
        case "export": { const t = all().find((x) => x.id === id); if (t) K.download(`${t.id}.json`, JSON.stringify(T.file(t), null, 2)); break; }
        case "del": K.twice(b, "Delete?", () => del(id)); break;
        case "eset": st.edit[b.dataset.set] = b.dataset.v; preview(); render(); break;
        case "editFix": st.edit = T.fix(st.edit); preview(); render(); break;
        case "editSave": saveEdit(); break;
        case "editCancel": st.edit = null; stopPreview(); render(); break;
        case "import": importText(st.paste); break;
        case "copyPrompt": copy(T.prompt(st.idea)); break;
        case "clearHist": K.twice(b, "Clear every problem's log?", () => api.storage.local.set({ history: {} }).then(() => K.toast("Cleared the attempt log"))); break;
        case "siteOn": setOff(id, false); break;
        case "backup": backup(); break;
        case "reset": K.twice(b, "Reset every setting?", () => api.storage.local.set({ settings: Object.assign({}, BW.DEFAULTS, { off: st.S.off }) })); break;
      }
    }
    function onChange(e) {
      const t = e.target;
      if (t.matches("input.bw-switch[data-set]")) save({ [t.dataset.set]: t.checked });
      else if (t.matches('[data-act="site"]')) setOff(t.dataset.id, !t.checked);
      else if (t.matches('input[type="range"][data-set]')) save({ zoom: +t.value });
      else if (t.matches('input[type="time"][data-set]') && t.value) save({ [t.dataset.set]: t.value });
      else if (t.matches('[data-act="file"]')) readFile(t).then((x) => x != null && importText(x));
      else if (t.matches('[data-act="restore"]')) readFile(t).then((x) => x != null && restore(x));
      else if (t.matches("[data-tok]")) { const c = host.querySelector("#bw-checks"); if (c) c.replaceChildren(BW.u.frag(checks(st.edit))); }
    }
    function onInput(e) {
      const t = e.target;
      if (t.matches("[data-tok]")) { st.edit.tokens[t.dataset.tok] = t.value; preview(); }
      else if (t.matches('[data-e="name"]')) st.edit.name = t.value;
      else if (t.matches('[data-f="idea"]')) { st.idea = t.value; const a = host.querySelector('[data-k="bot"]'); if (a) a.href = T.BOTS.claude(T.prompt(st.idea)); }
      else if (t.matches('[data-f="paste"]')) st.paste = t.value;
      else if (t.matches('input[type="range"][data-set]')) { host.querySelector("#bw-zoomv").textContent = t.value + "%"; document.documentElement.style.setProperty("--bw-pz", String(t.value / 100)); }
    }
    function onKey(e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches(".bw-tcard")) { e.preventDefault(); save({ [slotKey()]: e.target.dataset.id }); }
    }
    const onToggle = (e) => { if (e.target.dataset && e.target.dataset.d) st.open[e.target.dataset.d] = e.target.open; };
    const onStore = (ch, area) => { if (area === "local" && (ch.settings || ch.themes || ch.history)) load(); };

    host.addEventListener("click", onClick);
    host.addEventListener("change", onChange);
    host.addEventListener("input", onInput);
    host.addEventListener("keydown", onKey);
    host.addEventListener("toggle", onToggle, true);
    api.storage.onChanged.addListener(onStore);
    load().then(() => { if (ctx.section) { const s = host.querySelector(`#bw-s-${ctx.section}`); if (s) s.scrollIntoView({ block: "start" }); } });
    return { destroy() { api.storage.onChanged.removeListener(onStore); stopPreview(); } };
  }

  BW.settings = { mount, SECTIONS };
})(globalThis);
