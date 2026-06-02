import { describe, expect, it } from "vitest";
import {
  decodeOAuthState,
  encodeOAuthState,
  STATE_TTL_MS,
  validateOAuthState,
  type OAuthStatePayload,
} from "./oauth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePayload(overrides: Partial<OAuthStatePayload> = {}): OAuthStatePayload {
  return {
    nonce: "test-nonce-uuid",
    postLoginUri: "/portal",
    iat: Date.now(),
    ...overrides,
  };
}

// ─── encode / decode round-trip ───────────────────────────────────────────────

describe("encodeOAuthState / decodeOAuthState", () => {
  it("round-trips a valid payload", () => {
    const payload = makePayload();
    const encoded = encodeOAuthState(payload);
    const decoded = decodeOAuthState(encoded);

    expect(decoded).toEqual(payload);
  });

  it("produces URL-safe base64 (no +, /, = characters)", () => {
    // Run many samples to avoid accidental passing on a single alignment.
    for (let i = 0; i < 20; i++) {
      const encoded = encodeOAuthState(makePayload({ nonce: `nonce-${i}` }));
      expect(encoded).not.toMatch(/[+/=]/);
    }
  });

  it("returns null for an empty string", () => {
    expect(decodeOAuthState("")).toBeNull();
  });

  it("returns null for a plain base64 string (old btoa format)", () => {
    // Old format: btoa(redirectUri) — not valid JSON.
    const old = Buffer.from("https://example.com/api/oauth/callback").toString("base64");
    expect(decodeOAuthState(old)).toBeNull();
  });

  it("returns null for a structurally-invalid JSON object", () => {
    const bad = Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64url");
    expect(decodeOAuthState(bad)).toBeNull();
  });

  it("returns null when nonce is missing", () => {
    const bad = Buffer.from(
      JSON.stringify({ postLoginUri: "/", iat: Date.now() }),
    ).toString("base64url");
    expect(decodeOAuthState(bad)).toBeNull();
  });

  it("returns null for arbitrary garbage", () => {
    expect(decodeOAuthState("!!!not-base64url!!!")).toBeNull();
  });
});

// ─── validateOAuthState ───────────────────────────────────────────────────────

describe("validateOAuthState", () => {
  // (a) Valid flow ─────────────────────────────────────────────────────────────

  it("returns ok=true for a valid state + matching cookie", () => {
    const payload = makePayload();
    const state = encodeOAuthState(payload);
    const result = validateOAuthState(state, payload.nonce);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.postLoginUri).toBe("/portal");
      expect(result.payload.nonce).toBe(payload.nonce);
    }
  });

  it("accepts a state issued just before the TTL boundary", () => {
    const iat = 1_000_000;
    const payload = makePayload({ iat });
    const state = encodeOAuthState(payload);

    // One millisecond before expiry — should pass.
    const nowMs = iat + STATE_TTL_MS - 1;
    const result = validateOAuthState(state, payload.nonce, nowMs);

    expect(result.ok).toBe(true);
  });

  // (b) Missing cookie ─────────────────────────────────────────────────────────

  it("rejects when the oauth_state cookie is absent (undefined)", () => {
    const state = encodeOAuthState(makePayload());
    const result = validateOAuthState(state, undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_cookie");
  });

  it("rejects when the oauth_state cookie is an empty string", () => {
    const state = encodeOAuthState(makePayload());
    // An empty cookie is treated the same as absent.
    const result = validateOAuthState(state, "");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_cookie");
  });

  // (c) Nonce mismatch ─────────────────────────────────────────────────────────

  it("rejects when state nonce does not match the cookie nonce", () => {
    const payload = makePayload({ nonce: "legitimate-nonce" });
    const state = encodeOAuthState(payload);

    const result = validateOAuthState(state, "attacker-injected-nonce");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("nonce_mismatch");
  });

  it("rejects when the state is from a different flow (different nonce UUID)", () => {
    const flow1 = makePayload({ nonce: "flow-1-nonce" });
    const flow2 = makePayload({ nonce: "flow-2-nonce" });

    // Browser has cookie for flow-2 but receives state from flow-1 (replay).
    const result = validateOAuthState(encodeOAuthState(flow1), flow2.nonce);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("nonce_mismatch");
  });

  // (d) Expired iat ────────────────────────────────────────────────────────────

  it("rejects when iat is exactly at the TTL boundary", () => {
    const iat = 1_000_000;
    const payload = makePayload({ iat });
    const state = encodeOAuthState(payload);

    // nowMs - iat === STATE_TTL_MS → expired (boundary is exclusive).
    const nowMs = iat + STATE_TTL_MS;
    const result = validateOAuthState(state, payload.nonce, nowMs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });

  it("rejects when iat is well past the TTL (10-minute-old state)", () => {
    const iat = 1_000_000;
    const payload = makePayload({ iat });
    const state = encodeOAuthState(payload);

    const nowMs = iat + 10 * 60 * 1000; // 10 minutes later
    const result = validateOAuthState(state, payload.nonce, nowMs);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });

  // (e) Malformed state ────────────────────────────────────────────────────────

  it("rejects a malformed / non-JSON state string even when cookie is present", () => {
    const result = validateOAuthState("not-valid-base64url!!", "some-nonce");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_state");
  });

  it("rejects the old btoa(redirectUri) state format", () => {
    const oldState = Buffer.from("https://example.com/api/oauth/callback").toString("base64");
    const result = validateOAuthState(oldState, "some-nonce");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_state");
  });

  // (f) Precedence — missing cookie is checked before anything else ─────────────

  it("reports missing_cookie even when state is also malformed", () => {
    const result = validateOAuthState("garbage-state", undefined);

    // missing_cookie is checked first; we never even attempt to decode state.
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_cookie");
  });
});
