/*
  Home Services Studio: core state, events and shared helpers.
  One store holds the whole demo; modules change it only through update().
  Nothing is persisted: state lives in memory and is gone on reload or Reset.
*/
import { SEED_RECORDS, FIRST_VISITOR_ID, SERVICES, STATUSES, SLOTS, SCHEDULE_DAYS } from "./hs-config.js";

const listeners = new Set();
const timers = new Set();
let state;

export const SERVICE = Object.fromEntries(SERVICES.map(s => [s.id, s]));

export function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---------- formatting and safety ---------- */
const money0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const fmtMoney = cents => money0.format(Math.round(cents / 100));
export const fmtRange = r => fmtMoney(r[0]) + "–" + fmtMoney(r[1]);
export const fmtTime = t => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export function fmtWhen(t) {
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + " min ago";
  const h = Math.round(mins / 60);
  if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
  const d = Math.round(h / 24);
  return d + (d === 1 ? " day ago" : " days ago");
}
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ESC[c]);

/* ---------- sample estimating (pure) ---------- */
export function quantity(service, inputs) {
  if (service.unit === "area") return Math.max(0, (Number(inputs.length) || 0) * (Number(inputs.width) || 0));
  if (service.unit === "linear") return Math.max(0, Number(inputs.feet) || 0);
  return Math.max(0, Math.round(Number(inputs.count) || 0));
}

const round50 = c => Math.round(c / 5000) * 5000;

/** Preliminary sample range [low, high] in cents, with a readable breakdown. Fictional rates only. */
export function estimate(serviceId, inputs) {
  const s = SERVICE[serviceId];
  if (!s) return null;
  const qty = quantity(s, inputs);
  const opt = s.options.find(o => o.id === inputs.option) || s.options[0];
  const lines = [];
  let low = s.rate[0] * qty * opt.mult, high = s.rate[1] * qty * opt.mult;
  lines.push({ label: qty.toLocaleString("en-US") + " " + s.unitLabel + " · " + opt.label, range: [low, high] });
  const conds = (inputs.conditions || []).map(id => s.conditions.find(c => c.id === id)).filter(Boolean);
  let fixedLow = 0, fixedHigh = 0, pct = 0;
  conds.forEach(c => {
    if (c.kind === "fixed") { fixedLow += c.add[0]; fixedHigh += c.add[1]; lines.push({ label: c.label, range: [c.add[0], c.add[1]] }); }
    if (c.kind === "perUnit") { fixedLow += c.add[0] * qty; fixedHigh += c.add[1] * qty; lines.push({ label: c.label, range: [c.add[0] * qty, c.add[1] * qty] }); }
    if (c.kind === "percent") { pct += c.add[0]; }
  });
  low += fixedLow; high += fixedHigh;
  if (pct) {
    const pl = low * pct / 100, ph = high * pct / 100;
    lines.push({ label: conds.filter(c => c.kind === "percent").map(c => c.label).join(", ") + " (+" + pct + "%)", range: [pl, ph] });
    low += pl; high += ph;
  }
  return { qty, option: opt, range: [round50(low), round50(high)], lines };
}

export function validInputs(service, inputs) {
  const e = {};
  if (service.unit === "area") {
    ["length", "width"].forEach(k => { const v = Number(inputs[k]); if (!Number.isFinite(v) || v < 1 || v > 200) e[k] = "Enter a number of feet from 1 to 200."; });
  } else if (service.unit === "linear") {
    const v = Number(inputs.feet); if (!Number.isFinite(v) || v < 5 || v > 2000) e.feet = "Enter a length from 5 to 2,000 feet.";
  } else {
    const v = Number(inputs.count); if (!Number.isInteger(v) || v < 1 || v > 20) e.count = "Enter a whole number from 1 to 20.";
  }
  return e;
}

/* ---------- sample availability (business days from today) ---------- */
export function businessDay(offset) {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  let n = offset;
  const step = n >= 0 ? 1 : -1;
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  while (n !== 0) { d.setDate(d.getDate() + step); if (d.getDay() !== 0 && d.getDay() !== 6) n -= step; }
  return d;
}
export const fmtDay = (offset, opts = { weekday: "short", month: "short", day: "numeric" }) => businessDay(offset).toLocaleDateString("en-US", opts);
export const slotLabel = a => fmtDay(a.dayOffset) + ", " + SLOTS[a.slot];

/** Deterministic "already booked" pattern so availability looks real but never changes between loads. */
export const seededTaken = (day, slot) => ((day * 7 + slot * 3) % 5 === 0);

export function slotTaken(s, day, slot, exceptId) {
  if (seededTaken(day, slot)) return true;
  return s.records.some(r => r.id !== exceptId && r.appointment && r.appointment.dayOffset === day && r.appointment.slot === slot);
}

/* ---------- tasks ---------- */
export function tasksFor(rec) {
  const s = SERVICE[rec.service];
  const t = [
    { id: "t1", text: "Call " + rec.customer.name.split(" ")[0] + " to confirm details", done: false },
    { id: "t2", text: rec.type === "visit" ? "Measure and photograph on site" : "Check measurements against photos", done: false },
    { id: "t3", text: "Prepare written estimate for " + s.name.toLowerCase(), done: false },
    { id: "t4", text: "Order materials", done: false }
  ];
  const done = (STATUSES[rec.status] || { done: 1 }).done;
  t.forEach((x, i) => { if (done >= 3 && i < 3) x.done = true; if (done >= 5) x.done = true; });
  return t;
}

