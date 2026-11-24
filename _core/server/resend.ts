/**
 * Shared Resend helpers for every email sender (transactional mailer and
 * mass email). Nothing here logs or returns the API key itself.
 */

const RESEND_API = "https://api.resend.com";

/**
 * Resend API origin. RESEND_API_BASE exists only for local testing against a
 * fake server; in production it is honoured only when it points at this
 * machine (localhost), so a stray setting can never send real email somewhere
 * other than Resend while the site reports success.
 */
export function resendApiBase(env: NodeJS.ProcessEnv = process.env): string {
  const override = (env.RESEND_API_BASE || "").trim().replace(/\/+$/, "");
  if (!override) return RESEND_API;
  if (env.NODE_ENV === "production" && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(override)) {
    if (!warned) { warned = true; console.warn("[resend] RESEND_API_BASE is set in production and ignored; sending to api.resend.com"); }
    return RESEND_API;
  }
  return override;
}
let warned = false;

/**
 * Last 4 characters of the API key, e.g. "…a1b2". Lets staff match the key
 * against Resend → API Keys without exposing it. Empty when no key.
 */
export function resendKeyHint(key: string | undefined | null): string {
  const k = (key ?? "").trim();
  return k.length >= 8 ? `…${k.slice(-4)}` : k ? "…(short key)" : "";
}

/**
 * Resend's email ID from a successful response body, or null. A send only
 * counts as successful when Resend returns an ID.
 */
export function resendEmailId(json: unknown): string | null {
  const id = (json as { id?: unknown } | null)?.id;
  return typeof id === "string" && id.trim() ? id : null;
}
