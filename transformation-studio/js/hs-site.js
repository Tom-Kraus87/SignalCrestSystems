/*
  Oakline website (Upgrade A) plus the homeowner tools it hosts:
  sample estimate builder (Upgrade B) and appointment requests (Upgrade C).
  render(state, ctx) returns markup for one site variant:
    ctx.flags  active upgrades for this variant
    ctx.inert  true for the non-interactive copies used by Compare
    ctx.idp    id prefix so two variants can share a page
*/
import { SERVICES, BUSINESS, SLOTS, SCHEDULE_DAYS, SAMPLE_CUSTOMER, RECORD_TYPES } from "./hs-config.js";
import { SERVICE, esc, fmtMoney, fmtRange, estimate, validInputs, quantity, update, getState, announce, nextRecordId, logEvent, notify, tasksFor, fmtDay, slotTaken, slotLabel } from "./hs-core.js";
import { ICONS, serviceIcon } from "./hs-icons.js";
import { renderAssistant } from "./hs-assistant.js";
import { startPipeline } from "./hs-workflow-rules.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ti = ctx => (ctx.inert ? ' tabindex="-1"' : "");
const btn = (ctx, cls, action, label, extra = "") => '<button type="button" class="' + cls + '" data-action="' + action + '"' + extra + ti(ctx) + ">" + label + "</button>";

/* ---------- drafts ---------- */
export function newEstimateDraft(serviceId) {
  const s = SERVICE[serviceId] || SERVICES[0];
  return { service: s.id, inputs: { ...s.dims, option: s.options[0].id, conditions: [] }, name: "", email: "", phone: "", notes: "", wantVisit: false };
}
export function newBookingDraft(serviceId, linkedId) {
  return { service: serviceId || "", day: null, slot: null, name: "", email: "", phone: "", notes: "", linkedId: linkedId || null };
}

/* ---------- variant render ---------- */
export function render(s, ctx) {
  const modern = ctx.flags.website;
  const page = resolvePage(s.site.page, ctx.flags);
  const body = modern ? modernPage(s, ctx, page) : classicPage(s, ctx, page);
  const head = modern ? modernHeader(s, ctx, page) : classicHeader(s, ctx, page);
  const foot = modern
    ? '<footer class="ow-foot"><div><strong>' + esc(BUSINESS.name) + "</strong><p>" + esc(BUSINESS.tagline) + " · " + esc(BUSINESS.area) + '</p></div><p class="ow-fine">' + esc(BUSINESS.disclosure) + "</p></footer>"
    : '<footer class="cw-foot"><p>&copy; ' + esc(BUSINESS.name) + " · Licensed &amp; Insured · Call " + esc(BUSINESS.phone) + "</p><p>" + esc(BUSINESS.disclosure) + "</p></footer>";
  const assistant = ctx.flags.assistant ? renderAssistant(s, ctx) : "";
  return '<section class="site ' + (modern ? "site-modern" : "site-classic") + (ctx.flags.assistant ? " has-assistant" : "") + '" aria-label="' + esc(BUSINESS.name) + ' website preview">' +
    head + '<div class="site-main" id="' + ctx.idp + 'site-main" tabindex="-1">' + body + "</div>" + foot + assistant + "</section>";
}

function resolvePage(page, f) {
  if (page === "estimate" && !f.estimates) return f.website ? "home" : "contact";
  if (page === "book" && !f.scheduling) return f.website ? "home" : "contact";
  if (page === "service" && !f.website) return "home";
  if (page === "confirm" && !(f.estimates || f.scheduling)) return "home";
  return page;
}

/* ---------- classic (before) ---------- */
function classicHeader(s, ctx, page) {
  const nav = [["home", "Home"], ["contact", "Contact Us"]];
  if (ctx.flags.estimates) nav.push(["estimate", "Estimates"]);
  if (ctx.flags.scheduling) nav.push(["book", "Book Online"]);
  return '<header class="cw-head"><p class="cw-phone">CALL NOW FOR A FREE ESTIMATE! ' + esc(BUSINESS.phone) + "</p>" +
    '<div class="cw-title"><span class="cw-logo">' + ICONS.house + "</span><span><strong>" + esc(BUSINESS.name.toUpperCase()) + "</strong><small>Serving " + esc(BUSINESS.area) + " Since 1998</small></span></div>" +
    '<nav class="cw-nav" aria-label="Site">' + nav.map(([p, l]) => btn(ctx, "cw-link" + (page === p ? " is-current" : ""), "site-go", l, ' data-page="' + p + '"' + (page === p ? ' aria-current="page"' : ""))).join(" | ") + "</nav></header>";
}

