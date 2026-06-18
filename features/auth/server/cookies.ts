import type { CookieOptions } from "express";
import { authConfig } from "./config";

/**
 * Returns the cookie attributes to use for the session cookie.
 *
 * `secure` is derived from the deployment environment, not from request
 * headers.  On Render (and any TLS-terminating reverse proxy) the app sees
 * plain HTTP internally, so header-based detection (`X-Forwarded-Proto`) is
 * unreliable unless `trust proxy` is configured.  Tying `secure` to
 * `NODE_ENV=production` is deterministic and correct:
 *   - production  → always Secure (all Render web services are HTTPS)
 *   - development → never Secure (local HTTP dev server)
 *
 * SameSite policy:
 *   - Default (SameSite=Lax): correct for same-origin OAuth redirect flows.
 *   - COOKIE_CROSS_SITE=true (SameSite=None): only when API and frontend are
 *     on different origins AND every deployment is HTTPS.  Requires Secure=true
 *     per RFC 6265bis §5.3.7 — browsers silently drop SameSite=None cookies
 *     over plain HTTP.
 */
export function getSessionCookieOptions(): Pick<
  CookieOptions,
  "httpOnly" | "path" | "sameSite" | "secure"
> {
  if (authConfig.cookieCrossSite) {
    return {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true, // mandatory with SameSite=None
    };
  }

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: authConfig.isProduction,
  };
}
