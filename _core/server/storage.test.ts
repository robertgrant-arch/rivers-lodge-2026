import { afterEach, describe, expect, it, vi } from "vitest";
import { isPublicStorageKey, signedDatabaseUrl, verifyStorageSignature } from "./storage";

const parse = (url: string) => {
  const u = new URL(url, "http://x");
  return { key: decodeURIComponent(u.pathname.replace(/^\/manus-storage\//, "")), expires: u.searchParams.get("expires") ?? undefined, sig: u.searchParams.get("sig") ?? undefined };
};

describe("database storage access rules", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("property and generated files are public; member photos and waivers are not", () => {
    expect(isPublicStorageKey("properties/covers/1-pond_ab12.jpg")).toBe(true);
    expect(isPublicStorageKey("properties/maps/1-map_ab12.pdf")).toBe(true);
    expect(isPublicStorageKey("generated/1_ab12.png")).toBe(true);
    expect(isPublicStorageKey("members/photos/3-1_ab12.jpg")).toBe(false);
    expect(isPublicStorageKey("waiver-templates/x_ab12.pdf")).toBe(false);
    expect(isPublicStorageKey("waivers/signed/7_ab12.pdf")).toBe(false);
  });

  it("a signed link verifies until it expires", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@db/x");
    const now = Date.UTC(2026, 10, 24, 12);
    const { key, expires, sig } = parse(signedDatabaseUrl("members/photos/3-1_ab12.jpg", now));
    expect(verifyStorageSignature(key, expires, sig, now)).toBe(true);
    expect(verifyStorageSignature(key, expires, sig, now + 59 * 60 * 1000)).toBe(true);
    expect(verifyStorageSignature(key, expires, sig, now + 61 * 60 * 1000)).toBe(false);
  });

  it("rejects tampering, another file's signature, and missing parts", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@db/x");
    const now = Date.UTC(2026, 10, 24, 12);
    const a = parse(signedDatabaseUrl("members/photos/3-1_ab12.jpg", now));
    expect(verifyStorageSignature("members/photos/4-1_cd34.jpg", a.expires, a.sig, now)).toBe(false);
    expect(verifyStorageSignature(a.key, String(Number(a.expires) + 3600), a.sig, now)).toBe(false);
    expect(verifyStorageSignature(a.key, a.expires, a.sig!.replace(/.$/, (c) => (c === "0" ? "1" : "0")), now)).toBe(false);
    expect(verifyStorageSignature(a.key, a.expires, undefined, now)).toBe(false);
    expect(verifyStorageSignature(a.key, undefined, a.sig, now)).toBe(false);
  });

  it("a link signed with one secret doesn't verify with another", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@db/x");
    const now = Date.UTC(2026, 10, 24, 12);
    const a = parse(signedDatabaseUrl("waivers/signed/7_ab12.pdf", now));
    vi.stubEnv("FILE_URL_SECRET", "a-different-secret");
    expect(verifyStorageSignature(a.key, a.expires, a.sig, now)).toBe(false);
  });
});