function classicPage(s, ctx, page) {
  if (page === "estimate") return estimatePage(s, ctx);
  if (page === "book") return bookPage(s, ctx);
  if (page === "confirm") return confirmPage(s, ctx);
  if (page === "contact") return classicContact(s, ctx);
  return '<div class="cw-cols"><div><h2 class="cw-h">Welcome to Stone Harbor Tradeworks!</h2><p class="cw-p">We are a family-owned coastal trade contractor. No job too big or too small! Please call for a free estimate.</p>' +
    '<h3 class="cw-h3">Our Services:</h3><ul class="cw-list">' + SERVICES.map(x => "<li>" + esc(x.name) + "</li>").join("") + "</ul>" +
    '<p class="cw-p"><strong>Hours:</strong> Mon–Fri 8–5. Leave a message after hours and we will call you back.</p></div>' +
    '<aside class="cw-box"><h3 class="cw-h3">Free Estimates!</h3><p class="cw-p">Call ' + esc(BUSINESS.phone) + " or use our contact form.</p>" + btn(ctx, "cw-btn", "site-go", "Contact Us", ' data-page="contact"') + "</aside></div>";
}

function classicContact(s, ctx) {
  if (s.site.classicSent) return '<h2 class="cw-h">Contact Us</h2><p class="cw-p" role="status">Thank you! We will get back to you soon. (Demo: nothing was sent and no record was created; nobody on the team would know you asked. That gap is what the upgrades fix.)</p>' + btn(ctx, "cw-btn", "classic-again", "Send another message");
  const id = ctx.idp + "cw-msg";
  return '<h2 class="cw-h">Contact Us</h2><p class="cw-p">Tell us about your project and we will call you.</p><form class="cw-form" data-form="classic" novalidate><label for="' + id + '">Message</label>' +
    '<textarea id="' + id + '" rows="4" data-input="classic-note"' + ti(ctx) + ">" + esc(s.site.classicNote) + '</textarea><button type="submit" class="cw-btn"' + ti(ctx) + ">Submit</button></form>";
}

/* ---------- modern (after) ---------- */
function modernHeader(s, ctx, page) {
  const nav = [["home", "Services"]];
  if (ctx.flags.estimates) nav.push(["estimate", "Sample estimate"]);
  if (ctx.flags.scheduling) nav.push(["book", "Book a visit"]);
  return '<header class="ow-head"><div class="ow-bar">' +
    btn(ctx, "ow-brand", "site-go", '<span class="ow-mark">' + ICONS.oak + '</span><span class="ow-word"><span>Stone Harbor</span><small>Tradeworks</small></span>', ' data-page="home"') +
    '<nav class="ow-nav" aria-label="Site">' + nav.map(([p, l]) => btn(ctx, "ow-link" + (page === p ? " is-current" : ""), "site-go", l, ' data-page="' + p + '"' + (page === p ? ' aria-current="page"' : ""))).join("") + "</nav>" +
    '<span class="ow-phone">' + ICONS.phone + "<span>" + esc(BUSINESS.phone) + "</span></span></div></header>";
}

function modernPage(s, ctx, page) {
  if (page === "service") return servicePage(s, ctx);
  if (page === "estimate") return estimatePage(s, ctx);
  if (page === "book") return bookPage(s, ctx);
  if (page === "confirm") return confirmPage(s, ctx);
  if (page === "contact") return homePage(s, ctx);
  return homePage(s, ctx);
}

function ctas(ctx, serviceId) {
  const out = [];
  const d = serviceId ? ' data-service="' + serviceId + '"' : "";
  if (ctx.flags.estimates) out.push(btn(ctx, "ow-primary", "estimate-start", "Get a sample estimate", d));
  if (ctx.flags.scheduling) out.push(btn(ctx, out.length ? "ow-secondary" : "ow-primary", "book-start", "Book a site visit", d));
  if (!out.length) out.push('<span class="ow-callout">' + ICONS.phone + " Call " + esc(BUSINESS.phone) + " for an estimate</span>");
  return '<div class="ow-ctas">' + out.join("") + "</div>";
}

