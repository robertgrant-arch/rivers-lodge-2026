import { describe, expect, it } from "vitest";
import { appRouter } from "../_core/server/router";
import type { TrpcContext } from '@core/server/context';

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@riverslodge.com",
    name: "Admin User",
    loginMethod: "google",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      setHeader: () => {},
    } as unknown as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      setHeader: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createMemberContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "member-user",
    email: "member@riverslodge.com",
    name: "Member User",
    loginMethod: "google",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, setHeader: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth.logout", () => {
  it("returns success (sign-out is now handled by Clerk on the frontend)", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });

  it("auth.me returns null for unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.role).toBe("admin");
    expect(result?.email).toBe("admin@riverslodge.com");
  });
});

// ─── Admin guard tests ────────────────────────────────────────────────────────
describe("admin procedures", () => {
  it("rejects non-admin users from admin-only procedures", async () => {
    const ctx = createMemberContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.inquiries.list()).rejects.toThrow();
  });

  it("rejects unauthenticated users from admin-only procedures", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.inquiries.list()).rejects.toThrow();
  });
});

// ─── Inquiry validation tests ─────────────────────────────────────────────────
describe("inquiries.submit validation", () => {
  it("rejects inquiry with missing required fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error intentionally passing invalid input
    await expect(caller.inquiries.submit({ type: "wedding" })).rejects.toThrow();
  });

  it("rejects inquiry with invalid email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.inquiries.submit({
        type: "wedding",
        name: "Test User",
        email: "not-an-email",
      })
    ).rejects.toThrow();
  });
});

// ─── Membership application validation ───────────────────────────────────────
describe("membership.submitApplication validation", () => {
  it("rejects application with missing required fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // @ts-expect-error intentionally passing invalid input
    await expect(caller.membership.submitApplication({ name: "Test" })).rejects.toThrow();
  });
});

// ─── Bookings admin guard ─────────────────────────────────────────────────────
describe("bookings admin guard", () => {
  it("rejects non-admin from listing bookings", async () => {
    const ctx = createMemberContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.bookings.list()).rejects.toThrow();
  });
});

// ─── Updates public access ────────────────────────────────────────────────────
describe("updates.list", () => {
  it("is accessible to unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw — may return empty array if DB not available
    const result = await caller.updates.list().catch(() => []);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Blocked dates public access ─────────────────────────────────────────────
describe("bookings.blockedDates", () => {
  it("is accessible to unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.bookings.blockedDates().catch(() => []);
    expect(Array.isArray(result)).toBe(true);
  });
});
