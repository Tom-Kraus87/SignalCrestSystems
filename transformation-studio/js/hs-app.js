/*
  Home Services Studio shell: upgrade path, view switching, rendering and event routing.
  Layout from v0 Concept 1 (upgrade path, "why this matters" strip, icon tabs with a live count);
  intro from v0 Concept 2. DOM morph and event plumbing follow the Retail Studio's pattern
  (copied here, not shared, so the two prototypes stay independent).
*/
import { UPGRADES, BUSINESS } from "./hs-config.js";
import { getState, update, subscribe, reset, announce, setLiveRegion, later, prefersReducedMotion, esc } from "./hs-core.js";
import * as site from "./hs-site.js";
import * as asst from "./hs-assistant.js";
import * as wf from "./hs-workflow.js";
import * as ops from "./hs-ops.js";
import * as brief from "./hs-brief.js";
import { startPipeline } from "./hs-workflow-rules.js";
import { ICONS } from "./hs-icons.js";

const VIEWS = [
  { id: "site", label: "Website", needs: null, icon: "house" },
  { id: "workflow", label: "Workflow", needs: "automation", icon: "arrow" },
  { id: "operations", label: "Operations", needs: "operations", icon: "calendar" },
  { id: "brief", label: "Project brief", needs: null, icon: "star" }
];
const UP = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
const BEFORE_FLAGS = Object.fromEntries(UPGRADES.map(u => [u.id, false]));

/* ---------- shell actions ---------- */
function setUpgrade(s, id, on) {
  s.upgrades[id] = on;
  s.focusUpgrade = id;
  if (on && s.mode === "before") s.mode = "after";
  const v = VIEWS.find(x => x.id === s.view);
  if (v.needs && !s.upgrades[v.needs]) s.view = "site";
  if (!s.brief.edited) s.brief.generated = false;
  if (id === "assistant" && !on) s.assistant.open = false;
}
function afterUpgrade(id, on) {
  if (id === "automation" && on) getState().records.filter(r => r.source === "visitor" && r.status === "new").forEach(r => startPipeline(r.id));
}

const shell = {
  "upgrade-toggle": el => {
    const id = el.dataset.upgrade;
    const on = !getState().upgrades[id];
    update(s => setUpgrade(s, id, on));
    afterUpgrade(id, on);
    announce(UP[id].letter + ". " + UP[id].title + (on ? " on." : " off."));
  },
  "upgrade-all": () => {
    const ids = UPGRADES.map(u => u.id).filter(id => !getState().upgrades[id]);
    if (!ids.length) return;
    const done = () => announce("All six upgrades are on. Stone Harbor Tradeworks now runs on a connected platform.");
    if (prefersReducedMotion()) { update(s => ids.forEach(id => setUpgrade(s, id, true))); ids.forEach(id => afterUpgrade(id, true)); done(); return; }
    const step = i => { update(s => setUpgrade(s, ids[i], true)); afterUpgrade(ids[i], true); if (i < ids.length - 1) later(() => step(i + 1), 340); else done(); };
    step(0);
  },
  "upgrade-none": () => { update(s => { UPGRADES.forEach(u => setUpgrade(s, u.id, false)); s.focusUpgrade = "website"; }); announce("All upgrades are off."); },
  "view": el => {
    const v = VIEWS.find(x => x.id === el.dataset.view);
    if (v.needs && !getState().upgrades[v.needs]) {
      update(st => { st.focusUpgrade = v.needs; st.hint = v.needs; });
      announce("Turn on " + UP[v.needs].letter + ". " + UP[v.needs].title + " to open " + v.label + ".");
      return;
    }
    update(st => { st.view = v.id; st.hint = null; if (v.needs) st.focusUpgrade = v.needs; });
  },
  "goto-view": el => update(s => {
    s.view = el.dataset.view;
    if (el.dataset.view === "workflow") { s.workflow.recordId = el.dataset.record; s.workflow.stage = null; }
    if (el.dataset.view === "operations") { s.ops.detailId = el.dataset.record; if (s.ops.tab === "customers" || s.ops.tab === "tasks") s.ops.tab = "leads"; }
  }, { focusSel: el.dataset.view === "operations" ? "#od-h" : "#wf-h" }),
  "mode": el => { update(s => { s.mode = el.dataset.mode; }); announce({ before: "Showing the original website.", after: "Showing the upgraded website.", compare: "Comparison view. Use the slider to reveal each version." }[el.dataset.mode]); },
  "device": el => update(s => { s.device = el.dataset.device; }),
  "reset": () => {
    reset();
    announce("Demo reset. All upgrades are off and your demo records were cleared.");
    later(() => { const r = document.querySelector('[data-action="reset"]'); if (r) r.focus(); }, 0);
  }
};

