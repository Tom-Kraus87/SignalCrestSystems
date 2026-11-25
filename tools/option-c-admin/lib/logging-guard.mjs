/**
 * Transaction-local logging suppression. Every required setting is read back
 * and compared before any credential statement, including the canary ALTER.
 * pgaudit.log is required only when the setting exists.
 */

import { CODES, coded } from "./errors.mjs";

export const REQUIRED_LOG_SETTINGS = Object.freeze({
  log_statement: "none",
  log_min_error_statement: "panic",
  log_min_messages: "fatal",
  pg_stat_statements_track: "none",
});

export function pgauditIsPresent(probeRow) {
  if (!probeRow || probeRow.pgaudit_log == null || probeRow.pgaudit_log === "") return false;
  return true;
}

export function assertLogSettings(row, pgauditRequired) {
  if (!row || typeof row !== "object") throw coded(CODES.LOG_SETTING);
  for (const [key, expected] of Object.entries(REQUIRED_LOG_SETTINGS)) {
    if (row[key] !== expected) throw coded(CODES.LOG_SETTING);
  }
  if (pgauditRequired && row.pgaudit_log !== "none") throw coded(CODES.LOG_SETTING);
}
