import type { Request } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    protocol: "http",
    headers: {},
    ...overrides,
  } as Request;
}

// Re-import the module under test after each env mutation so we pick up the
// freshly-evaluated ENV.cookieCrossSite value.
async function importCookies() {
  const mod = await import("./cookies");
  return mod.getSessionCookieOptions;
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("getSessionCookieOptions — SameSite behaviour", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.COOKIE_CROSS_SITE;
    vi.resetModules();
  });

  // (a) Default: SameSite=Lax ─────────────────────────────────────────────────

  it("defaults to sameSite=lax over plain HTTP (local dev)", async () => {
    const getOptions = await importCookies();
    const opts = getOptions(makeReq({ protocol: "http" }));

    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(false);
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
  });

  it("defaults to sameSite=lax and secure=true over HTTPS", async () => {
    const getOptions = await importCookies();
    const opts = getOptions(makeReq({ protocol: "https" }));

    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(true);
  });

  it("defaults to sameSite=lax when behind an HTTPS proxy (x-forwarded-proto)", async () => {
    const getOptions = await importCookies();
    const opts = getOptions(
      makeReq({
        protocol: "http",
        headers: { "x-forwarded-proto": "https" },
      }),
    );

    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(true);
  });

  // (b) COOKIE_CROSS_SITE=true: SameSite=None + forced Secure ────────────────

  it("sets sameSite=none and forces secure=true when COOKIE_CROSS_SITE=true (http request)", async () => {
    process.env.COOKIE_CROSS_SITE = "true";
    const getOptions = await importCookies();

    // Even though the incoming request is plain HTTP, secure must be true —
    // SameSite=None without Secure is silently dropped by browsers.
    const opts = getOptions(makeReq({ protocol: "http" }));

    expect(opts.sameSite).toBe("none");
    expect(opts.secure).toBe(true);
  });

  it("sets sameSite=none and secure=true when COOKIE_CROSS_SITE=true (https request)", async () => {
    process.env.COOKIE_CROSS_SITE = "true";
    const getOptions = await importCookies();
    const opts = getOptions(makeReq({ protocol: "https" }));

    expect(opts.sameSite).toBe("none");
    expect(opts.secure).toBe(true);
  });

  it("returns to sameSite=lax when COOKIE_CROSS_SITE is anything other than 'true'", async () => {
    process.env.COOKIE_CROSS_SITE = "1"; // must be exactly the string "true"
    const getOptions = await importCookies();
    const opts = getOptions(makeReq({ protocol: "https" }));

    expect(opts.sameSite).toBe("lax");
  });

  // Shared invariants ──────────────────────────────────────────────────────────

  it("always sets httpOnly=true and path='/'", async () => {
    const getOptions = await importCookies();
    const opts = getOptions(makeReq());

    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
  });
});
