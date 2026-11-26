/**
 * Types + the storage interface the waiver service depends on.
 * Production: DrizzleWaiverRepo (repo.ts). Tests: an in-memory repo.
 */
import type {
  BookingWaiverEnvelopeRow,
  BookingWaiverSignerRow,
  MemberMasterWaiverRow,
} from "../../docusignSchema";

export type MasterWaiver = MemberMasterWaiverRow;
export type Signer = BookingWaiverSignerRow;
export type Envelope = BookingWaiverEnvelopeRow;

export interface WaiverSettings {
  masterRenewsEvery12Months: boolean;
  autoSendMasterOnNewMember: boolean;
  memberSignHoldHours: number;
}

export interface WaiverTemplateInfo {
  id: number;
  version: number;
  templateName: string;
  bodyText: string;
  waiverKind: "master" | "booking";
}

export interface MemberContact {
  memberId: number;
  userId: string;
  email: string;
  fullName: string | null;
  /** Normalized 10-digit US mobile, or null. */
  phone: string | null;
}

export interface BookingInfo {
  id: number;
  bookingRef: string;
  memberId: number;
  userId: string;
  propertyId: number;
  propertyName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  status: string;
  requiresApproval: boolean;
  createdAt: number;
  waiverSummarySentAt: number | null;
}

export interface PartyAdult {
  id: number;
  bookingId: number;
  fullName: string;
  email: string;
  phone: string | null;
  isDesignatedMember: boolean;
  removedAt: number | null;
}

export interface PartyMinor {
  id: number;
  bookingId: number;
  adultId: number;
  fullName: string;
  dateOfBirth: string | null;
  removedAt: number | null;
}

export type NewMasterWaiver = Omit<MasterWaiver, "id">;
export type NewSigner = Omit<Signer, "id">;
export type NewEnvelope = Omit<Envelope, "id">;

export interface WaiverRepo {
  getSettings(): Promise<WaiverSettings>;
  updateSettings(patch: Partial<WaiverSettings>, userId: string | null): Promise<WaiverSettings>;
  getCurrentTemplate(kind: "master" | "booking"): Promise<WaiverTemplateInfo | null>;
  getMemberContact(memberId: number): Promise<MemberContact | null>;

  // Master waivers
  listMasterWaivers(memberId: number): Promise<MasterWaiver[]>; // newest first
  listMasterWaiversForMembers(memberIds: number[]): Promise<MasterWaiver[]>;
  listMasterWaiversByStatus(statuses: string[]): Promise<MasterWaiver[]>;
  getMasterWaiver(id: number): Promise<MasterWaiver | null>;
  findMasterByEnvelope(envelopeId: string): Promise<MasterWaiver | null>;
  insertMasterWaiver(values: NewMasterWaiver): Promise<MasterWaiver>;
  updateMasterWaiver(id: number, patch: Partial<MasterWaiver>): Promise<void>;

  // Bookings (read-only here; status changes go through BookingLifecycle)
  getBooking(id: number): Promise<BookingInfo | null>;
  listBookingsByStatus(statuses: string[]): Promise<BookingInfo[]>;
  /** Bookings with startDate in [fromDate, toDate] (YYYY-MM-DD) and status in `statuses`. */
  listBookingsStartingBetween(fromDate: string, toDate: string, statuses: string[]): Promise<BookingInfo[]>;
  setBookingWaiverSummarySent(bookingId: number, at: number): Promise<void>;

  // Party roster
  listPartyAdults(bookingId: number): Promise<PartyAdult[]>;
  listPartyMinors(bookingId: number): Promise<PartyMinor[]>;
  insertPartyAdult(values: Omit<PartyAdult, "id" | "removedAt">): Promise<PartyAdult>;
  updatePartyAdult(id: number, patch: Partial<PartyAdult> & { waiverStatus?: "pending" | "sent" | "completed"; waiverEnvelopeId?: string | null; waiverSentAt?: number | null; waiverCompletedAt?: number | null }): Promise<void>;
  insertPartyMinor(values: Omit<PartyMinor, "id" | "removedAt">): Promise<PartyMinor>;
  updatePartyMinor(id: number, patch: Partial<PartyMinor>): Promise<void>;

  // Signers
  listSigners(bookingId: number): Promise<Signer[]>;
  listSignersByEnvelopeRow(envelopeRowId: number): Promise<Signer[]>;
  getSigner(id: number): Promise<Signer | null>;
  insertSigner(values: NewSigner): Promise<Signer>;
  updateSigner(id: number, patch: Partial<Signer>): Promise<void>;

  // Envelopes
  listEnvelopes(bookingId: number): Promise<Envelope[]>;
  listEnvelopesByStatus(statuses: string[]): Promise<Envelope[]>;
  getEnvelope(id: number): Promise<Envelope | null>;
  findEnvelopeByDsId(envelopeId: string): Promise<Envelope | null>;
  insertEnvelope(values: NewEnvelope): Promise<Envelope>;
  updateEnvelope(id: number, patch: Partial<Envelope>): Promise<void>;
}

/** Booking status changes, implemented by the property-booking feature. */
export interface BookingLifecycle {
  /** Member signed the booking waiver: pending_waiver → confirmed (or pending_approval). */
  confirmAfterMemberSigned(bookingId: number, signedAt: number): Promise<"confirmed" | "pending_approval" | "noop">;
  /** Hold expired: pending_waiver → expired_waiver, inventory released. True if it changed. */
  expireForUnsignedWaiver(bookingId: number): Promise<boolean>;
}

export interface WaiverNotifier {
  email(to: string, subject: string, paragraphs: string[]): Promise<boolean>;
  opsEmail(): string | null;
}

export interface PdfStore {
  /** Store a PDF; returns its storage key, or null if storage isn't available. */
  putPdf(key: string, data: Buffer): Promise<string | null>;
}