/* ---------- initial state ---------- */
function seedActivity(rec, created) {
  const a = [{ t: created, text: (rec.type === "visit" ? "Site visit requested" : "Estimate request received") + " from the website", actor: "Customer" }];
  const done = STATUSES[rec.status].done;
  const step = (h, text, actor) => a.push({ t: created + h * 3.6e6, text, actor });
  if (done >= 2) step(0.02, "Qualified automatically; sent to estimate review", "Automation");
  if (done >= 3) step(2, "Estimate approved", "Staff");
  if (done >= 4) step(6, "Appointment confirmed for " + (rec.appointment ? slotLabel(rec.appointment) : "a scheduled date"), "Staff");
  if (rec.status === "in-progress") step(Math.max(7, (Date.now() - created) / 3.6e6 - 2), "Job started", "Crew");
  if (done >= 5) step(48, "Job marked complete", "Crew");
  return a.filter(x => x.t <= Date.now());
}

function initialState() {
  const now = Date.now();
  const records = SEED_RECORDS.map(sd => {
    const created = now - sd.hoursAgo * 3.6e6;
    const rec = {
      id: sd.id, type: sd.type, status: sd.status, source: "seed", service: sd.service,
      inputs: { ...sd.inputs, conditions: [...(sd.inputs.conditions || [])] },
      customer: { ...sd.customer }, appointment: sd.appointment ? { ...sd.appointment } : null,
      createdAt: created, notes: ""
    };
    rec.estimate = estimate(rec.service, rec.inputs).range;
    rec.activity = seedActivity(rec, created);
    rec.updatedAt = rec.activity[rec.activity.length - 1].t;
    rec.tasks = tasksFor(rec);
    return rec;
  });
  return {
    upgrades: { website: false, estimates: false, scheduling: false, assistant: false, automation: false, operations: false },
    focusUpgrade: "website", hint: null,
    view: "site",            // site | workflow | operations | brief
    mode: "after",           // before | after | compare
    split: 50,
    device: "desktop",
    site: {
      page: "home",          // home | service | estimate | book | confirm | contact
      serviceId: null, classicNote: "", classicSent: false,
      est: null,             // estimate builder draft
      book: null,            // booking draft
      errors: {}, confirmId: null
    },
    assistant: { open: false, messages: [], flow: null },
    records, events: [], notifications: [],
    nextId: FIRST_VISITOR_ID,
    workflow: { recordId: null, stage: null, pickDay: null, pickSlot: null },
    ops: { tab: "leads", search: "", status: "all", service: "all", detailId: null, week: 0 },
    brief: { text: "", edited: false, generated: false, handoff: false, copied: false },
    pulse: null              // record id to highlight after it moves (purposeful motion cue)
  };
}

/* ---------- store ---------- */
export function getState() { return state; }
export function update(mutator, opts = {}) { mutator(state); if (!opts.silent) listeners.forEach(fn => fn(state, opts)); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function nextRecordId() { const id = "HP-" + state.nextId; state.nextId += 1; return id; }
export function later(fn, ms) { const h = setTimeout(() => { timers.delete(h); fn(); }, ms); timers.add(h); return h; }
export function reset() {
  timers.forEach(clearTimeout); timers.clear();
  state = initialState();
  listeners.forEach(fn => fn(state, { reset: true }));
}
state = initialState();

/* ---------- shared record helpers ---------- */
export const findRecord = id => state.records.find(r => r.id === id);
export function logEvent(s, recordId, text, actor = "Automation") {
  s.events.unshift({ t: Date.now(), recordId, text, actor });
  if (s.events.length > 80) s.events.length = 80;
}
export function notify(s, text) {
  s.notifications.unshift({ t: Date.now(), text });
  if (s.notifications.length > 8) s.notifications.length = 8;
}
export const statusLabel = rec => (STATUSES[rec.status] || { label: rec.status }).label;

export function addActivity(s, rec, text, actor) {
  rec.updatedAt = Date.now();
  rec.activity.push({ t: rec.updatedAt, text, actor });
  logEvent(s, rec.id, text, actor);
}

/** The one place a status changes: record, activity, event log, tasks and highlight stay in step. */
export function setStatus(s, id, status, actor, note) {
  const rec = s.records.find(r => r.id === id);
  if (!rec || rec.status === status) return;
  rec.status = status;
  addActivity(s, rec, note || "Status changed to " + statusLabel(rec), actor);
  const done = STATUSES[status].done;
  rec.tasks.forEach((t, i) => { if (done >= 3 && i < 3) t.done = true; if (done >= 5) t.done = true; });
  s.pulse = id;
}

/* ---------- live announcements ---------- */
let liveEl = null;
export function setLiveRegion(el) { liveEl = el; }
export function announce(text) {
  if (!liveEl) return;
  liveEl.textContent = "";
  later(() => { liveEl.textContent = text; }, 40);
}

export { SLOTS, SCHEDULE_DAYS };
