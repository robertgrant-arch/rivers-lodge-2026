import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function tryLoadEnv() {
  return import("./env");
}

describe("ENV", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("cookieCrossSite is false by default", async () => {
    delete process.env.COOKIE_CROSS_SITE;
    const { ENV } = await tryLoadEnv();
    expect(ENV.cookieCrossSite).toBe(false);
  });

  it("cookieCrossSite is true when COOKIE_CROSS_SITE=true", async () => {
    process.env.COOKIE_CROSS_SITE = "true";
    const { ENV } = await tryLoadEnv();
    expect(ENV.cookieCrossSite).toBe(true);
  });

  it("reads ADMIN_EMAIL", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    const { ENV } = await tryLoadEnv();
    expect(ENV.adminEmail).toBe("admin@example.com");
  });
});
