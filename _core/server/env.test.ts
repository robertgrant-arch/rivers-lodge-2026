import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ENV is evaluated at module load time, so each scenario needs a fresh import
// after the environment variables are configured.
async function loadEnv() {
  const mod = await import("./env");
  return mod.ENV;
}

// Simpler helper that just attempts the import and lets it throw.
async function tryLoadEnv() {
  return import("./env");
}

describe("ENV — cookieSecret validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Restore to original state before each test mutates it.
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  // (c) Production: missing secret must throw ──────────────────────────────────

  it("throws at boot when JWT_SECRET is absent in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;

    await expect(tryLoadEnv()).rejects.toThrow(
      "JWT_SECRET is required in production",
    );
  });

  it("throws at boot when JWT_SECRET is an empty string in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "";

    await expect(tryLoadEnv()).rejects.toThrow(
      "JWT_SECRET is required in production",
    );
  });

  it("does not throw in production when JWT_SECRET is provided", async () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "super-secret-key";

    const { ENV } = await tryLoadEnv();
    expect(ENV.cookieSecret).toBe("super-secret-key");
    expect(ENV.isProduction).toBe(true);
  });

  // Development: warn but continue ────────────────────────────────────────────

  it("logs a console.warn (not throws) when JWT_SECRET is absent in development", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_SECRET;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { ENV } = await tryLoadEnv();

    expect(ENV.cookieSecret).toBe("");
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toMatch(/JWT_SECRET/);
    warnSpy.mockRestore();
  });

  it("does not warn when JWT_SECRET is set in development", async () => {
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "dev-secret";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { ENV } = await tryLoadEnv();

    expect(ENV.cookieSecret).toBe("dev-secret");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // cookieCrossSite ────────────────────────────────────────────────────────────

  it("cookieCrossSite is false by default", async () => {
    process.env.JWT_SECRET = "s";
    delete process.env.COOKIE_CROSS_SITE;

    const { ENV } = await tryLoadEnv();
    expect(ENV.cookieCrossSite).toBe(false);
  });

  it("cookieCrossSite is true when COOKIE_CROSS_SITE=true", async () => {
    process.env.JWT_SECRET = "s";
    process.env.COOKIE_CROSS_SITE = "true";

    const { ENV } = await tryLoadEnv();
    expect(ENV.cookieCrossSite).toBe(true);
  });

  it("cookieCrossSite is false for any value other than 'true'", async () => {
    process.env.JWT_SECRET = "s";
    process.env.COOKIE_CROSS_SITE = "1";

    const { ENV } = await tryLoadEnv();
    expect(ENV.cookieCrossSite).toBe(false);
  });
});
