/**
 * tRPC: waivers.docusign.*
 *
 * Member (signed-in, own data only):
 *   config, myMasterStatus, sendMyMasterWaiver, currentBookingWaiver,
 *   bookingWaivers, resendSigner, editSigner, addGuest, removeGuest, removeMinor
 * Ops (admin only):
 *   overview, settings, updateSettings, list, bookingDetail, bookingSummaries,
 *   memberMaster, memberMasterStatuses, sendMaster, requireResign,
 *   opsResendSigner, opsEditSigner, syncBooking, downloadUrl
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { router, protectedProcedure } from "@core/server/trpc";
import { getDb } from "@core/server/db";
import { storageGetSignedUrl } from "@core/server/storage";
import { members, users } from "@core/db/schema";
import { huntingProperties, propertyBookings } from "@core/db/property-booking-schema";
import { propertyCapacity } from "@shared/propertyRules";
import { normalizeUsPhone } from "@shared/waiverParty";
import { bookingWaiverSigners, memberMasterWaivers, bookingWaiverEnvelopes } from "../../docusignSchema";
import { connectHmacSecret, getDocuSignConfig, isWaiversDocuSignEnabled, missingDocuSignEnv } from "./config";
import { getWaiverService } from "./runtime";
import { WaiverActionError, type SendResult } from "./service";
import { DrizzleWaiverRepo } from "./repo";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

async function db() {
  const d = await getDb();
  if (!d) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  return d;
}

async function memberIdFor(userId: string): Promise<number> {
  const d = await db();
  const [m] = await d.select({ id: members.id, active: members.active }).from(members).where(eq(members.userId, userId)).limit(1);
  if (!m) throw new TRPCError({ code: "FORBIDDEN", message: "Active membership required." });
  return m.id;
}

/** Member may only touch their own bookings. */
async function assertOwnBooking(userId: string, bookingId: number): Promise<number> {
  const memberId = await memberIdFor(userId);
  const d = await db();
  const [b] = await d.select({ id: propertyBookings.id }).from(propertyBookings)
    .where(and(eq(propertyBookings.id, bookingId), eq(propertyBookings.memberId, memberId))).limit(1);
  if (!b) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });
  return memberId;
}

/** Turn user-facing waiver errors into a result the UI can show (with "Send by email only"). */
async function asResult<T extends SendResult>(fn: () => Promise<T>): Promise<T | SendResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof WaiverActionError) return { ok: false, error: err.message, canEmailOnly: err.canEmailOnly };
    throw err;
  }
}

async function orThrow<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof WaiverActionError) throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
    throw err;
  }
}

function masterSummary(s: Awaited<ReturnType<ReturnType<typeof getWaiverService>["masterStatus"]>>) {
  const c = s.current;
  return {
    enabled: s.enabled,
    required: s.required,
    valid: s.valid,
    state: s.state,
    template: s.template,
    current: c ? { id: c.id, status: c.status, sentAt: c.sentAt, signedAt: c.signedAt, lastError: c.lastError, deliveryMethod: c.deliveryMethod, templateVersion: c.templateVersion } : null,
    signed: s.signed ? { id: s.signed.id, signedAt: s.signed.signedAt, templateVersion: s.signed.templateVersion, invalidatedAt: s.signed.invalidatedAt, hasPdf: !!s.signed.signedPdfKey, hasCertificate: !!s.signed.certificatePdfKey } : null,
  };
}

/** Keep property_bookings.partySize / guestNames in step with the roster. */
async function syncPartySize(bookingId: number) {
  const repo = new DrizzleWaiverRepo();
  const [adults, minors] = await Promise.all([repo.listPartyAdults(bookingId), repo.listPartyMinors(bookingId)]);
  const a = adults.filter((x) => !x.removedAt);
  const m = minors.filter((x) => !x.removedAt);
  const d = await db();
  await d.update(propertyBookings).set({
    partySize: Math.max(1, a.length + m.length),
    guestNames: [...a.filter((x) => !x.isDesignatedMember).map((x) => x.fullName), ...m.map((x) => x.fullName)],
    hasMinors: m.length > 0,
    updatedAt: Date.now(),
  } as any).where(eq(propertyBookings.id, bookingId));
}

