/*
  Workflow view (Upgrade E). Layout from v0 Concept 2: numbered nodes on a connecting line with
  a glowing current node and an event log; "human" pills and the approval note from Concept 3.
  All states come from the shared record; actions go through hs-workflow-rules.act().
*/
import { STAGES, RECORD_TYPES, SLOTS, SCHEDULE_DAYS } from "./hs-config.js";
import { SERVICE, esc, fmtTime, fmtRange, update, getState, announce, statusLabel, slotLabel, fmtDay, slotTaken, quantity } from "./hs-core.js";
import { stageIndex, qualify, act, nextAction } from "./hs-workflow-rules.js";
import { ICONS, serviceIcon } from "./hs-icons.js";

export const selectedRecord = s => s.records.find(r => r.id === s.workflow.recordId) || s.records.find(r => r.source === "visitor") || s.records.find(r => r.status === "review") || s.records[0];

export function render(s) {
  const rec = selectedRecord(s);
  const cur = stageIndex(rec);
  const sel = s.workflow.stage == null ? Math.min(cur, STAGES.length - 1) : s.workflow.stage;
  const flagged = rec.status === "changes";
  const opts = s.records.map(r => '<option value="' + r.id + '"' + (r.id === rec.id ? " selected" : "") + ">" + esc(r.id + " · " + r.customer.name + " · " + SERVICE[r.service].name) + (r.source === "visitor" ? " (yours)" : "") + "</option>").join("");
  const nodes = STAGES.map((st, i) => {
    const state = i < cur ? "done" : i === cur ? (flagged ? "flagged" : "current") : "todo";
    const word = { done: "Done", current: st.human ? "Waiting for a person" : "In progress", flagged: "Changes requested", todo: "Not started" }[state];
    return '<li class="wf-step is-' + state + '"><button type="button" class="wf-node-btn" data-action="wf-stage" data-stage="' + i + '" aria-pressed="' + (i === sel) + '"' + (i === cur ? ' aria-current="step"' : "") + ">" +
      '<span class="wf-node" aria-hidden="true">' + (state === "done" ? ICONS.check : String(i + 1).padStart(2, "0")) + "</span>" +
      '<span class="wf-name">' + esc(st.label) + "</span>" +
      '<span class="wf-sub">' + word + "</span>" + (st.human ? '<span class="wf-human">Human</span>' : "") + "</button></li>";
  }).join("");
  const progress = Math.min(cur, STAGES.length - 1) / (STAGES.length - 1);
  const ev = s.events.filter(e => e.recordId === rec.id);
  const log = (ev.length ? ev : rec.activity.slice().reverse()).slice(0, 10).map((e, i) =>
    '<li class="' + (i === 0 ? "is-latest" : "") + '"><span class="wf-dot" aria-hidden="true"></span><div><p>' + esc(e.text) + "</p><small>" + fmtTime(e.t) + " · " + esc(e.actor) + "</small></div></li>").join("");
  const notes = s.notifications.slice(0, 4).map(n => "<li><time>" + fmtTime(n.t) + "</time><span>" + esc(n.text) + "</span></li>").join("") || '<li class="wf-none">No notifications yet.</li>';
  const na = nextAction(rec);

  return '<section class="vw vw-wf" aria-labelledby="wf-h"><div class="vw-head"><div><p class="vw-kicker">Upgrade E · Workflow automation</p><h2 id="wf-h" class="vw-title" tabindex="-1">From first hello to follow-up.</h2></div>' +
    '<div class="vw-pick"><label for="wf-record">Project</label><select id="wf-record" data-input="wf-record">' + opts + "</select></div></div>" +
    '<p class="vw-disc">Simulated workflow. Notifications, estimates and follow-ups never leave this page: no email, SMS or external system is used.</p>' +
    '<div class="wf-summary' + (s.pulse === rec.id ? " is-pulse" : "") + '" data-testid="wf-summary"><span class="wf-svc" aria-hidden="true">' + serviceIcon(rec.service) + '</span><span class="wf-id">' + esc(rec.id) + "</span><span>" + esc(SERVICE[rec.service].name) + " · " + esc(rec.customer.name) + "</span>" +
    '<span class="st-badge st-' + rec.status + '" data-testid="wf-status">' + esc(statusLabel(rec)) + '</span><span class="wf-next">Next: ' + esc(na.label) + "</span></div>" +
    '<div class="wf-track-wrap"><span class="wf-line" aria-hidden="true"><span class="wf-fill" data-fill="' + progress.toFixed(3) + '"></span></span><ol class="wf-track" aria-label="Workflow stages for ' + esc(rec.id) + '">' + nodes + "</ol></div>" +
    '<p class="wf-loop">' + ICONS.shield + "<span><strong>Human approval stays in the loop.</strong> Estimates and appointment times are never finalized automatically.</span></p>" +
    '<div class="wf-grid"><div class="wf-detail">' + detail(s, rec, sel, cur) + "</div>" +
    '<div class="wf-side"><h3>Recent activity</h3><ol class="wf-log" data-testid="wf-log">' + log + "</ol>" +
    '<h3 class="wf-h3b">Team notifications <span class="vw-tag">simulated</span></h3><ul class="wf-notes">' + notes + "</ul></div></div></section>";
}

