/*
  Contractor Operations (Upgrade F).
  KPI cards and kanban with detail panel follow v0 Concept 1; the crew-lane week schedule follows
  v0 Concept 3. Everything is computed from the shared records.
*/
import { STATUS_ORDER, STATUSES, PIPELINE_COLUMNS, RECORD_TYPES, SERVICES, SLOTS } from "./hs-config.js";
import { SERVICE, esc, fmtWhen, fmtTime, fmtRange, update, getState, announce, statusLabel, slotLabel, fmtDay, setStatus, addActivity, quantity } from "./hs-core.js";
import { nextAction, act } from "./hs-workflow-rules.js";
import { ICONS, serviceIcon } from "./hs-icons.js";

const TABS = [["leads", "Leads"], ["pipeline", "Pipeline"], ["schedule", "Schedule"], ["customers", "Customers"], ["tasks", "Tasks"]];
const initials = n => n.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
const open = r => !["completed", "follow-up"].includes(r.status);

export function kpis(s) {
  return {
    leads: s.records.filter(r => ["new", "qualified", "review", "changes"].includes(r.status)).length,
    review: s.records.filter(r => r.status === "review" || r.status === "changes").length,
    week: s.records.filter(r => r.appointment && r.appointment.dayOffset >= 0 && r.appointment.dayOffset <= 4).length,
    active: s.records.filter(r => r.status === "in-progress").length,
    tasks: s.records.reduce((n, r) => n + r.tasks.filter(t => !t.done).length, 0)
  };
}

export function filterRecords(s) {
  const q = s.ops.search.trim().toLowerCase();
  return s.records.filter(r => (s.ops.status === "all" || r.status === s.ops.status) && (s.ops.service === "all" || r.service === s.ops.service) &&
    (!q || [r.id, r.customer.name, r.customer.email, SERVICE[r.service].name, statusLabel(r)].join(" ").toLowerCase().includes(q)));
}

const openBtn = (r, cls, inner) => '<button type="button" class="' + cls + '" data-action="ops-open" data-record="' + r.id + '" aria-expanded="' + (getState().ops.detailId === r.id) + '" aria-controls="ops-detail">' + inner + "</button>";

export function render(s) {
  const k = kpis(s);
  const bars = n => '<span class="kpi-bars" aria-hidden="true">' + [3, 5, 4, 6, 5, 7, n % 5 + 4].map(h => '<i class="h' + h + '"></i>').join("") + "</span>";
  const card = (label, val, sub, key, tone) => '<div class="kpi kpi-' + tone + '"><p class="kpi-l">' + label + '</p><p class="kpi-v" data-testid="kpi-' + key + '">' + val + '</p><p class="kpi-s">' + sub + "</p>" + bars(val) + "</div>";
  const tab = s.ops.tab;
  const body = tab === "pipeline" ? pipeline(s) : tab === "schedule" ? schedule(s) : tab === "customers" ? customers(s) : tab === "tasks" ? tasks(s) : leads(s);
  const det = s.records.find(r => r.id === s.ops.detailId);
  return '<section class="vw vw-ops" aria-labelledby="ops-h"><div class="vw-head"><div><p class="vw-kicker">Upgrade F · Stone Harbor workspace</p><h2 id="ops-h" class="vw-title" tabindex="-1">Good morning, team.</h2></div>' +
    '<p class="ops-date">' + ICONS.calendar + "<span>Week of " + esc(fmtDay(0, { month: "long", day: "numeric" })) + "</span></p></div>" +
    '<p class="vw-disc">Fictional records plus any you create in this demo. Cleared on reset or reload.</p>' +
    '<div class="kpis">' + card("Open leads", k.leads, "Need a next step", "leads", "blue") + card("Estimates to review", k.review, k.review ? "Waiting for approval" : "All reviewed", "review", "gold") +
    card("Visits &amp; jobs this week", k.week, "Next 5 business days", "week", "green") + card("Jobs in progress", k.active, k.tasks + " open tasks overall", "active", "violet") + "</div>" +
    '<div class="ops-grid' + (det ? " has-detail" : "") + '"><div class="ops-main"><div class="ops-tabs" role="tablist" aria-label="Operations views">' + TABS.map(([id, l]) =>
      '<button type="button" role="tab" id="ops-tab-' + id + '" aria-selected="' + (tab === id) + '" aria-controls="ops-panel" tabindex="' + (tab === id ? 0 : -1) + '" data-action="ops-tab" data-tab="' + id + '">' + l + (id === "leads" ? ' <span class="ops-count">' + k.leads + "</span>" : "") + "</button>").join("") + "</div>" +
    '<div class="ops-panel" id="ops-panel" role="tabpanel" aria-labelledby="ops-tab-' + tab + '">' + body + "</div></div>" +
    '<aside class="ops-detail" id="ops-detail" aria-label="Record details"' + (det ? "" : " hidden") + ">" + (det ? detail(s, det) : "") + "</aside></div>" +
    (det ? "" : '<p class="ops-hint">' + ICONS.arrow + "<span>Select any ID, card or job to open the customer, sample range, tasks and activity.</span></p>") + "</section>";
}

