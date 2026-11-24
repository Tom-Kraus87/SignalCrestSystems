/*
  AI Project Assistant engine (Upgrade D), simulated.
  respond(message, context) is deterministic: a guided discovery flow from config, keyword
  routing to services, and a small plain-language glossary. No network, no language model.
  The same contract could later be backed by the approved advisor service.
*/
import { DISCOVERY, SERVICES } from "./hs-config.js";
import { SERVICE, estimate, fmtRange } from "./hs-core.js";

export const DISCLOSURE = "Simulated assistant: guided, pre-written answers for this demo's services. Not connected to a live language model.";

const ROUTES = [
  { re: /deck|patio|porch/, topic: "deck" },
  { re: /floor|carpet|tile|vinyl|lvp|hardwood/, topic: "flooring" },
  { re: /paint|wall color|repaint/, topic: "walls" },
  { re: /hole|crack|drywall|sheetrock|dent/, topic: "drywall" },
  { re: /bath|shower|vanity|toilet/, topic: "bath" },
  { re: /fence|yard|gate/, topic: "fence" },
  { re: /gutter|downspout|clog/, topic: "upkeep" },
  { re: /maintenance|tune.?up|checkup|seasonal|winteri/, topic: "maintenance" }
];

export function startFlow(topicId) {
  const topic = DISCOVERY.topics[topicId];
  return { topic: topicId, service: topic.service, step: 0, draft: { option: null, conditions: [] } };
}

function applySet(flow, set) {
  const f = { ...flow, switched: false, draft: { ...flow.draft, conditions: [...flow.draft.conditions] } };
  if (set.switchTo) return { ...startFlow(set.switchTo), step: 0, switched: true };
  Object.entries(set).forEach(([k, v]) => {
    if (k === "addCondition") { if (!f.draft.conditions.includes(v)) f.draft.conditions.push(v); }
    else if (k !== "wet") f.draft[k] = v;
  });
  f.step += 1;
  return f;
}

function questionMsg(flow, lead) {
  const q = DISCOVERY.topics[flow.topic].questions[flow.step];
  const total = DISCOVERY.topics[flow.topic].questions.length;
  return { from: "bot", text: (lead ? lead + " " : "") + q.text, progress: (flow.step + 1) + " of " + total, chips: q.chips.map(c => ({ label: c.label, ask: c.label })) };
}

function finish(flow, inquiriesEnabled) {
  const s = SERVICE[flow.service];
  const inputs = { ...s.dims, ...pick(flow.draft, ["length", "width", "feet", "count"]), option: flow.draft.option || s.options[0].id, conditions: flow.draft.conditions };
  const est = estimate(s.id, inputs);
  const opt = est.option;
  const explain = "Here's what I'd suggest: " + s.name.toLowerCase() + " with " + opt.label.toLowerCase() + ". In plain terms: " + opt.note;
  const msgs = [{ from: "bot", text: explain, summary: { service: s.name, qty: est.qty.toLocaleString("en-US") + " " + s.unitLabel, option: opt.label, conditions: inputs.conditions.map(id => s.conditions.find(c => c.id === id).label), range: fmtRange(est.range) } }];
  if (inquiriesEnabled) {
    msgs.push({ from: "bot", text: "I filled in the estimate builder with these answers. The sample range is " + fmtRange(est.range) + ". It uses fictional demo rates and isn't a quote; a real price comes after a site visit.", chips: [{ label: "Show the sample estimate", action: "assistant-goto-estimate" }, { label: "Start over", ask: "start over" }] });
    return { messages: msgs, flow: null, effect: { kind: "prefill", service: s.id, inputs } };
  }
  msgs.push({ from: "bot", text: "The estimate builder is part of Upgrade B (Instant Sample Estimates), which is off in this configuration. You can still request a site visit.", chips: [{ label: "Start over", ask: "start over" }] });
  return { messages: msgs, flow: null };
}
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] != null).map(k => [k, o[k]]));

export function respond(input, ctx) {
  const text = String(input || "").trim().slice(0, 300);
  const low = text.toLowerCase();
  const flow = ctx.flow;

  if (!text || /^(hi|hello|hey|help|menu|start over|restart)[!. ]*$/.test(low)) {
    return { flow: null, messages: [{ from: "bot", text: DISCOVERY.start.text, chips: DISCOVERY.start.chips.map(c => ({ label: c.label, topic: c.topic })) }] };
  }

  // Answering a clarifying question.
  if (flow) {
    const q = DISCOVERY.topics[flow.topic].questions[flow.step];
    const chip = q.chips.find(c => c.label.toLowerCase() === low) || q.chips.find(c => low && c.label.toLowerCase().includes(low));
    if (chip) {
      const next = applySet(flow, chip.set);
      if (next.switched) return { flow: next, messages: [questionMsg(next, "Got it, that sounds like " + SERVICE[next.service].name.toLowerCase() + ".")] };
      if (next.step >= DISCOVERY.topics[next.topic].questions.length) return finish(next, ctx.inquiriesEnabled);
      return { flow: next, messages: [questionMsg(next, "Thanks.")] };
    }
    const g = DISCOVERY.glossary.find(x => x.re.test(low));
    if (g) return { flow, messages: [{ from: "bot", text: g.text }, questionMsg(flow, "Back to your project:")] };
    return { flow, messages: [questionMsg(flow, "Pick the closest answer, or tap Start over.")] };
  }

  // Topic chip or free text naming a project.
  const byTopic = DISCOVERY.start.chips.find(c => c.label.toLowerCase() === low);
  const route = byTopic ? { topic: byTopic.topic } : ROUTES.find(r => r.re.test(low));
  const g = DISCOVERY.glossary.find(x => x.re.test(low));
  if (g && (!route || /what|mean|explain|is a|are /.test(low))) return { flow: null, messages: [{ from: "bot", text: g.text, chips: DISCOVERY.start.chips.map(c => ({ label: c.label, topic: c.topic })) }] };
  if (route) {
    const f = startFlow(route.topic);
    return { flow: f, messages: [questionMsg(f, "Happy to help with that. A few quick questions so the estimate fits your project.")] };
  }
  return { flow: null, messages: [{ from: "bot", text: "I can only help with this demo's home services, so I'm not sure about that one. Which of these is closest?", chips: DISCOVERY.start.chips.map(c => ({ label: c.label, topic: c.topic })) }] };
}

export { SERVICES };
