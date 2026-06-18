// Auth feature public API — client-safe exports only.
// Vite bundles this file into the client bundle; do NOT add server imports here.
// Server consumers (Express handlers, tRPC routers): import from @features/auth/server/public

// ── Types ─────────────────────────────────────────────────────────────────────
export type { User, InsertUser, UserRole } from "./types";

// ── Client ────────────────────────────────────────────────────────────────────
export { useAuth } from "./client/useAuth";
export { LoginButton } from "./client/LoginButton";

/**
 * Returns the URL for the member login entrypoint, with an optional post-login
 * redirect path.  Consumers should import this from here rather than
 * constructing OAuth URLs directly — callers do not need to know which route
 * the login flow starts from.
 *
 * @param postLoginUri - Same-origin path to redirect to after successful login.
 *   Defaults to "/".
 */
export { getLoginUrl } from "@shared/constants";
