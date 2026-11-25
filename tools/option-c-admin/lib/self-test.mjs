/**
 * Cryptographic self-test. Prints a fixed code only.
 * Does not generate a salt, does not read the terminal, and does not connect.
 */

import { assertAllowedRole } from "./allowlist.mjs";
import { CODES } from "./errors.mjs";
import { rfc7677VectorMatches, syntheticSerializationMatches } from "./scram.mjs";

export function runSelfTest(write) {
  const sink = typeof write === "function" ? write : (line) => process.stdout.write(line);
  let code = CODES.SELF_TEST;
  let ok = true;
  if (!rfc7677VectorMatches() || !syntheticSerializationMatches()) {
    ok = false;
    code = CODES.SCRAM_VECTOR;
  }
  try {
    assertAllowedRole("postgres");
    ok = false;
    code = CODES.ALLOWLIST_DENIED;
  } catch (err) {
    if (!err || err.publicCode !== CODES.ALLOWLIST_DENIED) {
      ok = false;
      code = CODES.ALLOWLIST_DENIED;
    }
  }
  try {
    assertAllowedRole("scs_intake_runtime");
  } catch {
    ok = false;
    code = CODES.ALLOWLIST_DENIED;
  }
  sink(`${JSON.stringify({ result: ok ? "PASS" : "FAIL", code })}\n`);
  return ok ? 0 : 1;
}
