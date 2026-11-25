/**
 * Core lead-intake processor — Netlify-agnostic for local tests.
 *
 * Never returns a successful submission receipt unless persistence confirmed.
 */

const crypto = require("node:crypto");
const { MAX_BODY_BYTES, validateLeadPayload } = require("./schema");
const { enforceLeadRateLimits } = require("./rate-limit");
const { isKillSwitchOn } = require("./transactional-primitives");
const { logInfo, logWarn, logError, safeRequestMeta } = require("./safe-log");
const { IdempotencyConflictError } = require("./repository");
const { leadPayloadHash } = require("./payload-hash");
const { clientIpFromEvent, resolveIsTestFlag } = require("./request-meta");

function jsonResponse(status, body, headers) {
  return {
    statusCode: status,
    headers: Object.assign(
      {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
      headers || {}
    ),
    body: JSON.stringify(body),
  };
}

function isHostedRuntime(env) {
  const e = env || process.env;
  const scsEnv = String(e.SCS_ENV || "").toLowerCase();
  const nodeEnv = String(e.NODE_ENV || "").toLowerCase();
  const ctx = String(e.CONTEXT || e.Netlify_CONTEXT || "").toLowerCase();
  return (
    scsEnv === "production" ||
    scsEnv === "prod" ||
    scsEnv === "staging" ||
    nodeEnv === "production" ||
    ctx === "production" ||
    ctx === "deploy-preview" ||
    ctx === "branch-deploy" ||
    Boolean(e.NETLIFY)
  );
}

/**
 * Missing, short, or placeholder salts are rejected.
 * There is no public development-salt fallback.
 * @param {string|undefined|null} salt
 */
function ipHashSaltRejected(salt) {
  const value = salt == null ? "" : String(salt).trim();
  if (value.length < 32) return true;
  return /replace_|your_|change_me|placeholder|example|not-for-prod|dev-salt|development-salt/i.test(
    value
  );
}

/**
 * Hash a visitor IP only with a non-placeholder server salt.
 * Invalid salt → null (no IP persisted). Raw IPs are never returned.
 * @param {string|null} ip
 * @param {NodeJS.ProcessEnv} [env]
 */
function hashIp(ip, env) {
  if (!ip) return null;
  const e = env || process.env;
  const salt = e.LEAD_IP_HASH_SALT;
  // Hosted and local: reject missing, short, and placeholder salts.
  // The result is a non-IP fallback (null). Raw visitor IPs are never stored.
  if (isHostedRuntime(e) && ipHashSaltRejected(salt)) return null;
  if (!isHostedRuntime(e) && ipHashSaltRejected(salt)) return null;
  return crypto
    .createHash("sha256")
    .update(String(salt).trim() + "|" + ip)
    .digest("hex")
    .slice(0, 32);
}

function parseBody(event) {
  const raw = event && typeof event.body === "string" ? event.body : "";
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return { error: { status: 413, code: "payload_too_large", message: "Request body is too large." } };
  }
  if (!raw || !raw.trim()) {
    return { error: { status: 400, code: "empty_body", message: "Request body is required." } };
  }
  const contentType = String(
    (event.headers && (event.headers["content-type"] || event.headers["Content-Type"])) || ""
  ).toLowerCase();

  if (contentType.includes("application/json") || raw.trim().startsWith("{")) {
    try {
      return { value: JSON.parse(raw) };
    } catch {
      return { error: { status: 400, code: "malformed_json", message: "Malformed JSON body." } };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const obj = {};
    params.forEach((v, k) => {
      obj[k] = v;
    });
    return { value: obj };
  }

  return {
    error: {
      status: 415,
      code: "unsupported_media",
      message: "Use application/json.",
    },
  };
}

/**
 * @param {object} event Netlify-like event
 * @param {object} deps
 */
async function processLeadRequest(event, deps) {
  const method = (event && (event.httpMethod || event.method)) || "GET";
  if (method === "OPTIONS") {
    return jsonResponse(204, {}, {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
    });
  }
  if (method !== "POST") {
    return jsonResponse(405, { ok: false, code: "method_not_allowed", message: "POST required." });
  }

  if (!deps || !deps.repository) {
    logError("leads_deps_missing", safeRequestMeta(event, { code: "intake_misconfigured", status: 503 }));
    return jsonResponse(503, {
      ok: false,
      code: "intake_misconfigured",
      message: "Lead intake is temporarily unavailable.",
    });
  }

  const env = deps.env || process.env;
  if (await isKillSwitchOn(deps.counterStore || null, env)) {
    logWarn("leads_kill_switch", safeRequestMeta(event, { code: "kill_switch", status: 503 }));
    return jsonResponse(503, {
      ok: false,
      code: "intake_disabled",
      message: "Lead intake is temporarily unavailable.",
    });
  }

  const parsed = parseBody(event);
  if (parsed.error) {
    logWarn("leads_parse_error", safeRequestMeta(event, { code: parsed.error.code, status: parsed.error.status }));
    return jsonResponse(parsed.error.status, {
      ok: false,
      code: parsed.error.code,
      message: parsed.error.message,
    });
  }

  const headers = (event && event.headers) || {};
  const headerIdem =
    headers["idempotency-key"] || headers["Idempotency-Key"] || null;
  if (headerIdem && parsed.value && !parsed.value.idempotencyKey && !parsed.value.idempotency_key) {
    parsed.value.idempotencyKey = String(headerIdem);
  }

  const validated = validateLeadPayload(parsed.value);
  if (!validated.ok) {
    logWarn(
      "leads_validation_rejected",
      safeRequestMeta(event, { code: validated.code, status: validated.status })
    );
    return jsonResponse(validated.status, {
      ok: false,
      code: validated.code,
      message: validated.message,
      fields: validated.fields || undefined,
    });
  }

  const lead = validated.value;
  // Strip visitor-controlled test flag unless server explicitly allows it.
  lead.isTest = resolveIsTestFlag(lead.isTest, env);

  const ip = clientIpFromEvent(event, env);
  const ipHash = hashIp(ip, env);
  const userAgent = normalizeUa(headers["user-agent"] || headers["User-Agent"]);

  if (deps.spamProtector) {
    const spam = await deps.spamProtector.evaluate({
      honeypotHit: lead.honeypotHit,
      ipHash,
      email: lead.email,
      turnstileToken: lead.turnstileToken,
    });
    if (spam.action === "silent_drop") {
      logInfo("leads_honeypot_drop", safeRequestMeta(event, { code: "honeypot", status: 200 }));
      return jsonResponse(200, { ok: true });
    }
    if (spam.action === "reject") {
      return jsonResponse(400, {
        ok: false,
        code: "spam_rejected",
        message: "Unable to accept this submission.",
      });
    }
  } else if (lead.honeypotHit) {
    logInfo("leads_honeypot_drop", safeRequestMeta(event, { code: "honeypot", status: 200 }));
    return jsonResponse(200, { ok: true });
  }

  const payloadHash = leadPayloadHash(lead);

  // A5 rate-limit ordering:
  // Identical replay from response-cache returns original receipt WITHOUT burning
  // rate budget or opening an unlimited DB abuse path. Cache miss → rate limit →
  // durable repository (which still returns original receipt after cache expiry).
  if (lead.idempotencyKey && deps.idempotency) {
    const prior = await deps.idempotency.get(lead.idempotencyKey, payloadHash);
    const marked =
      deps.repository && typeof deps.repository.isIdempotencyKeyDeleted === "function"
        ? await deps.repository.isIdempotencyKeyDeleted(lead.idempotencyKey)
        : false;
    // A warm cache must not outrun a deletion marker.
    if ((prior && prior.deleted) || marked) {
      return jsonResponse(409, {
        ok: false,
        code: "idempotency_key_deleted",
        message: "This submission key is no longer valid.",
      });
    }
    if (
      (prior && prior.fingerprintMismatch) ||
      (prior && prior.payloadHash && prior.payloadHash !== payloadHash)
    ) {
      logWarn(
        "leads_idempotency_conflict",
        safeRequestMeta(event, { code: "idempotency_conflict", status: 409 })
      );
      return jsonResponse(409, {
        ok: false,
        code: "idempotency_conflict",
        message: "This idempotency key was already used with a different request.",
      });
    }
    if (prior && prior.status && prior.body) {
      return jsonResponse(prior.status, prior.body);
    }
  }

  const rate = await enforceLeadRateLimits(deps.rateLimiter, {
    ipHash: ipHash || undefined,
    email: lead.email,
  });
  if (!rate.allowed) {
    logWarn("leads_rate_limited", safeRequestMeta(event, { code: "rate_limited", status: 429 }));
    return jsonResponse(
      429,
      {
        ok: false,
        code: "rate_limited",
        message: "Too many requests. Please try again later.",
      },
      rate.resetAtMs
        ? { "Retry-After": String(Math.max(1, Math.ceil((rate.resetAtMs - Date.now()) / 1000))) }
        : {}
    );
  }

  const receivedAt = new Date().toISOString();

  let persistResult;
  try {
    persistResult = await deps.repository.persistLeadTransaction({
      lead,
      receivedAt,
      ipHash,
      userAgent,
      idempotencyKey: lead.idempotencyKey,
      payloadHash,
    });
  } catch (err) {
    if (
      err instanceof IdempotencyConflictError ||
      (err && err.code === "IDEMPOTENCY_CONFLICT")
    ) {
      logWarn(
        "leads_idempotency_conflict",
        safeRequestMeta(event, { code: "idempotency_conflict", status: 409 })
      );
      return jsonResponse(409, {
        ok: false,
        code: "idempotency_conflict",
        message: "This idempotency key was already used with a different request.",
      });
    }
    if (err && (err.code === "IDEMPOTENCY_KEY_DELETED" || (err.message && err.message.includes("idempotency_key_deleted")))) {
      return jsonResponse(409, {
        ok: false,
        code: "idempotency_key_deleted",
        message: "This submission key is no longer valid.",
      });
    }
    logError("leads_persist_failure", safeRequestMeta(event, { code: "persist_failure", status: 500 }));
    return jsonResponse(500, {
      ok: false,
      code: "persist_failure",
      message: "Unable to save your request. Please try again or email tom@signalcrestsystems.com.",
    });
  }

  // Fail closed: never mint a success receipt without confirmed persistence ids.
  if (
    !persistResult ||
    !persistResult.submissionId ||
    !persistResult.leadId ||
    !persistResult.consentId ||
    !persistResult.receivedAt
  ) {
    logError("leads_persist_unconfirmed", safeRequestMeta(event, { code: "persist_failure", status: 500 }));
    return jsonResponse(500, {
      ok: false,
      code: "persist_failure",
      message: "Unable to save your request. Please try again or email tom@signalcrestsystems.com.",
    });
  }

  const body = {
    ok: true,
    // Durable: always the DB-persisted original received_at (not a fresh clock).
    receivedAt: persistResult.receivedAt,
    receipt: String(persistResult.submissionId).slice(0, 8),
  };

  if (lead.idempotencyKey && deps.idempotency) {
    try {
      await deps.idempotency.putIfAbsent(lead.idempotencyKey, {
        status: 200,
        body,
        payloadHash,
      });
    } catch {
      // Repository already committed; response-cache failure must not undo success.
      logWarn("leads_idempotency_cache_failed", safeRequestMeta(event, { code: "idem_cache", status: 200 }));
    }
  }

  if (deps.notifier && !persistResult.duplicate) {
    try {
      await deps.notifier.notifyLeadAccepted({
        receipt: body.receipt,
        formName: lead.formName,
        source: lead.source,
        receivedAt: persistResult.receivedAt,
        isTest: Boolean(lead.isTest),
      });
    } catch {
      logWarn("leads_notify_failed", safeRequestMeta(event, { code: "notify_failed", status: 200 }));
    }
  }

  logInfo(
    "leads_accepted",
    safeRequestMeta(event, {
      code: persistResult.duplicate ? "duplicate" : "accepted",
      status: 200,
      idempotencyKey: Boolean(lead.idempotencyKey),
    })
  );

  return jsonResponse(200, body);
}

function normalizeUa(ua) {
  if (!ua) return null;
  const s = String(ua);
  if (s.length > 512) return null; // reject oversized UA rather than truncate into storage
  return s.replace(/[\u0000-\u001F\u007F]/g, "") || null;
}

module.exports = {
  processLeadRequest,
  jsonResponse,
  parseBody,
  hashIp,
  isHostedRuntime,
  ipHashSaltRejected,
  clientIpFromEvent,
  MAX_BODY_BYTES,
};
