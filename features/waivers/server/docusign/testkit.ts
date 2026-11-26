/**
 * Test helpers: in-memory WaiverRepo, a mocked DocuSign API and a fake
 * booking lifecycle. Used only by *.test.ts files.
 */
import { DocuSignError, type DocuSignApi, type DsEnvelopeDefinition, type DsSigner, type DsSignerStatus } from "./api";
import { WaiverService } from "./service";
import type {
  BookingInfo, BookingLifecycle, Envelope, MasterWaiver, MemberContact, PartyAdult, PartyMinor,
  Signer, WaiverRepo, WaiverSettings, WaiverTemplateInfo,
} from "./types";

export class MemoryRepo implements WaiverRepo {
  settings: WaiverSettings = { masterRenewsEvery12Months: false, autoSendMasterOnNewMember: true, memberSignHoldHours: 24 };
  templates: Record<"master" | "booking", WaiverTemplateInfo | null> = {
    master: { id: 1, version: 1, templateName: "Master Waiver", bodyText: "Master waiver text.", waiverKind: "master" },
    booking: { id: 2, version: 1, templateName: "Rivers Lodge Release & Liability Waiver", bodyText: "Booking waiver text.", waiverKind: "booking" },
  };
  contacts = new Map<number, MemberContact>();
  masters: MasterWaiver[] = [];
  bookings = new Map<number, BookingInfo>();
  adults: PartyAdult[] = [];
  minors: PartyMinor[] = [];
  signers: Signer[] = [];
  envelopes: Envelope[] = [];
  adultExtra = new Map<number, Record<string, unknown>>();
  private seq = 100;
  private nextId() { return ++this.seq; }

  async getSettings() { return { ...this.settings }; }
  async updateSettings(patch: Partial<WaiverSettings>) { this.settings = { ...this.settings, ...patch }; return { ...this.settings }; }
  async getCurrentTemplate(kind: "master" | "booking") { return this.templates[kind]; }
  async getMemberContact(memberId: number) { return this.contacts.get(memberId) ?? null; }

  async listMasterWaivers(memberId: number) { return this.masters.filter((m) => m.memberId === memberId).sort((a, b) => b.id - a.id).map((m) => ({ ...m })); }
  async listMasterWaiversForMembers(ids: number[]) { return this.masters.filter((m) => ids.includes(m.memberId)).map((m) => ({ ...m })); }
  async listMasterWaiversByStatus(st: string[]) { return this.masters.filter((m) => st.includes(m.status)).map((m) => ({ ...m })); }
  async getMasterWaiver(id: number) { const m = this.masters.find((x) => x.id === id); return m ? { ...m } : null; }
  async findMasterByEnvelope(e: string) { const m = this.masters.find((x) => x.envelopeId === e); return m ? { ...m } : null; }
  async insertMasterWaiver(v: Omit<MasterWaiver, "id">) { const r = { ...v, id: this.nextId() }; this.masters.push(r); return { ...r }; }
  async updateMasterWaiver(id: number, patch: Partial<MasterWaiver>) { const m = this.masters.find((x) => x.id === id)!; Object.assign(m, patch); }

  async getBooking(id: number) { const b = this.bookings.get(id); return b ? { ...b } : null; }
  async listBookingsByStatus(st: string[]) { return Array.from(this.bookings.values()).filter((b) => st.includes(b.status)).map((b) => ({ ...b })); }
  async listBookingsStartingBetween(from: string, to: string, st: string[]) {
    return Array.from(this.bookings.values()).filter((b) => st.includes(b.status) && b.startDate >= from && b.startDate <= to).map((b) => ({ ...b }));
  }
  async setBookingWaiverSummarySent(id: number, at: number) { this.bookings.get(id)!.waiverSummarySentAt = at; }

  async listPartyAdults(bookingId: number) { return this.adults.filter((a) => a.bookingId === bookingId).map((a) => ({ ...a })); }
  async listPartyMinors(bookingId: number) { return this.minors.filter((a) => a.bookingId === bookingId).map((a) => ({ ...a })); }
  async insertPartyAdult(v: Omit<PartyAdult, "id" | "removedAt">) { const r = { ...v, id: this.nextId(), removedAt: null }; this.adults.push(r); return { ...r }; }
  async updatePartyAdult(id: number, patch: Record<string, unknown>) {
    const a = this.adults.find((x) => x.id === id)!;
    const { waiverStatus, waiverEnvelopeId, waiverSentAt, waiverCompletedAt, updatedAt, ...rest } = patch as any;
    Object.assign(a, rest);
    this.adultExtra.set(id, { ...(this.adultExtra.get(id) ?? {}), ...Object.fromEntries(Object.entries({ waiverStatus, waiverEnvelopeId, waiverSentAt, waiverCompletedAt }).filter(([, v]) => v !== undefined)) });
  }
  async insertPartyMinor(v: Omit<PartyMinor, "id" | "removedAt">) { const r = { ...v, id: this.nextId(), removedAt: null }; this.minors.push(r); return { ...r }; }
  async updatePartyMinor(id: number, patch: Partial<PartyMinor>) { Object.assign(this.minors.find((x) => x.id === id)!, patch); }

