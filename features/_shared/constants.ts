export { COOKIE_NAME, ONE_YEAR_MS, AXIOS_TIMEOUT_MS, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from '../_core/shared/const';

/**
 * Returns the URL for the Clerk-hosted sign-in page.
 *
 * Components that need to send users to sign-in should import this rather
 * than hard-coding the path, so the destination can be changed in one place.
 *
 * @param _postLoginUri - Kept for backward compatibility; Clerk handles
 *   post-sign-in redirects via its own afterSignInUrl / redirectUrl props.
 */
export const getLoginUrl = (_postLoginUri = "/"): string => "/sign-in";
