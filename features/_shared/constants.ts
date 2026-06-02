export { COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from '../_core/shared/const';

/**
 * Returns the URL for the server-side OAuth start endpoint.
 *
 * The start endpoint generates a cryptographic nonce, stores it in an
 * httpOnly cookie, embeds it in the OAuth state parameter, and redirects
 * to the OAuth provider.  This makes the login flow CSRF-safe — no client-
 * side state construction, no replayable btoa(redirectUri) encoding.
 *
 * Falls back to "/portal" in environments where the server is unreachable
 * (e.g. static preview builds) so the public site still renders.
 */
export const getLoginUrl = (postLoginUri = "/"): string => {
  if (typeof window === "undefined") return "/api/oauth/start";
  const params = new URLSearchParams({ redirectUri: postLoginUri });
  return `/api/oauth/start?${params}`;
};
