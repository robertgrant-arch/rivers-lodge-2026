// Auth feature server public API.
// Import from here in server-only files (Express handlers, tRPC routers, _core/server/).
// Client code: import from @features/auth/public (client-safe barrel).

/** Express handler: initiates the OAuth flow (GET /api/oauth/start). */
export { startMemberLogin } from "./oauth";

/** Express handler: completes the OAuth flow (GET /api/oauth/callback). */
export { handleMemberCallback } from "./oauth";

/** Registers GET /api/oauth/start and GET /api/oauth/callback on an Express app. */
export { registerOAuthRoutes } from "./oauth";

/** Read and verify the member session from an Express request. Returns User | null. */
export { getMemberSession } from "./session";

/** tRPC procedure builder that enforces an authenticated member session. */
export { requireMemberSession } from "./session";

/** Clear the member session cookie (called by the tRPC logout mutation). */
export { logoutMember } from "./router";

// ── tRPC router ───────────────────────────────────────────────────────────────
export { authRouter } from "./router";

// ── DB table ref (admin feature consumption only) ─────────────────────────────
export { users } from '@core/db/schema';
