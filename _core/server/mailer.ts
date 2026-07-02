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

async function sendViaResend(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
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
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[Mailer] Resend send failed (${res.status}): ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Mailer] Resend request error:", err);
    return false;
  }
}

async function sendViaSMTP(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
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
    await transport.sendMail({ from: mailFrom(), ...opts });
    return true;
  } catch (err) {
    console.error("[Mailer] SMTP send failed:", err);
    return false;
  }
}

/** Dispatch an email through the first configured provider. */
async function send(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  logLabel: string;
  logLine: string;
}): Promise<boolean> {
  if (resendConfigured()) return sendViaResend(opts);
  if (smtpConfigured()) return sendViaSMTP(opts);
  console.log(`[Mailer] No email provider configured — ${opts.logLabel} for ${opts.to}:\n  ${opts.logLine}`);
  return false;
}

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

  return send({
    to,
    subject,
    text,
    html,
    logLabel: "invite URL",
    logLine: inviteUrl,
  });
}

export async function sendPasswordResetNotification(
  to: string,
  actingAdminEmail: string,
): Promise<boolean> {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:5173";
  const signInUrl = `${baseUrl}/sign-in`;
  const subject = `Your ${BRAND} password has been reset`;
  const text = [
    `${actingAdminEmail} has required a password reset on your ${BRAND} account.`,
    ``,
    `Sign in at ${signInUrl} — you will be prompted to set a new password.`,
  ].join("\n");
  const html = shell(`
    <p style="margin:0 0 24px;"><strong>${actingAdminEmail}</strong> has required a password reset on your account.</p>
    <p style="margin:0;">
      <a href="${signInUrl}"
         style="display:inline-block;background:#9B4D19;color:#E0D3BD;text-decoration:none;
                padding:12px 24px;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
        Sign In
      </a>
    </p>
  `);

  return send({
    to,
    subject,
    text,
    html,
    logLabel: "password reset notice",
    logLine: signInUrl,
  });
}
