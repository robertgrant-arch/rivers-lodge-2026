/**
 * auth.logout tRPC procedure tests.
 *
 * With Clerk, sign-out is handled on the frontend by useClerk().signOut().
 * The server-side auth.logout mutation is now a no-op that returns { success: true }
 * for backward compatibility.
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "@core/server/router";
import type { TrpcContext } from '@core/server/context';

function createAuthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: {
      id: 1,
      openId: "user_clerk123",
      email: "sample@example.com",
      name: "Sample User",
      loginMethod: "email",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return { ctx };
}

describe("auth.logout", () => {
  it("returns success (sign-out is handled by Clerk on the frontend)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
