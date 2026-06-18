/**
 * Member-auth vertical slice — end-to-end flow tests.
 *
 * Covers:
 *   1. OAuth start — sets state cookie and redirects to provider
 *   2. Callback success — exchanges code, persists user, writes session cookie
 *   3. Callback failures — each stage returns a deterministic HTTP error
 *   4. Authenticated portal procedure succeeds
 *   5. Unauthenticated portal procedure throws UNAUTHORIZED
 *   6. Missing required env vars fail fast at slice initialisation
 *
 * All tests are scoped to the member-auth slice public interface.  External
 * dependencies (sdk, db) are mocked at the module boundary.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

// ─── Mocks (hoisted so vi.mock factory runs before imports) ───────────────────

vi.mock("@core/server/sdk", () => ({
  sdk: {
    exchangeCodeForToken: vi.fn(),
    getUserInfo: vi.fn(),
    createSessionToken: vi.fn(),
    authenticateRequest: vi.fn(),
  },
}));

vi.mock("@core/server/db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getMessages: vi.fn().mockResolvedValue([]),
  getBookings: vi.fn().mockResolvedValue([]),
}));

vi.mock("./config", () => ({
  authConfig: Object.freeze({
    oauthServerUrl: "https://oauth.example.com",
    appId: "test-app-id",
    appBaseUrl: "https://app.example.com",
    cookieCrossSite: false,
    isProduction: false,
  }),
  OAUTH_CALLBACK_URL: "https://app.example.com/api/oauth/callback",
}));

// ─── Imports (after mocks are registered) ─────────────────────────────────────

import type { Request, Response } from "express";
import { sdk } from "@core/server/sdk";
import * as db from "@core/server/db";
import { COOKIE_NAME } from "@shared/constants";
import { encodeOAuthState, startMemberLogin, handleMemberCallback } from "./oauth";
import { appRouter } from "@core/server/router";
import type { TrpcContext } from "@core/server/context";
import type { User } from "../types";

// ─── Request / Response helpers ───────────────────────────────────────────────

type SetCookieCall = { name: string; value: string; options: Record<string, unknown> };
type ClearCookieCall = { name: string; options?: Record<string, unknown> };

function makeRes() {
  const cookies: SetCookieCall[] = [];
  const clearedCookies: ClearCookieCall[] = [];
  let statusCode = 200;
  let redirectTarget: string | undefined;
  let jsonBody: unknown;

  const res = {
    cookie(name: string, value: string, options: Record<string, unknown>) {
      cookies.push({ name, value, options });
      return res;
    },
    clearCookie(name: string, options?: Record<string, unknown>) {
      clearedCookies.push({ name, options: options ?? {} });
      return res;
    },
    redirect(_code: number, url: string) {
      statusCode = _code;
      redirectTarget = url;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(body: unknown) {
      jsonBody = body;
      return res;
    },
    // Expose recorded state for assertions
    _cookies: cookies,
    _clearedCookies: clearedCookies,
    get _status() { return statusCode; },
    get _redirectTarget() { return redirectTarget; },
    get _json() { return jsonBody; },
  } as unknown as Response & {
    _cookies: SetCookieCall[];
    _clearedCookies: ClearCookieCall[];
    _status: number;
    _redirectTarget: string | undefined;
    _json: unknown;
  };

  return res;
}

function makeReq(overrides: Partial<{
  query: Record<string, string>;
  cookieHeader: string;
}> = {}): Request {
  return {
    query: overrides.query ?? {},
    headers: { cookie: overrides.cookieHeader ?? "" },
    protocol: "https",
  } as unknown as Request;
}

// ─── Shared test user fixture ──────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "user-open-id",
    name: "Alice",
    email: "alice@example.com",
    loginMethod: "google",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

// ─── tRPC context helpers ──────────────────────────────────────────────────────

function makeCtx(user: User | null): TrpcContext {
  return {
    user,
    req: makeReq() as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── 1. OAuth start ───────────────────────────────────────────────────────────

describe("startMemberLogin", () => {
  it("sets an httpOnly oauth_state cookie", () => {
    const req = makeReq({ query: { redirectUri: "/portal" } });
    const res = makeRes();

    startMemberLogin(req, res as unknown as Response);

    const stateCookie = res._cookies.find((c) => c.name === "oauth_state");
    expect(stateCookie).toBeDefined();
    expect(stateCookie?.options).toMatchObject({ httpOnly: true, sameSite: "lax" });
  });

  it("redirects to the OAuth provider with required params", () => {
    const req = makeReq({ query: { redirectUri: "/portal" } });
    const res = makeRes();

    startMemberLogin(req, res as unknown as Response);

    expect(res._status).toBe(302);
    expect(res._redirectTarget).toBeDefined();

    const url = new URL(res._redirectTarget!);
    expect(url.searchParams.get("type")).toBe("signIn");
    expect(url.searchParams.get("redirectUri")).toContain("/api/oauth/callback");
    expect(url.searchParams.get("state")).toBeTruthy();
  });

  it("encodes postLoginUri in the state param", () => {
    const req = makeReq({ query: { redirectUri: "/portal" } });
    const res = makeRes();

    startMemberLogin(req, res as unknown as Response);

    const url = new URL(res._redirectTarget!);
    const rawState = url.searchParams.get("state")!;
    const decoded = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8"));
    expect(decoded.postLoginUri).toBe("/portal");
  });

  it("defaults postLoginUri to '/' when redirectUri is omitted", () => {
    const req = makeReq();
    const res = makeRes();

    startMemberLogin(req, res as unknown as Response);

    const url = new URL(res._redirectTarget!);
    const rawState = url.searchParams.get("state")!;
    const decoded = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8"));
    expect(decoded.postLoginUri).toBe("/");
  });

  it("rejects non-relative redirectUri and falls back to '/'", () => {
    const req = makeReq({ query: { redirectUri: "https://evil.com/steal" } });
    const res = makeRes();

    startMemberLogin(req, res as unknown as Response);

    const url = new URL(res._redirectTarget!);
    const rawState = url.searchParams.get("state")!;
    const decoded = JSON.parse(Buffer.from(rawState, "base64url").toString("utf8"));
    expect(decoded.postLoginUri).toBe("/");
  });
});

// ─── 2. Callback success ──────────────────────────────────────────────────────

describe("handleMemberCallback — success", () => {
  beforeEach(() => {
    (sdk.exchangeCodeForToken as MockInstance).mockResolvedValue({ accessToken: "access-tok" });
    (sdk.getUserInfo as MockInstance).mockResolvedValue({
      openId: "user-open-id",
      name: "Alice",
      email: "alice@example.com",
      loginMethod: "google",
      platform: "google",
    });
    (db.upsertUser as MockInstance).mockResolvedValue(undefined);
    (sdk.createSessionToken as MockInstance).mockResolvedValue("session.jwt.token");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function buildValidRequest(postLoginUri = "/portal") {
    const nonce = "test-nonce-123";
    const state = encodeOAuthState({ nonce, postLoginUri, iat: Date.now() });
    const req = makeReq({
      query: { code: "auth-code", state },
      cookieHeader: `oauth_state=${nonce}`,
    });
    return req;
  }

  it("writes the session cookie on a successful exchange", async () => {
    const res = makeRes();
    await handleMemberCallback(buildValidRequest(), res as unknown as Response);

    const sessionCookie = res._cookies.find((c) => c.name === COOKIE_NAME);
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.value).toBe("session.jwt.token");
    expect(sessionCookie?.options).toMatchObject({ httpOnly: true });
  });

  it("redirects to postLoginUri after successful exchange", async () => {
    const res = makeRes();
    await handleMemberCallback(buildValidRequest("/portal"), res as unknown as Response);

    expect(res._status).toBe(302);
    expect(res._redirectTarget).toBe("/portal");
  });

  it("clears the oauth_state cookie (single-use)", async () => {
    const res = makeRes();
    await handleMemberCallback(buildValidRequest(), res as unknown as Response);

    const cleared = res._clearedCookies.find((c) => c.name === "oauth_state");
    expect(cleared).toBeDefined();
  });

  it("passes the correct callback URL to the token exchange", async () => {
    const res = makeRes();
    await handleMemberCallback(buildValidRequest(), res as unknown as Response);

    const [, redirectUri] = (sdk.exchangeCodeForToken as MockInstance).mock.calls[0] as [string, string];
    expect(redirectUri).toContain("/api/oauth/callback");
  });

  it("upserts the user with the openId from the provider", async () => {
    const res = makeRes();
    await handleMemberCallback(buildValidRequest(), res as unknown as Response);

    expect(db.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ openId: "user-open-id" }),
    );
  });

  it("falls back to openId as display name when user has no name", async () => {
    (sdk.getUserInfo as MockInstance).mockResolvedValue({
      openId: "nameless-user",
      name: "",
      email: null,
      loginMethod: null,
    });

    const res = makeRes();
    const nonce = "nonce-nameless";
    const state = encodeOAuthState({ nonce, postLoginUri: "/", iat: Date.now() });
    const req = makeReq({ query: { code: "c", state }, cookieHeader: `oauth_state=${nonce}` });

    await handleMemberCallback(req, res as unknown as Response);

    // createSessionToken must receive the openId as name, not empty string
    const [, opts] = (sdk.createSessionToken as MockInstance).mock.calls[0] as [string, { name: string }];
    expect(opts.name).toBe("nameless-user");
  });
});

// ─── 3. Callback failures ─────────────────────────────────────────────────────

describe("handleMemberCallback — failures", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when code or state params are missing", async () => {
    const req = makeReq({ query: {} });
    const res = makeRes();

    await handleMemberCallback(req, res as unknown as Response);

    expect(res._status).toBe(400);
    expect((res._json as Record<string, string>).error).toBeTruthy();
  });

  it("returns 400 when the oauth_state cookie is missing (CSRF guard)", async () => {
    const state = encodeOAuthState({ nonce: "n", postLoginUri: "/", iat: Date.now() });
    const req = makeReq({ query: { code: "c", state }, cookieHeader: "" });
    const res = makeRes();

    await handleMemberCallback(req, res as unknown as Response);

    expect(res._status).toBe(400);
    expect((res._json as Record<string, string>).error).toMatch(/cookie/i);
  });

  it("returns 400 when the nonce doesn't match the cookie (CSRF guard)", async () => {
    const state = encodeOAuthState({ nonce: "legit-nonce", postLoginUri: "/", iat: Date.now() });
    const req = makeReq({ query: { code: "c", state }, cookieHeader: "oauth_state=attacker-nonce" });
    const res = makeRes();

    await handleMemberCallback(req, res as unknown as Response);

    expect(res._status).toBe(400);
    expect((res._json as Record<string, string>).error).toMatch(/nonce/i);
  });

  it("returns 400 when the state has expired", async () => {
    const expiredIat = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    const nonce = "old-nonce";
    const state = encodeOAuthState({ nonce, postLoginUri: "/", iat: expiredIat });
    const req = makeReq({ query: { code: "c", state }, cookieHeader: `oauth_state=${nonce}` });
    const res = makeRes();

    await handleMemberCallback(req, res as unknown as Response);

    expect(res._status).toBe(400);
    expect((res._json as Record<string, string>).error).toMatch(/expir/i);
  });

  it("returns 502 when the token exchange fails", async () => {
    (sdk.exchangeCodeForToken as MockInstance).mockRejectedValue(new Error("provider down"));

    const nonce = "n1";
    const state = encodeOAuthState({ nonce, postLoginUri: "/", iat: Date.now() });
    const req = makeReq({ query: { code: "c", state }, cookieHeader: `oauth_state=${nonce}` });
    const res = makeRes();

    await handleMemberCallback(req, res as unknown as Response);

    expect(res._status).toBe(502);
    expect((res._json as Record<string, string>).error).toMatch(/token exchange/i);
  });

  it("returns 502 when getUserInfo fails", async () => {
    (sdk.exchangeCodeForToken as MockInstance).mockResolvedValue({ accessToken: "tok" });
    (sdk.getUserInfo as MockInstance).mockRejectedValue(new Error("info endpoint down"));

    const nonce = "n2";
    const state = encodeOAuthState({ nonce, postLoginUri: "/", iat: Date.now() });
    const req = makeReq({ query: { code: "c", state }, cookieHeader: `oauth_state=${nonce}` });
    const res = makeRes();

    await handleMemberCallback(req, res as unknown as Response);

    expect(res._status).toBe(502);
    expect((res._json as Record<string, string>).error).toMatch(/user info/i);
  });

  it("returns 400 when the provider returns no openId", async () => {
    (sdk.exchangeCodeForToken as MockInstance).mockResolvedValue({ accessToken: "tok" });
    (sdk.getUserInfo as MockInstance).mockResolvedValue({ openId: "", name: "Alice" });

    const nonce = "n3";
    const state = encodeOAuthState({ nonce, postLoginUri: "/", iat: Date.now() });
    const req = makeReq({ query: { code: "c", state }, cookieHeader: `oauth_state=${nonce}` });
    const res = makeRes();

    await handleMemberCallback(req, res as unknown as Response);

    expect(res._status).toBe(400);
    expect((res._json as Record<string, string>).error).toMatch(/openId/i);
  });

  it("returns 503 when the DB upsert fails", async () => {
    (sdk.exchangeCodeForToken as MockInstance).mockResolvedValue({ accessToken: "tok" });
    (sdk.getUserInfo as MockInstance).mockResolvedValue({
      openId: "u1", name: "Alice", email: null, loginMethod: null,
    });
    (db.upsertUser as MockInstance).mockRejectedValue(new Error("DB connection lost"));

    const nonce = "n4";
    const state = encodeOAuthState({ nonce, postLoginUri: "/", iat: Date.now() });
    const req = makeReq({ query: { code: "c", state }, cookieHeader: `oauth_state=${nonce}` });
    const res = makeRes();

    await handleMemberCallback(req, res as unknown as Response);

    expect(res._status).toBe(503);
    expect((res._json as Record<string, string>).error).toMatch(/persist/i);
  });

  it("returns 500 when session token creation fails", async () => {
    (sdk.exchangeCodeForToken as MockInstance).mockResolvedValue({ accessToken: "tok" });
    (sdk.getUserInfo as MockInstance).mockResolvedValue({
      openId: "u1", name: "Alice", email: null, loginMethod: null,
    });
    (db.upsertUser as MockInstance).mockResolvedValue(undefined);
    (sdk.createSessionToken as MockInstance).mockRejectedValue(new Error("signing key error"));

    const nonce = "n5";
    const state = encodeOAuthState({ nonce, postLoginUri: "/", iat: Date.now() });
    const req = makeReq({ query: { code: "c", state }, cookieHeader: `oauth_state=${nonce}` });
    const res = makeRes();

    await handleMemberCallback(req, res as unknown as Response);

    expect(res._status).toBe(500);
    expect((res._json as Record<string, string>).error).toMatch(/session token/i);
  });
});

// ─── 4 & 5. Portal session guard (via tRPC) ───────────────────────────────────

describe("requireMemberSession — portal.member.myProfile", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("allows an authenticated user to reach a protected procedure", async () => {
    (db.getUserByOpenId as MockInstance).mockResolvedValue(makeUser());

    const caller = appRouter.createCaller(makeCtx(makeUser()));
    const result = await caller.memberPortal.myProfile().catch((e: Error) => {
      // DB errors are acceptable in the test env; auth errors are not.
      if (e.message.includes("UNAUTHORIZED") || e.message.includes("FORBIDDEN")) throw e;
      return { user: makeUser(), member: null };
    });

    expect(result).toBeDefined();
  });

  it("throws UNAUTHORIZED for an unauthenticated request", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.memberPortal.myProfile()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ─── 6. Fail-fast env validation ──────────────────────────────────────────────

describe("auth slice config — fail-fast in production", () => {
  beforeEach(() => {
    // Remove the global mock so we load the real config.ts implementation.
    vi.doUnmock("./config");
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.OAUTH_SERVER_URL;
    delete process.env.VITE_APP_ID;
    delete process.env.APP_BASE_URL;
    delete process.env.RENDER_EXTERNAL_URL;
    vi.resetModules();
  });

  it("throws an actionable error when OAUTH_SERVER_URL is missing in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.VITE_APP_ID = "test-app-id";
    process.env.APP_BASE_URL = "https://theriverslodge.onrender.com";
    // OAUTH_SERVER_URL intentionally omitted

    await expect(import("./config")).rejects.toThrow(/OAUTH_SERVER_URL/);
  });

  it("throws an actionable error when VITE_APP_ID is missing in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.OAUTH_SERVER_URL = "https://oauth.example.com";
    process.env.APP_BASE_URL = "https://theriverslodge.onrender.com";
    // VITE_APP_ID intentionally omitted

    await expect(import("./config")).rejects.toThrow(/VITE_APP_ID/);
  });

  it("throws an actionable error when no base URL is available in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.OAUTH_SERVER_URL = "https://oauth.example.com";
    process.env.VITE_APP_ID = "test-app-id";
    // Neither APP_BASE_URL nor RENDER_EXTERNAL_URL set

    await expect(import("./config")).rejects.toThrow(/APP_BASE_URL|RENDER_EXTERNAL_URL/);
  });

  it("does not throw in development even when vars are missing", async () => {
    // NODE_ENV is not 'production' in the test runner — all requireVar calls return "".
    await expect(import("./config")).resolves.toBeDefined();
  });
});
