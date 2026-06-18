import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Re-import after each env mutation so we pick up fresh authConfig values.
async function importCookies() {
  const mod = await import("./cookies");
  return mod.getSessionCookieOptions;
}

describe("getSessionCookieOptions — SameSite behaviour", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.COOKIE_CROSS_SITE;
    delete process.env.NODE_ENV;
    delete process.env.OAUTH_SERVER_URL;
    delete process.env.VITE_APP_ID;
    delete process.env.APP_BASE_URL;
    vi.resetModules();
  });

  // (a) Default: SameSite=Lax ─────────────────────────────────────────────────

  it("defaults to sameSite=lax with secure=false in non-production", async () => {
    // NODE_ENV is not 'production' in the test runner.
    const getOptions = await importCookies();
    const opts = getOptions();

    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(false);
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
  });

  it("sets secure=true in production (env-driven, not request-driven)", async () => {
    // Satisfy fail-fast validation so config.ts doesn't throw in production mode.
    process.env.NODE_ENV = "production";
    process.env.OAUTH_SERVER_URL = "https://oauth.example.com";
    process.env.VITE_APP_ID = "test-app-id";
    process.env.APP_BASE_URL = "https://example.onrender.com";
    const getOptions = await importCookies();
    const opts = getOptions();

    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(true);
  });

  // (b) COOKIE_CROSS_SITE=true: SameSite=None + forced Secure ────────────────

  it("sets sameSite=none and forces secure=true when COOKIE_CROSS_SITE=true", async () => {
    process.env.COOKIE_CROSS_SITE = "true";
    const getOptions = await importCookies();

    // secure must be true regardless of environment — SameSite=None without
    // Secure is silently dropped by browsers (RFC 6265bis §5.3.7).
    const opts = getOptions();

    expect(opts.sameSite).toBe("none");
    expect(opts.secure).toBe(true);
  });

  it("returns to sameSite=lax when COOKIE_CROSS_SITE is anything other than 'true'", async () => {
    process.env.COOKIE_CROSS_SITE = "1"; // must be exactly the string "true"
    const getOptions = await importCookies();
    const opts = getOptions();

    expect(opts.sameSite).toBe("lax");
  });

  // Shared invariants ──────────────────────────────────────────────────────────

  it("always sets httpOnly=true and path='/'", async () => {
    const getOptions = await importCookies();
    const opts = getOptions();

    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
  });
});