function slotPicker(s, rec) {
  const pick = s.workflow;
  const opts = [];
  for (let d = 1; d <= SCHEDULE_DAYS; d++) SLOTS.forEach((lab, si) => { if (!slotTaken(s, d, si, rec.id)) opts.push('<option value="' + d + ":" + si + '"' + (pick.pickDay === d && pick.pickSlot === si ? " selected" : "") + ">" + esc(fmtDay(d) + ", " + lab) + "</option>"); });
  return '<div class="wf-pick"><label for="wf-slot">Job date and window</label><select id="wf-slot" data-input="wf-slot"><option value="">Choose an open window</option>' + opts.join("") + "</select></div>";
}

function detail(s, rec, i, cur) {
  const st = STAGES[i];
  const S = SERVICE[rec.service];
  let body = "";
  const btns = (...b) => '<div class="wf-btns">' + b.join("") + "</div>";
  const b = (cls, action, label) => '<button type="button" class="' + cls + '" data-action="wf-act" data-act="' + action + '" data-record="' + rec.id + '">' + label + "</button>";
  if (i === 0) {
    body = '<dl class="kv"><div><dt>Customer</dt><dd>' + esc(rec.customer.name) + "</dd></div><div><dt>Request</dt><dd>" + esc(RECORD_TYPES[rec.type]) + "</dd></div>" +
      "<div><dt>Service</dt><dd>" + esc(S.name) + " · " + quantity(S, rec.inputs).toLocaleString("en-US") + " " + esc(S.unitLabel) + "</dd></div>" +
      "<div><dt>Choice</dt><dd>" + esc((S.options.find(o => o.id === rec.inputs.option) || S.options[0]).label) + "</dd></div>" +
      (rec.estimate ? "<div><dt>Sample range</dt><dd>" + fmtRange(rec.estimate) + "</dd></div>" : "") +
      (rec.appointment ? "<div><dt>Requested time</dt><dd>" + esc(slotLabel(rec.appointment)) + "</dd></div>" : "") + "</dl>";
  } else if (i === 1) {
    const q = qualify(rec);
    body = cur > 1 ? "<p><strong>Priority: " + esc(q.priority) + '</strong></p><ul class="wf-list">' + q.reasons.map(r => "<li>" + esc(r) + "</li>").join("") + "</ul>" : "<p>Waiting to run the qualification rules.</p>";
  } else if (i === 2) {
    if (rec.status === "review") body = "<p>Check the sample range and details. Nothing is sent to " + esc(rec.customer.name.split(" ")[0]) + " until someone approves.</p>" +
      '<p class="wf-range">Sample range <strong>' + fmtRange(rec.estimate) + "</strong></p>" + btns(b("sc-primary", "approve", "Approve estimate"), b("sc-ghost", "changes", "Request changes"));
    else if (rec.status === "changes") body = "<p>Changes were requested. Update the estimate, then return it to review.</p>" + btns(b("sc-primary", "resubmit", "Return to review"));
    else if (cur > 2) body = "<p>Estimate approved and marked sent (simulated).</p>";
    else body = "<p>Estimate review starts after qualification.</p>";
  } else if (i === 3) {
    if (rec.status === "approved" && rec.appointment && !rec.appointment.confirmed) body = "<p>" + esc(rec.customer.name) + " requested <strong>" + esc(slotLabel(rec.appointment)) + "</strong> for a " + esc(rec.appointment.kind) + ".</p>" + btns(b("sc-primary", "confirm", "Confirm appointment"));
    else if (rec.status === "approved") body = "<p>Pick a date for the job. Confirming puts it on the crew schedule.</p>" + slotPicker(s, rec) + btns('<button type="button" class="sc-primary" data-action="wf-schedule" data-record="' + rec.id + '">Schedule job</button>');
    else if (cur > 3) body = "<p>Scheduled for <strong>" + esc(rec.appointment ? slotLabel(rec.appointment) : "the confirmed date") + "</strong>.</p>";
    else body = "<p>Scheduling unlocks once the estimate is approved.</p>";
  } else if (i === 4) {
    if (rec.status === "scheduled") body = "<p>The crew starts on the scheduled day.</p>" + btns(b("sc-primary", "start", "Start job"));
    else if (rec.status === "in-progress") body = '<p>Work in progress. Tasks:</p><ul class="wf-list">' + rec.tasks.map(t => "<li" + (t.done ? ' class="is-done"' : "") + ">" + esc(t.text) + (t.done ? " (done)" : "") + "</li>").join("") + "</ul>" + btns(b("sc-primary", "complete", "Mark complete"));
    else if (cur > 4) body = "<p>Job complete.</p>";
    else body = "<p>The job starts after scheduling.</p>";
  } else {
    const first = rec.customer.name.split(" ")[0];
    body = '<p class="wf-msg-h">Follow-up preview <span class="vw-tag">not sent</span></p><blockquote class="wf-msg">Hi ' + esc(first) + ", thanks for choosing Stone Harbor Tradeworks for your " + esc(S.name.toLowerCase()) + ". We'd love to hear how it went. Would you leave a short review?</blockquote>";
    if (rec.status === "completed") body += btns(b("sc-primary", "follow", "Send follow-up (simulated)"));
    else if (rec.status === "follow-up") body += "<p>Follow-up marked sent. Nothing was delivered.</p>";
    else body += "<p>Available once the job is complete.</p>";
  }
  return '<h3 class="wf-dh">' + String(i + 1).padStart(2, "0") + " · " + esc(st.label) + (st.human ? ' <span class="wf-human">Human checkpoint</span>' : "") + '</h3><p class="wf-explain">' + esc(st.detail) + "</p>" + body;
}

