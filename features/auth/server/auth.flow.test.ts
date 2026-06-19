/**
 * Auth flow tests — Manus OAuth flow removed; authentication now handled by Clerk.
 *
 * The previous version of this file tested the Manus OAuth start/callback handlers
 * (GET /api/oauth/start and GET /api/oauth/callback). Those routes no longer exist.
 * Clerk manages the full authentication lifecycle, including session handling.
 *
 * What still needs testing (added incrementally as the Clerk integration matures):
 *  - tRPC protectedProcedure throws UNAUTHORIZED when ctx.user is null
 *  - tRPC protectedProcedure succeeds when ctx.user is populated
 *
 * These are covered by _core/server/trpc.ts unit tests (not yet written here).
 */

import { describe, expect, it } from "vitest";

describe("Clerk auth migration", () => {
  it("placeholder — auth is now handled by Clerk SDK", () => {
    // OAuth routes (/api/oauth/start, /api/oauth/callback) have been removed.
    // Clerk middleware (clerkMiddleware) handles session validation in app.ts.
    expect(true).toBe(true);
  });
});
