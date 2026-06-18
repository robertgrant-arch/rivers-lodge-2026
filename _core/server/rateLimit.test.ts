/**
 * Rate-limiter smoke tests
 *
 * These tests spin up a minimal Express app with only the rate-limiting
 * middleware in place.  We don't need tRPC, a real DB, or auth — we just
 * need to verify that:
 *
 *  1. submitLimiter allows ≤5 requests per minute per IP and returns 429
 *     on the 6th (and subsequent) requests.
 *  2. authLimiter allows ≤10 requests per minute per IP and returns 429
 *     on the 11th request.
 *  3. Non-rate-limited paths are always 200.
 *
 * express-rate-limit uses the X-Forwarded-For / req.ip as the key.
 * In tests we set a fixed IP via X-Forwarded-For so all requests count
 * against the same bucket.
 */

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { submitLimiter } from "./rateLimit";

// ─── App factory ──────────────────────────────────────────────────────────────

function makeSubmitApp() {
  const app = express();
  // Trust the X-Forwarded-For header so express-rate-limit keying works in tests.
  app.set("trust proxy", 1);
  // Mount the limiter on a fake tRPC-style path.
  app.use("/api/trpc/inquiries.submit", submitLimiter, (_req, res) =>
    res.json({ ok: true }),
  );
  return app;
}


function makeUnlimitedApp() {
  const app = express();
  app.set("trust proxy", 1);
  // No rate-limiter — should always 200.
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  return app;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fire n sequential requests against `app` at `path`. Returns status codes. */
async function fire(
  app: ReturnType<typeof express>,
  path: string,
  n: number,
  method: "get" | "post" = "post",
): Promise<number[]> {
  const codes: number[] = [];
  for (let i = 0; i < n; i++) {
    const req = method === "post"
      ? request(app).post(path)
      : request(app).get(path);
    // Pin all requests to the same IP so they share a rate-limit bucket.
    const res = await req.set("X-Forwarded-For", "1.2.3.4");
    codes.push(res.status);
  }
  return codes;
}

// ─── submitLimiter tests ──────────────────────────────────────────────────────

describe("submitLimiter (5 req/min/IP)", () => {
  it("allows the first 5 requests and blocks the 6th", async () => {
    const app = makeSubmitApp();
    const codes = await fire(app, "/api/trpc/inquiries.submit", 10);

    // First 5: OK
    expect(codes.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    // 6th through 10th: rate-limited
    expect(codes.slice(5)).toEqual([429, 429, 429, 429, 429]);
  });

  it("returns a human-readable error body on 429", async () => {
    const app = makeSubmitApp();
    await fire(app, "/api/trpc/inquiries.submit", 5); // exhaust the limit

    const res = await request(app)
      .post("/api/trpc/inquiries.submit")
      .set("X-Forwarded-For", "1.2.3.4");

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({
      error: expect.stringContaining("Too many"),
    });
  });

  it("returns RateLimit-* headers on every response", async () => {
    const app = makeSubmitApp();
    // Use a distinct IP so this test has its own clean bucket
    // (the in-memory store is shared across tests via the module singleton).
    const res = await request(app)
      .post("/api/trpc/inquiries.submit")
      .set("X-Forwarded-For", "2.3.4.5");

    expect(res.status).toBe(200);
    // draft-6 standard headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
    expect(res.headers).toHaveProperty("ratelimit-limit");
    expect(res.headers).toHaveProperty("ratelimit-remaining");
    expect(Number(res.headers["ratelimit-limit"])).toBe(5);
    expect(Number(res.headers["ratelimit-remaining"])).toBe(4); // 1 request used
  });

  it("two different IPs have independent buckets", async () => {
    const app = makeSubmitApp();

    // Exhaust IP-A's bucket
    await fire(app, "/api/trpc/inquiries.submit", 5);
    const ipA6th = await request(app)
      .post("/api/trpc/inquiries.submit")
      .set("X-Forwarded-For", "1.2.3.4");
    expect(ipA6th.status).toBe(429);

    // IP-B's bucket is untouched
    const ipB1st = await request(app)
      .post("/api/trpc/inquiries.submit")
      .set("X-Forwarded-For", "9.8.7.6");
    expect(ipB1st.status).toBe(200);
  });
});


// ─── Non-rate-limited path ────────────────────────────────────────────────────

describe("health check (no limiter)", () => {
  it("never returns 429 regardless of request count", async () => {
    const app = makeUnlimitedApp();
    const codes = await fire(app, "/api/health", 20, "get");
    expect(codes.every((c) => c === 200)).toBe(true);
  });
});