async function assertCapacityForOneMore(bookingId: number) {
  const d = await db();
  const [row] = await d.select({ maxGuests: huntingProperties.maxGuests, maxHunters: huntingProperties.maxHunters })
    .from(propertyBookings).leftJoin(huntingProperties, eq(huntingProperties.id, propertyBookings.propertyId))
    .where(eq(propertyBookings.id, bookingId)).limit(1);
  const capacity = propertyCapacity(row) ?? (row?.maxHunters || null);
  if (!capacity) return;
  const repo = new DrizzleWaiverRepo();
  const [adults, minors] = await Promise.all([repo.listPartyAdults(bookingId), repo.listPartyMinors(bookingId)]);
  const size = adults.filter((x) => !x.removedAt).length + minors.filter((x) => !x.removedAt).length;
  if (size + 1 > capacity) throw new TRPCError({ code: "BAD_REQUEST", message: `This property allows a maximum of ${capacity} ${capacity === 1 ? "person" : "people"}.` });
}

const guestInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("adult"), fullName: z.string().trim().min(1).max(255), email: z.string().trim().max(320), phone: z.string().max(30) }),
  z.object({ type: z.literal("minor"), fullName: z.string().trim().min(1).max(255), dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), guardianAdultId: z.number().int().positive() }),
]);

const signerPatch = z.object({
  fullName: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().max(320).optional(),
  phone: z.string().max(30).optional(),
});

