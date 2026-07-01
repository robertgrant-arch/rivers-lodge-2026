/**
 * pagination.test.ts
 *
 * Verifies cursor-pagination behaviour for:
 *   - messages.allMessages
 *   - inquiries.list
 *
 * Shape: { items, nextCursor }
 * nextCursor is the last item's id when more rows exist, otherwise null.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { TrpcContext } from "@core/server/context";

// ─── Mock pg so no real TCP connection is made ───────────────────────────────
vi.mock("pg", () => {
  const mockPool = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn(),
  };
  return { Pool: vi.fn().mockImplementation(() => mockPool) };
});

// ─── Mock drizzle so getDb() returns our controllable mock ───────────────────
vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: vi.fn(() => mockDb),
}));

// ─── Shared mock db ───────────────────────────────────────────────────────────
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

function makeMessages(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: count - i,
    fromUserId: 1,
    toUserId: null,
    subject: `Subject ${i + 1}`,
    body: `Body ${i + 1}`,
    read: false,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

function makeInquiries(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: count - i,
    type: "wedding",
    name: `Name ${i + 1}`,
    email: `email${i + 1}@test.com`,
    phone: null,
    eventDate: null,
    guestCount: null,
    message: null,
    status: "new",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

// ─── messages.allMessages ─────────────────────────────────────────────────────

describe("messages.allMessages — pagination", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("A — 5 rows, limit=10 → nextCursor is null (all fit on one page)", async () => {
    const rows = makeMessages(5);
    mockSelect.mockReturnValue(buildSelectChain(rows));

    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.messages.allMessages({ limit: 10, archived: false });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("nextCursor");
    expect(result.items).toHaveLength(5);
    expect(result.nextCursor).toBeNull();
  });

  it("B — 26 rows returned by DB, limit=25 → nextCursor equals the 25th item's id", async () => {
    // The procedure fetches limit+1 rows to detect if more exist
    const rows = makeMessages(26);
    mockSelect.mockReturnValue(buildSelectChain(rows));

    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.messages.allMessages({ limit: 25, archived: false });

    expect(result.items).toHaveLength(25);
    expect(result.nextCursor).not.toBeNull();
    expect(result.nextCursor).toBe(result.items[24].id);
  });

  it("C — cursor=1 (out of range, DB returns 0 rows) → items=[], nextCursor=null", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.messages.allMessages({ cursor: 1, limit: 25, archived: false });

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});

// ─── inquiries.list ───────────────────────────────────────────────────────────

describe("inquiries.list — pagination", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("D — returns { items, nextCursor } shape with 3 inquiries", async () => {
    const rows = makeInquiries(3);
    mockSelect.mockReturnValue(buildSelectChain(rows));

    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.inquiries.list({ limit: 25 });

    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("nextCursor");
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it("E — out-of-range cursor (DB returns 0 rows) → empty, clean", async () => {
    mockSelect.mockReturnValue(buildSelectChain([]));

    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.inquiries.list({ cursor: 1, limit: 25 });

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});