/* ---------- leads ---------- */
function leads(s) {
  const rows = filterRecords(s);
  const opt = (v, l, cur) => '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + esc(l) + "</option>";
  const tr = rows.map(r => '<tr class="' + (r.source === "visitor" ? "is-yours" : "") + (s.pulse === r.id ? " is-pulse" : "") + (s.ops.detailId === r.id ? " is-open" : "") + '" data-testid="row-' + r.id + '">' +
    '<th scope="row" data-label="ID">' + openBtn(r, "ops-link", esc(r.id)) + (r.source === "visitor" ? ' <span class="vw-tag">yours</span>' : "") + "</th>" +
    '<td data-label="Customer"><span class="av av-' + (r.id.charCodeAt(5) % 5) + '" aria-hidden="true">' + initials(r.customer.name) + "</span>" + esc(r.customer.name) + "</td>" +
    '<td data-label="Service">' + esc(SERVICE[r.service].name) + '<span class="ops-sub">' + esc(RECORD_TYPES[r.type]) + "</span></td>" +
    '<td data-label="Sample range">' + (r.estimate ? fmtRange(r.estimate) : "—") + "</td>" +
    '<td data-label="Status"><span class="st-badge st-' + r.status + '">' + esc(statusLabel(r)) + "</span></td>" +
    '<td data-label="Appointment">' + (r.appointment ? esc(slotLabel(r.appointment)) + (r.appointment.confirmed ? "" : '<span class="ops-sub">Needs confirmation</span>') : "—") + "</td>" +
    '<td data-label="Updated">' + fmtWhen(r.updatedAt) + "</td></tr>").join("");
  return '<div class="ops-filters" role="search"><div class="fq"><label for="ops-search">Search</label><input id="ops-search" type="search" autocomplete="off" placeholder="ID, customer or service" value="' + esc(s.ops.search) + '" data-input="ops-search"></div>' +
    '<div class="fq"><label for="ops-status">Status</label><select id="ops-status" data-input="ops-status">' + opt("all", "All statuses", s.ops.status) + STATUS_ORDER.map(x => opt(x, STATUSES[x].label, s.ops.status)).join("") + "</select></div>" +
    '<div class="fq"><label for="ops-service">Service</label><select id="ops-service" data-input="ops-service">' + opt("all", "All services", s.ops.service) + SERVICES.map(x => opt(x.id, x.name, s.ops.service)).join("") + "</select></div></div>" +
    '<p class="ops-count-line" data-testid="ops-count">Showing ' + rows.length + " of " + s.records.length + " records</p>" +
    (rows.length ? '<div class="ops-table-wrap"><table class="ops-table"><caption class="hs-sr">Leads and projects</caption><thead><tr><th scope="col">ID</th><th scope="col">Customer</th><th scope="col">Service</th><th scope="col">Sample range</th><th scope="col">Status</th><th scope="col">Appointment</th><th scope="col">Updated</th></tr></thead><tbody>' + tr + "</tbody></table></div>"
      : '<p class="ops-none">No records match. <button type="button" class="fq-link" data-action="ops-clear">Clear filters</button></p>');
}

