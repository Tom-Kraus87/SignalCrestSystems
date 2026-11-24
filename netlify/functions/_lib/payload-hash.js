/**
 * Stable fingerprint for idempotency payload-conflict detection.
 * Never log the raw payload or this hash next to PII in application logs.
 */

const crypto = require("node:crypto");

/**
 * Canonical subset used to decide whether two submissions with the same
 * idempotency key are "identical" vs conflicting.
 * @param {object} lead
 * @returns {string} hex sha256
 */
function leadPayloadHash(lead) {
  const canonical = JSON.stringify({
    formName: lead.formName || "",
    name: lead.name || "",
    email: String(lead.email || "").toLowerCase(),
    company: lead.company || "",
    phone: lead.phone || "",
    service: lead.service || "",
    timeline: lead.timeline || "",
    budget: lead.budget || "",
    message: lead.message || "",
    source: lead.source || "",
    advisorBrief: lead.advisorBrief || "",
    pagePath: lead.pagePath || "",
    privacyVersion: lead.privacyVersion || "",
    consent: true,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

module.exports = {
  leadPayloadHash,
};
