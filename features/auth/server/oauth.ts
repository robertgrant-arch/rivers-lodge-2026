import { randomUUID } from "crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/constants";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import * as db from "@core/server/db";
import { sdk } from "@core/server/sdk";
import { authConfig, OAUTH_CALLBACK_URL } from "./config";
import { getSessionCookieOptions } from "./cookies";

const OAUTH_STATE_COOKIE = "oauth_state";

/** State nonces expire after 5 minutes. */
export const STATE_TTL_MS = 5 * 60 * 1000;

// ─── State payload ────────────────────────────────────────────────────────────

export interface OAuthStatePayload {
  /** Cryptographic nonce — compared to the httpOnly cookie on callback. */
  nonce: string;
  /** Where to redirect the user after a successful login (must be same-origin). */
  postLoginUri: string;
  /** Issued-at timestamp in milliseconds (Date.now()). */
  iat: number;
}

// ─── Encode / decode (exported for unit tests) ───────────────────────────────

/** Encode a state payload as URL-safe base64 JSON. */
export function encodeOAuthState(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * Decode and structurally validate a state string.
 * Returns `null` for any malformed input — never throws.
 */
export function decodeOAuthState(state: string): OAuthStatePayload | null {
  try {
    const json = Buffer.from(state, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).nonce !== "string" ||
      typeof (parsed as Record<string, unknown>).postLoginUri !== "string" ||
      typeof (parsed as Record<string, unknown>).iat !== "number"
    ) {
      return null;
    }
    return parsed as OAuthStatePayload;
  } catch {
    return null;
  }
}

// ─── Validation (pure — no I/O, injectable clock for tests) ──────────────────

export type StateValidationError =
  | "missing_cookie"
  | "invalid_state"
  | "nonce_mismatch"
  | "expired";

export type StateValidationResult =
  | { ok: true; payload: OAuthStatePayload }
  | { ok: false; reason: StateValidationError };

/**
 * Validate an OAuth callback's state parameter against the nonce cookie.
 *
 * Security properties:
 * - `cookieNonce` is read from an httpOnly cookie → cannot be forged or read
 *   by JavaScript on any origin.
 * - Nonce comparison prevents replay: each flow generates a unique UUID that
 *   is tied to exactly one browser session.
 * - `iat` expiry prevents slow replay: a stolen code + state pair is useless
 *   after 5 minutes.
 *
 * @param rawState - The raw `state` query parameter from the OAuth callback.
 * @param cookieNonce - The value of the `oauth_state` httpOnly cookie, or
 *   undefined if the cookie is absent.
 * @param nowMs - Current time in ms (injectable for deterministic testing).
 */
export function validateOAuthState(
  rawState: string,
  cookieNonce: string | undefined,
  nowMs: number = Date.now(),
): StateValidationResult {
  if (!cookieNonce) {
    return { ok: false, reason: "missing_cookie" };
  }

  const payload = decodeOAuthState(rawState);
  if (!payload) {
    return { ok: false, reason: "invalid_state" };
  }

  if (payload.nonce !== cookieNonce) {
    return { ok: false, reason: "nonce_mismatch" };
  }

  if (nowMs - payload.iat >= STATE_TTL_MS) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload };
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function readCookie(req: Request, name: string): string | undefined {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  return cookies[name];
}

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Cookie options for the short-lived OAuth state nonce.
 *
 * SameSite=Lax is required regardless of COOKIE_CROSS_SITE — the browser
 * must send this cookie when the OAuth provider redirects back to the callback
 * path, which is a top-level cross-site navigation.  SameSite=Strict would
 * drop the cookie on that redirect.
 *
 * `secure` follows the same env-based rule as the session cookie: always true
 * in production, always false in dev.
 */
function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: authConfig.isProduction,
    maxAge: STATE_TTL_MS,
    path: "/",
    sameSite: "lax" as const,
  };
}

// ─── Route registration ───────────────────────────────────────────────────────

const STATE_ERROR_MESSAGES: Record<StateValidationError, string> = {
  missing_cookie: "OAuth state cookie missing — possible CSRF attack or expired session",
  invalid_state: "OAuth state parameter is malformed",
  nonce_mismatch: "OAuth state nonce mismatch — possible CSRF attack",
  expired: "OAuth login attempt expired — please try logging in again",
};

/**
 * GET /api/oauth/start
 *
 * Begins the OAuth login flow server-side.
 *  1. A cryptographic nonce is tied to this browser session via an httpOnly
 *     cookie that no other origin can read or set.
 *  2. The nonce is verified on callback → CSRF-safe.
 *  3. The iat timestamp expires the flow after 5 min → replay-safe.
 *  4. The callback URL is built from APP_BASE_URL / RENDER_EXTERNAL_URL —
 *     deterministic, no request-origin heuristics.
 */
export function startMemberLogin(req: Request, res: Response): void {
  // Accept only same-origin relative paths as the post-login destination.
  const raw = getQueryParam(req, "redirectUri") ?? "/";
  const postLoginUri = raw.startsWith("/") ? raw : "/";

  const nonce = randomUUID();

  // Embed nonce + destination in the state parameter sent to the OAuth provider.
  const state = encodeOAuthState({ nonce, postLoginUri, iat: Date.now() });

  // The nonce is also stored in an httpOnly cookie.  On callback we compare
  // the two — a mismatch means the request was not initiated by this browser.
  res.cookie(OAUTH_STATE_COOKIE, nonce, oauthStateCookieOptions());

  const oauthUrl = new URL(`${authConfig.oauthServerUrl}/app-auth`);
  oauthUrl.searchParams.set("appId", authConfig.appId);
  oauthUrl.searchParams.set("redirectUri", OAUTH_CALLBACK_URL);
  oauthUrl.searchParams.set("state", state);
  oauthUrl.searchParams.set("type", "signIn");

  res.redirect(302, oauthUrl.toString());
}

/**
 * GET /api/oauth/callback
 *
 * Receives the authorization code from the OAuth provider.
 * Validates state before exchanging the code for a token.
 */
export async function handleMemberCallback(req: Request, res: Response): Promise<void> {
  const code = getQueryParam(req, "code");
  const rawState = getQueryParam(req, "state");

  if (!code || !rawState) {
    res.status(400).json({ error: "code and state are required" });
    return;
  }

  // Read the nonce BEFORE clearing — order matters.
  const cookieNonce = readCookie(req, OAUTH_STATE_COOKIE);
  // Always clear the state cookie — single-use by design.
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

  const result = validateOAuthState(rawState, cookieNonce);
  if (!result.ok) {
    res.status(400).json({ error: STATE_ERROR_MESSAGES[result.reason] });
    return;
  }

  const { postLoginUri } = result.payload;

  try {
    // OAUTH_CALLBACK_URL is the same value used in startMemberLogin — the
    // provider requires the redirectUri in the exchange request to exactly
    // match the one sent at the start of the flow.
    const tokenResponse = await sdk.exchangeCodeForToken(code, OAUTH_CALLBACK_URL);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      res.status(400).json({ error: "openId missing from user info" });
      return;
    }

    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions();
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    // Redirect to the post-login destination from the validated state payload.
    res.redirect(302, postLoginUri);
  } catch (error) {
    console.error("[OAuth] Callback failed", error);
    res.status(500).json({ error: "OAuth callback failed" });
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", startMemberLogin);
  app.get("/api/oauth/callback", handleMemberCallback);
}
