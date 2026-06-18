// Auth feature server public API.
// Import from here in server-only files (Express handlers, tRPC routers, _core/server/).
// Client code: import from @features/auth/public (client-safe barrel).

/** Read and verify the member session from an Express request. Returns User | null. */
export { getMemberSession } from "./session";

/** tRPC procedure builder that enforces an authenticated member session. */
export { requireMemberSession } from "./session";

// ── tRPC router ───────────────────────────────────────────────────────────────
export { authRouter } from "./router";

// ── DB table ref (admin feature consumption only) ─────────────────────────────
export { users } from '@core/db/schema';
