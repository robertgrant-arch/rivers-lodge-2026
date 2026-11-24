/**
 * Mass email tRPC procedures (reports.newsletters.*).
 *
 * Permissions are enforced here, never only in the UI:
 *   - staffProcedure: admins, or users with the "employee" role AND an active
 *     employees record. Members are always refused (FORBIDDEN).
 *   - Employees edit/cancel/delete only their own emails; admins any.
 *   - approve / reject / settings.update: admins only.
 *   - When "require employee approval" is on (default), an employee's
 *     submit goes to Pending approval; an admin's is sent/scheduled directly.
 *
 * Status flow: draft → (pending_approval) → scheduled | sending → sent.
 * Cancelling a scheduled or pending email returns it to draft.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { router, protectedProcedure } from "@core/server/trpc";
import { getDb } from "@core/server/db";
import { storagePut } from "@core/server/storage";
import { users } from "@core/db/schema";
import { newsletters, emailRecipients, emailSettings, type Newsletter } from "../../schema";
import { staffInfo, type StaffInfo } from "./access";
import { audienceLabel, emailAudienceSchema, resolveAudience, searchPeople, type EmailAudience } from "./audience";
import { htmlToPlainText, renderEmail, sanitizeBodyHtml } from "./content";
import { emailFromAddress, fromHeader, publicSiteUrl, resendConfigured, resendKeyHint } from "./config";
import { buildMessage, startSend } from "./deliver";
import { sendOne } from "./sender";

export const EMAIL_IMAGE_MAX_BYTES = Math.floor(2.5 * 1024 * 1024);
/** JSON body limit for uploadImage: base64 of the max image plus headroom. */
export const EMAIL_IMAGE_JSON_LIMIT_BYTES = Math.ceil((EMAIL_IMAGE_MAX_BYTES * 4) / 3) + 64 * 1024;

const MAX_BODY_CHARS = 200_000;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

const staffProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const db = await requireDb();
  const staff = await staffInfo(db, ctx.user);
  if (!staff) throw new TRPCError({ code: "FORBIDDEN", message: "Mass email is only available to Rivers Lodge staff." });
  return next({ ctx: { ...ctx, staff } });
});