  async listSigners(bookingId: number) { return this.signers.filter((s) => s.bookingId === bookingId).map((s) => ({ ...s, minors: [...s.minors] })); }
  async listSignersByEnvelopeRow(rowId: number) { return this.signers.filter((s) => s.envelopeRowId === rowId).map((s) => ({ ...s })); }
  async getSigner(id: number) { const s = this.signers.find((x) => x.id === id); return s ? { ...s } : null; }
  async insertSigner(v: Omit<Signer, "id">) { const r = { ...v, id: this.nextId() }; this.signers.push(r); return { ...r }; }
  async updateSigner(id: number, patch: Partial<Signer>) { Object.assign(this.signers.find((x) => x.id === id)!, patch); }

  async listEnvelopes(bookingId: number) { return this.envelopes.filter((e) => e.bookingId === bookingId).map((e) => ({ ...e })); }
  async listEnvelopesByStatus(st: string[]) { return this.envelopes.filter((e) => st.includes(e.status)).map((e) => ({ ...e })); }
  async getEnvelope(id: number) { const e = this.envelopes.find((x) => x.id === id); return e ? { ...e } : null; }
  async findEnvelopeByDsId(ds: string) { const e = this.envelopes.find((x) => x.envelopeId === ds); return e ? { ...e } : null; }
  async insertEnvelope(v: Omit<Envelope, "id">) { const r = { ...v, id: this.nextId() }; this.envelopes.push(r); return { ...r }; }
  async updateEnvelope(id: number, patch: Partial<Envelope>) { Object.assign(this.envelopes.find((x) => x.id === id)!, patch); }

  // ── Fixtures ──
  addMember(memberId: number, contact: Partial<MemberContact> = {}) {
    this.contacts.set(memberId, { memberId, userId: `user-${memberId}`, email: `member${memberId}@example.com`, fullName: `Member ${memberId}`, phone: "8165550100", ...contact });
  }

  /** A pending_waiver booking with the member + adults (each with optional minors). */
  addBooking(opts: {
    id: number; memberId: number; startDate?: string; endDate?: string; createdAt?: number; status?: string; requiresApproval?: boolean;
    guests?: Array<{ fullName: string; email: string; phone: string | null; minors?: Array<{ fullName: string; dateOfBirth: string }> }>;
    memberMinors?: Array<{ fullName: string; dateOfBirth: string }>;
  }) {
    const b: BookingInfo = {
      id: opts.id, bookingRef: `RL-2026-${String(opts.id).padStart(5, "0")}`, memberId: opts.memberId, userId: `user-${opts.memberId}`,
      propertyId: 7, propertyName: "North Marsh", startDate: opts.startDate ?? "2026-12-20", endDate: opts.endDate ?? opts.startDate ?? "2026-12-20",
      status: opts.status ?? "pending_waiver", requiresApproval: !!opts.requiresApproval, createdAt: opts.createdAt ?? 0, waiverSummarySentAt: null,
    };
    this.bookings.set(b.id, b);
    const c = this.contacts.get(opts.memberId)!;
    const member = { id: this.nextId(), bookingId: b.id, fullName: c.fullName ?? "Member", email: c.email, phone: c.phone, isDesignatedMember: true, removedAt: null };
    this.adults.push(member);
    for (const m of opts.memberMinors ?? []) this.minors.push({ id: this.nextId(), bookingId: b.id, adultId: member.id, fullName: m.fullName, dateOfBirth: m.dateOfBirth, removedAt: null });
    for (const g of opts.guests ?? []) {
      const a = { id: this.nextId(), bookingId: b.id, fullName: g.fullName, email: g.email, phone: g.phone, isDesignatedMember: false, removedAt: null };
      this.adults.push(a);
      for (const m of g.minors ?? []) this.minors.push({ id: this.nextId(), bookingId: b.id, adultId: a.id, fullName: m.fullName, dateOfBirth: m.dateOfBirth, removedAt: null });
    }
    return b;
  }
}

