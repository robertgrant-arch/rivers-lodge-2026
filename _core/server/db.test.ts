/**
 * db.ts — unit tests (#2)
 *
 * Verifies that concurrent getDb() calls share a single promise and therefore
 * never create more than one connection pool.
 *
 * We test without a real MySQL server: mysql.createPool() is synchronous and
 * doesn't connect immediately, so the pool object is created whether or not
 * the database is reachable.  We mock mysql2/promise so no OS-level TCP work
 * happens at all.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock mysql2/promise so no real TCP connection is attempted ───────────────

vi.mock("mysql2/promise", () => {
  const mockPool = {
    query: vi.fn().mockResolvedValue([[{ 1: 1 }], []]),
    end: vi.fn().mockResolvedValue(undefined),
  };
  return {
    default: { createPool: vi.fn().mockReturnValue(mockPool) },
    createPool: vi.fn().mockReturnValue(mockPool),
  };
});

vi.mock("drizzle-orm/mysql2", () => ({
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
    vi.stubEnv("DATABASE_URL", "mysql://user:pass@localhost:3306/testdb");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns the same Promise object on concurrent calls (no race)", async () => {
    const { getDb } = await freshDb();

    // Fire both calls without awaiting between them.
    const p1 = getDb();
    const p2 = getDb();

    // Must be the exact same promise — the second call saw _dbPromise already set.
    expect(p1).toBe(p2);
  });

  it("resolves both concurrent calls to the same db instance", async () => {
    const { getDb } = await freshDb();

    const [db1, db2] = await Promise.all([getDb(), getDb()]);

    expect(db1).toBe(db2);
    expect(db1).not.toBeNull();
  });

  it("creates exactly one pool across concurrent calls", async () => {
    const mysql = await import("mysql2/promise");
    const createPoolSpy = vi.mocked((mysql as any).default?.createPool ?? mysql.createPool);
    createPoolSpy.mockClear();

    const { getDb } = await freshDb();

    await Promise.all([getDb(), getDb(), getDb()]);

    expect(createPoolSpy).toHaveBeenCalledTimes(1);
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
    vi.stubEnv("DATABASE_URL", "mysql://user:pass@localhost:3306/testdb");
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
    vi.stubEnv("DATABASE_URL", "mysql://user:pass@localhost:3306/testdb");

    // Override the pool mock to fail on query.
    const mysql = await import("mysql2/promise");
    const mockPool = {
      query: vi.fn().mockRejectedValue(new Error("Connection refused")),
      end: vi.fn(),
    };
    vi.mocked((mysql as any).default?.createPool ?? mysql.createPool).mockReturnValueOnce(mockPool as any);

    const { checkDbHealth } = await freshDb();
    const result = await checkDbHealth();
    expect(result).toBe(false);
  });
});
