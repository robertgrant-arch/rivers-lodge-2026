/**
 * Captcha verification — unit tests
 *
 * Tests verifyCaptcha() in isolation by mocking the global fetch so no
 * real HTTP calls are made to Cloudflare.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("verifyCaptcha", () => {
  // Each test gets a fresh module import so stubEnv changes take effect.
  async function captchaModule() {
    vi.resetModules();
    return import("./captcha");
  }

  beforeEach(() => {
    vi.stubEnv("TURNSTILE_SECRET", "test-secret-key");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  // ── Successful verification ─────────────────────────────────────────────────

  it("resolves when Cloudflare returns success=true", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    }));

    const { verifyCaptcha } = await captchaModule();
    await expect(verifyCaptcha("valid-token")).resolves.toBeUndefined();

    // Confirm we POSTed to Cloudflare's siteverify endpoint.
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    const [url, opts] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("challenges.cloudflare.com/turnstile");
    expect((opts.body as URLSearchParams).get("response")).toBe("valid-token");
    expect((opts.body as URLSearchParams).get("secret")).toBe("test-secret-key");
  });

  // ── Invalid / expired token ─────────────────────────────────────────────────

  it("throws FORBIDDEN when Cloudflare returns success=false", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    }));

    const { verifyCaptcha } = await captchaModule();
    await expect(verifyCaptcha("bad-token")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN for an empty string token (no network call made)", async () => {
    // vi.stubGlobal returns the OLD global value, not the spy — store separately.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { verifyCaptcha } = await captchaModule();
    await expect(verifyCaptcha("")).rejects.toMatchObject({ code: "FORBIDDEN" });
    // We short-circuit before the HTTP hop.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── Network / service errors ────────────────────────────────────────────────

  it("throws INTERNAL_SERVER_ERROR when fetch itself rejects (network down)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const { verifyCaptcha } = await captchaModule();
    await expect(verifyCaptcha("some-token")).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  // ── Development bypass ──────────────────────────────────────────────────────

  it("bypasses verification and resolves when TURNSTILE_SECRET is absent in non-production", async () => {
    vi.stubEnv("TURNSTILE_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { verifyCaptcha } = await captchaModule();
    await expect(verifyCaptcha("")).resolves.toBeUndefined();
    // No network call in bypass mode.
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
