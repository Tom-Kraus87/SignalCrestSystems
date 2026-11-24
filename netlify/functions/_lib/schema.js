/**
 * Strict lead-intake request schema.
 * Unknown fields are rejected. Size limits are hard caps (reject, never truncate).
 */

const {
  normalizeTextChecked,
  normalizeEmailChecked,
  normalizeConsent,
  normalizeOptional,
} = require("./normalize");
const { isAcceptedPrivacyVersion } = require("./privacy");
const { detectSensitiveInfo } = require("./sensitive");

const MAX_BODY_BYTES = 24 * 1024; // 24 KiB raw body
const LIMITS = Object.freeze({
  name: 120,
  email: 254,
  company: 200,
  phone: 40,
  message: 5000,
  advisorBrief: 8000,
  pagePath: 200,
  idempotencyKey: 128,
  userAgent: 512,
});

const ALLOWED_FORM_NAMES = Object.freeze(["project-request", "contact"]);
const ALLOWED_SOURCES = Object.freeze(["contact", "advisor", "project-request"]);
const ALLOWED_SERVICES = Object.freeze([
  "package-landing",
  "package-starter",
  "package-professional",
  "package-advanced",
  "custom-software",
  "ai-automation",
  "website-transformation",
  "it-consulting",
  "cybersecurity",
  "qa-automation",
  "care-plan",
  "local-seo",
  "other",
  "",
]);
const ALLOWED_TIMELINES = Object.freeze([
  "",
  "asap",
  "1-3-months",
  "3-6-months",
  "exploring",
]);
const ALLOWED_BUDGETS = Object.freeze([
  "",
  "under-2k",
  "2k-5k",
  "5k-15k",
  "15k-plus",
]);

const KNOWN_KEYS = Object.freeze([
  "formName",
  "form_name",
  "form-name",
  "name",
  "email",
  "company",
  "phone",
  "service",
  "timeline",
  "budget",
  "message",
  "consent",
  "privacyVersion",
  "privacy_version",
  "privacy-version",
  "source",
  "advisorBrief",
  "advisor_brief",
  "advisor-brief",
  "pagePath",
  "page_path",
  "botField",
  "bot_field",
  "bot-field",
  "idempotencyKey",
  "idempotency_key",
  "isTest",
  "is_test",
  "turnstileToken",
  "turnstile_token",
  "cf-turnstile-response",
]);

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isSafePagePath(path) {
  if (!path) return true;
  if (path.length > LIMITS.pagePath) return false;
  if (path.includes("://") || path.startsWith("//")) return false;
  if (path.includes("..")) return false;
  return /^\/?[A-Za-z0-9._~\-\/]*$/.test(path);
}

/**
 * @param {object} raw
 * @returns {{ ok: true, value: object } | { ok: false, status: number, code: string, message: string, fields?: object }}
 */
function validateLeadPayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_body",
      message: "Request body must be a JSON object.",
    };
  }

  const unknown = Object.keys(raw).filter((k) => !KNOWN_KEYS.includes(k));
  if (unknown.length) {
    return {
      ok: false,
      status: 400,
      code: "unknown_fields",
      message: "Request contains unsupported fields.",
    };
  }

  const formName = String(
    pick(raw, "formName", "form_name", "form-name") || ""
  ).trim();

  const nameChk = normalizeTextChecked(pick(raw, "name"), LIMITS.name);
  const emailChk = normalizeEmailChecked(pick(raw, "email"), LIMITS.email);
  const companyChk = normalizeOptional(pick(raw, "company"), LIMITS.company);
  const phoneChk = normalizeOptional(pick(raw, "phone"), LIMITS.phone);
  const serviceChk = normalizeTextChecked(pick(raw, "service") || "", 64);
  const timelineChk = normalizeTextChecked(pick(raw, "timeline") || "", 64);
  const budgetChk = normalizeTextChecked(pick(raw, "budget") || "", 64);
  const messageChk = normalizeTextChecked(pick(raw, "message"), LIMITS.message);
  const consent = normalizeConsent(pick(raw, "consent"));
  const privacyChk = normalizeTextChecked(
    pick(raw, "privacyVersion", "privacy_version", "privacy-version"),
    64
  );
  const sourceChk = normalizeTextChecked(pick(raw, "source") || "contact", 40);
  const advisorChk = normalizeOptional(
    pick(raw, "advisorBrief", "advisor_brief", "advisor-brief"),
    LIMITS.advisorBrief
  );
  const pagePathChk = normalizeOptional(
    pick(raw, "pagePath", "page_path"),
    LIMITS.pagePath
  );
  const botChk = normalizeTextChecked(
    pick(raw, "botField", "bot_field", "bot-field") || "",
    200
  );
  const idemChk = normalizeTextChecked(
    pick(raw, "idempotencyKey", "idempotency_key") || "",
    LIMITS.idempotencyKey
  );
  const turnstileToken = String(
    pick(raw, "turnstileToken", "turnstile_token", "cf-turnstile-response") || ""
  ).trim();
  const isTest = Boolean(pick(raw, "isTest", "is_test"));

  const fields = {};

  if (nameChk.tooLong) fields.name = "Name exceeds maximum length.";
  if (emailChk.tooLong) fields.email = "Email exceeds maximum length.";
  if (companyChk.tooLong) fields.company = "Company exceeds maximum length.";
  if (phoneChk.tooLong) fields.phone = "Phone exceeds maximum length.";
  if (messageChk.tooLong) fields.message = "Message exceeds maximum length.";
  if (advisorChk.tooLong) fields.advisorBrief = "Advisor brief exceeds maximum length.";
  if (pagePathChk.tooLong) fields.pagePath = "Page path exceeds maximum length.";
  if (idemChk.tooLong) fields.idempotencyKey = "Idempotency key exceeds maximum length.";
  if (serviceChk.tooLong) fields.service = "Service exceeds maximum length.";
  if (timelineChk.tooLong) fields.timeline = "Timeline exceeds maximum length.";
  if (budgetChk.tooLong) fields.budget = "Budget exceeds maximum length.";
  if (privacyChk.tooLong) fields.privacyVersion = "Privacy version exceeds maximum length.";
  if (sourceChk.tooLong) fields.source = "Source exceeds maximum length.";
  if (botChk.tooLong) fields.botField = "Bot field exceeds maximum length.";

  const name = nameChk.value;
  const email = emailChk.value;
  const company = companyChk.value;
  const phone = phoneChk.value;
  const serviceRaw = serviceChk.value;
  const timelineRaw = timelineChk.value;
  const budgetRaw = budgetChk.value;
  const message = messageChk.value;
  const privacyVersion = privacyChk.value;
  const source = sourceChk.value;
  const advisorBrief = advisorChk.value;
  const pagePath = pagePathChk.value;
  const botField = botChk.value;
  const idempotencyKey = idemChk.value;

  if (!ALLOWED_FORM_NAMES.includes(formName)) {
    fields.formName = "Invalid form name.";
  }
  if (!name && !fields.name) fields.name = "Name is required.";
  if (!email && !fields.email) fields.email = "Email is required.";
  else if (email && !fields.email && !isValidEmail(email)) fields.email = "Email format is invalid.";
  if (!message && !fields.message) fields.message = "Message is required.";
  if (!consent) {
    fields.consent = "Affirmative consent is required.";
  }
  if (!privacyVersion && !fields.privacyVersion) {
    fields.privacyVersion = "Privacy policy version is required.";
  } else if (privacyVersion && !fields.privacyVersion && !isAcceptedPrivacyVersion(privacyVersion)) {
    fields.privacyVersion = "Privacy policy version is not accepted.";
  }
  if (!fields.source && !ALLOWED_SOURCES.includes(source)) {
    fields.source = "Invalid source.";
  }
  if (!fields.service && !ALLOWED_SERVICES.includes(serviceRaw)) {
    fields.service = "Invalid service selection.";
  }
  if (!fields.timeline && !ALLOWED_TIMELINES.includes(timelineRaw)) {
    fields.timeline = "Invalid timeline.";
  }
  if (!fields.budget && !ALLOWED_BUDGETS.includes(budgetRaw)) {
    fields.budget = "Invalid budget band.";
  }
  if (!fields.pagePath && !isSafePagePath(pagePath || "")) {
    fields.pagePath = "Invalid page path.";
  }
  // Supported public submissions require a valid idempotency key (M7A-R2 A5).
  if (!idempotencyKey && !fields.idempotencyKey) {
    fields.idempotencyKey = "Idempotency key is required.";
  } else if (
    idempotencyKey &&
    !fields.idempotencyKey &&
    !/^[A-Za-z0-9._~\-]{8,128}$/.test(idempotencyKey)
  ) {
    fields.idempotencyKey = "Invalid idempotency key.";
  }

  // Oversized-field rejections take precedence before sensitive-content heuristics.
  if (Object.keys(fields).some((k) => String(fields[k]).includes("exceeds maximum length"))) {
    return {
      ok: false,
      status: 400,
      code: "field_too_long",
      message: "One or more fields exceed the maximum allowed length.",
      fields,
    };
  }

  const sensitiveTargets = [message, advisorBrief || "", name, company || "", phone || ""];
  for (const t of sensitiveTargets) {
    const det = detectSensitiveInfo(t);
    if (det.hit) {
      return {
        ok: false,
        status: 400,
        code: "sensitive_content",
        message:
          "Remove passwords, MFA/recovery codes, API keys, SSNs, or payment card numbers before submitting. Rotate any secret you may have pasted.",
        fields: { message: "Sensitive information detected." },
        // coarse ids only — never matched text
        meta: { reasonIds: det.reasonIds },
      };
    }
  }

  if (Object.keys(fields).length) {
    const code = fields.consent
      ? "consent_required"
      : fields.privacyVersion
        ? "privacy_version_invalid"
        : "validation_failed";
    return {
      ok: false,
      status: 400,
      code,
      message: "Please fix the highlighted fields and try again.",
      fields,
    };
  }

  return {
    ok: true,
    value: {
      formName,
      name,
      email,
      company,
      phone,
      service: serviceRaw || null,
      timeline: timelineRaw || null,
      budget: budgetRaw || null,
      message,
      consent: true,
      privacyVersion,
      source,
      advisorBrief,
      pagePath,
      botField,
      idempotencyKey: idempotencyKey || null,
      turnstileToken: turnstileToken || null,
      isTest,
      honeypotHit: Boolean(botField),
    },
  };
}

module.exports = {
  MAX_BODY_BYTES,
  LIMITS,
  ALLOWED_FORM_NAMES,
  ALLOWED_SOURCES,
  ALLOWED_SERVICES,
  ALLOWED_TIMELINES,
  ALLOWED_BUDGETS,
  validateLeadPayload,
};
