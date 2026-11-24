/** Mass email configuration (all from environment; nothing secret is logged). */
import { createHash } from "node:crypto";

export const DEFAULT_FROM_ADDRESS = "info@riverslodgehunt.com";
export const DEFAULT_SITE_URL = "https://riverslodgehunt.com";

/** Bare sender address from EMAIL_FROM (or the older MAIL_FROM), e.g. "info@riverslodgehunt.com". */
export function emailFromAddress(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.EMAIL_FROM || env.MAIL_FROM || "").trim();
  const angle = /<([^>]+)>/.exec(raw);
  const addr = (angle ? angle[1] : raw).trim();
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(addr) ? addr : DEFAULT_FROM_ADDRESS;
}

/** From header: "<Name> at Rivers Lodge <info@…>". Quotes/angle brackets are stripped from the name. */
export function fromHeader(senderName: string, env: NodeJS.ProcessEnv = process.env): string {
  const name = (senderName || "").replace(/["<>\r\n]/g, "").trim() || "The Team";
  return `${name} at Rivers Lodge <${emailFromAddress(env)}>`;
}

/** Public site origin for links in emails. APP_BASE_URL unless it points at localhost in production. */
export function publicSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const base = (env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!base) return DEFAULT_SITE_URL;
  if (env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(base)) return DEFAULT_SITE_URL;
  return base;
}

export function resendConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.RESEND_API_KEY;
}

/** Resend API origin and key hint: shared with the transactional mailer. */
export { resendApiBase, resendKeyHint } from "@core/server/resend";

/** Secret for signing unsubscribe links: EMAIL_UNSUBSCRIBE_SECRET, else derived from DATABASE_URL. */
export function unsubscribeSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.EMAIL_UNSUBSCRIBE_SECRET) return env.EMAIL_UNSUBSCRIBE_SECRET;
  return env.DATABASE_URL ? createHash("sha256").update(`rivers-lodge:unsubscribe:${env.DATABASE_URL}`).digest("hex") : null;
}
