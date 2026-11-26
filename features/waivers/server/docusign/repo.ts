/**
 * Drizzle (Postgres) implementation of WaiverRepo.
 */
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "@core/server/db";
import { users, members, memberProfiles, waiverTemplates } from "@core/db/schema";
import {
  bookingPartyAdults,
  bookingPartyMinors,
  huntingProperties,
  propertyBookings,
} from "@core/db/property-booking-schema";
import {
  bookingWaiverEnvelopes,
  bookingWaiverSigners,
  memberMasterWaivers,
  waiverSettings,
} from "../../docusignSchema";
import { normalizeUsPhone } from "@shared/waiverParty";
import type {
  BookingInfo, Envelope, MasterWaiver, MemberContact, PartyAdult, PartyMinor, Signer,
  WaiverRepo, WaiverSettings, WaiverTemplateInfo,
} from "./types";

async function db() {
  const d = await getDb();
  if (!d) throw new Error("Database unavailable");
  return d;
}

const DEFAULT_SETTINGS: WaiverSettings = { masterRenewsEvery12Months: false, autoSendMasterOnNewMember: true, memberSignHoldHours: 24 };

function toYmd(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "").slice(0, 10);
}

const bookingCols = {
  id: propertyBookings.id,
  bookingRef: propertyBookings.bookingRef,
  memberId: propertyBookings.memberId,
  userId: propertyBookings.userId,
  propertyId: propertyBookings.propertyId,
  propertyName: huntingProperties.name,
  startDate: propertyBookings.startDate,
  endDate: propertyBookings.endDate,
  status: propertyBookings.status,
  requiresApproval: propertyBookings.requiresApproval,
  createdAt: propertyBookings.createdAt,
  waiverSummarySentAt: propertyBookings.waiverSummarySentAt,
};

function toBooking(r: any): BookingInfo {
  return {
    id: r.id, bookingRef: r.bookingRef, memberId: r.memberId, userId: r.userId, propertyId: r.propertyId,
    propertyName: r.propertyName ?? "Property", startDate: toYmd(r.startDate), endDate: toYmd(r.endDate),
    status: r.status, requiresApproval: !!r.requiresApproval, createdAt: Number(r.createdAt),
    waiverSummarySentAt: r.waiverSummarySentAt ?? null,
  };
}

function toAdult(r: any): PartyAdult {
  return { id: r.id, bookingId: r.bookingId, fullName: r.fullName, email: r.email, phone: r.phone ?? null, isDesignatedMember: !!r.isDesignatedMember, removedAt: r.removedAt ?? null };
}
function toMinor(r: any): PartyMinor {
  return { id: r.id, bookingId: r.bookingId, adultId: r.adultId, fullName: r.fullName, dateOfBirth: r.dateOfBirth ? toYmd(r.dateOfBirth) : null, removedAt: r.removedAt ?? null };
}

export class DrizzleWaiverRepo implements WaiverRepo {
  async getSettings(): Promise<WaiverSettings> {
    const d = await db();
    const [row] = await d.select().from(waiverSettings).where(eq(waiverSettings.id, 1)).limit(1);
    if (!row) return { ...DEFAULT_SETTINGS };
    return { masterRenewsEvery12Months: row.masterRenewsEvery12Months, autoSendMasterOnNewMember: row.autoSendMasterOnNewMember, memberSignHoldHours: row.memberSignHoldHours };
  }

  async updateSettings(patch: Partial<WaiverSettings>, userId: string | null): Promise<WaiverSettings> {
    const d = await db();
    const next = { ...(await this.getSettings()), ...patch };
    await d.insert(waiverSettings).values({ id: 1, ...next, updatedByUserId: userId, updatedAt: Date.now() })
      .onConflictDoUpdate({ target: waiverSettings.id, set: { ...next, updatedByUserId: userId, updatedAt: Date.now() } });
    return next;
  }

  async getCurrentTemplate(kind: "master" | "booking"): Promise<WaiverTemplateInfo | null> {
    const d = await db();
    const [t] = await d.select().from(waiverTemplates)
      .where(and(eq(waiverTemplates.waiverKind, kind), eq(waiverTemplates.active, true), eq(waiverTemplates.archived, false)))
      .orderBy(desc(waiverTemplates.id)).limit(1); // newest active template of this kind is current
    if (!t) return null;
    return { id: t.id, version: t.version, templateName: t.templateName, bodyText: t.bodyText, waiverKind: kind };
  }

