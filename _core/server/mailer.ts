/**
 * Mailer — sends invite / password-reset emails.
 *
 * Delivery is attempted in this order:
 *   1. Resend HTTP API   — if RESEND_API_KEY is set (recommended on Render:
 *                          no SMTP ports, no native deps, plain HTTPS).
 *   2. SMTP (nodemailer) — if SMTP_HOST is set and `nodemailer` is installed.
 *   3. Console log        — dev fallback: logs the link so an admin can copy it.
 *
 * Required env for real sending (Resend):
 *   RESEND_API_KEY   — from https://resend.com
 *   MAIL_FROM        — a verified sender, e.g. "Rivers Lodge <no-reply@yourdomain.com>"
 *   APP_BASE_URL     — public site origin, so invite links point at the live domain
 */

import { resendApiBase, resendEmailId, resendKeyHint } from "./resend";

const BRAND = "Rivers Lodge & Hunt Club";

function mailFrom() {
  return process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? "Rivers Lodge <onboarding@resend.dev>";
}

function resendConfigured() {
  return !!process.env.RESEND_API_KEY;
}

function smtpConfigured() {
  return !!process.env.SMTP_HOST;
}

/** Outcome of one send. `error` is the provider's real reason, safe to show to an admin. */
export type MailResult = { ok: true; id: string | null } | { ok: false; error: string };

// logTo: what to print instead of the address (e.g. waiver notices must not log signer details).
type MailOpts = { to: string; subject: string; text: string; html: string; logLabel: string; logTo?: string };