const ACTIONS = { ...site.actions, ...asst.actions, ...wf.actions, ...ops.actions, ...brief.actions, ...shell };
const INPUTS = { ...site.inputs, ...wf.inputs, ...ops.inputs, ...brief.inputs, "cmp-range": el => setSplit(Number(el.value)) };
const FORMS = { ...site.forms, ...asst.forms, ...ops.forms };

/* ---------- region templates ---------- */
function configHtml(s) {
  const on = UPGRADES.filter(u => s.upgrades[u.id]).length;
  return '<p class="cf-kicker">The upgrade path</p><h2 class="cf-h" id="cf-h">One better business at a time.</h2><p class="cf-sub"><span data-testid="upgrade-count">' + on + "</span> of 6 upgrades on</p>" +
    '<ul class="cf-list" role="list">' + UPGRADES.map(u =>
      '<li><button type="button" class="cf-sw' + (s.upgrades[u.id] ? " is-on" : "") + (s.focusUpgrade === u.id ? " is-focus" : "") + '" role="switch" aria-checked="' + s.upgrades[u.id] + '" data-action="upgrade-toggle" data-upgrade="' + u.id + '" aria-describedby="cf-d-' + u.id + '">' +
      '<span class="cf-letter" aria-hidden="true">' + u.letter + '</span><span class="cf-text"><span class="cf-title">' + esc(u.title) + '</span><span class="cf-desc" id="cf-d-' + u.id + '">' + esc(u.summary) + "</span></span>" +
      '<span class="cf-track" aria-hidden="true"><span class="cf-knob"></span></span></button></li>').join("") + "</ul>" +
    '<div class="cf-btns"><button type="button" class="sc-primary" data-action="upgrade-all"' + (on === 6 ? " disabled" : "") + ">Enable all 6</button>" +
    '<button type="button" class="sc-ghost" data-action="upgrade-none"' + (on === 0 ? " disabled" : "") + ">Turn all off</button></div>";
}

