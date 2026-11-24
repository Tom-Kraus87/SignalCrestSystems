/**
 * Heuristic sensitive-info detector for lead free-text fields.
 *
 * IMPORTANT: This is a best-effort pattern filter. It does NOT claim complete
 * credential, secret, or PII detection. Attackers can evade heuristics.
 * On match: reject the submission; never log the matched substring.
 */

const SENSITIVE_PATTERNS = [
  {
    id: "password_keyword",
    re: /\b(password|passwd|passphrase)\b/i,
  },
  {
    id: "mfa_otp",
    re: /\b(mfa|otp|one[-\s]?time(?:\s+pass(?:word|code)?)?|auth(?:entication)?\s*code|2fa)\b/i,
  },
  {
    id: "recovery_seed",
    re: /\b(recovery\s*key|backup\s*code|seed\s*phrase|private\s*key)\b/i,
  },
  {
    id: "api_key_keyword",
    re: /\bapi[\s_-]?key\b/i,
  },
  {
    id: "ssn",
    re: /\b(ssn|social\s*security)\b/i,
  },
  {
    id: "payment",
    re: /\b(cvv|cvc|credit\s*card|card\s*number)\b/i,
  },
  {
    id: "pan_like",
    re: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
  },
  {
    id: "aws_access_key_shape",
    re: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    id: "bearer_token_shape",
    re: /\bBearer\s+[A-Za-z0-9\-._~+\/]+=*\b/,
  },
];

/**
 * @param {string} text
 * @returns {{ hit: boolean, reasonIds: string[] }}
 * reasonIds are coarse categories only — never include matched text.
 */
function detectSensitiveInfo(text) {
  const raw = String(text || "");
  const reasonIds = [];
  for (const p of SENSITIVE_PATTERNS) {
    if (p.re.test(raw)) reasonIds.push(p.id);
  }
  return { hit: reasonIds.length > 0, reasonIds };
}

function containsSensitiveInfo(text) {
  return detectSensitiveInfo(text).hit;
}

module.exports = {
  SENSITIVE_PATTERNS,
  detectSensitiveInfo,
  containsSensitiveInfo,
};
