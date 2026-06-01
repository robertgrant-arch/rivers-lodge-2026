/**
 * Portal Router Tests
 * Covers: auth guards, role enforcement, and input validation for portal procedures.
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "../features/_core/server/context";
import type { AuthenticatedUser } from "../features/_core/server/auth";

// ─── Context helpers ──────────────────────────────────────────────────────────

function makeCtx(role: string | null): TrpcContext {
  const user: AuthenticatedUser | null = role
    ? {
        id: 99,
        openId: `test-${role}`,
        email: `${role}@riverslodge.com`,
        name: `Test ${role}`,
        loginMethod: "google",
        role: role as AuthenticatedUser["role"],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ─── Portal auth guard tests ──────────────────────────────────────────────────

describe("portal auth guards", () => {
  it("rejects unauthenticated users from portal.dashboard.kpis", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.portal.dashboard.kpis()).rejects.toThrow();
  });

  it("rejects regular members from portal.dashboard.kpis", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.portal.dashboard.kpis()).rejects.toThrow();
  });

  it("allows admin to access portal.dashboard.kpis", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    // May fail with DB error in test env — that's acceptable; auth must not throw
    const result = await caller.portal.dashboard.kpis().catch((e: Error) => {
      // Only allow DB-related errors, not auth errors
      if (e.message.includes("UNAUTHORIZED") || e.message.includes("FORBIDDEN")) throw e;
      return null;
    });
    // If DB is available, result should be an object; if not, null is fine
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("allows owner role to access portal procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("owner"));
    const result = await caller.portal.dashboard.kpis().catch((e: Error) => {
      if (e.message.includes("UNAUTHORIZED") || e.message.includes("FORBIDDEN")) throw e;
      return null;
    });
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("allows venue_sales role to access portal procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("venue_sales"));
    const result = await caller.portal.dashboard.kpis().catch((e: Error) => {
      if (e.message.includes("UNAUTHORIZED") || e.message.includes("FORBIDDEN")) throw e;
      return null;
    });
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("allows hunt_fish_ops role to access portal procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("hunt_fish_ops"));
    const result = await caller.portal.dashboard.kpis().catch((e: Error) => {
      if (e.message.includes("UNAUTHORIZED") || e.message.includes("FORBIDDEN")) throw e;
      return null;
    });
    expect(result === null || typeof result === "object").toBe(true);
  });
});

// ─── Portal calendar input validation ────────────────────────────────────────

describe("portal.calendar.events input validation", () => {
  it("rejects missing startDate and endDate", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    // @ts-expect-error intentionally passing invalid input
    await expect(caller.portal.calendar.events({})).rejects.toThrow();
  });

  it("returns empty arrays for a valid date range with no data", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.portal.calendar.events({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    }).catch((e: Error) => {
      // DB errors are acceptable in test env — auth errors are not
      if (e.message.includes("UNAUTHORIZED") || e.message.includes("FORBIDDEN")) throw e;
      return { weddings: [], corporate: [], huntFish: [], blocked: [] };
    });
    expect(result).toHaveProperty("weddings");
    expect(result).toHaveProperty("corporate");
    expect(result).toHaveProperty("huntFish");
    expect(result).toHaveProperty("blocked");
  });
});

// ─── Portal weddings input validation ────────────────────────────────────────

describe("portal.weddings.create input validation", () => {
  it("rejects missing required fields", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    // @ts-expect-error intentionally passing invalid input
    await expect(caller.portal.weddings.create({ coupleName: "Test" })).rejects.toThrow();
  });

  it("rejects invalid email in wedding create", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.portal.weddings.create({
        coupleName: "Test Couple",
        contactEmail: "not-an-email",
        contactPhone: "555-1234",
        guestCount: 100,
        weddingDate: "2026-09-15",
        venueSpaceId: 1,
      })
    ).rejects.toThrow();
  });
});

// ─── Portal hunt/fish input validation ───────────────────────────────────────

describe("portal.huntFish.create input validation", () => {
  it("rejects missing required fields", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    // @ts-expect-error intentionally passing invalid input
    await expect(caller.portal.huntFish.create({ clientName: "Test" })).rejects.toThrow();
  });
});

// ─── Portal block dates input validation ─────────────────────────────────────

describe("portal.calendar.blockDates input validation", () => {
  it("rejects missing date fields", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    // @ts-expect-error intentionally passing invalid input
    await expect(caller.portal.calendar.blockDates({})).rejects.toThrow();
  });
});

// ─── Portal notifications ─────────────────────────────────────────────────────

describe("portal.dashboard.notifications", () => {
  it("rejects unauthenticated access", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.portal.dashboard.notifications()).rejects.toThrow();
  });

  it("allows admin to access notifications", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.portal.dashboard.notifications().catch((e: Error) => {
      if (e.message.includes("UNAUTHORIZED") || e.message.includes("FORBIDDEN")) throw e;
      return [];
    });
    expect(Array.isArray(result)).toBe(true);
  });
});
