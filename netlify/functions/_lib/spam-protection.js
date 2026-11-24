/**
 * Spam-protection interface — provider-independent.
 * Built-in: honeypot + rate limits (Postgres counters in production).
 * Cloudflare Turnstile: contract stub — live verify only when secret is real
 * and a token is supplied; otherwise honeypot remains the local default.
 */

/**
 * @typedef {object} SpamDecision
 * @property {'allow'|'silent_drop'|'reject'} action
 * @property {string} [reason]
 */

/**
 * @typedef {object} SpamProtector
 * @property {(input: { honeypotHit: boolean, ipHash?: string|null, email?: string, turnstileToken?: string|null }) => Promise<SpamDecision>} evaluate
 */

/** Default: honeypot silent-drop; otherwise allow (rate limit handled separately). */
class HoneypotSpamProtector {
  async evaluate(input) {
    if (input && input.honeypotHit) {
      return { action: "silent_drop", reason: "honeypot" };
    }
    return { action: "allow" };
  }
}

/**
 * Stub for a future external provider — always allows; documents the seam.
 * Do not configure live CAPTCHA keys until hosted staging authorization.
 */
class UnprovisionedExternalSpamProtector {
  constructor(inner) {
    this.inner = inner || new HoneypotSpamProtector();
  }

  async evaluate(input) {
    return this.inner.evaluate(input);
  }
}

/**
 * Cloudflare Turnstile adapter with explicit fail-closed when required (M7A-R2 B).
 * - Always applies honeypot first.
 * - When TURNSTILE_REQUIRED / requireToken and secret is placeholder → reject (fail closed).
 * - When secret looks like a placeholder and not required → honeypot-only (no remote call).
 * - When a real secret is present and token missing → reject.
 * - Live siteverify only with a non-placeholder secret (do NOT activate without Owner auth).
 */
class TurnstileSpamProtector {
  /**
   * @param {{ secretKey: string, fetchImpl?: typeof fetch, requireToken?: boolean }} options
   */
  constructor(options) {
    if (!options || !options.secretKey) {
      throw new Error("TurnstileSpamProtector requires secretKey");
    }
    this.secretKey = String(options.secretKey);
    this.fetchImpl = options.fetchImpl || (typeof fetch === "function" ? fetch : null);
    this.requireToken = options.requireToken !== false;
    this.honeypot = new HoneypotSpamProtector();
    this.isPlaceholder = /REPLACE_|YOUR_|example/i.test(this.secretKey);
  }

  async evaluate(input) {
    const hp = await this.honeypot.evaluate(input);
    if (hp.action !== "allow") return hp;

    if (this.isPlaceholder) {
      if (this.requireToken) {
        // Required mode must not silently allow when CAPTCHA is unactivated.
        return { action: "reject", reason: "turnstile_required_unactivated" };
      }
      return { action: "allow", reason: "turnstile_unactivated" };
    }

    const token = input && input.turnstileToken ? String(input.turnstileToken) : "";
    if (!token) {
      if (this.requireToken) {
        return { action: "reject", reason: "turnstile_missing" };
      }
      return { action: "allow", reason: "turnstile_optional_absent" };
    }

    if (!this.fetchImpl) {
      return { action: "reject", reason: "turnstile_client_unavailable" };
    }

    try {
      const body = new URLSearchParams({
        secret: this.secretKey,
        response: token,
      });
      const res = await this.fetchImpl(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        }
      );
      if (!res || !res.ok) {
        return { action: "reject", reason: "turnstile_http_error" };
      }
      const data = await res.json();
      if (data && data.success) return { action: "allow", reason: "turnstile_ok" };
      return { action: "reject", reason: "turnstile_failed" };
    } catch {
      // Fail closed on network/parse errors when Turnstile is active.
      return { action: "reject", reason: "turnstile_error" };
    }
  }
}

module.exports = {
  HoneypotSpamProtector,
  UnprovisionedExternalSpamProtector,
  TurnstileSpamProtector,
};