/** Mocked DocuSign. Records every call; envelopes/recipients are tracked in memory. */
export class MockDocuSign implements DocuSignApi {
  created: Array<{ envelopeId: string; def: DsEnvelopeDefinition }> = [];
  voided: Array<{ envelopeId: string; reason: string }> = [];
  deleted: Array<{ envelopeId: string; recipientId: string }> = [];
  updates: Array<{ envelopeId: string; signers: Array<Partial<DsSigner> & { recipientId: string }>; resend: boolean }> = [];
  resends: Array<{ envelopeId: string; recipientIds: string[] }> = [];
  docsFetched: Array<{ envelopeId: string; documentId: string }> = [];
  status = new Map<string, { status: string; signers: DsSignerStatus[] }>();
  /** Set to make the next createEnvelope calls fail. */
  failCreate: DocuSignError | null = null;
  failUpdate: DocuSignError | null = null;
  private n = 0;

  async createEnvelope(def: DsEnvelopeDefinition) {
    if (this.failCreate) throw this.failCreate;
    const envelopeId = `env-${++this.n}`;
    this.created.push({ envelopeId, def });
    this.status.set(envelopeId, { status: "sent", signers: def.recipients.signers.map((s) => ({ recipientId: s.recipientId, status: "sent" })) });
    return { envelopeId };
  }
  async getEnvelopeStatus(envelopeId: string) {
    const s = this.status.get(envelopeId);
    if (!s) throw new DocuSignError("ENVELOPE_DOES_NOT_EXIST", 404, "ENVELOPE_DOES_NOT_EXIST");
    return { status: s.status, signers: s.signers.map((x) => ({ ...x })) };
  }
  async updateRecipients(envelopeId: string, signers: Array<Partial<DsSigner> & { recipientId: string }>, opts: { resend: boolean }) {
    if (this.failUpdate) throw this.failUpdate;
    this.updates.push({ envelopeId, signers, resend: opts.resend });
  }
  async resendRecipients(envelopeId: string, recipientIds: string[]) { this.resends.push({ envelopeId, recipientIds }); }
  async deleteRecipient(envelopeId: string, recipientId: string) {
    this.deleted.push({ envelopeId, recipientId });
    const s = this.status.get(envelopeId);
    if (s) s.signers = s.signers.filter((x) => x.recipientId !== recipientId);
  }
  async voidEnvelope(envelopeId: string, reason: string) {
    this.voided.push({ envelopeId, reason });
    const s = this.status.get(envelopeId);
    if (s) s.status = "voided";
  }
  async getDocument(envelopeId: string, documentId: string) {
    this.docsFetched.push({ envelopeId, documentId });
    return Buffer.from(`%PDF ${envelopeId}/${documentId}`);
  }

  /** Simulate a recipient signing (updates envelope status to completed when all signed). */
  sign(envelopeId: string, recipientId: string, at = "2026-12-01T15:00:00Z") {
    const s = this.status.get(envelopeId)!;
    const r = s.signers.find((x) => x.recipientId === recipientId)!;
    r.status = "completed";
    r.signedDateTime = at;
    if (s.signers.every((x) => x.status === "completed")) s.status = "completed";
    return { status: s.status, signers: s.signers.map((x) => ({ ...x })) };
  }
}

export class FakeLifecycle implements BookingLifecycle {
  constructor(private repo: MemoryRepo) {}
  confirmed: number[] = [];
  expired: number[] = [];
  async confirmAfterMemberSigned(bookingId: number) {
    const b = this.repo.bookings.get(bookingId)!;
    if (b.status !== "pending_waiver") return "noop" as const;
    b.status = b.requiresApproval ? "pending_approval" : "confirmed";
    this.confirmed.push(bookingId);
    return b.status as "confirmed" | "pending_approval";
  }
  async expireForUnsignedWaiver(bookingId: number) {
    const b = this.repo.bookings.get(bookingId)!;
    if (b.status !== "pending_waiver") return false;
    b.status = "expired_waiver";
    this.expired.push(bookingId);
    return true;
  }
}

export function makeService(opts: { enabled?: boolean; connect?: boolean; now?: () => number; api?: MockDocuSign | null } = {}) {
  const repo = new MemoryRepo();
  const ds = opts.api === undefined ? new MockDocuSign() : opts.api;
  const lifecycle = new FakeLifecycle(repo);
  const emails: Array<{ to: string; subject: string; paragraphs: string[] }> = [];
  const stored: string[] = [];
  let clock = Date.parse("2026-12-01T12:00:00Z");
  const svc = new WaiverService({
    repo,
    api: () => ds,
    lifecycle,
    enabled: () => opts.enabled ?? true,
    connectConfigured: () => !!opts.connect,
    now: opts.now ?? (() => clock),
    notifier: { email: async (to, subject, paragraphs) => { emails.push({ to, subject, paragraphs }); return true; }, opsEmail: () => "ops@example.com" },
    storage: { putPdf: async (key) => { stored.push(key); return key; } },
  });
  return { svc, repo, ds: ds as MockDocuSign, lifecycle, emails, stored, setNow: (ms: number) => { clock = ms; }, now: () => clock };
}