function toolbarHtml(s) {
  const siteView = s.view === "site";
  const seg = (group, key, items, cur, disabled) => '<div class="tb-seg" role="group" aria-label="' + group + '">' + items.map(([v, l]) =>
    '<button type="button" data-action="' + key + '" data-' + key + '="' + v + '" aria-pressed="' + (cur === v) + '"' + (disabled ? " disabled" : "") + ">" + l + "</button>").join("") + "</div>";
  const k = ops.kpis(s);
  const focus = s.view === "workflow" ? UP.automation : s.view === "operations" ? UP.operations : UP[s.focusUpgrade] || UP.website;
  const hint = s.hint && !s.upgrades[s.hint] ? UP[s.hint] : null;
  return '<div class="tb-row"><p class="tb-crumb"><span>Demo workspace</span><span aria-hidden="true">›</span><strong>' + esc(BUSINESS.name) + '</strong><span class="tb-fict">Fictional business</span></p>' +
    '<div class="tb-ctl">' + seg("Website version", "mode", [["before", "Before"], ["after", "After"], ["compare", "Compare"]], s.mode, !siteView) +
    seg("Preview size", "device", [["desktop", "Desktop"], ["mobile", "Mobile"]], s.device, !siteView || s.mode === "compare") +
    '<button type="button" class="tb-reset" data-action="reset">Reset demo</button></div></div>' +
    '<p class="tb-why' + (hint ? " is-hint" : "") + '" role="status">' + ICONS.arrow + (hint
      ? "<span>Turn on <strong>" + hint.letter + ". " + esc(hint.title) + "</strong> to open that view.</span>"
      : "<span><strong>" + esc(focus.title) + "</strong> · " + esc(focus.summary) + "</span>") + "</p>" +
    '<div class="tb-tabs" role="tablist" aria-label="Studio views">' + VIEWS.map(v => {
      const locked = v.needs && !s.upgrades[v.needs];
      return '<button type="button" role="tab" id="tab-' + v.id + '" aria-controls="st-preview" aria-selected="' + (s.view === v.id) + '" tabindex="' + (s.view === v.id ? 0 : -1) + '"' +
        (locked ? ' aria-disabled="true" aria-describedby="tab-lock-' + v.id + '"' : "") + ' data-action="view" data-view="' + v.id + '">' + '<span class="tb-ico" aria-hidden="true">' + ICONS[v.icon] + "</span>" + v.label +
        (v.id === "operations" && !locked ? '<span class="tb-count" data-testid="ops-badge"><span class="hs-sr">, </span>' + k.leads + '<span class="hs-sr"> open leads</span></span>' : "") +
        (locked ? '<span class="tb-lock" id="tab-lock-' + v.id + '"><span class="hs-sr">, needs upgrade </span>' + UP[v.needs].letter + "</span>" : "") + "</button>";
    }).join("") + "</div>";
}

function siteView(s) {
  if (s.mode === "compare") {
    const cs = { ...s, site: { ...s.site, page: "home" }, assistant: { ...s.assistant, open: false } };
    return '<p class="hs-sr">Visual comparison of the original and upgraded websites. Choose Before or After to use either one.</p>' +
      '<div class="cmp" data-compare aria-hidden="true"><div class="cmp-layer cmp-before" inert><span class="pv-tag">Before</span>' + site.render(cs, { flags: BEFORE_FLAGS, inert: true, idp: "cb-" }) + "</div>" +
      '<div class="cmp-layer cmp-after" inert><span class="pv-tag pv-tag-after">After</span>' + site.render(cs, { flags: s.upgrades, inert: true, idp: "ca-" }) + "</div>" +
      '<div class="cmp-handle"><span></span></div></div>' +
      '<div class="cmp-ctl"><span aria-hidden="true">Before</span><label for="cmp-range" class="hs-sr">Comparison position</label><input id="cmp-range" type="range" min="0" max="100" step="1" value="' + s.split + '" aria-valuetext="' + splitText(s.split) + '" data-input="cmp-range"><span aria-hidden="true">After</span></div>';
  }
  const flags = s.mode === "before" ? BEFORE_FLAGS : s.upgrades;
  return '<div class="pv-frame pv-' + s.device + '"><div class="pv-chrome" aria-hidden="true"><span class="pv-dots"><i></i><i></i><i></i></span><span class="pv-url">' + esc(BUSINESS.domain) + '</span><span class="pv-tag' + (s.mode === "before" ? "" : " pv-tag-after") + '">' + (s.mode === "before" ? "Before" : "After") + "</span></div>" +
    '<div class="pv-screen" data-testid="site-screen" data-skin="' + (flags.website ? "modern" : "classic") + '">' + site.render(s, { flags, inert: false, idp: "" }) + "</div></div>";
}

function previewHtml(s) {
  if (s.view === "workflow") return wf.render(s);
  if (s.view === "operations") return ops.render(s);
  if (s.view === "brief") return brief.render(s);
  return siteView(s);
}

