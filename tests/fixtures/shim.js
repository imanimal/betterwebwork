// A stand-in for Firefox's extension APIs, so the fixture pages run the real content scripts in any browser.
// storage.local lives in the page's localStorage ("bww.shim"); runtime.getURL serves from the repo root.
(function () {
  const KEY = "bww.shim";
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { data = {}; }
  const listeners = [];
  const copy = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private window */ } };
  const fire = (ch) => setTimeout(() => listeners.slice().forEach((f) => f(ch, "local")));
  const local = {
    async get(keys) {
      const ks = keys == null ? Object.keys(data) : Array.isArray(keys) ? keys : typeof keys === "string" ? [keys] : Object.keys(keys);
      const out = {};
      for (const k of ks) if (k in data) out[k] = copy(data[k]);
      return out;
    },
    async set(obj) { const ch = {}; for (const k in obj) { ch[k] = { oldValue: copy(data[k]), newValue: copy(obj[k]) }; data[k] = copy(obj[k]); } persist(); fire(ch); },
    async remove(keys) { const ch = {}; for (const k of [].concat(keys)) { ch[k] = { oldValue: data[k] }; delete data[k]; } persist(); fire(ch); },
    async clear() { data = {}; persist(); },
  };
  window.browser = {
    storage: { local, onChanged: { addListener: (f) => listeners.push(f), removeListener: (f) => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); } } },
    runtime: { getURL: (p) => "/" + p, getManifest: () => ({ version: "fixture" }), onMessage: { addListener() {} }, async openOptionsPage() { location.href = "/src/pages/options.html"; } },
    tabs: { async query() { return [{ id: 1, url: location.href }]; }, async sendMessage() { return true; }, async create(o) { window.open(o.url); }, async update(id, o) { location.href = o.url; } },
  };
  // forms in fixtures go nowhere; the console says what WeBWorK would have received
  document.addEventListener("submit", (e) => { e.preventDefault(); console.log("fixture: form submitted with", e.submitter ? e.submitter.name : "(enter)"); });
})();
