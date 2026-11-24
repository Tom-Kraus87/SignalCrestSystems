/**
 * Server-authoritative privacy policy versions for lead intake.
 * Browser-supplied stamps are validated against this allowlist only.
 */

/** Current published stamp (must match privacy.html / form hidden fields). */
const CURRENT_PRIVACY_VERSION = "privacy-2026-11-23";

/**
 * Accepted stamps during cutover. Prefer CURRENT for new submissions.
 * Do not accept open-ended client invention.
 */
const ACCEPTED_PRIVACY_VERSIONS = Object.freeze([
  "privacy-2026-11-23",
  "advisor-privacy-2026-11-16", // legacy Phase A stamp — retire after Owner cutover
]);

function isAcceptedPrivacyVersion(version) {
  return ACCEPTED_PRIVACY_VERSIONS.includes(String(version || "").trim());
}

module.exports = {
  CURRENT_PRIVACY_VERSION,
  ACCEPTED_PRIVACY_VERSIONS,
  isAcceptedPrivacyVersion,
};