/* ---------- pipeline (kanban) ---------- */
function pipeline(s) {
  return '<div class="kanban">' + PIPELINE_COLUMNS.map(col => {
    const items = s.records.filter(r => col.statuses.includes(r.status));
    return '<section class="kb-col kb-' + col.id + '" aria-labelledby="kb-' + col.id + '"><h3 id="kb-' + col.id + '"><span class="kb-dot" aria-hidden="true"></span>' + esc(col.label) + ' <span class="kb-n">' + items.length + '</span></h3><ul role="list">' +
      items.map(r => '<li class="kb-card' + (s.pulse === r.id ? " is-pulse" : "") + (s.ops.detailId === r.id ? " is-open" : "") + '">' + openBtn(r, "kb-btn",
        '<span class="kb-top"><span class="av av-' + (r.id.charCodeAt(5) % 5) + '" aria-hidden="true">' + initials(r.customer.name) + '</span><span class="kb-id">' + esc(r.id) + "</span></span>" +
        '<span class="kb-name">' + esc(r.customer.name) + '</span><span class="kb-svc">' + esc(SERVICE[r.service].name) + "</span>" +
        (r.estimate ? '<span class="kb-range">' + fmtRange(r.estimate) + "</span>" : "") +
        (r.status === "review" ? '<span class="kb-flag">Needs your review</span>' : r.appointment && !r.appointment.confirmed ? '<span class="kb-flag">Visit to confirm</span>' : "")) + "</li>").join("") +
      (items.length ? "" : '<li class="kb-empty">Nothing here</li>') + "</ul></section>";
  }).join("") + "</div>";
}

/* ---------- schedule (crew lanes) ---------- */
function laneOf(r) {
  if (r.appointment.kind !== "job") return "office";
  return Number(r.id.slice(3)) % 2 ? "a" : "b";
}
function schedule(s) {
  const start = s.ops.week || 0;
  const days = [0, 1, 2, 3, 4].map(i => start + i);
  const appts = s.records.filter(r => r.appointment);
  const lanes = [["a", "Crew A"], ["b", "Crew B"], ["office", "Office visits"]];
  const cell = (day, lane) => appts.filter(r => r.appointment.dayOffset === day && laneOf(r) === lane).sort((x, y) => x.appointment.slot - y.appointment.slot).map(r =>
    '<li class="job job-' + r.service + (r.appointment.confirmed ? "" : " is-tentative") + (s.pulse === r.id ? " is-pulse" : "") + '">' + openBtn(r, "job-btn",
      '<span class="job-time">' + esc(SLOTS[r.appointment.slot]) + '</span><span class="job-ico" aria-hidden="true">' + serviceIcon(r.service) + '</span><span class="job-name">' + esc(r.customer.name) + '</span><span class="job-what">' + esc(SERVICE[r.service].name) + " · " + esc(r.appointment.kind) + (r.appointment.confirmed ? "" : " · to confirm") + "</span>") + "</li>").join("");
  const later = appts.filter(r => r.appointment.dayOffset > days[4] || r.appointment.dayOffset < days[0]).length;
  return '<div class="sched-bar"><p><strong>Team schedule</strong> · ' + esc(fmtDay(days[0], { month: "short", day: "numeric" })) + " – " + esc(fmtDay(days[4], { month: "short", day: "numeric" })) + (later ? " · " + later + " outside this week" : "") + "</p>" +
    '<div class="sched-nav"><button type="button" class="sc-ghost sc-sm" data-action="ops-week" data-dir="-1"' + (start <= -5 ? " disabled" : "") + '>Previous week</button><button type="button" class="sc-ghost sc-sm" data-action="ops-week" data-dir="1"' + (start >= 5 ? " disabled" : "") + ">Next week</button></div></div>" +
    '<div class="sched-scroll"><table class="sched"><caption class="hs-sr">Crew schedule by day</caption><thead><tr><th scope="col"><span class="hs-sr">Lane</span></th>' + days.map(d => '<th scope="col"' + (d === 0 ? ' class="is-today"' : "") + "><small>" + esc(fmtDay(d, { weekday: "short" })) + "</small><b>" + esc(fmtDay(d, { day: "numeric" })) + "</b>" + (d === 0 ? '<span class="hs-sr"> (today)</span>' : "") + "</th>").join("") + "</tr></thead><tbody>" +
    lanes.map(([id, l]) => '<tr><th scope="row" class="lane">' + l + "</th>" + days.map(d => '<td><ul role="list">' + cell(d, id) + "</ul></td>").join("") + "</tr>").join("") + "</tbody></table></div>" +
    '<p class="sched-legend"><span class="lg lg-solid"></span>Confirmed <span class="lg lg-dash"></span>Requested, needs staff confirmation</p>';
}

