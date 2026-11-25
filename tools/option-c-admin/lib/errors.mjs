/**
 * Fixed public error codes. The message is the code and nothing else.
 * Callers must not append SQL, verifiers, passwords, or connection URLs.
 */

export const CODES = Object.freeze({
  MODE_REQUIRED: "OC-MODE-REQUIRED",
  LIVE_UNAUTHORIZED: "OC-LIVE-UNAUTHORIZED",
  ENV_SECRET_FORBIDDEN: "OC-ENV-SECRET-FORBIDDEN",
  PASSWORD_POLICY: "OC-PASSWORD-POLICY",
  PASSWORD_MISMATCH: "OC-PASSWORD-MISMATCH",
  PASSWORD_REUSED: "OC-PASSWORD-REUSED",
  ALLOWLIST_DENIED: "OC-ALLOWLIST-DENIED",
  SCRAM_VECTOR: "OC-SCRAM-VECTOR",
  SCRAM_FORMAT: "OC-SCRAM-FORMAT",
  TLS_HOST: "OC-TLS-HOST",
  TLS_PORT: "OC-TLS-PORT",
  TLS_POOLER: "OC-TLS-POOLER",
  TLS_INSECURE: "OC-TLS-INSECURE",
  TLS_HELPER: "OC-TLS-HELPER",
  LOG_SETTING: "OC-LOG-SETTING",
  CANARY_REQUIRED: "OC-CANARY-REQUIRED",
  CANARY_ATTESTATION: "OC-CANARY-ATTESTATION",
  AUTHORITY: "OC-AUTHORITY",
  MEMBERSHIP: "OC-MEMBERSHIP",
  IDENTITY: "OC-IDENTITY",
  ENCRYPTION: "OC-ENCRYPTION",
  ITERATIONS: "OC-ITERATIONS",
  INJECTION: "OC-INJECTION",
  TERMINAL: "OC-TERMINAL",
  PARTIAL: "OC-PARTIAL",
  PREFLIGHT: "OC-PREFLIGHT",
  LOG_HYGIENE: "OC-LOG-HYGIENE",
  SELF_TEST: "OC-SELF-TEST",
  ROLE_PASS: "OC-ROLE-PASS",
  VERIFY_FAIL: "OC-VERIFY-FAIL",
  INTERNAL: "OC-INTERNAL",
});

const CODE_SET = new Set(Object.values(CODES));

export function isFixedCode(value) {
  return typeof value === "string" && CODE_SET.has(value);
}

export function coded(code) {
  const publicCode = isFixedCode(code) ? code : CODES.INTERNAL;
  const err = new Error(publicCode);
  err.code = publicCode;
  err.publicCode = publicCode;
  return err;
}
