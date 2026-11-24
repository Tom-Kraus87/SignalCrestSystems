/**
 * Input normalization for lead intake — strip control chars, trim.
 * Oversized fields are NOT truncated; callers must reject them.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function stripControlChars(value) {
  return String(value == null ? "" : value).replace(CONTROL_CHARS, "");
}

/**
 * Normalize without silent truncation.
 * @param {*} value
 * @param {number} [maxLen] when provided, values longer than maxLen return
 *   { value, tooLong: true } via normalizeTextChecked; this helper still
 * truncates only when `options.truncate` is explicitly true (legacy/tests).
 * Default: no truncation — returns full cleaned string.
 */
function normalizeText(value, maxLen, options) {
  let s = stripControlChars(value).trim();
  if (options && options.truncate === true && typeof maxLen === "number" && s.length > maxLen) {
    s = s.slice(0, maxLen);
  }
  return s;
}

/**
 * @returns {{ value: string, tooLong: boolean }}
 */
function normalizeTextChecked(value, maxLen) {
  const s = stripControlChars(value).trim();
  const tooLong = typeof maxLen === "number" && s.length > maxLen;
  return { value: s, tooLong };
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

/**
 * @returns {{ value: string, tooLong: boolean }}
 */
function normalizeEmailChecked(value, maxLen) {
  const raw = stripControlChars(value).trim().toLowerCase();
  const tooLong = typeof maxLen === "number" && raw.length > maxLen;
  return { value: raw, tooLong };
}

function normalizeConsent(value) {
  if (value === true || value === 1) return true;
  const s = String(value == null ? "" : value)
    .trim()
    .toLowerCase();
  return s === "yes" || s === "true" || s === "1" || s === "on";
}

function normalizeOptional(value, maxLen) {
  const { value: s, tooLong } = normalizeTextChecked(value, maxLen);
  if (tooLong) return { value: null, tooLong: true };
  return { value: s.length ? s : null, tooLong: false };
}

module.exports = {
  stripControlChars,
  normalizeText,
  normalizeTextChecked,
  normalizeEmail,
  normalizeEmailChecked,
  normalizeConsent,
  normalizeOptional,
};
