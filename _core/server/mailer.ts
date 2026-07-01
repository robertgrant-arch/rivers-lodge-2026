/**
 * Mailer stub — sends invite/reset emails via SMTP if configured, otherwise
 * logs the URL to the console so admins can copy it manually.
 *
 * To enable real sending:
 *   1. pnpm add nodemailer @types/nodemailer
 *   2. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env
 */

function smtpConfigured() {
  return !!process.env.SMTP_HOST;
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
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@riverslodge.com",
      ...opts,
    });
    return true;
  } catch (err) {
    console.error("[Mailer] SMTP send failed:", err);
    return false;
  }
}

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  invitedByEmail: string,
): Promise<boolean> {
  const subject = "You've been invited to Rivers Lodge & Hunt Club";
  const text = [
    `${invitedByEmail} has invited you to join Rivers Lodge & Hunt Club.`,
    ``,
    `Accept your invitation within 72 hours:`,
    inviteUrl,
  ].join("\n");
  const html = `
    <p>${invitedByEmail} has invited you to join <strong>Rivers Lodge &amp; Hunt Club</strong>.</p>
    <p><a href="${inviteUrl}">Accept Invitation</a></p>
    <p style="color:#888;font-size:12px;">This link expires in 72 hours. If you did not expect this, ignore this email.</p>
  `;

  if (!smtpConfigured()) {
    console.log(`[Mailer] SMTP not configured — invite URL for ${to}:\n  ${inviteUrl}`);
    return false;
  }
  return sendViaSMTP({ to, subject, text, html });
}

export async function sendPasswordResetNotification(
  to: string,
  actingAdminEmail: string,
): Promise<boolean> {
  const subject = "Your Rivers Lodge password has been reset";
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:5173";
  const text = [
    `${actingAdminEmail} has required a password reset on your Rivers Lodge account.`,
    ``,
    `Sign in at ${baseUrl}/sign-in — you will be prompted to set a new password.`,
  ].join("\n");
  const html = `
    <p>${actingAdminEmail} has required a password reset on your account.</p>
    <p><a href="${baseUrl}/sign-in">Sign in to set your new password</a></p>
  `;

  if (!smtpConfigured()) {
    console.log(`[Mailer] SMTP not configured — password reset notification for ${to} skipped.`);
    return false;
  }
  return sendViaSMTP({ to, subject, text, html });
}
