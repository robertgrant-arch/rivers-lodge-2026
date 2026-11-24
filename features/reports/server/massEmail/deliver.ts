/**
 * Bulk delivery for mass email.
 *
 *  startSend(id)      newsletter → 'sending': resolve recipients now (minus
 *                     unsubscribes), record one email_recipients row each.
 *  processQueued(id)  send queued rows in batches of 100 (paced under Resend's
 *                     rate limit), record each result, then mark the email
 *                     'sent' with sent/failed counts.
 *  startEmailScheduler()  every minute: start scheduled emails that are due,
 *                     and resume any 'sending' email left unfinished by a
 *                     restart. Rows already sent are never re-sent.
 */
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@core/server/db";
import { newsletters, emailRecipients } from "../../schema";
import { emailAudienceSchema, resolveAudience, unsubscribedSet } from "./audience";
import { renderEmail } from "./content";
import { fromHeader, publicSiteUrl, resendConfigured, resendKeyHint } from "./config";
import { BATCH_SIZE, MIN_INTERVAL_MS, sendBatch, type OutMessage } from "./sender";
import { unsubscribeUrl } from "./unsubscribe";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const active = new Set<number>();

/** Per-recipient message, with a personal unsubscribe link and one-click headers. */
export function buildMessage(nl: { subject: string; finalContent: string | null; senderName: string | null; replyTo: string | null }, to: string): OutMessage {
  const unsub = unsubscribeUrl(to);
  const { html, text } = renderEmail({ bodyHtml: nl.finalContent ?? "", siteUrl: publicSiteUrl(), unsubscribeUrl: unsub });
  return {
    to,
    subject: nl.subject,
    html,
    text,
    from: fromHeader(nl.senderName ?? ""),
    replyTo: nl.replyTo,
    headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

/** Queue recipients for a newsletter already in 'sending'. Returns how many were queued. */
export async function queueRecipients(id: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [nl] = await db.select().from(newsletters).where(eq(newsletters.id, id)).limit(1);
  if (!nl) throw new Error(`Newsletter ${id} not found`);
  const audience = emailAudienceSchema.parse(nl.audience);
  const { recipients } = await resolveAudience(db, audience);
  for (let i = 0; i < recipients.length; i += 500) {
    const chunk = recipients.slice(i, i + 500).map((r) => ({ newsletterId: id, email: r.email, name: r.name }));
    if (chunk.length) await db.insert(emailRecipients).values(chunk).onConflictDoNothing();
  }
  return recipients.length;
}

async function finalize(id: number) {
  const db = await getDb();
  if (!db) return;
  const [counts] = await db
    .select({
      sent: sql<number>`count(*) filter (where ${emailRecipients.status} in ('sent','bounced','complained'))`.mapWith(Number),
      failed: sql<number>`count(*) filter (where ${emailRecipients.status} = 'failed')`.mapWith(Number),
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.newsletterId, id));
  await db.update(newsletters).set({ status: "sent", sentAt: new Date(), sentCount: counts?.sent ?? 0, failedCount: counts?.failed ?? 0 }).where(eq(newsletters.id, id));
  console.log(`[mass-email] newsletter ${id} finished: ${counts?.sent ?? 0} sent, ${counts?.failed ?? 0} failed`);
}

/** Send every queued recipient of a 'sending' newsletter. Safe to call again after a restart. */
export async function processQueued(id: number, wait: (ms: number) => Promise<void> = sleep): Promise<void> {
  if (active.has(id)) return;
  active.add(id);
  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const apiKey = process.env.RESEND_API_KEY;
    const [nl] = await db.select().from(newsletters).where(eq(newsletters.id, id)).limit(1);
    if (!nl || nl.status !== "sending") return;
    for (;;) {
      const batch = await db.select().from(emailRecipients)
        .where(and(eq(emailRecipients.newsletterId, id), eq(emailRecipients.status, "queued")))
        .orderBy(asc(emailRecipients.id)).limit(BATCH_SIZE);
      if (batch.length === 0) break;
      // Honour unsubscribes that arrived after the list was built.
      const unsub = await unsubscribedSet(db, batch.map((r) => r.email));
      const toSend = batch.filter((r) => !unsub.has(r.email));
      const skipped = batch.filter((r) => unsub.has(r.email));
      if (skipped.length) {
        await db.delete(emailRecipients).where(inArray(emailRecipients.id, skipped.map((r) => r.id)));
      }
      if (toSend.length === 0) continue;
      const results = apiKey
        ? await sendBatch(toSend.map((r) => buildMessage(nl, r.email)), apiKey, wait)
        : toSend.map((r) => ({ to: r.email, ok: false as const, error: "Email sending isn't configured (RESEND_API_KEY missing)" }));
      const now = new Date();
      for (const [i, r] of toSend.entries()) {
        const res = results[i];
        await db.update(emailRecipients).set(res.ok
          ? { status: "sent", providerMessageId: res.id, sentAt: now, attempts: r.attempts + 1, error: null }
          : { status: "failed", attempts: r.attempts + 1, error: res.error.slice(0, 1000) })
          .where(eq(emailRecipients.id, r.id));
      }
      const failed = results.filter((r) => !r.ok).length;
      const firstOk = results.find((r) => r.ok) as { id: string } | undefined;
      console.log(`[mass-email] newsletter ${id}: batch of ${results.length} — ${results.length - failed} accepted by Resend${firstOk ? ` (first resend_id=${firstOk.id})` : ""}, ${failed} failed, key=${resendKeyHint(apiKey)}`);
      if (failed) console.warn(`[mass-email] newsletter ${id}: first failure — ${(results.find((r) => !r.ok) as any)?.error}`);
      await wait(MIN_INTERVAL_MS);
    }
    await finalize(id);
  } catch (err) {
    console.error(`[mass-email] newsletter ${id} delivery error (will resume on next scheduler tick):`, err);
  } finally {
    active.delete(id);
  }
}

/** Move a newsletter to 'sending', queue its recipients, and start delivery in the background. */
export async function startSend(id: number): Promise<{ queued: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const queued = await queueRecipients(id);
  void processQueued(id);
  return { queued };
}

export function deliveryConfigured(): boolean {
  return resendConfigured();
}

let timer: NodeJS.Timeout | null = null;

/** One scheduler pass: start due scheduled emails, resume unfinished sends. */
export async function schedulerTick(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const due = await db.update(newsletters)
    .set({ status: "sending", sendStartedAt: new Date() })
    .where(and(eq(newsletters.status, "scheduled"), lte(newsletters.scheduledFor, new Date())))
    .returning({ id: newsletters.id });
  for (const { id } of due) {
    console.log(`[mass-email] starting scheduled newsletter ${id}`);
    try { await startSend(id); } catch (err) { console.error(`[mass-email] couldn't start newsletter ${id}:`, err); }
  }
  const sending = await db.select({ id: newsletters.id }).from(newsletters).where(eq(newsletters.status, "sending"));
  for (const { id } of sending) {
    if (active.has(id)) continue;
    const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(emailRecipients).where(eq(emailRecipients.newsletterId, id));
    if (n === 0) { try { await queueRecipients(id); } catch (err) { console.error(`[mass-email] couldn't queue newsletter ${id}:`, err); continue; } }
    void processQueued(id);
  }
}

export function startEmailScheduler(intervalMs = 60_000): void {
  if (timer) return;
  timer = setInterval(() => { schedulerTick().catch((err) => console.error("[mass-email] scheduler error:", err)); }, intervalMs);
  timer.unref?.();
  setTimeout(() => { schedulerTick().catch((err) => console.error("[mass-email] scheduler error:", err)); }, 5_000).unref?.();
}
