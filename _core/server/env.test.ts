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

  it("reads CLERK_SECRET_KEY", async () => {
    process.env.CLERK_SECRET_KEY = "sk_test_abc";
    const { ENV } = await tryLoadEnv();
    expect(ENV.clerkSecretKey).toBe("sk_test_abc");
  });

  it("defaults clerkSecretKey to empty string when absent", async () => {
    delete process.env.CLERK_SECRET_KEY;
    const { ENV } = await tryLoadEnv();
    expect(ENV.clerkSecretKey).toBe("");
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

  it("cookieCrossSite is false for any value other than 'true'", async () => {
    process.env.COOKIE_CROSS_SITE = "1";
    const { ENV } = await tryLoadEnv();
    expect(ENV.cookieCrossSite).toBe(false);
  });
});
