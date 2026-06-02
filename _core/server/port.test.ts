/**
 * Port resolution — unit tests (#1)
 *
 * Tests resolvePort() in isolation.  We use net.createServer to actually
 * occupy a port so findAvailablePort can prove it skips occupied ports.
 */

import net from "net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePort } from "./port";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Bind a real server to `port` and return a close function. */
function occupy(port: number): Promise<() => Promise<void>> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(port, () =>
      resolve(
        () =>
          new Promise<void>((res, rej) =>
            srv.close((err) => (err ? rej(err) : res())),
          ),
      ),
    );
    srv.on("error", reject);
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("resolvePort — production", () => {
  beforeEach(() => vi.stubEnv("NODE_ENV", "production"));
  afterEach(() => vi.unstubAllEnvs());

  it("returns PORT when it is a valid number", async () => {
    vi.stubEnv("PORT", "8080");
    await expect(resolvePort()).resolves.toBe(8080);
  });

  it("throws when PORT is absent", async () => {
    vi.stubEnv("PORT", "");
    await expect(resolvePort()).rejects.toThrow("PORT environment variable");
  });

  it("throws when PORT is not a number", async () => {
    vi.stubEnv("PORT", "banana");
    await expect(resolvePort()).rejects.toThrow("PORT environment variable");
  });

  it("throws when PORT is 0 (out of valid range)", async () => {
    vi.stubEnv("PORT", "0");
    await expect(resolvePort()).rejects.toThrow("PORT environment variable");
  });
});

describe("resolvePort — development", () => {
  beforeEach(() => vi.stubEnv("NODE_ENV", "development"));
  afterEach(() => vi.unstubAllEnvs());

  it("returns the preferred port when it is free", async () => {
    vi.stubEnv("PORT", "19001");
    const port = await resolvePort();
    expect(port).toBe(19001);
  });

  it("skips an occupied port and returns the next available one", async () => {
    vi.stubEnv("PORT", "19100");
    const release = await occupy(19100); // block 19100
    try {
      const port = await resolvePort();
      expect(port).toBe(19101); // should pick the next one
    } finally {
      await release();
    }
  });

  it("defaults to port 3000 when PORT is unset", async () => {
    vi.stubEnv("PORT", ""); // empty = unset

    // We only check it doesn't throw and returns a number in range.
    // (3000 might be occupied in CI, so we don't assert the exact value.)
    const port = await resolvePort();
    expect(typeof port).toBe("number");
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThanOrEqual(65535);
  });
});