/* ---------- customers and tasks ---------- */
function customers(s) {
  const map = new Map();
  s.records.forEach(r => { const k = r.customer.email || r.customer.name; const c = map.get(k) || { ...r.customer, recs: [] }; c.recs.push(r); map.set(k, c); });
  const rows = [...map.values()].sort((a, b) => b.recs[0].updatedAt - a.recs[0].updatedAt).map(c => {
    const latest = c.recs.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0];
    return '<tr><th scope="row" data-label="Customer"><span class="av av-' + (latest.id.charCodeAt(5) % 5) + '" aria-hidden="true">' + initials(c.name) + "</span>" + esc(c.name) + "</th>" +
      '<td data-label="Contact">' + esc(c.email) + (c.phone ? '<span class="ops-sub">' + esc(c.phone) + "</span>" : "") + "</td>" +
      '<td data-label="Projects">' + c.recs.length + "</td>" +
      '<td data-label="Latest">' + openBtn(latest, "ops-link", esc(latest.id)) + " · " + esc(SERVICE[latest.service].name) + '<span class="ops-sub">' + esc(statusLabel(latest)) + "</span></td></tr>";
  }).join("");
  return '<div class="ops-table-wrap"><table class="ops-table"><caption class="hs-sr">Customers</caption><thead><tr><th scope="col">Customer</th><th scope="col">Contact (fictional)</th><th scope="col">Projects</th><th scope="col">Latest project</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
}

function tasks(s) {
  const items = s.records.filter(open).flatMap(r => r.tasks.map(t => ({ r, t })));
  const pending = items.filter(x => !x.t.done);
  return '<p class="ops-count-line">' + pending.length + " open · " + (items.length - pending.length) + " done on active projects</p>" +
    '<ul class="task-list" role="list">' + items.map(({ r, t }) => '<li class="' + (t.done ? "is-done" : "") + '"><label class="check"><input type="checkbox" data-input="ops-task" data-record="' + r.id + '" data-task="' + t.id + '"' + (t.done ? " checked" : "") + "><span>" + esc(t.text) + "</span></label>" +
      openBtn(r, "ops-link ops-task-rec", esc(r.id)) + "</li>").join("") + "</ul>";
}