function homePage(s, ctx) {
  // Hero, trust strip and numbered service cards: visual direction from v0 Concept 2 (craftsman), rebuilt for legibility.
  const cards = SERVICES.map((x, i) =>
    '<li class="ow-card"><span class="ow-num" aria-hidden="true">' + String(i + 1).padStart(2, "0") + '</span><span class="ow-ico">' + serviceIcon(x.id) + "</span>" +
    "<h3>" + btn(ctx, "ow-card-link", "site-service", esc(x.name), ' data-service="' + x.id + '"') + '</h3><p>' + esc(x.summary) + '</p><span class="ow-more" aria-hidden="true">' + ICONS.arrow + "</span></li>").join("");
  return '<section class="ow-hero" aria-labelledby="' + ctx.idp + 'ow-hero-h"><div class="ow-hero-copy"><p class="ow-kicker"><i></i>Built with care. Kept with pride.</p>' +
    '<h2 id="' + ctx.idp + 'ow-hero-h">Make room<br>for <em>living.</em></h2>' +
    "<p>Decks, floors, paint, fences and year-round upkeep from one local team. See a sample range in minutes, then pick a time for a visit.</p>" + ctas(ctx) + "</div>" +
    '<div class="ow-art" aria-hidden="true"><span class="ow-sun"></span><span class="ow-art-label">The outdoor room<br><b>Built for every day</b></span>' +
    '<span class="ow-house"><span class="ow-roof"></span><span class="ow-walls"><span class="ow-win"></span><span class="ow-door"></span></span><span class="ow-deck"></span><span class="ow-rail r1"></span><span class="ow-rail r2"></span><span class="ow-post p1"></span><span class="ow-post p2"></span><span class="ow-post p3"></span></span></div></section>' +
    '<ul class="ow-trust" role="list"><li>Locally rooted in ' + esc(BUSINESS.area.replace(" (fictional)", "")) + '</li><li>Licensed &amp; insured (sample)</li><li>Clear written estimates</li><li>No-pressure visits</li></ul>' +
    '<section class="ow-services" aria-labelledby="' + ctx.idp + 'ow-svc-h"><div class="ow-sec-head"><div><p class="ow-kicker">The work we do</p><h2 id="' + ctx.idp + 'ow-svc-h">Care for every corner of home.</h2></div>' +
    "<p>From the first board to the final detail, steady hands and clear communication.</p></div>" +
    '<ul class="ow-grid" role="list">' + cards + "</ul></section>" +
    '<section class="ow-band"><div><p class="ow-kicker">A better way to get started</p><h2>Know what comes next.</h2><p>Start with a few project details. The team takes it from there.</p></div>' + ctas(ctx) + "</section>";
}

function servicePage(s, ctx) {
  const x = SERVICE[s.site.serviceId] || SERVICES[0];
  return btn(ctx, "ow-back", "site-go", "← All services", ' data-page="home"') +
    '<article class="ow-service"><span class="ow-ico ow-ico-lg">' + serviceIcon(x.id) + '</span><div><p class="ow-eyebrow">' + esc(x.group) + "</p><h2>" + esc(x.name) + "</h2><p>" + esc(x.summary) + "</p>" +
    '<h3 class="ow-h3">What\'s included</h3><ul class="ow-checks">' + x.includes.map(i => "<li>" + ICONS.check + "<span>" + esc(i) + "</span></li>").join("") + "</ul>" +
    '<h3 class="ow-h3">' + esc(x.optionLabel) + ' options</h3><dl class="ow-opts">' + x.options.map(o => "<div><dt>" + esc(o.label) + "</dt><dd>" + esc(o.note) + "</dd></div>").join("") + "</dl>" +
    ctas(ctx, x.id) + "</div></article>";
}

