/*
  Workflow rules (Upgrade E): pure functions plus the automated steps.
  Lead -> Qualification -> Estimate review (human) -> Scheduling (human) -> Job -> Complete & follow-up.
  Automation only performs the first two moves. Everything after a human checkpoint needs a person.
*/
import { STATUSES, STAGES } from "./hs-config.js";
import { SERVICE, getState, update, later, setStatus, notify, findRecord, announce, prefersReducedMotion, quantity, fmtRange, slotLabel, addActivity } from "./hs-core.js";

export const STEP_MS = 900;

export function stageIndex(rec) {
  const done = (STATUSES[rec.status] || { done: 1 }).done;
  return Math.min(done, STAGES.length);           // STAGES.length means everything is done
}

/** Deterministic, explainable qualification. */
export function qualify(rec) {
  const s = SERVICE[rec.service];
  const reasons = ["Inside the " + "service area (sample rule)"];
  let priority = "Normal";
  if (rec.estimate && rec.estimate[1] >= 1000000) { priority = "High"; reasons.push("Large project: " + fmtRange(rec.estimate) + " sample range"); }
  else if (rec.estimate) reasons.push("Sample range " + fmtRange(rec.estimate));
  if (rec.appointment) reasons.push("Site visit requested for " + slotLabel(rec.appointment));
  if (["gutters", "drywall"].includes(rec.service)) { reasons.push("Quick-turnaround service"); if (priority === "Normal") priority = "Normal (fast track)"; }
  reasons.push(quantity(s, rec.inputs).toLocaleString("en-US") + " " + s.unitLabel + " of " + s.name.toLowerCase());
  return { priority, reasons };
}

/** The next human or automated action for a record, used by workflow and operations views. */
export function nextAction(rec) {
  switch (rec.status) {
    case "new": case "qualified": return { label: "Waiting for qualification", auto: true };
    case "review": return { label: "Approve the estimate", human: true };
    case "changes": return { label: "Return to review after updating", human: true };
    case "approved": return { label: rec.appointment ? "Confirm the requested appointment" : "Schedule the job", human: true };
    case "scheduled": return { label: "Start the job on the scheduled day" };
    case "in-progress": return { label: "Mark the job complete" };
    case "completed": return { label: "Send follow-up (simulated)" };
    default: return { label: "No action needed" };
  }
}

/** Run the automated part of the pipeline for a new lead. */
export function startPipeline(id) {
  const s = getState();
  const rec = findRecord(id);
  if (!rec || !s.upgrades.automation || rec.status !== "new") return;
  const q = qualify(rec);
  const step1 = () => update(st => setStatus(st, id, "qualified", "Automation", "Qualified: " + q.priority.toLowerCase() + " priority. " + q.reasons.slice(0, 2).join("; ")));
  const step2 = () => {
    update(st => {
      setStatus(st, id, "review", "Automation", "Customer record and " + rec.tasks.length + " tasks created; sent to estimate review");
      notify(st, id + " needs estimate review (simulated notification)");
    });
    announce(id + " is waiting for estimate review.");
  };
  if (prefersReducedMotion()) { step1(); step2(); return; }
  later(step1, STEP_MS);
  later(step2, STEP_MS * 2);
}

/** Human actions. Each returns an announcement. */
export function act(s, id, action, payload = {}) {
  const rec = s.records.find(r => r.id === id);
  if (!rec) return "";
  const who = "Staff (you)";
  switch (action) {
    case "approve": setStatus(s, id, "approved", who, "Estimate approved by staff; estimate marked sent (simulated)"); notify(s, "Estimate for " + id + " marked sent to " + rec.customer.name + " (simulated, nothing delivered)"); return id + " estimate approved.";
    case "changes": setStatus(s, id, "changes", who, "Changes requested on the estimate"); return id + ": changes requested.";
    case "resubmit": setStatus(s, id, "review", who, "Estimate updated; returned to review"); return id + " returned to review.";
    case "confirm":
      if (!rec.appointment) return "";
      rec.appointment.confirmed = true;
      setStatus(s, id, "scheduled", who, "Confirmed " + rec.appointment.kind + " for " + slotLabel(rec.appointment));
      notify(s, "Confirmation for " + id + " prepared for " + rec.customer.name + " (simulated)");
      return id + " scheduled for " + slotLabel(rec.appointment) + ".";
    case "schedule":
      rec.appointment = { dayOffset: payload.dayOffset, slot: payload.slot, kind: "job", confirmed: true };
      setStatus(s, id, "scheduled", who, "Job scheduled for " + slotLabel(rec.appointment));
      return id + " job scheduled for " + slotLabel(rec.appointment) + ".";
    case "start": setStatus(s, id, "in-progress", "Crew", "Job started"); return id + " in progress.";
    case "complete": setStatus(s, id, "completed", "Crew", "Job marked complete"); return id + " completed.";
    case "follow": setStatus(s, id, "follow-up", who, "Thank-you and review request sent (simulated, nothing delivered)"); notify(s, "Follow-up for " + id + " marked sent (simulated)"); return "Follow-up marked sent. Nothing was delivered.";
    case "note": addActivity(s, rec, "Note: " + payload.text, who); return "Note added.";
    default: return "";
  }
}
