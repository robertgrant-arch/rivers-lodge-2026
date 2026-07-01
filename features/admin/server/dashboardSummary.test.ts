/**
 * portal.dashboard.dashboardSummary — server test
 *
 * Asserts the shape of the combined payload that replaces 12 individual
 * tRPC calls on the AdminDashboard client.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "@core/server/context";

// ─── Mock the DB pool (no real PostgreSQL needed) ────────────────────────────
// The admin router uses its own getDb() (drizzle(DATABASE_URL)).  We stub the
// DATABASE_URL env var and mock drizzle-orm/node-postgres so no connection is made.

vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: vi.fn(() => mockDb),
}));

// Shared mock db — select() returns [] by default; override per-test as needed
const mockSelect = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([{ insertId: 1 }]) })),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) })),
  execute: vi.fn().mockResolvedValue([]),
  transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb)),
};

// Build a chainable select that resolves to a given rows array
function buildSelectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    from:    () => chain,
    where:   () => chain,
    orderBy: () => chain,
    limit:   () => chain,
    offset:  () => chain,
    for:     () => chain,
    then: (resolve: (v: unknown[]) => unknown) =>
      Promise.resolve(rows).then(resolve),
  };
  return chain;
}

// ─── Import after mocks ───────────────────────────────────────────────────────

import { appRouter } from "../../../_core/server/router";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-openid",
      email: "admin@riverslodge.com",
      name: "Admin",
      loginMethod: "google",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("portal.dashboard.dashboardSummary", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");
    vi.clearAllMocks();

    // Default: all selects return empty arrays
    mockSelect.mockReturnValue(buildSelectChain([]));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the correct top-level shape (bookings, inquiries, members, applications, waivers, updates)", async () => {
    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.portal.dashboard.dashboardSummary();

    // Shape assertions — every key must be present and be an array
    expect(result).toHaveProperty("bookings");
    expect(result).toHaveProperty("inquiries");
    expect(result).toHaveProperty("members");
    expect(result).toHaveProperty("applications");
    expect(result).toHaveProperty("waivers");
    expect(result).toHaveProperty("updates");

    expect(Array.isArray(result.bookings)).toBe(true);
    expect(Array.isArray(result.inquiries)).toBe(true);
    expect(Array.isArray(result.members)).toBe(true);
    expect(Array.isArray(result.applications)).toBe(true);
    expect(Array.isArray(result.waivers)).toBe(true);
    expect(Array.isArray(result.updates)).toBe(true);
  });

  it("returns populated arrays when the DB has data", async () => {
    const fakeBooking = {
      id: 1, type: "wedding", clientName: "Jane Smith",
      clientEmail: "jane@example.com", clientPhone: null,
      startDate: new Date("2027-06-15"), endDate: new Date("2027-06-17"),
      guestCount: 150, totalRevenue: "12000", depositPaid: true,
      status: "confirmed", notes: null, userId: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    const fakeInquiry = {
      id: 1, type: "wedding", name: "Jane Smith", email: "jane@example.com",
      phone: null, eventDate: null, guestCount: null, message: null,
      status: "new", createdAt: new Date(), updatedAt: new Date(),
    };

    // First 2 select calls return data; rest stay empty
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildSelectChain([fakeBooking]);
      if (callCount === 2) return buildSelectChain([fakeInquiry]);
      return buildSelectChain([]);
    });

    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.portal.dashboard.dashboardSummary();

    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0].clientName).toBe("Jane Smith");
    expect(result.inquiries).toHaveLength(1);
    expect(result.inquiries[0].email).toBe("jane@example.com");
    // Other collections still empty
    expect(result.members).toHaveLength(0);
    expect(result.applications).toHaveLength(0);
    expect(result.waivers).toHaveLength(0);
    expect(result.updates).toHaveLength(0);
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const memberCtx: TrpcContext = {
      user: {
        id: 2, openId: "member-openid", email: "member@test.com", name: "Member",
        loginMethod: "google", role: "user",
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(memberCtx);
    await expect(caller.portal.dashboard.dashboardSummary()).rejects.toThrow(TRPCError);
  });

  it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
    const anonCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(anonCtx);
    await expect(caller.portal.dashboard.dashboardSummary()).rejects.toThrow(TRPCError);
  });
});

describe("portal.dashboard.cmsTab", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");
    vi.clearAllMocks();
    mockSelect.mockReturnValue(buildSelectChain([]));
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns testimonials, faqs, announcements, memberContent keys", async () => {
    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.portal.dashboard.cmsTab();

    expect(result).toHaveProperty("testimonials");
    expect(result).toHaveProperty("faqs");
    expect(result).toHaveProperty("announcements");
    expect(result).toHaveProperty("memberContent");

    expect(Array.isArray(result.testimonials)).toBe(true);
    expect(Array.isArray(result.faqs)).toBe(true);
    expect(Array.isArray(result.announcements)).toBe(true);
    expect(Array.isArray(result.memberContent)).toBe(true);
  });
});