/* ---------- estimate builder (Upgrade B) ---------- */
function estimatePage(s, ctx) {
  const d = s.site.est || newEstimateDraft(s.site.serviceId);
  const sv = SERVICE[d.service];
  const err = s.site.errors;
  const est = Object.keys(validInputs(sv, d.inputs)).length ? null : estimate(sv.id, d.inputs);
  const id = k => ctx.idp + "e-" + k;
  const field = (k, label, val, unit) => '<div class="fq' + (err[k] ? " has-error" : "") + '"><label for="' + id(k) + '">' + label + '</label><div class="fq-unit"><input id="' + id(k) + '" type="number" inputmode="decimal" min="1" value="' + esc(val) + '" data-input="est-dim" data-key="' + k + '"' + (err[k] ? ' aria-invalid="true" aria-describedby="' + id(k) + '-err"' : "") + ti(ctx) + "><span>" + unit + "</span></div>" +
    (err[k] ? '<p class="fq-err" id="' + id(k) + '-err">' + esc(err[k]) + "</p>" : "") + "</div>";
  const dims = sv.unit === "area" ? field("length", "Length", d.inputs.length, "ft") + '<span class="fq-x" aria-hidden="true">×</span>' + field("width", "Width", d.inputs.width, "ft")
    : sv.unit === "linear" ? field("feet", "Length", d.inputs.feet, "ft") : field("count", "How many " + sv.unitLabel, d.inputs.count, sv.unitLabel);
  const services = SERVICES.map(x => '<label class="tile' + (x.id === d.service ? " is-on" : "") + '"><input type="radio" name="' + ctx.idp + 'e-svc" value="' + x.id + '" data-input="est-service"' + (x.id === d.service ? " checked" : "") + ti(ctx) + '><span class="tile-ico">' + serviceIcon(x.id) + "</span><span>" + esc(x.name) + "</span></label>").join("");
  const options = sv.options.map(o => '<label class="choice' + (o.id === d.inputs.option ? " is-on" : "") + '"><input type="radio" name="' + ctx.idp + 'e-opt" value="' + o.id + '" data-input="est-option"' + (o.id === d.inputs.option ? " checked" : "") + ti(ctx) + '><span class="choice-t">' + esc(o.label) + '</span><span class="choice-d">' + esc(o.note) + "</span></label>").join("");
  const conds = sv.conditions.map(c => '<label class="check"><input type="checkbox" value="' + c.id + '" data-input="est-cond"' + (d.inputs.conditions.includes(c.id) ? " checked" : "") + ti(ctx) + "><span>" + esc(c.label) + "</span></label>").join("");
  const ce = k => (err[k] ? '<p class="fq-err" id="' + id(k) + '-err">' + esc(err[k]) + "</p>" : "");
  const contact = (k, label, type, val, opt) => '<div class="fq' + (err[k] ? " has-error" : "") + '"><label for="' + id(k) + '">' + label + (opt ? ' <span class="fq-opt">(optional)</span>' : "") + '</label><input id="' + id(k) + '" type="' + type + '" autocomplete="off" maxlength="120" value="' + esc(val) + '" data-input="est-field" data-key="' + k + '"' + (err[k] ? ' aria-invalid="true" aria-describedby="' + id(k) + '-err"' : "") + ti(ctx) + ">" + ce(k) + "</div>";
  const errCount = Object.keys(err).length;

  return '<section class="est" aria-labelledby="' + ctx.idp + 'est-h"><div class="est-head"><p class="ow-eyebrow">Upgrade B · Instant sample estimate</p><h2 id="' + ctx.idp + 'est-h">Get a sample estimate</h2>' +
    '<p>Answer a few questions to see a preliminary sample range. It updates as you go.</p></div>' +
    (errCount ? '<div class="fq-summary" role="alert"><p>Please fix ' + errCount + (errCount === 1 ? " field" : " fields") + " below.</p></div>" : "") +
    '<form class="est-grid" data-form="estimate" novalidate><div class="est-steps">' +
    '<fieldset class="est-step"><legend><span class="est-n">1</span>Service</legend><div class="tiles">' + services + "</div></fieldset>" +
    '<fieldset class="est-step"><legend><span class="est-n">2</span>Measurements</legend><p class="fq-hint">' + ICONS.ruler + " " + (sv.unit === "area" ? "Pace it off or use a tape measure. Rough numbers are fine." : sv.unit === "linear" ? "Walk the line you want covered. A typical backyard fence is 100 to 150 ft." : "Count what needs work.") + '</p><div class="fq-dims">' + dims + "</div></fieldset>" +
    '<fieldset class="est-step"><legend><span class="est-n">3</span>' + esc(sv.optionLabel) + '</legend><div class="choices">' + options + "</div></fieldset>" +
    '<fieldset class="est-step"><legend><span class="est-n">4</span>Project conditions <span class="fq-opt">(optional)</span></legend><div class="checks">' + conds + "</div></fieldset>" +
    '<fieldset class="est-step"><legend><span class="est-n">5</span>Your details <span class="fq-opt">(fictional)</span></legend>' +
    btn(ctx, "fq-link", "est-sample", "Use sample details") +
    '<div class="fq-row">' + contact("name", "Name", "text", d.name) + contact("email", "Email", "email", d.email) + "</div>" + contact("phone", "Phone", "tel", d.phone, true) +
    (ctx.flags.scheduling ? '<label class="check"><input type="checkbox" data-input="est-visit"' + (d.wantVisit ? " checked" : "") + ti(ctx) + "><span>Pick a site-visit time after submitting</span></label>" : "") + "</fieldset></div>" +
    '<aside class="est-result" aria-labelledby="' + ctx.idp + 'est-r-h"><p class="est-label" id="' + ctx.idp + 'est-r-h">Preliminary sample range</p>' +
    (est ? '<p class="est-range" data-testid="est-range"><span>' + fmtMoney(est.range[0]) + '</span><span class="est-dash">–</span><span>' + fmtMoney(est.range[1]) + "</span></p>" +
      '<ul class="est-lines">' + est.lines.map(l => "<li><span>" + esc(l.label) + "</span><span>" + fmtRange(l.range) + "</span></li>").join("") + "</ul>"
      : '<p class="est-range est-range-empty" data-testid="est-range">Enter measurements</p>') +
    '<p class="est-disc"><strong>Sample estimate · fictional rates · not a quote.</strong> A real price is confirmed only after a site visit.</p>' +
    '<button type="submit" class="ow-primary est-submit"' + ti(ctx) + ">Request this estimate</button></aside></form></section>";
}