export const docusignWaiversRouter = router({
  // ── Member ────────────────────────────────────────────────────────────────

  config: protectedProcedure.query(() => ({ enabled: isWaiversDocuSignEnabled() })),

  myMasterStatus: protectedProcedure.query(async ({ ctx }) => {
    const d = await db();
    const [m] = await d.select({ id: members.id }).from(members).where(eq(members.userId, ctx.user.id)).limit(1);
    if (!m) return { isMember: false as const, enabled: isWaiversDocuSignEnabled() };
    const svc = getWaiverService();
    const [status, contact] = await Promise.all([svc.masterStatus(m.id), new DrizzleWaiverRepo().getMemberContact(m.id)]);
    return {
      isMember: true as const,
      ...masterSummary(status),
      contact: { fullName: contact?.fullName ?? "", email: contact?.email ?? ctx.user.email, phone: contact?.phone ?? "" },
    };
  }),

  sendMyMasterWaiver: protectedProcedure
    .input(z.object({ emailOnly: z.boolean().optional(), fullName: z.string().max(255).optional(), phone: z.string().max(30).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const memberId = await memberIdFor(ctx.user.id);
      return asResult(() => getWaiverService().sendMasterWaiver(memberId, input ?? {}));
    }),

  /** Read-only view of the current Booking waiver (linked from the booking checkbox). */
  currentBookingWaiver: protectedProcedure.query(async () => {
    const t = await new DrizzleWaiverRepo().getCurrentTemplate("booking");
    return t ? { id: t.id, version: t.version, title: t.templateName, body: t.bodyText } : null;
  }),

  bookingWaivers: protectedProcedure
    .input(z.object({ bookingId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await assertOwnBooking(ctx.user.id, input.bookingId);
      const view = await getWaiverService().bookingWaiverView(input.bookingId);
      if (!view) throw new TRPCError({ code: "NOT_FOUND" });
      return { enabled: isWaiversDocuSignEnabled(), ...view };
    }),

  resendSigner: protectedProcedure
    .input(z.object({ bookingId: z.number().int().positive(), signerId: z.number().int().positive(), emailOnly: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnBooking(ctx.user.id, input.bookingId);
      const s = await new DrizzleWaiverRepo().getSigner(input.signerId);
      if (!s || s.bookingId !== input.bookingId) throw new TRPCError({ code: "NOT_FOUND" });
      return asResult(() => getWaiverService().resendSigner(input.signerId, { emailOnly: input.emailOnly }));
    }),

  editSigner: protectedProcedure
    .input(z.object({ bookingId: z.number().int().positive(), signerId: z.number().int().positive() }).merge(signerPatch))
    .mutation(async ({ ctx, input }) => {
      await assertOwnBooking(ctx.user.id, input.bookingId);
      const s = await new DrizzleWaiverRepo().getSigner(input.signerId);
      if (!s || s.bookingId !== input.bookingId) throw new TRPCError({ code: "NOT_FOUND" });
      if (s.role === "member" && input.email !== undefined && input.email.trim().toLowerCase() !== s.email.toLowerCase()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Your own waiver goes to your account email." });
      }
      const { bookingId: _b, signerId, ...patch } = input;
      return asResult(() => getWaiverService().editSigner(signerId, patch));
    }),

  addGuest: protectedProcedure
    .input(z.object({ bookingId: z.number().int().positive(), guest: guestInput }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnBooking(ctx.user.id, input.bookingId);
      await assertCapacityForOneMore(input.bookingId);
      const svc = getWaiverService();
      const r = input.guest.type === "adult"
        ? await asResult(() => svc.addAdultGuest(input.bookingId, input.guest as any))
        : await asResult(() => svc.addMinor(input.bookingId, input.guest as any));
      await syncPartySize(input.bookingId);
      return r;
    }),

  removeGuest: protectedProcedure
    .input(z.object({ bookingId: z.number().int().positive(), partyAdultId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnBooking(ctx.user.id, input.bookingId);
      await orThrow(() => getWaiverService().removeGuest(input.bookingId, input.partyAdultId));
      await syncPartySize(input.bookingId);
      return { success: true };
    }),

  removeMinor: protectedProcedure
    .input(z.object({ bookingId: z.number().int().positive(), minorId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnBooking(ctx.user.id, input.bookingId);
      await orThrow(() => getWaiverService().removeMinor(input.bookingId, input.minorId));
      await syncPartySize(input.bookingId);
      return { success: true };
    }),

  // ── Ops ───────────────────────────────────────────────────────────────────

  overview: adminProcedure.query(async () => {
    const repo = new DrizzleWaiverRepo();
    const [master, booking, settings] = await Promise.all([repo.getCurrentTemplate("master"), repo.getCurrentTemplate("booking"), repo.getSettings()]);
    const cfg = getDocuSignConfig();
    return {
      enabled: isWaiversDocuSignEnabled(),
      docusignConfigured: !!cfg,
      environment: cfg ? (cfg.basePath.includes("demo.docusign.net") ? "demo" : "production") : null,
      missingEnv: missingDocuSignEnv(),
      connectConfigured: !!connectHmacSecret(),
      masterTemplate: master ? { id: master.id, version: master.version, title: master.templateName } : null,
      bookingTemplate: booking ? { id: booking.id, version: booking.version, title: booking.templateName } : null,
      settings,
    };
  }),

  updateSettings: adminProcedure
    .input(z.object({
      masterRenewsEvery12Months: z.boolean().optional(),
      autoSendMasterOnNewMember: z.boolean().optional(),
      memberSignHoldHours: z.number().int().min(1).max(168).optional(),
    }))
    .mutation(async ({ ctx, input }) => new DrizzleWaiverRepo().updateSettings(input, ctx.user.id)),

  list: adminProcedure
    .input(z.object({
      type: z.enum(["all", "master", "booking"]).default("all"),
      status: z.string().max(16).optional(),
      search: z.string().max(100).optional(),
    }).optional())
    .query(async ({ input }) => {
      const d = await db();
      const type = input?.type ?? "all";
      const status = input?.status && input.status !== "all" ? input.status : null;
      const q = input?.search?.trim() ? `%${input.search.trim()}%` : null;
      type Row = { type: "master" | "booking"; id: number; name: string; email: string; status: string; sentAt: number | null; signedAt: number | null; createdAt: number; memberId: number | null; bookingId: number | null; bookingRef: string | null; startDate: string | null; templateVersion: number | null; hasPdf: boolean; lastError: string | null; role: string | null };
      const rows: Row[] = [];
      if (type !== "booking") {
        const conds = [];
        if (status) conds.push(eq(memberMasterWaivers.status, status));
        if (q) conds.push(or(ilike(memberMasterWaivers.signerName, q), ilike(memberMasterWaivers.signerEmail, q)));
        const ms = await d.select().from(memberMasterWaivers).where(conds.length ? and(...conds) : undefined).orderBy(desc(memberMasterWaivers.id)).limit(200);
        for (const m of ms) rows.push({ type: "master", id: m.id, name: m.signerName, email: m.signerEmail, status: m.invalidatedAt ? "resign_required" : m.status, sentAt: m.sentAt, signedAt: m.signedAt, createdAt: m.createdAt, memberId: m.memberId, bookingId: null, bookingRef: null, startDate: null, templateVersion: m.templateVersion, hasPdf: !!m.signedPdfKey, lastError: m.lastError, role: "member" });
      }
      if (type !== "master") {
        const conds = [];
        if (status) conds.push(eq(bookingWaiverSigners.status, status));
        if (q) conds.push(or(ilike(bookingWaiverSigners.fullName, q), ilike(bookingWaiverSigners.email, q), ilike(propertyBookings.bookingRef, q)));
        const ss = await d.select({ s: bookingWaiverSigners, bookingRef: propertyBookings.bookingRef, startDate: propertyBookings.startDate, memberId: propertyBookings.memberId })
          .from(bookingWaiverSigners).leftJoin(propertyBookings, eq(propertyBookings.id, bookingWaiverSigners.bookingId))
          .where(conds.length ? and(...conds) : undefined).orderBy(desc(bookingWaiverSigners.id)).limit(300);
        for (const { s, bookingRef, startDate, memberId } of ss) rows.push({ type: "booking", id: s.id, name: s.fullName, email: s.email, status: s.removedAt ? "removed" : s.status, sentAt: s.sentAt, signedAt: s.signedAt, createdAt: s.createdAt, memberId: memberId ?? null, bookingId: s.bookingId, bookingRef: bookingRef ?? null, startDate: startDate ? String(startDate).slice(0, 10) : null, templateVersion: s.templateVersion, hasPdf: !!s.signedPdfKey, lastError: s.lastError, role: s.role });
      }
      rows.sort((a, b) => b.createdAt - a.createdAt);
      return rows.slice(0, 400);
    }),

  bookingDetail: adminProcedure
    .input(z.object({ bookingId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const svc = getWaiverService();
      const view = await svc.bookingWaiverView(input.bookingId);
      if (!view) throw new TRPCError({ code: "NOT_FOUND" });
      const master = masterSummary(await svc.masterStatus(view.booking.memberId));
      return { enabled: isWaiversDocuSignEnabled(), ...view, master };
    }),

  /** "Waivers: 3 of 5 signed" for booking lists. */
  bookingSummaries: adminProcedure
    .input(z.object({ bookingIds: z.array(z.number().int().positive()).max(500) }))
    .query(async ({ input }) => {
      if (input.bookingIds.length === 0) return {} as Record<number, { signed: number; total: number }>;
      const svc = getWaiverService();
      const out: Record<number, { signed: number; total: number }> = {};
      for (const id of input.bookingIds) {
        const v = await svc.bookingWaiverView(id);
        if (v) out[id] = { signed: v.signedCount, total: v.totalAdults };
      }
      return out;
    }),

  /** Bookings that have booking waivers (upcoming first), with "x of y signed". */
  bookingsWithWaivers: adminProcedure
    .input(z.object({ includePast: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const d = await db();
      const today = new Date().toISOString().slice(0, 10);
      const ids = await d.selectDistinct({ id: bookingWaiverSigners.bookingId }).from(bookingWaiverSigners).limit(2000);
      if (ids.length === 0) return [];
      const rows = await d.select({
        id: propertyBookings.id, bookingRef: propertyBookings.bookingRef, status: propertyBookings.status,
        startDate: propertyBookings.startDate, endDate: propertyBookings.endDate, memberId: propertyBookings.memberId,
        propertyName: huntingProperties.name,
      }).from(propertyBookings).leftJoin(huntingProperties, eq(huntingProperties.id, propertyBookings.propertyId))
        .where(inArray(propertyBookings.id, ids.map((r) => r.id)));
      const ymd = (v: unknown) => String(v instanceof Date ? v.toISOString() : v ?? "").slice(0, 10);
      const list = rows
        .map((r) => ({ ...r, startDate: ymd(r.startDate), endDate: ymd(r.endDate) }))
        .filter((r) => input?.includePast || r.endDate >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 150);
      const svc = getWaiverService();
      const out = [];
      for (const r of list) {
        const v = await svc.bookingWaiverView(r.id);
        out.push({ ...r, signed: v?.signedCount ?? 0, total: v?.totalAdults ?? 0, memberName: v?.people.find((p) => p.role === "member")?.fullName ?? "" });
      }
      return out;
    }),

  memberMaster: adminProcedure
    .input(z.object({ memberId: z.number().int().positive() }))
    .query(async ({ input }) => masterSummary(await getWaiverService().masterStatus(input.memberId))),

  memberMasterStatuses: adminProcedure
    .input(z.object({ memberIds: z.array(z.number().int().positive()).max(500) }))
    .query(async ({ input }) => getWaiverService().masterStatesFor(input.memberIds)),

  sendMaster: adminProcedure
    .input(z.object({ memberId: z.number().int().positive(), emailOnly: z.boolean().optional() }))
    .mutation(async ({ input }) => asResult(() => getWaiverService().sendMasterWaiver(input.memberId, { emailOnly: input.emailOnly }))),

  requireResign: adminProcedure
    .input(z.object({ memberId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => asResult(() => getWaiverService().requireMasterResign(input.memberId, ctx.user.id))),

  opsResendSigner: adminProcedure
    .input(z.object({ signerId: z.number().int().positive(), emailOnly: z.boolean().optional() }))
    .mutation(async ({ input }) => asResult(() => getWaiverService().resendSigner(input.signerId, { emailOnly: input.emailOnly }))),

  opsEditSigner: adminProcedure
    .input(z.object({ signerId: z.number().int().positive() }).merge(signerPatch))
    .mutation(async ({ input }) => {
      const { signerId, ...patch } = input;
      if (patch.phone !== undefined && patch.phone !== "" && !normalizeUsPhone(patch.phone)) return { ok: false, error: "Enter a valid US mobile number." };
      return asResult(() => getWaiverService().editSigner(signerId, patch));
    }),

  /** Pull the latest status from DocuSign for one booking (ops "Refresh"). */
  syncBooking: adminProcedure
    .input(z.object({ bookingId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const svc = getWaiverService();
      const repo = new DrizzleWaiverRepo();
      const envs = (await repo.listEnvelopes(input.bookingId)).filter((e) => e.status === "sent" && e.envelopeId);
      let synced = 0;
      for (const e of envs) {
        await svc.syncEnvelopeNow(e.envelopeId!);
        synced++;
      }
      const memberId = (await repo.getBooking(input.bookingId))?.memberId;
      if (memberId) {
        for (const m of await repo.listMasterWaivers(memberId)) {
          if (m.envelopeId && ["sent", "viewed", "declined"].includes(m.status)) { await svc.syncEnvelopeNow(m.envelopeId); synced++; }
        }
      }
      return { synced };
    }),

  downloadUrl: adminProcedure
    .input(z.object({ kind: z.enum(["master", "signer", "envelope"]), id: z.number().int().positive(), doc: z.enum(["signed", "certificate"]) }))
    .mutation(async ({ input }) => {
      const d = await db();
      let key: string | null = null;
      if (input.kind === "master") {
        const [m] = await d.select().from(memberMasterWaivers).where(eq(memberMasterWaivers.id, input.id)).limit(1);
        key = input.doc === "signed" ? m?.signedPdfKey ?? null : m?.certificatePdfKey ?? null;
      } else if (input.kind === "signer") {
        const [s] = await d.select().from(bookingWaiverSigners).where(eq(bookingWaiverSigners.id, input.id)).limit(1);
        key = input.doc === "signed" ? s?.signedPdfKey ?? null : s?.certificatePdfKey ?? null;
      } else {
        const [e] = await d.select().from(bookingWaiverEnvelopes).where(eq(bookingWaiverEnvelopes.id, input.id)).limit(1);
        key = e?.certificatePdfKey ?? null;
      }
      if (!key) throw new TRPCError({ code: "NOT_FOUND", message: "That document hasn't been stored yet." });
      return { url: await storageGetSignedUrl(key) };
    }),

  /** Ops: member emails for a list of member IDs (used by ops pages to label rows). */
  memberEmails: adminProcedure
    .input(z.object({ memberIds: z.array(z.number().int().positive()).max(500) }))
    .query(async ({ input }) => {
      if (input.memberIds.length === 0) return {} as Record<number, string>;
      const d = await db();
      const rows = await d.select({ id: members.id, email: users.email }).from(members).leftJoin(users, eq(users.id, members.userId)).where(inArray(members.id, input.memberIds));
      return Object.fromEntries(rows.map((r) => [r.id, r.email ?? ""])) as Record<number, string>;
    }),
});