  async getMemberContact(memberId: number): Promise<MemberContact | null> {
    const d = await db();
    const [r] = await d.select({
      memberId: members.id, userId: members.userId, email: users.email,
      fullName: memberProfiles.fullName, cellPhone: memberProfiles.cellPhone,
    }).from(members)
      .leftJoin(users, eq(users.id, members.userId))
      .leftJoin(memberProfiles, eq(memberProfiles.memberId, members.id))
      .where(eq(members.id, memberId)).limit(1);
    if (!r) return null;
    return { memberId: r.memberId, userId: r.userId, email: r.email ?? "", fullName: r.fullName ?? null, phone: normalizeUsPhone(r.cellPhone) };
  }

  async listMasterWaivers(memberId: number): Promise<MasterWaiver[]> {
    const d = await db();
    return d.select().from(memberMasterWaivers).where(eq(memberMasterWaivers.memberId, memberId)).orderBy(desc(memberMasterWaivers.id));
  }
  async listMasterWaiversForMembers(memberIds: number[]): Promise<MasterWaiver[]> {
    if (memberIds.length === 0) return [];
    const d = await db();
    return d.select().from(memberMasterWaivers).where(inArray(memberMasterWaivers.memberId, memberIds)).orderBy(desc(memberMasterWaivers.id));
  }
  async listMasterWaiversByStatus(statuses: string[]): Promise<MasterWaiver[]> {
    const d = await db();
    return d.select().from(memberMasterWaivers).where(inArray(memberMasterWaivers.status, statuses)).orderBy(desc(memberMasterWaivers.id)).limit(1000);
  }
  async getMasterWaiver(id: number) {
    const d = await db();
    const [r] = await d.select().from(memberMasterWaivers).where(eq(memberMasterWaivers.id, id)).limit(1);
    return r ?? null;
  }
  async findMasterByEnvelope(envelopeId: string) {
    const d = await db();
    const [r] = await d.select().from(memberMasterWaivers).where(eq(memberMasterWaivers.envelopeId, envelopeId)).limit(1);
    return r ?? null;
  }
  async insertMasterWaiver(values: Omit<MasterWaiver, "id">) {
    const d = await db();
    const [r] = await d.insert(memberMasterWaivers).values(values).returning();
    return r;
  }
  async updateMasterWaiver(id: number, patch: Partial<MasterWaiver>) {
    const d = await db();
    const { id: _ignore, ...rest } = patch;
    await d.update(memberMasterWaivers).set(rest).where(eq(memberMasterWaivers.id, id));
  }

  async getBooking(id: number): Promise<BookingInfo | null> {
    const d = await db();
    const [r] = await d.select(bookingCols).from(propertyBookings)
      .leftJoin(huntingProperties, eq(huntingProperties.id, propertyBookings.propertyId))
      .where(eq(propertyBookings.id, id)).limit(1);
    return r ? toBooking(r) : null;
  }
  async listBookingsByStatus(statuses: string[]): Promise<BookingInfo[]> {
    const d = await db();
    const rows = await d.select(bookingCols).from(propertyBookings)
      .leftJoin(huntingProperties, eq(huntingProperties.id, propertyBookings.propertyId))
      .where(inArray(propertyBookings.status, statuses as any)).limit(2000);
    return rows.map(toBooking);
  }
  async listBookingsStartingBetween(fromDate: string, toDate: string, statuses: string[]): Promise<BookingInfo[]> {
    const d = await db();
    const rows = await d.select(bookingCols).from(propertyBookings)
      .leftJoin(huntingProperties, eq(huntingProperties.id, propertyBookings.propertyId))
      .where(and(
        inArray(propertyBookings.status, statuses as any),
        gte(propertyBookings.startDate, fromDate as any),
        lte(propertyBookings.startDate, toDate as any),
      )).limit(2000);
    return rows.map(toBooking);
  }
  async setBookingWaiverSummarySent(bookingId: number, at: number) {
    const d = await db();
    await d.update(propertyBookings).set({ waiverSummarySentAt: at } as any).where(eq(propertyBookings.id, bookingId));
  }