/* ---------- booking (Upgrade C) ---------- */
function bookPage(s, ctx) {
  const d = s.site.book || newBookingDraft(s.site.serviceId);
  const err = s.site.errors;
  const linked = d.linkedId && s.records.find(r => r.id === d.linkedId);
  const id = k => ctx.idp + "b-" + k;
  const days = [];
  for (let i = 1; i <= SCHEDULE_DAYS; i++) days.push(i);
  // Calendar grid with days as columns and windows as rows: layout from v0 Concept 2.
  const head = '<div class="cal-corner" aria-hidden="true">' + esc(fmtDay(1, { month: "short" })) + "</div>" + days.map(day => '<div class="cal-day" aria-hidden="true"><small>' + esc(fmtDay(day, { weekday: "short" })) + "</small><b>" + esc(fmtDay(day, { day: "numeric" })) + "</b></div>").join("");
  const rows = SLOTS.map((lab, si) => '<div class="cal-time" aria-hidden="true">' + esc(lab) + "</div>" + days.map(day => {
    const taken = slotTaken(s, day, si, d.linkedId);
    const on = d.day === day && d.slot === si;
    const name = fmtDay(day, { weekday: "long", month: "long", day: "numeric" }) + ", " + lab;
    // Visible word first, then the full date for screen readers, so the accessible name contains the visible label.
    return '<button type="button" class="slot' + (on ? " is-on" : "") + (taken ? " is-taken" : "") + '" data-action="book-slot" data-day="' + day + '" data-slot="' + si + '" aria-pressed="' + on + '"' + (taken ? " disabled" : "") + ti(ctx) + ">" +
      (taken ? "Taken" : on ? ICONS.check + '<span class="hs-sr">Selected</span>' : "Open") + '<span class="hs-sr">, ' + esc(name) + "</span></button>";
  }).join("")).join("");
  const grid = '<div class="cal-scroll"><div class="cal" role="group" aria-labelledby="' + id("slots-h") + '"' + (err.slot ? ' aria-describedby="' + id("slot-err") + '"' : "") + ">" + head + rows + "</div></div>";
  const svcOpts = '<option value="">Choose a service</option>' + SERVICES.map(x => '<option value="' + x.id + '"' + (x.id === d.service ? " selected" : "") + ">" + esc(x.name) + "</option>").join("");
  const ce = k => (err[k] ? '<p class="fq-err" id="' + id(k) + '-err">' + esc(err[k]) + "</p>" : "");
  const inv = k => (err[k] ? ' aria-invalid="true" aria-describedby="' + id(k) + '-err"' : "");
  const input = (k, label, type, val, opt) => '<div class="fq' + (err[k] ? " has-error" : "") + '"><label for="' + id(k) + '">' + label + (opt ? ' <span class="fq-opt">(optional)</span>' : "") + '</label><input id="' + id(k) + '" type="' + type + '" autocomplete="off" maxlength="120" value="' + esc(val) + '" data-input="book-field" data-key="' + k + '"' + inv(k) + ti(ctx) + ">" + ce(k) + "</div>";
  const errCount = Object.keys(err).length;
  return '<section class="book" aria-labelledby="' + ctx.idp + 'book-h"><p class="ow-eyebrow">Upgrade C · Online scheduling</p><h2 id="' + ctx.idp + 'book-h">' + (linked ? "Pick a site-visit time for " + esc(linked.id) : "Book a site visit") + "</h2>" +
    "<p>Choose an open window. The team confirms every visit before it's final.</p>" +
    (errCount ? '<div class="fq-summary" role="alert"><p>Please fix ' + errCount + (errCount === 1 ? " field" : " fields") + " below.</p></div>" : "") +
    '<form class="book-form" data-form="book" novalidate>' +
    (linked ? '<p class="book-linked">' + serviceIcon(linked.service) + "<span>" + esc(SERVICE[linked.service].name) + " · sample range " + fmtRange(linked.estimate) + "</span></p>"
      : '<div class="fq' + (err.service ? " has-error" : "") + '"><label for="' + id("service") + '">Service</label><select id="' + id("service") + '" data-input="book-field" data-key="service"' + inv("service") + ti(ctx) + ">" + svcOpts + "</select>" + ce("service") + "</div>") +
    '<h3 class="book-h3" id="' + id("slots-h") + '">' + ICONS.calendar + " Sample availability <span>(next " + SCHEDULE_DAYS + " business days)</span></h3>" + grid +
    (err.slot ? '<p class="fq-err" id="' + id("slot-err") + '">' + esc(err.slot) + "</p>" : "") +
    (linked ? "" : '<div class="fq-contact">' + btn(ctx, "fq-link", "book-sample", "Use sample details") + '<div class="fq-row">' + input("name", "Name", "text", d.name) + input("email", "Email", "email", d.email) + "</div>" + input("phone", "Phone", "tel", d.phone, true) + "</div>") +
    '<div class="fq-actions"><button type="submit" class="ow-primary"' + ti(ctx) + ">Request this time</button>" +
    (d.day != null ? '<p class="book-pick" data-testid="book-pick">Selected: <strong>' + esc(slotLabel({ dayOffset: d.day, slot: d.slot })) + "</strong></p>" : "") + "</div>" +
    '<p class="est-disc">Demo scheduling: availability is sample data, no calendar is connected and nothing is booked.</p></form></section>';
}

