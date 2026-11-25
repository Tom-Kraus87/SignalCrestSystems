/**
 * Printable ASCII 0x21–0x7E, minimum 32 bytes, unique across roles.
 * Passwords stay in buffers. Digests are compared; the buffers are not logged.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { CODES, coded } from "./errors.mjs";
import { ALLOWED_ROLES, assertAllowedRole } from "./allowlist.mjs";

export const MIN_PASSWORD_BYTES = 32;

export function assertPasswordBuffer(password) {
  if (!Buffer.isBuffer(password) || password.length < MIN_PASSWORD_BYTES) {
    throw coded(CODES.PASSWORD_POLICY);
  }
  for (const byte of password) {
    if (byte < 0x21 || byte > 0x7e) {
      throw coded(CODES.PASSWORD_POLICY);
    }
  }
  return password;
}

export function passwordDigest(password) {
  assertPasswordBuffer(password);
  return createHash("sha256").update(password).digest();
}

export function passwordsMatch(left, right) {
  if (!Buffer.isBuffer(left) || !Buffer.isBuffer(right) || left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * @param {Record<string, Buffer>} passwords one buffer per allowlisted role
 */
export function assertUniqueRolePasswords(passwords) {
  if (!passwords || typeof passwords !== "object") {
    throw coded(CODES.PASSWORD_POLICY);
  }
  const digests = [];
  for (const role of ALLOWED_ROLES) {
    if (!Object.hasOwn(passwords, role)) {
      throw coded(CODES.PASSWORD_POLICY);
    }
    assertAllowedRole(role);
    const digest = passwordDigest(passwords[role]);
    for (const previous of digests) {
      if (timingSafeEqual(digest, previous)) {
        digest.fill(0);
        for (const item of digests) item.fill(0);
        throw coded(CODES.PASSWORD_REUSED);
      }
    }
    digests.push(digest);
  }
  for (const digest of digests) digest.fill(0);
}

export function zeroBuffers(buffers) {
  if (!buffers) return;
  for (const buffer of buffers) {
    if (Buffer.isBuffer(buffer)) buffer.fill(0);
  }
}