/* ---------- DOM morph ---------- */
const tpl = document.createElement("template");
function keyOf(n) {
  if (n.nodeType !== 1) return null;
  if (n.id) return "#" + n.id;
  const d = n.dataset;
  if (d.action) return d.action + "|" + (d.service || "") + "|" + (d.record || "") + "|" + (d.page || "") + "|" + (d.view || "") + "|" + (d.upgrade || "") + "|" + (d.stage || "") + "|" + (d.ask || "") + "|" + (d.day || "") + "|" + (d.slot || "") + "|" + (d.tab || "") + "|" + (d.act || "");
  return null;
}
function same(a, b) { return a.nodeType === b.nodeType && a.nodeName === b.nodeName && keyOf(a) === keyOf(b); }
function syncAttrs(from, to) {
  for (const { name } of [...from.attributes]) if (!to.hasAttribute(name)) from.removeAttribute(name);
  for (const { name, value } of [...to.attributes]) if (from.getAttribute(name) !== value) from.setAttribute(name, value);
}
function morphEl(from, to) {
  syncAttrs(from, to);
  const focused = from === document.activeElement;
  const tag = from.nodeName;
  if (tag === "TEXTAREA") { if (!focused && from.value !== to.value) from.value = to.value; return; }
  if (tag === "INPUT") {
    if (from.type === "checkbox" || from.type === "radio") from.checked = to.hasAttribute("checked");
    else if (!focused && from.value !== (to.getAttribute("value") || "")) from.value = to.getAttribute("value") || "";
    return;
  }
  morphChildren(from, to);
  if (tag === "SELECT" && !focused) {
    const sel = to.querySelector("option[selected]");
    from.value = sel ? sel.value : (from.options[0] ? from.options[0].value : "");
  }
}
function morphChildren(fp, tp) {
  let f = fp.firstChild, t = tp.firstChild;
  while (t) {
    const next = t.nextSibling;
    if (f && same(f, t)) {
      if (f.nodeType === 3 || f.nodeType === 8) { if (f.nodeValue !== t.nodeValue) f.nodeValue = t.nodeValue; }
      else morphEl(f, t);
      f = f.nextSibling;
    } else {
      // Look ahead for a keyed match so lists keep their nodes (and focus) when items move.
      let m = null;
      if (keyOf(t)) for (let x = f; x; x = x.nextSibling) if (same(x, t)) { m = x; break; }
      if (m) { fp.insertBefore(m, f); morphEl(m, t); }
      else fp.insertBefore(t, f);
    }
    t = next;
  }
  while (f) { const n = f.nextSibling; fp.removeChild(f); f = n; }
}
const lastHtml = new Map();
function patch(el, html) {
  if (lastHtml.get(el) === html) return;
  lastHtml.set(el, html);
  tpl.innerHTML = html;
  morphChildren(el, tpl.content);
}

/* ---------- compare split ---------- */
function splitText(v) { return v + "% of the width shows Before, " + (100 - v) + "% shows After"; }
function setSplit(v) {
  v = Math.max(0, Math.min(100, Math.round(v)));
  update(s => { s.split = v; }, { silent: true });
  const c = document.querySelector("[data-compare]");
  if (c) c.style.setProperty("--split", v + "%");
  const r = document.getElementById("cmp-range");
  if (r) { if (Number(r.value) !== v) r.value = v; r.setAttribute("aria-valuetext", splitText(v)); r.setAttribute("value", v); }
  lastHtml.delete(regions.preview);
}

/* ---------- render ---------- */
const regions = {};
let lastSkin = null;