  async listPartyAdults(bookingId: number) {
    const d = await db();
    const rows = await d.select().from(bookingPartyAdults).where(eq(bookingPartyAdults.bookingId, bookingId)).orderBy(bookingPartyAdults.id);
    return rows.map(toAdult);
  }
  async listPartyMinors(bookingId: number) {
    const d = await db();
    const rows = await d.select().from(bookingPartyMinors).where(eq(bookingPartyMinors.bookingId, bookingId)).orderBy(bookingPartyMinors.id);
    return rows.map(toMinor);
  }
  async insertPartyAdult(values: Omit<PartyAdult, "id" | "removedAt">) {
    const d = await db();
    const now = Date.now();
    const [r] = await d.insert(bookingPartyAdults).values({ ...values, waiverStatus: "pending", createdAt: now, updatedAt: now } as any).returning();
    return toAdult(r);
  }
  async updatePartyAdult(id: number, patch: Record<string, unknown>) {
    const d = await db();
    const { id: _ignore, bookingId: _b, ...rest } = patch as any;
    await d.update(bookingPartyAdults).set({ ...rest, updatedAt: Date.now() }).where(eq(bookingPartyAdults.id, id));
  }
  async insertPartyMinor(values: Omit<PartyMinor, "id" | "removedAt">) {
    const d = await db();
    const [r] = await d.insert(bookingPartyMinors).values({ ...values, createdAt: Date.now() } as any).returning();
    return toMinor(r);
  }
  async updatePartyMinor(id: number, patch: Partial<PartyMinor>) {
    const d = await db();
    const { id: _ignore, ...rest } = patch;
    await d.update(bookingPartyMinors).set(rest as any).where(eq(bookingPartyMinors.id, id));
  }

  async listSigners(bookingId: number): Promise<Signer[]> {
    const d = await db();
    return d.select().from(bookingWaiverSigners).where(eq(bookingWaiverSigners.bookingId, bookingId)).orderBy(bookingWaiverSigners.id);
  }
  async listSignersByEnvelopeRow(envelopeRowId: number): Promise<Signer[]> {
    const d = await db();
    return d.select().from(bookingWaiverSigners).where(eq(bookingWaiverSigners.envelopeRowId, envelopeRowId)).orderBy(bookingWaiverSigners.id);
  }
  async getSigner(id: number) {
    const d = await db();
    const [r] = await d.select().from(bookingWaiverSigners).where(eq(bookingWaiverSigners.id, id)).limit(1);
    return r ?? null;
  }
  async insertSigner(values: Omit<Signer, "id">) {
    const d = await db();
    const [r] = await d.insert(bookingWaiverSigners).values(values).returning();
    return r;
  }
  async updateSigner(id: number, patch: Partial<Signer>) {
    const d = await db();
    const { id: _ignore, ...rest } = patch;
    await d.update(bookingWaiverSigners).set(rest).where(eq(bookingWaiverSigners.id, id));
  }

  async listEnvelopes(bookingId: number): Promise<Envelope[]> {
    const d = await db();
    return d.select().from(bookingWaiverEnvelopes).where(eq(bookingWaiverEnvelopes.bookingId, bookingId)).orderBy(bookingWaiverEnvelopes.id);
  }
  async listEnvelopesByStatus(statuses: string[]): Promise<Envelope[]> {
    const d = await db();
    return d.select().from(bookingWaiverEnvelopes).where(inArray(bookingWaiverEnvelopes.status, statuses)).limit(1000);
  }
  async getEnvelope(id: number) {
    const d = await db();
    const [r] = await d.select().from(bookingWaiverEnvelopes).where(eq(bookingWaiverEnvelopes.id, id)).limit(1);
    return r ?? null;
  }
  async findEnvelopeByDsId(envelopeId: string) {
    const d = await db();
    const [r] = await d.select().from(bookingWaiverEnvelopes).where(eq(bookingWaiverEnvelopes.envelopeId, envelopeId)).limit(1);
    return r ?? null;
  }
  async insertEnvelope(values: Omit<Envelope, "id">) {
    const d = await db();
    const [r] = await d.insert(bookingWaiverEnvelopes).values(values).returning();
    return r;
  }
  async updateEnvelope(id: number, patch: Partial<Envelope>) {
    const d = await db();
    const { id: _ignore, ...rest } = patch;
    await d.update(bookingWaiverEnvelopes).set(rest).where(eq(bookingWaiverEnvelopes.id, id));
  }
}
