/**
 * PostgreSQL SCRAM-SHA-256 verifier derivation using node:crypto only.
 * SASLprep is not implemented. Callers must already have restricted the
 * password to printable ASCII, which makes SASLprep a no-op.
 *
 * Serialization matches PostgreSQL scram_build_secret:
 *   SCRAM-SHA-256$<iterations>:<base64 salt>$<base64 StoredKey>:<base64 ServerKey>
 * Base64 is the standard alphabet with padding. Salt is at least 16 bytes.
 * StoredKey and ServerKey are 32 bytes. No whitespace and no quotes.
 */

import { createHash, createHmac, pbkdf2Sync } from "node:crypto";
import { CODES, coded } from "./errors.mjs";

export const VERIFIER_PATTERN =
  /^SCRAM-SHA-256\$[1-9]\d*:[A-Za-z0-9+/]+=*\$[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/;

/** RFC 7677 §3 SCRAM-SHA-256 authentication vector. Published test data, not a credential. */
export const RFC7677 = Object.freeze({
  password: "pencil",
  saltBase64: "W22ZaJ0SNY7soEsUEjb6gQ==",
  iterations: 4096,
  clientFirstBare: "n=user,r=rOprNGfwEbeRWgbNEkqO",
  serverFirst:
    "r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096",
  clientFinalWithoutProof: "c=biws,r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0",
  clientProof: "dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=",
  serverSignature: "6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4=",
  verifier:
    "SCRAM-SHA-256$4096:W22ZaJ0SNY7soEsUEjb6gQ==$WG5d8oPm3OtcPnkdi4Uo7BkeZkBFzpcXkuLmtbsT4qY=:wfPLwcE6nTWhTAmQ7tl2KeoiWGPlZqQxSrmfPwDl2dU=",
});

/**
 * Synthetic non-secret serialization fixture.
 * Password is 32 ASCII "A" bytes. Salt is the 16 ASCII bytes 0123456789abcdef.
 * Iterations 4096. This is not a role password and must not be logged by the utility.
 */
export const SYNTHETIC_SERIALIZATION = Object.freeze({
  password: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  saltAscii: "0123456789abcdef",
  iterations: 4096,
  verifier:
    "SCRAM-SHA-256$4096:MDEyMzQ1Njc4OWFiY2RlZg==$3NIj6zQms0r21b/onbrd8cu89pwSmlF0SUbwFNNpVxo=:hhqGr59gMLpTCST9+Tqh0QMpcj3WNeQOSGOqgLarrP8=",
});

function xorBuffers(left, right) {
  const out = Buffer.alloc(left.length);
  for (let i = 0; i < left.length; i += 1) out[i] = left[i] ^ right[i];
  return out;
}

export function deriveScramKeys(password, salt, iterations) {
  if (!Buffer.isBuffer(password) || password.length < 1) throw coded(CODES.SCRAM_FORMAT);
  if (!Buffer.isBuffer(salt) || salt.length < 16) throw coded(CODES.SCRAM_FORMAT);
  if (!Number.isInteger(iterations) || iterations < 1) throw coded(CODES.SCRAM_FORMAT);
  const saltedPassword = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const clientKey = createHmac("sha256", saltedPassword).update("Client Key").digest();
  const storedKey = createHash("sha256").update(clientKey).digest();
  const serverKey = createHmac("sha256", saltedPassword).update("Server Key").digest();
  saltedPassword.fill(0);
  return { clientKey, storedKey, serverKey };
}

export function serializeScramVerifier(iterations, salt, storedKey, serverKey) {
  if (!Number.isInteger(iterations) || iterations < 1) throw coded(CODES.SCRAM_FORMAT);
  if (!Buffer.isBuffer(salt) || salt.length < 16) throw coded(CODES.SCRAM_FORMAT);
  if (!Buffer.isBuffer(storedKey) || storedKey.length !== 32) throw coded(CODES.SCRAM_FORMAT);
  if (!Buffer.isBuffer(serverKey) || serverKey.length !== 32) throw coded(CODES.SCRAM_FORMAT);
  const verifier = `SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${storedKey.toString("base64")}:${serverKey.toString("base64")}`;
  if (!VERIFIER_PATTERN.test(verifier)) throw coded(CODES.SCRAM_FORMAT);
  return verifier;
}

export function buildVerifier(password, options) {
  const salt = options && options.salt;
  const iterations = options && options.iterations;
  const keys = deriveScramKeys(password, salt, iterations);
  try {
    return serializeScramVerifier(iterations, salt, keys.storedKey, keys.serverKey);
  } finally {
    keys.clientKey.fill(0);
    keys.storedKey.fill(0);
    keys.serverKey.fill(0);
  }
}

export function authMessage(clientFirstBare, serverFirst, clientFinalWithoutProof) {
  return `${clientFirstBare},${serverFirst},${clientFinalWithoutProof}`;
}

export function rfc7677Proofs(passwordBuffer) {
  const salt = Buffer.from(RFC7677.saltBase64, "base64");
  const keys = deriveScramKeys(passwordBuffer, salt, RFC7677.iterations);
  try {
    const message = authMessage(
      RFC7677.clientFirstBare,
      RFC7677.serverFirst,
      RFC7677.clientFinalWithoutProof
    );
    const storedKey = createHash("sha256").update(keys.clientKey).digest();
    const clientSignature = createHmac("sha256", storedKey).update(message).digest();
    const clientProof = xorBuffers(keys.clientKey, clientSignature);
    const serverSignature = createHmac("sha256", keys.serverKey).update(message).digest();
    const verifier = serializeScramVerifier(
      RFC7677.iterations,
      salt,
      storedKey,
      keys.serverKey
    );
    storedKey.fill(0);
    clientSignature.fill(0);
    return {
      clientProof: clientProof.toString("base64"),
      serverSignature: serverSignature.toString("base64"),
      verifier,
    };
  } finally {
    keys.clientKey.fill(0);
    keys.storedKey.fill(0);
    keys.serverKey.fill(0);
    salt.fill(0);
  }
}

/** Returns true when the published RFC 7677 vector matches. Never throws the expected bytes. */
export function rfc7677VectorMatches() {
  const password = Buffer.from(RFC7677.password, "utf8");
  try {
    const proofs = rfc7677Proofs(password);
    return (
      proofs.clientProof === RFC7677.clientProof &&
      proofs.serverSignature === RFC7677.serverSignature &&
      proofs.verifier === RFC7677.verifier
    );
  } finally {
    password.fill(0);
  }
}

export function syntheticSerializationMatches() {
  const password = Buffer.from(SYNTHETIC_SERIALIZATION.password, "utf8");
  const salt = Buffer.from(SYNTHETIC_SERIALIZATION.saltAscii, "utf8");
  try {
    const verifier = buildVerifier(password, { salt, iterations: SYNTHETIC_SERIALIZATION.iterations });
    return verifier === SYNTHETIC_SERIALIZATION.verifier;
  } finally {
    password.fill(0);
    salt.fill(0);
  }
}
