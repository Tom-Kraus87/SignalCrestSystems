/**
 * Non-secret log sink. Only fixed fields are written. A line that still
 * contains a verifier, a connection URL, or a password clause is replaced
 * with the hygiene code and the original line is discarded.
 */

import { CODES, isFixedCode } from "./errors.mjs";

const ALLOWED_FIELDS = ["phase", "role", "result", "code"];
const SECRET_LINE = /postgres(ql)?:\/\//i;
const VERIFIER_LINE = /SCRAM-SHA-256\$/i;
const PASSWORD_CLAUSE = /PASSWORD\s+'/i;

export function createLogger(write) {
  const sink = typeof write === "function" ? write : () => {};
  return {
    event(fields) {
      const safe = {};
      const source = fields && typeof fields === "object" ? fields : {};
      for (const key of ALLOWED_FIELDS) {
        if (source[key] == null) continue;
        safe[key] = String(source[key]).slice(0, 80);
      }
      if (!isFixedCode(safe.code)) safe.code = CODES.LOG_HYGIENE;
      if (safe.result !== "PASS" && safe.result !== "FAIL") safe.result = "FAIL";
      const line = JSON.stringify(safe);
      if (SECRET_LINE.test(line) || VERIFIER_LINE.test(line) || PASSWORD_CLAUSE.test(line)) {
        sink(`${JSON.stringify({ phase: "log-guard", result: "FAIL", code: CODES.LOG_HYGIENE })}\n`);
        return;
      }
      sink(`${line}\n`);
    },
  };
}