/* ---------- confirmation ---------- */
function confirmPage(s, ctx) {
  const r = s.records.find(x => x.id === s.site.confirmId);
  if (!r) return "";
  const next = [];
  if (r.type === "estimate" && !r.appointment && ctx.flags.scheduling) next.push(btn(ctx, "ow-primary", "book-start", "Pick a site-visit time", ' data-link="' + r.id + '"'));
  if (s.upgrades.automation) next.push(btn(ctx, next.length ? "ow-secondary" : "ow-primary", "goto-view", "Watch it in the workflow", ' data-view="workflow" data-record="' + r.id + '"'));
  if (s.upgrades.operations) next.push(btn(ctx, next.length ? "ow-secondary" : "ow-primary", "goto-view", "Open in operations", ' data-view="operations" data-record="' + r.id + '"'));
  next.push(btn(ctx, "fq-link", "site-go", "Back to the website", ' data-page="home"'));
  return '<section class="confirm" aria-labelledby="' + ctx.idp + 'cf-h"><span class="confirm-check" aria-hidden="true">' + ICONS.check + "</span>" +
    '<h2 id="' + ctx.idp + 'cf-h">' + (r.appointment && !r.appointment.confirmed ? "Visit requested" : "Estimate request received") + "</h2>" +
    '<p class="confirm-id">Reference <strong data-testid="confirm-id">' + esc(r.id) + "</strong></p>" +
    '<dl class="confirm-sum"><div><dt>Service</dt><dd>' + esc(SERVICE[r.service].name) + "</dd></div>" +
    (r.estimate ? '<div><dt>Sample range</dt><dd data-testid="confirm-range">' + fmtRange(r.estimate) + "</dd></div>" : "") +
    (r.appointment ? '<div><dt>Requested time</dt><dd data-testid="confirm-slot">' + esc(slotLabel(r.appointment)) + " · waiting for staff confirmation</dd></div>" : "") + "</dl>" +
    '<p class="est-disc">Demo only: nothing was sent, no one will call, and nothing was booked. The request exists only in this browser tab.</p><div class="ow-ctas">' + next.join("") + "</div></section>";
}

