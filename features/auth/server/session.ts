import { sdk } from "@core/server/sdk";
import type { Request } from "express";
import { protectedProcedure } from "@core/server/trpc";
import type { User } from "../types";

/**
 * Read and verify the member session from an Express request.
 * Returns the authenticated User, or null if the request is unauthenticated.
 * Never throws — callers receive null on any auth failure.
 */
export async function getMemberSession(req: Request): Promise<User | null> {
  try {
    const user = await sdk.authenticateRequest(req);
    console.log(`[auth:session] read_ok openId=${user.openId}`);
    return user;
  } catch (err) {
    console.log(`[auth:session] read_fail ${String(err)}`);
    return null;
  }
}

/**
 * tRPC procedure builder that enforces an authenticated member session.
 * Throws UNAUTHORIZED if ctx.user is null.
 */
export { protectedProcedure as requireMemberSession };
