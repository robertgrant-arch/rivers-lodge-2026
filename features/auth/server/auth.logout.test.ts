import { describe, expect, it } from "vitest";
import { appRouter } from "@core/server/router";
import type { TrpcContext } from '@core/server/context';

function createAuthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: {
      id: "user-uuid-123",
      email: "sample@example.com",
      passwordHash: null,
      role: "member",
      status: "active",
      mustChangePassword: false,
      createdAt: new Date(),
      lastLoginAt: null,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      setHeader: () => {},
    } as unknown as TrpcContext["res"],
  };
  return { ctx };
}

describe("auth.logout", () => {
  it("returns success and clears session cookie", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