const adminStaffProcedure = staffProcedure.use(({ ctx, next }) => {
  if (!ctx.staff.isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Only an admin can do that." });
  return next();
});

async function getSettings(db: Awaited<ReturnType<typeof requireDb>>) {
  const [row] = await db.select().from(emailSettings).where(eq(emailSettings.id, 1)).limit(1);
  return { requireEmployeeApproval: row ? row.requireEmployeeApproval : true };
}

async function loadEmail(db: Awaited<ReturnType<typeof requireDb>>, id: number): Promise<Newsletter> {
  const [nl] = await db.select().from(newsletters).where(eq(newsletters.id, id)).limit(1);
  if (!nl) throw new TRPCError({ code: "NOT_FOUND", message: "Email not found" });
  return nl;
}

function assertOwnerOrAdmin(nl: Newsletter, userId: string, staff: StaffInfo) {
  if (!staff.isAdmin && nl.createdBy !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You can only change emails you created." });
  }
}

/** Editable states. "approved" only exists on emails from the old newsletter tool. */
const EDITABLE = new Set(["draft", "cancelled", "approved"]);

function parseAudience(raw: unknown): EmailAudience | null {
  const r = emailAudienceSchema.safeParse(raw);
  return r.success ? r.data : null;
}

/**
 * Send now or schedule an email that is ready (approved, or no approval
 * needed). The status change is conditional on `from`, so two clicks can't
 * send twice.
 */
async function dispatch(db: Awaited<ReturnType<typeof requireDb>>, nl: Newsletter, from: string[], extra: Partial<Newsletter> = {}) {
  const schedule = nl.requestedSendMode === "schedule" && nl.scheduledFor && nl.scheduledFor.getTime() > Date.now() + 30_000;
  const next = schedule ? "scheduled" : "sending";
  const [row] = await db.update(newsletters)
    .set({ ...extra, status: next, ...(schedule ? {} : { sendStartedAt: new Date() }) })
    .where(and(eq(newsletters.id, nl.id), inArray(newsletters.status, from as any)))
    .returning({ id: newsletters.id });
  if (!row) throw new TRPCError({ code: "CONFLICT", message: "This email changed in the meantime. Refresh and try again." });
  if (!schedule) {
    const { queued } = await startSend(nl.id);
    return { status: "sending" as const, queued };
  }
  return { status: "scheduled" as const, queued: 0 };
}

const draftInput = z.object({
  id: z.number().int().optional(),
  subject: z.string().trim().max(255).default(""),
  bodyHtml: z.string().max(MAX_BODY_CHARS).default(""),
  audience: emailAudienceSchema.nullable().optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
});

export const massEmailRouter = router({
  /** What the current user may do. Safe for anyone signed in (no data). */
  access: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const staff = await staffInfo(db, ctx.user);
    if (!staff) return { canUse: false as const };
    const settings = await getSettings(db);
    return {
      canUse: true as const,
      isAdmin: staff.isAdmin,
      name: staff.name,
      email: staff.email,
      from: fromHeader(staff.name),
      fromAddress: emailFromAddress(),
      needsApproval: !staff.isAdmin && settings.requireEmployeeApproval,
      requireEmployeeApproval: settings.requireEmployeeApproval,
      deliveryConfigured: resendConfigured(),
    };
  }),

  list: staffProcedure
    .input(z.object({ status: z.string().max(32).default("all") }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const where = input?.status && input.status !== "all" ? eq(newsletters.status, input.status as any) : undefined;
      return db.select({
        id: newsletters.id, subject: newsletters.subject, status: newsletters.status,
        audienceLabel: newsletters.audienceLabel, senderName: newsletters.senderName,
        createdBy: newsletters.createdBy, creatorEmail: users.email,
        sentCount: newsletters.sentCount, failedCount: newsletters.failedCount,
        scheduledFor: newsletters.scheduledFor, sentAt: newsletters.sentAt, sendStartedAt: newsletters.sendStartedAt,
        requestedSendMode: newsletters.requestedSendMode,
        createdAt: newsletters.createdAt, updatedAt: newsletters.updatedAt,
      }).from(newsletters)
        .leftJoin(users, eq(users.id, newsletters.createdBy))
        .where(where)
        .orderBy(desc(newsletters.updatedAt))
        .limit(500);
    }),

  get: staffProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => {
    const db = await requireDb();
    const nl = await loadEmail(db, input.id);
    const [creator] = await db.select({ email: users.email }).from(users).where(eq(users.id, nl.createdBy)).limit(1);
    const [approver] = nl.approvedBy
      ? await db.select({ email: users.email }).from(users).where(eq(users.id, nl.approvedBy)).limit(1)
      : [];
    const [counts] = await db.select({
      queued: sql<number>`count(*) filter (where ${emailRecipients.status} = 'queued')`.mapWith(Number),
      sent: sql<number>`count(*) filter (where ${emailRecipients.status} = 'sent')`.mapWith(Number),
      failed: sql<number>`count(*) filter (where ${emailRecipients.status} = 'failed')`.mapWith(Number),
      bounced: sql<number>`count(*) filter (where ${emailRecipients.status} = 'bounced')`.mapWith(Number),
      complained: sql<number>`count(*) filter (where ${emailRecipients.status} = 'complained')`.mapWith(Number),
    }).from(emailRecipients).where(eq(emailRecipients.newsletterId, nl.id));
    return { ...nl, audience: parseAudience(nl.audience), creatorEmail: creator?.email ?? null, approverEmail: approver?.email ?? null, counts };
  }),

  /** Create or update a draft. */
  saveDraft: staffProcedure.input(draftInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const bodyHtml = sanitizeBodyHtml(input.bodyHtml);
    const values = {
      subject: input.subject || "(no subject)",
      finalContent: bodyHtml,
      bodyText: htmlToPlainText(bodyHtml),
      audience: input.audience ?? null,
      audienceLabel: input.audience ? audienceLabel(input.audience) : null,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
    };
    if (input.id) {
      const nl = await loadEmail(db, input.id);
      assertOwnerOrAdmin(nl, ctx.user.id, ctx.staff);
      if (!EDITABLE.has(nl.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Only drafts can be edited. Cancel it first, or duplicate it." });
      await db.update(newsletters).set({ ...values, status: "draft" }).where(eq(newsletters.id, nl.id));
      return { id: nl.id };
    }
    const [row] = await db.insert(newsletters).values({
      ...values, draftContent: bodyHtml, status: "draft", createdBy: ctx.user.id,
      senderName: ctx.staff.name, replyTo: ctx.staff.email || null,
    }).returning({ id: newsletters.id });
    return { id: row.id };
  }),

  /** How many people an audience reaches right now (unsubscribed excluded). */
  // A mutation (POST) so long hand-picked lists don't overflow a GET URL.
  audienceCount: staffProcedure.input(z.object({ audience: emailAudienceSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { recipients, excludedUnsubscribed } = await resolveAudience(db, input.audience);
    return { count: recipients.length, excludedUnsubscribed, label: audienceLabel(input.audience) };
  }),

  /** Render exactly what recipients get (HTML + plain text), with a sample unsubscribe link. */
  preview: staffProcedure
    .input(z.object({ bodyHtml: z.string().max(MAX_BODY_CHARS) }))
    .mutation(({ ctx, input }) => {
      const site = publicSiteUrl();
      const { html, text } = renderEmail({ bodyHtml: sanitizeBodyHtml(input.bodyHtml), siteUrl: site, unsubscribeUrl: `${site}/api/email/unsubscribe?t=preview` });
      return { html, text, from: fromHeader(ctx.staff.name), replyTo: ctx.staff.email };
    }),

  searchPeople: staffProcedure.input(z.object({ q: z.string().trim().min(2).max(100) })).query(async ({ input }) => {
    const db = await requireDb();
    return searchPeople(db, input.q, 20);
  }),

  /** Send one copy to the signed-in staff member only. Never to anyone else. */
  sendTest: staffProcedure
    .input(z.object({ subject: z.string().trim().max(255).default(""), bodyHtml: z.string().max(MAX_BODY_CHARS) }))
    .mutation(async ({ ctx, input }) => {
      const to = ctx.staff.email;
      if (!to) throw new TRPCError({ code: "BAD_REQUEST", message: "Your account has no email address." });
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Email sending isn't set up yet (RESEND_API_KEY is missing on the server)." });
      const msg = buildMessage({
        subject: `[Test] ${input.subject || "(no subject)"}`,
        finalContent: sanitizeBodyHtml(input.bodyHtml),
        senderName: ctx.staff.name,
        replyTo: to,
      }, to);
      const res = await sendOne(msg, apiKey);
      const key = resendKeyHint(apiKey);
      if (!res.ok) {
        console.error(`[mass-email] test email FAILED to=${to} key=${key}: ${res.error}`);
        throw new TRPCError({ code: "BAD_GATEWAY", message: `The test email couldn't be sent: ${res.error}` });
      }
      // One line per send so it can be matched in Resend → Emails (ID) and API Keys (key ending).
      console.log(`[mass-email] test email sent resend_id=${res.id} to=${to} key=${key}`);
      return { sentTo: to, resendId: res.id };
    }),

  /** Send now / schedule. Employees go to Pending approval when the setting is on. */
  submit: staffProcedure
    .input(z.object({ id: z.number().int(), mode: z.enum(["now", "schedule"]), scheduledFor: z.string().datetime().nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const nl = await loadEmail(db, input.id);
      assertOwnerOrAdmin(nl, ctx.user.id, ctx.staff);
      if (!EDITABLE.has(nl.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "This email has already been submitted." });
      if (!nl.subject.trim() || nl.subject === "(no subject)") throw new TRPCError({ code: "BAD_REQUEST", message: "Add a subject first." });
      if (!htmlToPlainText(nl.finalContent ?? "").trim() && !/<img/i.test(nl.finalContent ?? "")) throw new TRPCError({ code: "BAD_REQUEST", message: "The email body is empty." });
      const audience = parseAudience(nl.audience);
      if (!audience) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose who should receive this email." });
      const { recipients } = await resolveAudience(db, audience);
      if (recipients.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No one would receive this email (everyone in the group is unsubscribed or has no email)." });
      let scheduledFor: Date | null = null;
      if (input.mode === "schedule") {
        scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
        if (!scheduledFor || scheduledFor.getTime() < Date.now() + 60_000) throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a send time at least a minute in the future." });
      }
      if (!resendConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Email sending isn't set up yet (RESEND_API_KEY is missing on the server)." });

      // The submitter is the sender: From "<name> at Rivers Lodge", Reply-To their email.
      const common = {
        requestedSendMode: input.mode, scheduledFor,
        senderName: ctx.staff.name, replyTo: ctx.staff.email || null,
        audienceLabel: audienceLabel(audience),
      };
      const settings = await getSettings(db);
      if (!ctx.staff.isAdmin && settings.requireEmployeeApproval) {
        const [row] = await db.update(newsletters).set({ ...common, status: "pending_approval", approvedBy: null, approvedAt: null })
          .where(and(eq(newsletters.id, nl.id), inArray(newsletters.status, [...EDITABLE] as any)))
          .returning({ id: newsletters.id });
        if (!row) throw new TRPCError({ code: "CONFLICT", message: "This email changed in the meantime. Refresh and try again." });
        return { status: "pending_approval" as const, recipients: recipients.length };
      }
      const updated = { ...nl, ...common };
      const r = await dispatch(db, updated, [...EDITABLE], {
        ...common,
        ...(ctx.staff.isAdmin ? { approvedBy: ctx.user.id, approvedAt: new Date() } : {}),
      });
      return { ...r, recipients: recipients.length };
    }),

  approve: adminStaffProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const nl = await loadEmail(db, input.id);
    if (nl.status !== "pending_approval") throw new TRPCError({ code: "BAD_REQUEST", message: "This email isn't waiting for approval." });
    if (!resendConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Email sending isn't set up yet (RESEND_API_KEY is missing on the server)." });
    return dispatch(db, nl, ["pending_approval"], { approvedBy: ctx.user.id, approvedAt: new Date() });
  }),

  /** Send back to the author as a draft. */
  reject: adminStaffProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.update(newsletters).set({ status: "draft" })
      .where(and(eq(newsletters.id, input.id), eq(newsletters.status, "pending_approval")))
      .returning({ id: newsletters.id });
    if (!row) throw new TRPCError({ code: "BAD_REQUEST", message: "This email isn't waiting for approval." });
    return { success: true };
  }),

  /** Withdraw a pending or scheduled email back to draft. */
  cancel: staffProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const nl = await loadEmail(db, input.id);
    assertOwnerOrAdmin(nl, ctx.user.id, ctx.staff);
    const [row] = await db.update(newsletters).set({ status: "draft" })
      .where(and(eq(newsletters.id, nl.id), inArray(newsletters.status, ["pending_approval", "scheduled"])))
      .returning({ id: newsletters.id });
    if (!row) throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending or scheduled emails can be cancelled." });
    return { success: true };
  }),

  duplicate: staffProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const nl = await loadEmail(db, input.id);
    const audience = parseAudience(nl.audience);
    const [row] = await db.insert(newsletters).values({
      subject: nl.subject,
      draftContent: nl.finalContent ?? nl.draftContent,
      finalContent: nl.finalContent ?? nl.draftContent,
      bodyText: nl.bodyText ?? htmlToPlainText(nl.finalContent ?? nl.draftContent ?? ""),
      audience, audienceLabel: audience ? audienceLabel(audience) : null,
      status: "draft", createdBy: ctx.user.id,
      senderName: ctx.staff.name, replyTo: ctx.staff.email || null,
      duplicatedFromId: nl.id,
    }).returning({ id: newsletters.id });
    return { id: row.id };
  }),

  delete: staffProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const nl = await loadEmail(db, input.id);
    assertOwnerOrAdmin(nl, ctx.user.id, ctx.staff);
    if (!EDITABLE.has(nl.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Only drafts can be deleted." });
    await db.delete(newsletters).where(eq(newsletters.id, nl.id));
    return { success: true };
  }),

  /** Per-recipient delivery results for one email. */
  recipients: staffProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => {
    const db = await requireDb();
    return db.select({
      email: emailRecipients.email, name: emailRecipients.name, status: emailRecipients.status,
      error: emailRecipients.error, sentAt: emailRecipients.sentAt,
    }).from(emailRecipients).where(eq(emailRecipients.newsletterId, input.id)).orderBy(emailRecipients.email).limit(5000);
  }),

  /** Images for the email body. Stored publicly so mail clients can load them. */
  uploadImage: staffProcedure
    .input(z.object({ fileName: z.string().max(200), contentType: z.enum(["image/jpeg", "image/png", "image/gif"]), fileData: z.string() }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileData, "base64");
      if (buffer.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "The image is empty." });
      if (buffer.length > EMAIL_IMAGE_MAX_BYTES) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "That image is too large (2.5 MB max after resizing)." });
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
      const isGif = buffer.subarray(0, 4).toString("ascii") === "GIF8";
      const type = isPng ? "image/png" : isJpeg ? "image/jpeg" : isGif ? "image/gif" : null;
      if (!type) throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload a JPG, PNG or GIF image." });
      const ext = type === "image/png" ? "png" : type === "image/gif" ? "gif" : "jpg";
      const base = input.fileName.replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "image";
      try {
        const { url } = await storagePut(`email/${Date.now()}-${base}.${ext}`, buffer, type);
        return { url };
      } catch (err) {
        console.error("[mass-email] image upload failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The image couldn't be saved. Please try again." });
      }
    }),

  settings: router({
    get: staffProcedure.query(async () => getSettings(await requireDb())),
    update: adminStaffProcedure.input(z.object({ requireEmployeeApproval: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.insert(emailSettings).values({ id: 1, requireEmployeeApproval: input.requireEmployeeApproval, updatedBy: ctx.user.id, updatedAt: new Date() })
        .onConflictDoUpdate({ target: emailSettings.id, set: { requireEmployeeApproval: input.requireEmployeeApproval, updatedBy: ctx.user.id, updatedAt: new Date() } });
      return getSettings(db);
    }),
  }),
});
