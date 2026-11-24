/*
  Project brief and sales handoff (Home Services edition; same contract as the Retail Studio brief).
  The brief is generated from the selected upgrades and stays editable.
  It contains no prices, timelines, revenue claims or integration promises.
  Nothing leaves the page: the handoff links to the existing contact form,
  where the visitor decides whether to submit anything.
*/
import { UPGRADES, BUSINESS, INTEGRATIONS_TO_DISCOVER, CONTACT_ROUTE } from "./hs-config.js";
import { update, getState, esc, announce, SERVICE, fmtRange } from "./hs-core.js";

export function contactHref() {
  return CONTACT_ROUTE.path + "?service=" + encodeURIComponent(CONTACT_ROUTE.service);
}

export function generateBrief(s) {
  const on = UPGRADES.filter(u => s.upgrades[u.id]);
  const list = arr => (arr.length ? arr.map(x => "- " + x).join("\n") : "- None selected yet");
  const customer = on.flatMap(u => u.customerFacing);
  const ops = on.flatMap(u => u.operational);
  const tried = s.records.filter(r => r.source === "visitor").map(r => "- Tried in the demo: " + (r.type === "visit" ? "site-visit request" : "sample estimate request") + " for " + SERVICE[r.service].name.toLowerCase() + " (" + r.id + ")");
  return [
    "PROJECT BRIEF (DRAFT)",
    "",
    "Business type: " + BUSINESS.type,
    "Example business: " + BUSINESS.name + " (fictional demo)",
    "Goal: turn a basic contractor website into a connected business platform.",
    "",
    "Selected upgrades:",
    list(on.map(u => u.letter + ". " + u.title)),
    "",
    "Customer-facing features:",
    list(customer),
    "",
    "Operational features:",
    list(ops),
    "",
    "Integrations to confirm in discovery:",
    list(INTEGRATIONS_TO_DISCOVER),
    "",
    "Notes:",
    ...(tried.length ? tried : []),
    "- Add anything specific to your business here.",
    "",
    "Next step:",
    "- Request a consultation or proposal from Signal Crest Systems.",
    "- Scope, pricing and timeline are set only after a discovery conversation."
  ].join("\n");
}

export function render(s) {
  const b = s.brief;
  const text = b.generated ? b.text : generateBrief(s);
  const count = UPGRADES.filter(u => s.upgrades[u.id]).length;
  return '<section class="vw vw-brief" aria-labelledby="br-h"><div class="vw-head"><div><p class="vw-kicker">Your configuration</p>' +
    '<h2 id="br-h" class="vw-title" tabindex="-1">Project brief</h2></div></div>' +
    '<p class="vw-disc">Generated from the ' + count + (count === 1 ? " upgrade" : " upgrades") + " you selected. Edit it freely. Nothing here is sent anywhere.</p>" +
    '<div class="br-wrap"><label for="br-text" class="br-label">Brief (editable)</label>' +
    '<textarea id="br-text" class="br-text" rows="22" spellcheck="true" data-input="brief-text" data-testid="brief-text">' + esc(text) + "</textarea>" +
    '<div class="br-btns"><button type="button" class="sc-ghost" data-action="brief-regen" aria-describedby="br-regen-note">Regenerate from selections</button>' +
    '<button type="button" class="sc-ghost" data-action="brief-copy">' + (b.copied ? "Copied" : "Copy brief") + "</button>" +
    '<button type="button" class="sc-primary" data-action="cta-build">Build Something Like This</button></div>' +
    '<p class="br-note" id="br-regen-note">' + (b.edited ? "You've edited this brief. Regenerate replaces your edits." : "Regenerate rebuilds the brief after you change upgrades.") + "</p></div>" +
    (b.handoff ? handoff(s) : "") + "</section>";
}

function handoff() {
  return '<div class="br-handoff" id="br-handoff" tabindex="-1" aria-labelledby="br-ho-h"><h3 id="br-ho-h">Request a similar solution</h3>' +
    "<p>Continue to the Signal Crest contact form with <strong>Custom Software</strong> selected. Copy your brief first and paste it into the message. " +
    "Nothing is sent until you choose to submit the contact form, where the usual privacy notice applies.</p>" +
    '<div class="br-btns"><button type="button" class="sc-ghost" data-action="brief-copy">Copy brief</button>' +
    '<a class="sc-primary" href="' + esc(contactHref()) + '" data-testid="contact-link">Continue to contact form</a></div></div>';
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall through to selection */ }
  const ta = document.getElementById("br-text");
  if (ta) { ta.focus(); ta.select(); }
  return false;
}

export const actions = {
  "brief-regen": () => {
    update(s => { s.brief.text = generateBrief(s); s.brief.generated = true; s.brief.edited = false; s.brief.copied = false; }, { focusSel: "#br-text" });
    announce("Brief regenerated from your selections.");
  },
  "brief-copy": async () => {
    const s = getState();
    const text = s.brief.generated ? s.brief.text : generateBrief(s);
    const ok = await copyText(text);
    if (ok) { update(st => { st.brief.copied = true; }); announce("Brief copied to the clipboard."); }
    else announce("Brief selected. Press Control or Command plus C to copy.");
  },
  "cta-build": () => {
    update(s => {
      if (!s.brief.generated) { s.brief.text = generateBrief(s); s.brief.generated = true; }
      s.view = "brief"; s.brief.handoff = true;
    }, { focusSel: "#br-handoff" });
    announce("Project brief ready. Continue to the contact form when you're ready.");
  }
};

export const inputs = {
  "brief-text": el => update(s => { s.brief.text = el.value.slice(0, 8000); s.brief.generated = true; s.brief.edited = true; s.brief.copied = false; }, { silent: true })
};
