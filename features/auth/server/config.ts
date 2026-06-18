/**
 * Auth slice environment configuration.
 *
 * All OAuth/session env vars are owned and validated here.  No other file in
 * the auth slice reads process.env directly — they import from this module.
 *
 * Fail-fast in production: missing required vars throw at startup so the
 * process exits with an actionable error rather than failing silently at
 * the first login attempt.
 */

function requireVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `[auth] Required environment variable ${name} is not set. ` +
          `Add it to your Render service environment before starting the server.`,
      );
    }
    return "";
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

/**
 * Absolute public base URL of this service (e.g. https://theriverslodge.onrender.com).
 *
 * Used to build the OAuth callback URL sent to the provider.  Must be an exact
 * match of the redirect URI registered in the OAuth provider console.
 *
 * Precedence:
 *   1. APP_BASE_URL  — explicit override (recommended for custom domains)
 *   2. RENDER_EXTERNAL_URL — injected automatically by Render for web services
 *   3. In dev: derived from PORT (OAuth provider can't reach localhost anyway)
 */
function resolveAppBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, ""); // strip trailing slash

  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) return renderUrl.replace(/\/$/, "");

  if (isProduction) {
    throw new Error(
      "[auth] Neither APP_BASE_URL nor RENDER_EXTERNAL_URL is set in production. " +
        "Set APP_BASE_URL to the public HTTPS URL of this service " +
        "(e.g. https://theriverslodge.onrender.com).",
    );
  }

  const port = process.env.PORT ?? "5000";
  return `http://localhost:${port}`;
}

export const authConfig = Object.freeze({
  /** Manus OAuth server base URL. */
  oauthServerUrl: requireVar("OAUTH_SERVER_URL"),
  /** Application (project) ID registered in the Manus OAuth console. */
  appId: requireVar("VITE_APP_ID"),
  /** Public base URL of this service — used to build the OAuth callback URL. */
  appBaseUrl: resolveAppBaseUrl(),
  /**
   * When true, session cookies use SameSite=None; Secure=true so cross-origin
   * requests work (API and frontend on different origins).  Only enable on
   * HTTPS deployments — browsers silently drop SameSite=None over plain HTTP.
   */
  cookieCrossSite: process.env.COOKIE_CROSS_SITE === "true",
  isProduction,
});

/**
 * Absolute callback URL registered with the OAuth provider.
 * Deterministic — no request-origin heuristics.
 */
export const OAUTH_CALLBACK_URL = `${authConfig.appBaseUrl}/api/oauth/callback`;