/* ---------- record creation ---------- */
function createRecord(st, { type, service, inputs, customer, appointment }) {
  const id = nextRecordId();
  const now = Date.now();
  const est = estimate(service, inputs);
  const rec = { id, type, status: "new", source: "visitor", service, inputs, customer, appointment, estimate: est.range, createdAt: now, updatedAt: now, notes: "",
    activity: [{ t: now, text: RECORD_TYPES[type] + " submitted from the website" + (appointment ? " for " + slotLabel(appointment) : ""), actor: "Customer" }] };
  rec.tasks = tasksFor(rec);
  st.records.unshift(rec);
  logEvent(st, id, RECORD_TYPES[type] + ": " + SERVICE[service].name + (rec.estimate ? " · " + fmtRange(rec.estimate) : ""), "Website");
  notify(st, "New " + RECORD_TYPES[type].toLowerCase() + " " + id + " (" + SERVICE[service].name + ")");
  st.workflow.recordId = id; st.workflow.stage = null;
  st.pulse = id;
  return id;
}

function contactErrors(d, e) {
  if (!d.name.trim()) e.name = "Enter a name. Sample details are fine.";
  if (!d.email.trim()) e.email = "Enter an email address. Sample details are fine.";
  else if (!EMAIL_RE.test(d.email.trim())) e.email = "Enter an email in the format name@example.com.";
  return e;
}
const customerOf = d => ({ name: d.name.trim().slice(0, 80), email: d.email.trim().slice(0, 120), phone: d.phone.trim().slice(0, 30) });

/* ---------- actions ---------- */
const focusMain = { focus: "site-main" };
export const actions = {
  "site-go": el => update(s => { s.site.page = el.dataset.page; s.site.errors = {}; }, focusMain),
  "site-service": el => update(s => { s.site.page = "service"; s.site.serviceId = el.dataset.service; }, focusMain),
  "estimate-start": el => update(s => { if (!s.site.est || el.dataset.service) s.site.est = newEstimateDraft(el.dataset.service || s.site.serviceId); s.site.page = "estimate"; s.site.errors = {}; }, focusMain),
  "book-start": el => update(s => {
    const linked = el.dataset.link ? s.records.find(r => r.id === el.dataset.link) : null;
    s.site.book = newBookingDraft(linked ? linked.service : el.dataset.service || s.site.serviceId, linked ? linked.id : null);
    s.site.page = "book"; s.site.errors = {};
  }, focusMain),
  "book-slot": el => update(s => { const b = s.site.book || (s.site.book = newBookingDraft()); b.day = Number(el.dataset.day); b.slot = Number(el.dataset.slot); delete s.site.errors.slot; }, { focusSel: '.slot[data-day="' + el.dataset.day + '"][data-slot="' + el.dataset.slot + '"]' }),
  "est-sample": () => { update(s => { Object.assign(s.site.est, { name: SAMPLE_CUSTOMER.name, email: SAMPLE_CUSTOMER.email, phone: SAMPLE_CUSTOMER.phone }); delete s.site.errors.name; delete s.site.errors.email; }); announce("Sample contact details added."); },
  "book-sample": () => { update(s => { Object.assign(s.site.book, { name: SAMPLE_CUSTOMER.name, email: SAMPLE_CUSTOMER.email, phone: SAMPLE_CUSTOMER.phone }); delete s.site.errors.name; delete s.site.errors.email; }); announce("Sample contact details added."); },
  "classic-again": () => update(s => { s.site.classicSent = false; s.site.classicNote = ""; })
};