function render(s, opts = {}) {
  const prevFocus = document.activeElement;
  patch(regions.config, configHtml(s));
  patch(regions.toolbar, toolbarHtml(s));
  patch(regions.preview, previewHtml(s));
  regions.preview.setAttribute("aria-labelledby", "tab-" + s.view);
  document.documentElement.dataset.studioView = s.view;
  regions.preview.querySelectorAll("[data-fill]").forEach(el => el.style.setProperty("--p", el.dataset.fill));
  const c = regions.preview.querySelector("[data-compare]");
  if (c) c.style.setProperty("--split", s.split + "%");
  // Purposeful motion: a reveal wipe when the website transforms (v0 Concept 2 idea, CSS-only).
  const screen = regions.preview.querySelector(".pv-screen");
  const skin = screen ? screen.dataset.skin : null;
  if (screen && lastSkin && skin !== lastSkin && !prefersReducedMotion()) { screen.classList.remove("is-transforming"); void screen.offsetWidth; screen.classList.add("is-transforming"); }
  if (skin) lastSkin = skin;
  if (s.pulse && !opts.keepPulse) { const id = s.pulse; later(() => { if (getState().pulse === id) update(st => { st.pulse = null; }, { silent: true }); }, 2600); }
  if (opts.scrollLog) { const log = regions.preview.querySelector(".as-log"); if (log) log.scrollTop = log.scrollHeight; }
  let target = null;
  if (opts.focus) target = document.getElementById(opts.focus);
  if (!target && opts.focusSel) target = regions.root.querySelector(opts.focusSel);
  if (!target && opts.focusFn) target = regions.root.querySelector(opts.focusFn());
  if (target) {
    if (!target.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.nodeName)) target.setAttribute("tabindex", "-1");
    target.focus();
  } else if (prevFocus && prevFocus !== document.body && !document.body.contains(prevFocus)) regions.preview.focus();
}

/* ---------- events ---------- */
function inInert(el) { return !!el.closest("[inert]"); }

function onClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el || inInert(el) || !regions.root.contains(el)) return;
  if (el.getAttribute("aria-disabled") === "true" && el.dataset.action !== "view") return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
}
const CHANGE_ONLY = el => el.nodeName === "SELECT" || el.type === "checkbox" || el.type === "radio";
function onInput(e) {
  const el = e.target;
  if (!el.dataset || !el.dataset.input || inInert(el)) return;
  if (e.type === "input" && CHANGE_ONLY(el)) return;
  if (e.type === "change" && !CHANGE_ONLY(el)) return;
  const fn = INPUTS[el.dataset.input];
  if (fn) fn(el, e);
}
function onSubmit(e) {
  const f = e.target.closest("[data-form]");
  if (!f) return;
  e.preventDefault();
  const fn = FORMS[f.dataset.form];
  if (fn) fn(f, e);
}
function onKey(e) {
  const tab = e.target.closest && e.target.closest('[role="tab"]');
  if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
    const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
    let i = tabs.indexOf(tab);
    i = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs.forEach((t, j) => t.setAttribute("tabindex", j === i ? "0" : "-1"));
    tabs[i].focus();
    e.preventDefault();
    return;
  }
  if (e.key === "Escape" && e.target.closest && e.target.closest("[data-assistant]")) {
    e.preventDefault();
    ACTIONS["assistant-close"]();
  }
}

function bindCompareDrag() {
  let dragging = false;
  const fromEvent = (e, c) => { const r = c.getBoundingClientRect(); setSplit(((e.clientX - r.left) / r.width) * 100); };
  regions.preview.addEventListener("pointerdown", e => {
    const c = e.target.closest("[data-compare]");
    if (!c) return;
    dragging = true; c.setPointerCapture(e.pointerId); fromEvent(e, c);
  });
  regions.preview.addEventListener("pointermove", e => { if (!dragging) return; const c = regions.preview.querySelector("[data-compare]"); if (c) fromEvent(e, c); });
  const stop = () => { dragging = false; };
  regions.preview.addEventListener("pointerup", stop);
  regions.preview.addEventListener("pointercancel", stop);
}

function init() {
  regions.root = document.getElementById("studio");
  regions.config = document.getElementById("st-config");
  regions.toolbar = document.getElementById("st-toolbar");
  regions.preview = document.getElementById("st-preview");
  setLiveRegion(document.getElementById("st-live"));
  document.addEventListener("click", onClick);
  regions.root.addEventListener("input", onInput);
  regions.root.addEventListener("change", onInput);
  regions.root.addEventListener("submit", onSubmit);
  regions.root.addEventListener("keydown", onKey);
  bindCompareDrag();
  subscribe((s, opts) => render(s, opts));
  render(getState());
  document.documentElement.classList.add("st-ready");
  window.__studio = { state: () => JSON.parse(JSON.stringify(getState())) };
}

init();
