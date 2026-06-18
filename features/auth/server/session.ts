import { sdk } from "@core/server/sdk";
import type { Request } from "express";
import { protectedProcedure } from "@core/server/trpc";
import type { User } from "../types";

/**
 * Read and verify the member session from an Express request.
 * Returns the authenticated User, or null if the request carries no valid
 * session cookie.  Never throws — callers receive null on any auth failure.
 *
 * `_core/server/context.ts` calls `sdk.authenticateRequest` directly (it is
 * _core infrastructure).  Other slices that need to inspect a session outside
 * of tRPC context should use this function.
 */
export async function getMemberSession(req: Request): Promise<User | null> {
  try {
    const user = await sdk.authenticateRequest(req);
    console.log(`[auth:session] read_ok openId=${user.openId}`);
    return user;
  } catch (err) {
    // Unauthenticated requests are expected (public pages) — log at debug
    // level so failures are visible without being noisy for anonymous traffic.
    console.log(`[auth:session] read_fail ${String(err)}`);
    return null;
  }
}

/**
 * tRPC procedure builder that enforces an authenticated member session.
 * Throws UNAUTHORIZED if ctx.user is null.
 *
 * Every portal / member-facing router should build procedures on top of this
 * rather than importing protectedProcedure from _core directly, so that the
 * auth feature is the single owner of the session-enforcement contract.
 *
 * Guard redirect decisions: when this procedure throws UNAUTHORIZED, the
 * client-side useAuth hook (features/auth/client/useAuth.ts) catches the
 * UNAUTHORIZED tRPC error via meQuery and redirects to getLoginUrl().
 */
export { protectedProcedure as requireMemberSession };
