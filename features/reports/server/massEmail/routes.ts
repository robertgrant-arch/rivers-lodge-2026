/**
 * Public mass-email routes (registered before the JSON body parser so the
 * webhook can verify the raw body):
 *   GET  /api/email/unsubscribe?t=…   one-click link in every email footer
 *   POST /api/email/unsubscribe?t=…   RFC 8058 one-click (List-Unsubscribe-Post)
 *   POST /api/email/resubscribe       undo, from the confirmation page
 *   POST /api/webhooks/resend         Resend delivery events (Svix-signed)
 */
import express, { type Express } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@core/server/db";
import { emailEvents, emailRecipients, emailUnsubscribes } from "../../schema";
import { verifyUnsubscribeToken } from "./unsubscribe";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} — Rivers Lodge</title>
<style>body{margin:0;background:#2B2823;color:#E0D3BD;font-family:Georgia,serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}main{max-width:460px;text-align:center}h1{font-family:Arial,sans-serif;font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:#C2662A}p{line-height:1.6;color:#BABAAE}button{margin-top:12px;background:transparent;border:1px solid #9B4D19;color:#E0D3BD;padding:10px 18px;font:12px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}a{color:#E0D3BD}</style></head>
<body><main><h1>The Rivers Lodge &amp; Hunt Club</h1>${bodyHtml}</main></body></html>`;
}

async function unsubscribe(email: string, source: "link" | "one_click" | "complaint" | "bounce", newsletterId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(emailUnsubscribes).values({ email, source, newsletterId: newsletterId ?? null }).onConflictDoNothing();
}

/** Svix signature check used by Resend webhooks. secret: "whsec_<base64>". */
export function verifySvixSignature(secret: string, headers: { id?: string; timestamp?: string; signature?: string }, rawBody: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > 5 * 60) return false; // replay window
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signature.split(" ").some((part) => {
    const [ver, sig] = part.split(",");
    if (ver !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

export function registerMassEmailRoutes(app: Express): void {
  const form = express.urlencoded({ extended: false, limit: "10kb" });

  app.get("/api/email/unsubscribe", async (req, res) => {
    const token = String(req.query.t ?? "");
    const email = verifyUnsubscribeToken(token);
    res.set("Cache-Control", "no-store");
    if (!email) {
      res.status(400).send(page("Link not valid", `<p>This unsubscribe link isn't valid. If you keep receiving emails you don't want, reply to one and we'll remove you.</p>`));
      return;
    }
    try {
      await unsubscribe(email, "link");
      res.send(page("Unsubscribed", `<p><strong>${esc(email)}</strong> won't receive Rivers Lodge newsletters or announcements any more.</p>
<p>You'll still get emails about your own bookings and account.</p>
<form method="post" action="/api/email/resubscribe"><input type="hidden" name="t" value="${esc(token)}"><button type="submit">Resubscribe</button></form>`));
    } catch (err) {
      console.error("[mass-email] unsubscribe failed:", err);
      res.status(500).send(page("Something went wrong", `<p>We couldn't process that just now. Please try the link again in a moment.</p>`));
    }
  });

  // RFC 8058 one-click: mail clients POST "List-Unsubscribe=One-Click".
  app.post("/api/email/unsubscribe", form, async (req, res) => {
    const email = verifyUnsubscribeToken(String(req.query.t ?? (req.body as any)?.t ?? ""));
    if (!email) { res.status(400).send("Invalid link"); return; }
    try { await unsubscribe(email, "one_click"); res.send("Unsubscribed"); }
    catch (err) { console.error("[mass-email] one-click unsubscribe failed:", err); res.status(500).send("Error"); }
  });

  app.post("/api/email/resubscribe", form, async (req, res) => {
    const token = String((req.body as any)?.t ?? "");
    const email = verifyUnsubscribeToken(token);
    res.set("Cache-Control", "no-store");
    if (!email) { res.status(400).send(page("Link not valid", `<p>This link isn't valid.</p>`)); return; }
    const db = await getDb();
    if (db) await db.delete(emailUnsubscribes).where(eq(emailUnsubscribes.email, email));
    res.send(page("Subscribed", `<p><strong>${esc(email)}</strong> will receive Rivers Lodge newsletters and announcements again.</p>`));
  });

  app.post("/api/webhooks/resend", express.raw({ type: "*/*", limit: "1mb" }), async (req, res) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[mass-email] Resend webhook received but RESEND_WEBHOOK_SECRET is not set — ignored");
      res.status(503).send("Webhook not configured");
      return;
    }
    const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const ok = verifySvixSignature(secret, {
      id: req.header("svix-id") ?? undefined,
      timestamp: req.header("svix-timestamp") ?? undefined,
      signature: req.header("svix-signature") ?? undefined,
    }, raw);
    if (!ok) { res.status(401).send("Bad signature"); return; }
    let evt: any;
    try { evt = JSON.parse(raw); } catch { res.status(400).send("Bad JSON"); return; }
    const type = String(evt?.type ?? "");
    const messageId: string | null = evt?.data?.email_id ?? null;
    const to: string | null = Array.isArray(evt?.data?.to) ? String(evt.data.to[0] ?? "").toLowerCase() : null;
    try {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.insert(emailEvents).values({ providerMessageId: messageId, email: to, type, detail: evt?.data ?? null });
      if ((type === "email.bounced" || type === "email.complained") && messageId) {
        const [rec] = await db.update(emailRecipients)
          .set({ status: type === "email.bounced" ? "bounced" : "complained" })
          .where(eq(emailRecipients.providerMessageId, messageId))
          .returning({ newsletterId: emailRecipients.newsletterId, email: emailRecipients.email });
        const email = rec?.email ?? to;
        // Complaints always stop bulk email; so do permanent (hard) bounces.
        const permanent = type === "email.complained" || String(evt?.data?.bounce?.type ?? "").toLowerCase() !== "transient";
        if (email && permanent) await unsubscribe(email, type === "email.complained" ? "complaint" : "bounce", rec?.newsletterId);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[mass-email] webhook processing failed:", err);
      res.status(500).send("Error");
    }
  });
}