export const actions = {
  "wf-stage": el => update(s => { s.workflow.stage = Number(el.dataset.stage); }, { focusSel: '.wf-node-btn[data-stage="' + el.dataset.stage + '"]' }),
  "wf-act": el => {
    let msg;
    update(s => { msg = act(s, el.dataset.record, el.dataset.act); s.workflow.stage = null; }, { focusSel: '.wf-node-btn[aria-current="step"], #wf-h' });
    announce(msg);
  },
  "wf-schedule": el => {
    const s = getState();
    if (s.workflow.pickDay == null) { announce("Choose an open window first."); const sel = document.getElementById("wf-slot"); if (sel) sel.focus(); return; }
    let msg;
    update(st => { msg = act(st, el.dataset.record, "schedule", { dayOffset: st.workflow.pickDay, slot: st.workflow.pickSlot }); st.workflow.pickDay = null; st.workflow.pickSlot = null; st.workflow.stage = null; }, { focusSel: '.wf-node-btn[aria-current="step"], #wf-h' });
    announce(msg);
  }
};

export const inputs = {
  "wf-record": el => update(s => { s.workflow.recordId = el.value; s.workflow.stage = null; s.workflow.pickDay = null; }),
  "wf-slot": el => update(s => { const [d, sl] = el.value ? el.value.split(":").map(Number) : [null, null]; s.workflow.pickDay = d; s.workflow.pickSlot = sl; }, { silent: true })
};