export const inputs = {
  "classic-note": el => update(s => { s.site.classicNote = el.value.slice(0, 1000); }, { silent: true }),
  "est-service": el => update(s => { const keep = s.site.est; s.site.est = { ...newEstimateDraft(el.value), name: keep.name, email: keep.email, phone: keep.phone, wantVisit: keep.wantVisit }; s.site.errors = {}; }),
  "est-dim": el => update(s => { s.site.est.inputs[el.dataset.key] = el.value === "" ? "" : Number(el.value); const e = validInputs(SERVICE[s.site.est.service], s.site.est.inputs); if (!e[el.dataset.key]) delete s.site.errors[el.dataset.key]; }),
  "est-option": el => update(s => { s.site.est.inputs.option = el.value; }),
  "est-cond": el => update(s => { const c = s.site.est.inputs.conditions; const i = c.indexOf(el.value); if (el.checked && i < 0) c.push(el.value); if (!el.checked && i >= 0) c.splice(i, 1); }),
  "est-field": el => update(s => { s.site.est[el.dataset.key] = el.value; }, { silent: true }),
  "est-visit": el => update(s => { s.site.est.wantVisit = el.checked; }, { silent: true }),
  "book-field": el => update(s => { s.site.book[el.dataset.key] = el.value; if (el.dataset.key === "service") delete s.site.errors.service; }, { silent: el.dataset.key !== "service" })
};

export const forms = {
  classic: () => update(s => { s.site.classicSent = true; }, focusMain),
  estimate: () => {
    const s = getState();
    const d = s.site.est;
    const e = contactErrors(d, validInputs(SERVICE[d.service], d.inputs));
    if (Object.keys(e).length) {
      update(st => { st.site.errors = e; }, { focusSel: '[aria-invalid="true"]' });
      announce("The request has " + Object.keys(e).length + " problem" + (Object.keys(e).length === 1 ? "" : "s") + " to fix.");
      return;
    }
    let id;
    update(st => {
      id = createRecord(st, { type: "estimate", service: d.service, inputs: { ...d.inputs, conditions: [...d.inputs.conditions] }, customer: customerOf(d), appointment: null });
      st.site.errors = {};
      if (d.wantVisit && st.upgrades.scheduling) { st.site.book = { ...newBookingDraft(d.service, id) }; st.site.page = "book"; }
      else { st.site.page = "confirm"; st.site.confirmId = id; }
      st.site.est = null;
    }, focusMain);
    announce("Estimate request " + id + " created.");
    startPipeline(id);
  },
  book: () => {
    const s = getState();
    const d = s.site.book;
    const linked = d.linkedId && s.records.find(r => r.id === d.linkedId);
    const e = {};
    if (d.day == null) e.slot = "Choose an available time window.";
    if (!linked) { if (!d.service) e.service = "Choose a service."; contactErrors(d, e); }
    if (Object.keys(e).length) {
      update(st => { st.site.errors = e; }, { focusSel: e.service || e.name || e.email ? '[aria-invalid="true"]' : ".slot:not([disabled])" });
      announce("The request has " + Object.keys(e).length + " problem" + (Object.keys(e).length === 1 ? "" : "s") + " to fix.");
      return;
    }
    let id;
    const appt = { dayOffset: d.day, slot: d.slot, kind: "site visit", confirmed: false };
    update(st => {
      if (linked) {
        const r = st.records.find(x => x.id === linked.id);
        r.appointment = appt;
        r.updatedAt = Date.now();
        r.activity.push({ t: r.updatedAt, text: "Site visit requested for " + slotLabel(appt), actor: "Customer" });
        logEvent(st, r.id, "Site visit requested for " + slotLabel(appt), "Website");
        notify(st, "Visit request on " + r.id + " for " + slotLabel(appt) + " needs confirmation");
        id = r.id; st.pulse = id;
      } else {
        const sv = SERVICE[d.service];
        id = createRecord(st, { type: "visit", service: d.service, inputs: { ...sv.dims, option: sv.options[0].id, conditions: [] }, customer: customerOf(d), appointment: appt });
      }
      st.site.book = null; st.site.errors = {}; st.site.page = "confirm"; st.site.confirmId = id;
    }, focusMain);
    announce("Visit requested for " + slotLabel(appt) + ". Reference " + id + ".");
    if (!linked) startPipeline(id);
  }
};

export { quantity };
