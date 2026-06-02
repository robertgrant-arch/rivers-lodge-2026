/**
 * bookings.list — pagination total test
 *
 * Asserts that `total` is the full match count across all pages, not just
 * `items.length` on the current page.  Before the fix, total was always
 * ≤ limit because it was set to items.length after applying .limit().
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "@core/server/context";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@core/server/db", () => ({
  getDb: vi.fn(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { appRouter } from "../../../_core/server/router";
import { getDb } from "@core/server/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin",
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

/** Build a minimal mock db that returns `countValue` for COUNT(*) queries
 * and `pageItems` for all other SELECT queries. */
function makeMockDb(countValue: number, pageItems: unknown[]) {
  let callIndex = 0;

  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    offset: () => chain,
    // Promise interface — first call (COUNT) returns count result, subsequent
    // calls return the page rows.
    then: (resolve: (v: unknown[]) => unknown) => {
      const result =
        callIndex++ === 0
          ? [{ count: String(countValue) }]
          : pageItems;
      return Promise.resolve(result).then(resolve as (v: unknown) => unknown);
    },
  };

  return {
    select: (_cols?: unknown) => chain,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("bookings.list — total is the full match count, not the page size", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns total > items.length when more rows exist than the page size", async () => {
    const TOTAL_IN_DB = 7;
    const PAGE_SIZE = 2;

    // Mock db: COUNT query → 7, items query → 2 rows
    const fakeItems = [
      { id: 1, type: "wedding", clientName: "Alice", clientEmail: "a@test.com",
        clientPhone: null, startDate: new Date(), endDate: new Date(),
        guestCount: null, totalRevenue: null, depositPaid: false,
        status: "inquiry", notes: null, userId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, type: "corporate", clientName: "Bob", clientEmail: "b@test.com",
        clientPhone: null, startDate: new Date(), endDate: new Date(),
        guestCount: null, totalRevenue: null, depositPaid: false,
        status: "confirmed", notes: null, userId: null, createdAt: new Date(), updatedAt: new Date() },
    ];

    vi.mocked(getDb).mockResolvedValue(makeMockDb(TOTAL_IN_DB, fakeItems) as any);

    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.booking.bookings.list({ limit: PAGE_SIZE, offset: 0 });

    // The critical assertion: total must reflect the full DB count, not the page
    expect(result.total).toBe(TOTAL_IN_DB);
    expect(result.items).toHaveLength(PAGE_SIZE);
    // total > items.length — the bug would have made these equal
    expect(result.total).toBeGreaterThan(result.items.length);
  });

  it("returns total === items.length when the full result set fits on one page", async () => {
    const TOTAL_IN_DB = 2;
    const PAGE_SIZE = 50;

    const fakeItems = [
      { id: 1, type: "wedding", clientName: "Alice", clientEmail: "a@test.com",
        clientPhone: null, startDate: new Date(), endDate: new Date(),
        guestCount: null, totalRevenue: null, depositPaid: false,
        status: "inquiry", notes: null, userId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, type: "corporate", clientName: "Bob", clientEmail: "b@test.com",
        clientPhone: null, startDate: new Date(), endDate: new Date(),
        guestCount: null, totalRevenue: null, depositPaid: false,
        status: "confirmed", notes: null, userId: null, createdAt: new Date(), updatedAt: new Date() },
    ];

    vi.mocked(getDb).mockResolvedValue(makeMockDb(TOTAL_IN_DB, fakeItems) as any);

    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.booking.bookings.list({ limit: PAGE_SIZE, offset: 0 });

    expect(result.total).toBe(TOTAL_IN_DB);
    expect(result.items).toHaveLength(TOTAL_IN_DB);
    expect(result.total).toBe(result.items.length);
  });

  it("returns total=0 and items=[] when DB is unavailable", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.booking.bookings.list();

    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});