/* ---------- detail panel ---------- */
const QUICK = { review: ["approve", "Approve estimate"], changes: ["resubmit", "Return to review"], scheduled: ["start", "Start job"], "in-progress": ["complete", "Mark complete"], completed: ["follow", "Send follow-up (simulated)"] };
function detail(s, r) {
  const S = SERVICE[r.service];
  const opt = S.options.find(o => o.id === r.inputs.option) || S.options[0];
  let quick = QUICK[r.status];
  if (r.status === "approved" && r.appointment && !r.appointment.confirmed) quick = ["confirm", "Confirm appointment"];
  const conds = (r.inputs.conditions || []).map(id => (S.conditions.find(c => c.id === id) || {}).label).filter(Boolean);
  return '<div class="od-head"><span class="av av-lg av-' + (r.id.charCodeAt(5) % 5) + '" aria-hidden="true">' + initials(r.customer.name) + '</span><div><h3 id="od-h" tabindex="-1">' + esc(r.customer.name) + "</h3><p>" + esc(r.id) + " · " + esc(RECORD_TYPES[r.type]) + "</p></div>" +
    '<button type="button" class="sc-ghost sc-sm od-close" data-action="ops-close">Close<span class="hs-sr"> details</span></button></div>' +
    '<div class="fq"><label for="od-status">Status</label><select id="od-status" data-input="ops-status-edit" data-record="' + r.id + '">' + STATUS_ORDER.map(x => '<option value="' + x + '"' + (x === r.status ? " selected" : "") + ">" + esc(STATUSES[x].label) + "</option>").join("") + "</select></div>" +
    '<div class="od-box"><p class="od-svc">' + serviceIcon(r.service) + "<strong>" + esc(S.name) + "</strong></p><p>" + quantity(S, r.inputs).toLocaleString("en-US") + " " + esc(S.unitLabel) + " · " + esc(opt.label) + (conds.length ? " · " + esc(conds.join(", ")) : "") + "</p>" +
    (r.estimate ? '<p class="od-range"><span>Sample range</span><strong data-testid="od-range">' + fmtRange(r.estimate) + "</strong></p>" : "") + "</div>" +
    (r.appointment ? '<p class="od-appt">' + ICONS.calendar + "<span>" + esc(slotLabel(r.appointment)) + " · " + esc(r.appointment.kind) + (r.appointment.confirmed ? " · confirmed" : " · needs confirmation") + "</span></p>" : "") +
    '<p class="od-next">Next: ' + esc(nextAction(r).label) + "</p>" +
    '<div class="od-btns">' + (quick ? '<button type="button" class="sc-primary sc-sm" data-action="ops-act" data-act="' + quick[0] + '" data-record="' + r.id + '">' + quick[1] + "</button>" : "") +
    (getState().upgrades.automation ? '<button type="button" class="sc-ghost sc-sm" data-action="goto-view" data-view="workflow" data-record="' + r.id + '">View in workflow</button>' : "") + "</div>" +
    "<h4>Next steps</h4><ul class=\"od-tasks\" role=\"list\">" + r.tasks.map(t => '<li><label class="check"><input type="checkbox" data-input="ops-task" data-record="' + r.id + '" data-task="' + t.id + '"' + (t.done ? " checked" : "") + "><span>" + esc(t.text) + "</span></label></li>").join("") + "</ul>" +
    '<form class="od-note" data-form="ops-note" data-record="' + r.id + '"><label for="od-note-in">Add a note</label><div><input id="od-note-in" type="text" maxlength="200" autocomplete="off" placeholder="e.g. Customer prefers mornings"><button type="submit" class="sc-ghost sc-sm">Add</button></div></form>' +
    '<h4>Activity</h4><ol class="od-act" data-testid="od-activity">' + r.activity.slice().reverse().map(a => '<li><span class="wf-dot" aria-hidden="true"></span><div><p>' + esc(a.text) + "</p><small>" + fmtTime(a.t) + " · " + esc(a.actor) + "</small></div></li>").join("") + "</ol>";
}

export const actions = {
  "ops-tab": el => update(s => { s.ops.tab = el.dataset.tab; }),
  "ops-open": el => update(s => { s.ops.detailId = el.dataset.record; }, { focusSel: "#od-h" }),
  "ops-close": () => { let id; update(s => { id = s.ops.detailId; s.ops.detailId = null; }, { focusFn: () => '[data-action="ops-open"][data-record="' + id + '"]' }); },
  "ops-clear": () => update(s => { s.ops.search = ""; s.ops.status = "all"; s.ops.service = "all"; }, { focusSel: "#ops-search" }),
  "ops-week": el => update(s => { s.ops.week = Math.max(-5, Math.min(5, (s.ops.week || 0) + Number(el.dataset.dir) * 5)); }),
  "ops-act": el => { let m; update(s => { m = act(s, el.dataset.record, el.dataset.act); }, { focusSel: "#od-status" }); announce(m + " Workflow updated."); }
};

export const inputs = {
  "ops-search": el => update(s => { s.ops.search = el.value.slice(0, 80); }),
  "ops-status": el => update(s => { s.ops.status = el.value; }),
  "ops-service": el => update(s => { s.ops.service = el.value; }),
  "ops-status-edit": el => {
    const id = el.dataset.record;
    update(s => { setStatus(s, id, el.value, "Staff (you)"); s.workflow.stage = null; });
    announce(id + " is now " + STATUSES[el.value].label + ". Workflow and activity updated.");
  },
  "ops-task": el => update(s => {
    const r = s.records.find(x => x.id === el.dataset.record);
    const t = r.tasks.find(x => x.id === el.dataset.task);
    t.done = el.checked;
    addActivity(s, r, (t.done ? "Task completed: " : "Task reopened: ") + t.text, "Staff (you)");
  })
};

export const forms = {
  "ops-note": form => {
    const input = form.querySelector("input");
    const text = input.value.trim().slice(0, 200);
    if (!text) return;
    input.value = "";
    update(s => act(s, form.dataset.record, "note", { text }), { focusSel: "#od-note-in" });
    announce("Note added to " + form.dataset.record + ".");
  }
};
