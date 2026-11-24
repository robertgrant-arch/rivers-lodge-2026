/** Signed, non-expiring unsubscribe tokens: base64url(email).hmac */
import { createHmac, timingSafeEqual } from "node:crypto";
import { publicSiteUrl, unsubscribeSecret } from "./config";

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64url = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const mac = (email: string, secret: string) => createHmac("sha256", secret).update(`unsubscribe:${email}`).digest("base64url").slice(0, 32);

export const normalizeEmail = (e: string) => (e || "").trim().toLowerCase();

export function makeUnsubscribeToken(email: string, env: NodeJS.ProcessEnv = process.env): string {
  const secret = unsubscribeSecret(env);
  if (!secret) throw new Error("Can't sign unsubscribe links: DATABASE_URL (or EMAIL_UNSUBSCRIBE_SECRET) is not set");
  const e = normalizeEmail(email);
  return `${b64url(e)}.${mac(e, secret)}`;
}

/** The email address a token was issued for, or null if it's invalid. */
export function verifyUnsubscribeToken(token: string | undefined | null, env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = unsubscribeSecret(env);
  if (!secret || !token || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const [encoded, sig] = token.split(".");
  let email: string;
  try { email = normalizeEmail(unb64url(encoded)); } catch { return null; }
  if (!email.includes("@")) return null;
  const want = Buffer.from(mac(email, secret));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? email : null;
}

export function unsubscribeUrl(email: string, env: NodeJS.ProcessEnv = process.env): string {
  return `${publicSiteUrl(env)}/api/email/unsubscribe?t=${makeUnsubscribeToken(email, env)}`;
}
