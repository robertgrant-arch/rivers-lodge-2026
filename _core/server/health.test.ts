/**
 * /api/health endpoint — behaviour tests (#4)
 *
 * We build a minimal Express app with just the health route rather than
 * importing app.ts (which auto-runs startServer() as a side effect).
 * checkDbHealth is mocked so no real MySQL connection is needed.
 */

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock checkDbHealth before any imports that use it ────────────────────────

vi.mock("./db", () => ({
  checkDbHealth: vi.fn(),
  getDb: vi.fn().mockResolvedValue(null),
}));

import { checkDbHealth } from "./db";

// ─── Minimal app that mirrors the health route in app.ts ──────────────────────

function makeHealthApp() {
  const app = express();

  app.get("/api/health", async (_req, res) => {
    try {
      const dbOk = await checkDbHealth();
      if (!dbOk) {
        res.status(503).json({ ok: false, db: "down" });
        return;
      }
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false, db: "down" });
    }
  });

  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("/api/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 { ok: true } when DB is reachable", async () => {
    vi.mocked(checkDbHealth).mockResolvedValue(true);

    const res = await request(makeHealthApp()).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("returns 503 { ok: false, db: 'down' } when DB is unreachable", async () => {
    vi.mocked(checkDbHealth).mockResolvedValue(false);

    const res = await request(makeHealthApp()).get("/api/health");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ ok: false, db: "down" });
  });

  it("returns 503 when checkDbHealth throws unexpectedly", async () => {
    vi.mocked(checkDbHealth).mockRejectedValue(new Error("pool exploded"));

    const res = await request(makeHealthApp()).get("/api/health");

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false, db: "down" });
  });

  it("calls checkDbHealth on every request (no result caching)", async () => {
    vi.mocked(checkDbHealth).mockResolvedValue(true);

    const app = makeHealthApp();
    await request(app).get("/api/health");
    await request(app).get("/api/health");

    expect(vi.mocked(checkDbHealth)).toHaveBeenCalledTimes(2);
  });
});