// Log lines contain the recipient, the Resend ID and the key ending — never the
// message body, so nothing secret in an email (e.g. a temporary password) is logged.
async function sendViaResend(opts: MailOpts): Promise<MailResult> {
  const key = resendKeyHint(process.env.RESEND_API_KEY);
  try {
    const res = await fetch(`${resendApiBase()}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    const body = await res.text().catch(() => "");
    if (!res.ok) {
      let reason = body.slice(0, 300);
      try { reason = String(JSON.parse(body)?.message ?? reason); } catch { /* not JSON */ }
      console.error(`[Mailer] Resend send FAILED (${res.status}) ${opts.logLabel} to=${opts.logTo ?? opts.to} key=${key}: ${reason}`);
      return { ok: false, error: `Resend ${res.status}: ${reason || res.statusText}` };
    }
    let id: string | null = null;
    try { id = resendEmailId(JSON.parse(body)); } catch { /* not JSON */ }
    if (!id) {
      // Only count it as sent when Resend confirms with an email ID.
      console.error(`[Mailer] Resend returned ${res.status} without an email ID — treating as NOT sent (${opts.logLabel} to=${opts.logTo ?? opts.to} key=${key})`);
      return { ok: false, error: "Resend accepted the request but returned no email ID, so delivery can't be confirmed" };
    }
    console.log(`[Mailer] sent ${opts.logLabel} resend_id=${id} to=${opts.logTo ?? opts.to} key=${key}`);
    return { ok: true, id };
  } catch (err) {
    console.error(`[Mailer] Resend request error (${opts.logLabel} to=${opts.logTo ?? opts.to} key=${key}):`, (err as Error)?.message ?? err);
    return { ok: false, error: `Couldn't reach Resend: ${(err as Error)?.message ?? "network error"}` };
  }
}

async function sendViaSMTP(opts: MailOpts): Promise<MailResult> {
  try {
    const nodemailer = require("nodemailer") as any;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    const { to, subject, text, html } = opts;
    await transport.sendMail({ from: mailFrom(), to, subject, text, html });
    return { ok: true, id: null };
  } catch (err) {
    console.error(`[Mailer] SMTP send failed (${opts.logLabel} to=${opts.logTo ?? opts.to}):`, (err as Error)?.message ?? err);
    return { ok: false, error: `SMTP: ${(err as Error)?.message ?? "send failed"}` };
  }
}

/**
 * Dispatch an email through the first configured provider.
 * `logLine` is printed only in the no-provider dev fallback; never put a
 * password in it.
 */
async function send(opts: MailOpts & { logLine: string }): Promise<MailResult> {
  if (resendConfigured()) return sendViaResend(opts);
  if (smtpConfigured()) return sendViaSMTP(opts);
  console.log(`[Mailer] No email provider configured — ${opts.logLabel} for ${opts.logTo ?? opts.to}:\n  ${opts.logLine}`);
  return { ok: false, error: "Email sending isn't set up on the server (RESEND_API_KEY is missing)" };
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Shared branded HTML shell. */
function shell(bodyHtml: string): string {
  return `
  <div style="background:#2B2823;padding:32px 0;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#363330;border:1px solid #57544E;">
      <div style="padding:24px 32px;border-bottom:1px solid #57544E;">
        <p style="margin:0;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#9B4D19;font-weight:600;">
          ${BRAND}
        </p>
      </div>
      <div style="padding:28px 32px;color:#E0D3BD;font-size:15px;line-height:1.6;">
        ${bodyHtml}
      </div>
    </div>
  </div>`;
}

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  invitedByEmail: string,
): Promise<boolean> {
  const subject = `You've been invited to ${BRAND}`;
  const text = [
    `${invitedByEmail} has invited you to join ${BRAND}.`,
    ``,
    `Accept your invitation and set your password within 72 hours:`,
    inviteUrl,
    ``,
    `Your password must be at least 12 characters and include an uppercase letter, a number, and a special character.`,
    ``,
    `If you did not expect this invitation, you can safely ignore this email.`,
  ].join("\n");
  const html = shell(`
    <p style="margin:0 0 16px;"><strong>${invitedByEmail}</strong> has invited you to join <strong>${BRAND}</strong>.</p>
    <p style="margin:0 0 24px;">Click below to accept your invitation and set your password.</p>
    <p style="margin:0 0 24px;">
      <a href="${inviteUrl}"
         style="display:inline-block;background:#9B4D19;color:#E0D3BD;text-decoration:none;
                padding:12px 24px;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
        Accept Invitation
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#BABAAE;">Your password must contain:</p>
    <ul style="margin:0 0 20px;padding-left:18px;font-size:13px;color:#BABAAE;">
      <li>At least 12 characters</li>
      <li>One uppercase letter</li>
      <li>One number</li>
      <li>One special character</li>
    </ul>
    <p style="margin:0;color:#BABAAE;font-size:12px;">
      This link expires in 72 hours. If you did not expect this, ignore this email.
    </p>
  `);

  return (await send({
    to,
    subject,
    text,
    html,
    logLabel: "invite URL",
    logLine: inviteUrl,
  })).ok;
}

/** Body shared by the two temporary-password emails (account created / password reset). */
function temporaryPasswordEmail(opts: { intro: string; signInUrl: string; to: string; temporaryPassword: string; outro: string }) {
  const text = [
    opts.intro,
    ``,
    `Sign in here: ${opts.signInUrl}`,
    `Email: ${opts.to}`,
    `Temporary password: ${opts.temporaryPassword}`,
    ``,
    opts.outro,
  ].join("\n");
  const html = shell(`
    <p style="margin:0 0 20px;">${esc(opts.intro)}</p>
    <p style="margin:0 0 20px;">Sign in here: <a href="${esc(opts.signInUrl)}" style="color:#E0D3BD;">${esc(opts.signInUrl)}</a></p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;">
      <tr><td style="padding:4px 16px 4px 0;color:#BABAAE;font-size:13px;">Email:</td><td style="padding:4px 0;"><strong>${esc(opts.to)}</strong></td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:#BABAAE;font-size:13px;">Temporary password:</td><td style="padding:4px 0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:15px;letter-spacing:0.04em;"><strong>${esc(opts.temporaryPassword)}</strong></td></tr>
    </table>
    <p style="margin:0 0 24px;">
      <a href="${esc(opts.signInUrl)}"
         style="display:inline-block;background:#9B4D19;color:#E0D3BD;text-decoration:none;
                padding:12px 24px;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
        Sign In
      </a>
    </p>
    <p style="margin:0;">${esc(opts.outro)}</p>
  `);
  return { text, html };
}

/** "Your account is ready" — sent when an admin creates an account with a temporary password. */
export async function sendAccountCreatedEmail(to: string, signInUrl: string, createdByEmail: string, temporaryPassword: string): Promise<MailResult> {
  const { text, html } = temporaryPasswordEmail({
    intro: `${createdByEmail} has created a ${BRAND} account for you.`,
    signInUrl, to, temporaryPassword,
    outro: "You'll be asked to choose your own password the first time you sign in.",
  });
  return send({ to, subject: `Your ${BRAND} account is ready`, text, html, logLabel: "account-created email", logLine: signInUrl });
}

/** Sent by Force Password Reset with the new temporary password. */
export async function sendTemporaryPasswordResetEmail(to: string, signInUrl: string, resetByEmail: string, temporaryPassword: string): Promise<MailResult> {
  const { text, html } = temporaryPasswordEmail({
    intro: `${resetByEmail} has reset your ${BRAND} password.`,
    signInUrl, to, temporaryPassword,
    outro: "You'll be asked to choose a new password when you sign in.",
  });
  return send({ to, subject: `Your ${BRAND} temporary password`, text, html, logLabel: "password-reset email", logLine: signInUrl });
}

export async function sendWaiverEmail(opts: {
  to: string;
  signerName: string;
  waiverTitle: string;
  signingUrl: string;
  senderName: string;
  customMessage?: string | null;
  expiresAt?: Date | null;
}): Promise<boolean> {
  const { to, signerName, waiverTitle, signingUrl, senderName, customMessage, expiresAt } = opts;
  const expiryLine = expiresAt
    ? `This request expires on ${expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
    : `Please complete this at your earliest convenience.`;
  const subject = `Action needed: sign your ${waiverTitle} — ${BRAND}`;
  const text = [
    `Hello ${signerName},`,
    ``,
    `${senderName} at ${BRAND} has requested that you review and sign the following waiver: ${waiverTitle}.`,
    customMessage ? `\n${customMessage}\n` : ``,
    `Review and sign here:`,
    signingUrl,
    ``,
    expiryLine,
    ``,
    `If you did not expect this, you can ignore this email.`,
  ].filter(Boolean).join("\n");
  const html = shell(`
    <p style="margin:0 0 16px;">Hello <strong>${signerName}</strong>,</p>
    <p style="margin:0 0 16px;"><strong>${senderName}</strong> at <strong>${BRAND}</strong> has requested that you review and sign the following waiver:</p>
    <p style="margin:0 0 20px;font-size:16px;color:#E0D3BD;"><strong>${waiverTitle}</strong></p>
    ${customMessage ? `<p style="margin:0 0 20px;color:#BABAAE;border-left:2px solid #9B4D19;padding-left:12px;">${customMessage}</p>` : ""}
    <p style="margin:0 0 24px;">
      <a href="${signingUrl}"
         style="display:inline-block;background:#9B4D19;color:#E0D3BD;text-decoration:none;
                padding:12px 24px;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
        Review &amp; Sign Waiver
      </a>
    </p>
    <p style="margin:0;color:#BABAAE;font-size:12px;">${expiryLine} If you did not expect this, ignore this email.</p>
  `);
  return (await send({ to, subject, text, html, logLabel: "waiver signing URL", logLine: signingUrl })).ok;
}

/** Plain notice (waiver expiry, unsigned-guest summaries, ops alerts). Paragraphs are escaped. */
export async function sendNoticeEmail(to: string, subject: string, paragraphs: string[]): Promise<MailResult> {
  const text = paragraphs.join("\n\n");
  const html = shell(paragraphs.map((p) => `<p style="margin:0 0 14px;">${esc(p)}</p>`).join(""));
  return send({ to, subject: `${subject} — ${BRAND}`, text, html, logLabel: "notice email", logLine: subject, logTo: "[redacted]" });
}
