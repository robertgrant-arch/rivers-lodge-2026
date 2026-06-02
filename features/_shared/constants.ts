export { COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from '../_core/shared/const';

// Generate login URL at runtime so redirect URI reflects the current origin.
// Returns "" if VITE_OAUTH_PORTAL_URL / VITE_APP_ID are not configured, so the
// public site still renders when auth isn't wired up in the deploy env.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  if (!oauthPortalUrl || !appId) {
    if (typeof console !== "undefined") {
      console.warn(
        "[getLoginUrl] Missing VITE_OAUTH_PORTAL_URL or VITE_APP_ID; falling back to /portal."
      );
    }
    return "/portal";
  }

  try {
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);

    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (err) {
    console.warn("[getLoginUrl] Invalid OAuth portal URL:", oauthPortalUrl, err);
    return "";
  }
};
