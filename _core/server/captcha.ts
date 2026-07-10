/**
 * Cloudflare Turnstile server-side verification
 *
 * verifyCaptcha(token) is the only function callers need.
 * It POSTs the visitor token to Cloudflare's siteverify endpoint and throws
 * TRPCError({ code: "FORBIDDEN" }) if validation fails.
 *
 * Environment:
 *   TURNSTILE_SECRET  — the Cloudflare secret key (server-only, never sent to browser)
 *
 * Development behaviour:
 *   If TURNSTILE_SECRET is absent in development, verification is bypassed with a
 *   console.warn so local dev keeps working without credentials.
 *
 * Production behaviour:
 *   ENV.isProduction is checked at call time.  If the secret is missing, the server
 *   would already have thrown at boot (see env.ts#loadCookieSecret pattern) — this
 *   is a belt-and-suspenders guard.
 */

import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Verify a Cloudflare Turnstile token.
 *
 * @throws TRPCError FORBIDDEN  — when the token is missing, invalid, or expired.
 * @throws TRPCError INTERNAL_SERVER_ERROR — when the Cloudflare API call itself fails.
 */
export async function verifyCaptcha(token: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET;

  if (!secret) {
    console.warn(
      "[captcha] TURNSTILE_SECRET not configured — skipping verification (dev/preview mode)",
    );
    return;
  }

  if (!token) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Captcha token is required.",
    });
  }

  let data: TurnstileResponse;
  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
    data = (await res.json()) as TurnstileResponse;
  } catch (err) {
    // Network / parse error — don't leak details to the client.
    console.error("[captcha] Turnstile siteverify request failed:", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Captcha verification service unavailable — please try again.",
    });
  }

  if (!data.success) {
    const codes = data["error-codes"]?.join(", ") ?? "unknown";
    console.warn("[captcha] Turnstile verification failed:", codes);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Captcha verification failed — please refresh the page and try again.",
    });
  }
}
