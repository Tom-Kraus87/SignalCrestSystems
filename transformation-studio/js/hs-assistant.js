/*
  AI Project Assistant UI (Upgrade D). The chat window styling follows v0 Concept 3
  (project header, chips, user bubbles, disclosure footer). Replies come from the
  deterministic engine in hs-assistant-engine.js.
*/
import { SERVICE, esc, update, getState, announce } from "./hs-core.js";
import { ICONS, serviceIcon } from "./hs-icons.js";
import { respond, DISCLOSURE } from "./hs-assistant-engine.js";

const ti = ctx => (ctx.inert ? ' tabindex="-1"' : "");

function chip(ctx, c) {
  if (c.action) return '<button type="button" class="as-chip as-chip-go" data-action="' + c.action + '"' + ti(ctx) + ">" + esc(c.label) + "</button>";
  return '<button type="button" class="as-chip" data-action="assistant-ask" data-ask="' + esc(c.ask || c.label) + '"' + ti(ctx) + ">" + esc(c.label) + "</button>";
}

function msg(ctx, m, last) {
  if (m.from === "user") return '<li class="as-msg as-user"><p>' + esc(m.text) + "</p></li>";
  let extra = "";
  if (m.summary) {
    const sm = m.summary;
    extra = '<dl class="as-sum"><div><dt>Service</dt><dd>' + esc(sm.service) + "</dd></div><div><dt>Size</dt><dd>" + esc(sm.qty) + "</dd></div><div><dt>Choice</dt><dd>" + esc(sm.option) + "</dd></div>" +
      (sm.conditions.length ? "<div><dt>Extras</dt><dd>" + esc(sm.conditions.join(", ")) + "</dd></div>" : "") +
      '<div class="as-sum-range"><dt>Sample range</dt><dd>' + esc(sm.range) + "</dd></div></dl>";
  }
  const chips = last && m.chips ? '<div class="as-chips">' + m.chips.map(c => chip(ctx, c)).join("") + "</div>" : "";
  return '<li class="as-msg as-bot"><span class="as-av" aria-hidden="true">' + ICONS.oak + '</span><div class="as-bubble">' + (m.progress ? '<span class="as-step">Question ' + esc(m.progress) + "</span>" : "") + "<p>" + esc(m.text) + "</p>" + extra + chips + "</div></li>";
}

export function renderAssistant(s, ctx) {
  const a = s.assistant;
  if (!a.open) return '<div class="as-dock"><button type="button" class="as-launch" data-action="assistant-open"' + ti(ctx) + ">" + ICONS.chat + "<span>Plan my project</span></button></div>";
  const iid = ctx.idp + "as-input";
  return '<div class="as-dock"><section class="as-panel" aria-labelledby="' + ctx.idp + 'as-h" data-assistant>' +
    '<div class="as-head"><span class="as-ico" aria-hidden="true">' + ICONS.oak + '</span><div><h2 id="' + ctx.idp + 'as-h">Stone Harbor project assistant</h2><p><span class="as-dot" aria-hidden="true"></span>Simulated · guided questions</p></div>' +
    '<button type="button" class="as-x" data-action="assistant-close"' + ti(ctx) + ">" + ICONS.close + '<span class="hs-sr">Close assistant</span></button></div>' +
    '<div class="as-log" role="log" aria-live="polite" aria-label="Conversation" data-testid="as-log" tabindex="-1"><ol class="as-list">' + a.messages.map((m, i) => msg(ctx, m, i === a.messages.length - 1)).join("") + "</ol></div>" +
    '<form class="as-form" data-form="assistant"><label for="' + iid + '" class="hs-sr">Describe your project or ask a question</label>' +
    '<input id="' + iid + '" type="text" autocomplete="off" maxlength="300" placeholder="e.g. my deck is falling apart" data-fk="as-input"' + ti(ctx) + '><button type="submit" class="as-send"' + ti(ctx) + ">" + ICONS.arrow + '<span class="hs-sr">Send</span></button></form>' +
    '<p class="as-disc">' + esc(DISCLOSURE) + "</p></section></div>";
}

function ask(text, chipTopic) {
  const s = getState();
  const res = respond(text, { flow: s.assistant.flow, inquiriesEnabled: s.upgrades.estimates });
  update(st => {
    const a = st.assistant;
    a.open = true;
    if (text) a.messages.push({ from: "user", text: String(text).slice(0, 300) });
    a.messages.push(...res.messages);
    if (a.messages.length > 40) a.messages.splice(0, a.messages.length - 40);
    a.flow = res.flow || null;
    if (res.effect && res.effect.kind === "prefill") {
      const sv = SERVICE[res.effect.service];
      const keep = st.site.est || {};
      st.site.est = { service: sv.id, inputs: res.effect.inputs, name: keep.name || "", email: keep.email || "", phone: keep.phone || "", notes: "", wantVisit: !!keep.wantVisit, fromAssistant: true };
      st.site.errors = {};
    }
  }, { focusSel: '[data-fk="as-input"]', scrollLog: true });
  announce("Assistant: " + res.messages.map(m => m.text).join(" "));
}

export const actions = {
  "assistant-open": () => { const s = getState(); if (!s.assistant.messages.length) ask(""); else update(st => { st.assistant.open = true; }, { focusSel: '[data-fk="as-input"]', scrollLog: true }); },
  "assistant-close": () => update(s => { s.assistant.open = false; }, { focusSel: ".as-launch" }),
  "assistant-ask": el => ask(el.dataset.ask),
  "assistant-goto-estimate": () => update(s => { s.site.page = "estimate"; s.assistant.open = false; }, { focus: "site-main" })
};

export const forms = {
  assistant: form => {
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    ask(text);
  }
};

export { serviceIcon };
