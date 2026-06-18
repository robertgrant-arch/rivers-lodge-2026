// Auth feature public API
// Only import from here — never from auth internals directly

// ── Types ─────────────────────────────────────────────────────────────────────
export type { User, InsertUser, UserRole } from "./types";

// ── Client ────────────────────────────────────────────────────────────────────
export { useAuth } from "./client/useAuth";
export { LoginButton } from "./client/LoginButton";

// ── Server: named login-flow interface ───────────────────────────────────────
// These five functions are the canonical contract for the member-auth slice.
// Consumers must import from here — never from auth internals directly.

/** Express handler: initiates the OAuth flow (GET /api/oauth/start). */
export { startMemberLogin } from "./server/oauth";

/** Express handler: completes the OAuth flow (GET /api/oauth/callback). */
export { handleMemberCallback } from "./server/oauth";

/** Read and verify the member session from an Express request. Returns User | null. */
export { getMemberSession } from "./server/session";

/** tRPC procedure builder that enforces an authenticated member session. */
export { requireMemberSession } from "./server/session";

/** Clear the member session cookie (called by the tRPC logout mutation). */
export { logoutMember } from "./server/router";

// ── tRPC router ───────────────────────────────────────────────────────────────
export { authRouter } from "./server/router";

// ── DB table ref (admin feature consumption only) ─────────────────────────────
// Note: schema (users table) is also re-exported via @core/db/schema for DB-layer consumers
export { users } from '@core/db/schema';
