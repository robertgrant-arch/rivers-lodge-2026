/**
 * db.ts — unit tests (#2)
 *
 * Verifies that concurrent getDb() calls share a single promise and therefore
 * never create more than one connection pool.
 *
 * We test without a real PostgreSQL server: pg.Pool() is synchronous and
 * doesn't connect immediately, so the pool object is created whether or not
 * the database is reachable.  We mock pg so no OS-level TCP work happens.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock pg so no real TCP connection is attempted ───────────────────────────

const mockPool = {
  query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }),
  end: vi.fn().mockResolvedValue(undefined),
};
const MockPool = vi.fn().mockImplementation(() => mockPool);

vi.mock("pg", () => ({ Pool: MockPool }));

vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: vi.fn().mockImplementation((pool: unknown) => ({ _pool: pool, _type: "drizzle-mock" })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function freshDb() {
  vi.resetModules();
  return import("./db");
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getDb — promise caching (fix #2)", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns the same Promise object on concurrent calls (no race)", async () => {
    const { getDb } = await freshDb();

    const p1 = getDb();
    const p2 = getDb();

    expect(p1).toBe(p2);
  });

  it("resolves both concurrent calls to the same db instance", async () => {
    const { getDb } = await freshDb();

    const [db1, db2] = await Promise.all([getDb(), getDb()]);

    expect(db1).toBe(db2);
    expect(db1).not.toBeNull();
  });

  it("creates exactly one pool across concurrent calls", async () => {
    MockPool.mockClear();

    const { getDb } = await freshDb();

    await Promise.all([getDb(), getDb(), getDb()]);

    expect(MockPool).toHaveBeenCalledTimes(1);
  });

  it("returns null when DATABASE_URL is not set", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await freshDb();

    const db = await getDb();
    expect(db).toBeNull();
  });
});

describe("checkDbHealth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns true when SELECT 1 succeeds", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");
    const { checkDbHealth } = await freshDb();

    const result = await checkDbHealth();
    expect(result).toBe(true);
  });

  it("returns false when DATABASE_URL is not set", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { checkDbHealth } = await freshDb();

    const result = await checkDbHealth();
    expect(result).toBe(false);
  });

  it("returns false when pool.query rejects", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb");

    mockPool.query.mockRejectedValueOnce(new Error("Connection refused"));

    const { checkDbHealth } = await freshDb();
    const result = await checkDbHealth();
    expect(result).toBe(false);
  });
});
