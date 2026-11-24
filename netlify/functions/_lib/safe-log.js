/**
 * Safe logging helpers — never log request bodies, emails, messages, or secrets.
 */

function safeRequestMeta(event, extra) {
  const headers = (event && event.headers) || {};
  const method = (event && event.httpMethod) || (event && event.method) || "";
  const path = (event && (event.path || event.rawPath)) || "";
  return {
    method,
    path,
    contentLength: headers["content-length"] || headers["Content-Length"] || null,
    hasIdempotencyKey: Boolean(
      headers["idempotency-key"] ||
        headers["Idempotency-Key"] ||
        (extra && extra.idempotencyKey)
    ),
    code: extra && extra.code ? extra.code : undefined,
    status: extra && extra.status ? extra.status : undefined,
  };
}

function logInfo(message, meta) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: "info", message, meta: meta || {} }));
}

function logWarn(message, meta) {
  // eslint-disable-next-line no-console
  console.warn(JSON.stringify({ level: "warn", message, meta: meta || {} }));
}

function logError(message, meta) {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ level: "error", message, meta: meta || {} }));
}

module.exports = {
  safeRequestMeta,
  logInfo,
  logWarn,
  logError,
};
