/**
 * DocuSign waiver service — Master waiver per member, Booking waiver per booking.
 *
 * Rules (see the PR / CLAUDE.md):
 * - Master: a member needs a signed Master waiver for the CURRENT Master
 *   template version before starting any booking. It stays valid until a new
 *   Master version is published, staff click "Require re-sign", or (if the ops
 *   setting is on) 12 months pass.
 * - Booking: every booking gets ONE envelope (split only when >10 SMS signers)
 *   with the member + every adult guest as parallel signers. Each adult gets
 *   their own server-generated document listing the minors they cover.
 *   Prior signers are never skipped.
 * - The booking is held as "pending_waiver" and becomes confirmed the moment
 *   the MEMBER's recipient completes. If the member hasn't signed within the
 *   hold window, the hold is released, envelopes are voided and the member is
 *   told. A booking is never confirmed without the member's signature.
 * - DocuSign rejections (bad phone, SMS not enabled, opted out) are shown
 *   verbatim and nothing is marked sent; outages are queued and retried with
 *   backoff, and ops are alerted after an hour of failures.
 *
 * Logs contain IDs only — never names, emails or phone numbers.
 */
import { lodgeMidnight, addDaysYmd } from "@shared/lib/lodgeTime";
import { normalizeUsPhone, isValidEmail, isMinorOn } from "@shared/waiverParty";
import { DocuSignError, type DocuSignApi, type DsSignerStatus } from "./api";
import { anchorsFor, buildWaiverPdf } from "./documents";
import { mapRecipientStatus, shouldAdvance, smsNotification, splitSignersIntoEnvelopes, toDsSigner } from "./envelopes";
import type {
  BookingInfo, BookingLifecycle, Envelope, MasterWaiver, PartyAdult, PdfStore, Signer,
  WaiverNotifier, WaiverRepo, WaiverSettings, WaiverTemplateInfo,
} from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
export const POLL_INTERVAL_MS = 15 * MINUTE;
export const OPS_ALERT_AFTER_MS = HOUR;
const UNSIGNED = new Set(["queued", "sent", "viewed", "declined", "failed"]);
const ACTIVE_BOOKING_STATUSES = ["pending_waiver", "confirmed", "pending_approval", "checked_in"];

/** Thrown when a booking may not start because the Master waiver is missing. */
export class WaiverGateError extends Error {
  constructor(message: string, public readonly code: "MASTER_WAIVER_REQUIRED" | "NOT_CONFIGURED") {
    super(message);
    this.name = "WaiverGateError";
  }
}

/** A user-facing waiver error (bad input, wrong state, DocuSign rejection). */
export class WaiverActionError extends Error {
  constructor(message: string, public readonly canEmailOnly = false) {
    super(message);
    this.name = "WaiverActionError";
  }
}

export interface SendResult {
  ok: boolean;
  /** DocuSign's own error, when it rejected or was unreachable. */
  error?: string;
  /** True when the send was queued for retry (DocuSign unreachable). */
  queued?: boolean;
  /** Offer "Send by email only" (a rejection that may be SMS-related). */
  canEmailOnly?: boolean;
}

export interface MasterStatus {
  enabled: boolean;
  required: boolean;
  valid: boolean;
  state: "valid" | "missing" | "pending" | "outdated" | "expired" | "resign_required" | "declined" | "failed" | "no_template" | "disabled";
  template: { id: number; version: number; title: string } | null;
  current: MasterWaiver | null; // latest record
  signed: MasterWaiver | null; // latest signed record (valid or not)
}

export interface WaiverServiceDeps {
  repo: WaiverRepo;
  /** DocuSign client, or null when env vars are missing. */
  api: () => DocuSignApi | null;
  lifecycle: BookingLifecycle;
  notifier: WaiverNotifier;
  storage: PdfStore;
  enabled: () => boolean;
  connectConfigured: () => boolean;
  now?: () => number;
}

export function backoffMs(attempts: number): number {
  return Math.min(MINUTE * 2 ** Math.max(0, attempts - 1), 15 * MINUTE);
}

export function isMasterRecordValid(
  rec: MasterWaiver | null,
  template: { id: number; version: number } | null,
  settings: WaiverSettings,
  now: number,
): boolean {
  if (!rec || !template) return false;
  if (rec.status !== "signed" || !rec.signedAt) return false;
  if (rec.invalidatedAt) return false;
  if (rec.templateId !== template.id || rec.templateVersion !== template.version) return false;
  if (settings.masterRenewsEvery12Months && now - rec.signedAt >= 365 * DAY) return false;
  return true;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export class WaiverService {
  private readonly repo: WaiverRepo;
  private readonly now: () => number;

  constructor(private readonly deps: WaiverServiceDeps) {
    this.repo = deps.repo;
    this.now = deps.now ?? (() => Date.now());
  }

  get enabled(): boolean {
    return this.deps.enabled();
  }

  private requireApi(): DocuSignApi {
    const api = this.deps.api();
    if (!api) throw new WaiverActionError("DocuSign isn't configured on the server yet (DOCUSIGN_* env vars are missing).");
    return api;
  }

  // ─── Master waiver ─────────────────────────────────────────────────────────

  currentTemplate(kind: "master" | "booking"): Promise<WaiverTemplateInfo | null> {
    return this.repo.getCurrentTemplate(kind);
  }

  async masterStatus(memberId: number): Promise<MasterStatus> {
    const enabled = this.enabled;
    const [template, settings, records] = await Promise.all([
      this.repo.getCurrentTemplate("master"),
      this.repo.getSettings(),
      this.repo.listMasterWaivers(memberId),
    ]);
    const now = this.now();
    const current = records[0] ?? null;
    const signed = records.find((r) => r.status === "signed") ?? null;
    const tpl = template ? { id: template.id, version: template.version, title: template.templateName } : null;
    const valid = records.some((r) => isMasterRecordValid(r, template, settings, now));
    let state: MasterStatus["state"];
    if (!enabled) state = valid ? "valid" : "disabled";
    else if (!template) state = "no_template";
    else if (valid) state = "valid";
    else if (current && ["queued", "sent", "viewed"].includes(current.status)) state = "pending";
    else if (current?.status === "declined") state = "declined";
    else if (current?.status === "failed") state = "failed";
    else if (signed?.invalidatedAt) state = "resign_required";
    else if (signed && (signed.templateId !== template.id || signed.templateVersion !== template.version)) state = "outdated";
    else if (signed) state = "expired";
    else state = "missing";
    return { enabled, required: enabled, valid, state, template: tpl, current, signed };
  }

  /** Batch Master waiver state for many members (ops lists). */
  async masterStatesFor(memberIds: number[]): Promise<Record<number, { state: string; valid: boolean; signedAt: number | null }>> {
    const [template, settings, rows] = await Promise.all([
      this.repo.getCurrentTemplate("master"), this.repo.getSettings(), this.repo.listMasterWaiversForMembers(memberIds),
    ]);
    const now = this.now();
    const out: Record<number, { state: string; valid: boolean; signedAt: number | null }> = {};
    for (const id of memberIds) {
      const recs = rows.filter((r) => r.memberId === id).sort((a, b) => b.id - a.id);
      const valid = recs.some((r) => isMasterRecordValid(r, template, settings, now));
      const signed = recs.find((r) => r.status === "signed") ?? null;
      const current = recs[0] ?? null;
      let state = "missing";
      if (!template) state = "no_template";
      else if (valid) state = "valid";
      else if (current && ["queued", "sent", "viewed"].includes(current.status)) state = "pending";
      else if (current?.status === "declined" || current?.status === "failed") state = current.status;
      else if (signed?.invalidatedAt) state = "resign_required";
      else if (signed) state = signed.templateId !== template.id || signed.templateVersion !== template.version ? "outdated" : "expired";
      out[id] = { state, valid, signedAt: signed?.signedAt ?? null };
    }
    return out;
  }

  /** Server-side gate for creating a booking. No-op while the feature flag is off. */
  async assertMasterWaiverForBooking(memberId: number): Promise<void> {
    if (!this.enabled) return;
    const s = await this.masterStatus(memberId);
    if (s.state === "no_template") {
      throw new WaiverGateError("Online booking is paused: the Master waiver hasn't been published yet. Please contact the lodge.", "NOT_CONFIGURED");
    }
    if (!s.valid) {
      throw new WaiverGateError("Sign your master waiver to book. Open the booking page and tap SIGN WAIVER.", "MASTER_WAIVER_REQUIRED");
    }
  }

  /** Send (or re-send) the Master waiver to a member. */
  async sendMasterWaiver(memberId: number, opts: { emailOnly?: boolean; fullName?: string; phone?: string } = {}): Promise<SendResult & { alreadySigned?: boolean }> {
    if (!this.enabled) throw new WaiverActionError("DocuSign waivers are turned off (WAIVERS_DOCUSIGN_ENABLED).");
    const template = await this.repo.getCurrentTemplate("master");
    if (!template) throw new WaiverActionError("No Master waiver template is published. Add one on Ops → Waivers → Templates (type: Master).");
    const status = await this.masterStatus(memberId);
    if (status.valid) return { ok: true, alreadySigned: true };
    const contact = await this.repo.getMemberContact(memberId);
    if (!contact) throw new WaiverActionError("Member not found.");
    if (!isValidEmail(contact.email)) throw new WaiverActionError("This member has no valid email address on file.");
    const phone = opts.phone !== undefined && opts.phone !== "" ? normalizeUsPhone(opts.phone) : contact.phone;
    if (opts.phone && !phone) throw new WaiverActionError("Enter a valid US mobile number, or send by email only.");
    const name = (opts.fullName?.trim() || contact.fullName?.trim() || contact.email).slice(0, 255);

    // Supersede any open request so the member never has two live envelopes.
    for (const r of await this.repo.listMasterWaivers(memberId)) {
      if (["queued", "sent", "viewed", "failed", "declined"].includes(r.status)) await this.voidMasterRecord(r, "Superseded by a new Master waiver request");
    }

    const now = this.now();
    const row = await this.repo.insertMasterWaiver({
      memberId,
      userId: contact.userId,
      templateId: template.id,
      templateVersion: template.version,
      status: "queued",
      signerName: name,
      signerEmail: contact.email,
      signerPhone: phone,
      deliveryMethod: opts.emailOnly || !phone ? "email" : "email_sms",
      envelopeId: null, recipientId: "1",
      attempts: 0, nextAttemptAt: null, firstFailureAt: null, opsAlertedAt: null, lastError: null,
      sentAt: null, viewedAt: null, signedAt: null, declinedAt: null, lastPolledAt: null,
      signedPdfKey: null, certificatePdfKey: null,
      invalidatedAt: null, invalidatedReason: null, invalidatedByUserId: null,
      createdAt: now, updatedAt: now,
    });
    return this.attemptMasterSend(row, template);
  }

  private async voidMasterRecord(r: MasterWaiver, reason: string) {
    if (r.envelopeId && ["sent", "viewed", "declined"].includes(r.status)) {
      try { await this.requireApi().voidEnvelope(r.envelopeId, reason); }
      catch (err) { console.warn(`[waivers] couldn't void master envelope (record ${r.id}): ${errMessage(err)}`); }
    }
    await this.repo.updateMasterWaiver(r.id, { status: "voided", updatedAt: this.now() });
  }

  private async attemptMasterSend(row: MasterWaiver, template?: WaiverTemplateInfo | null): Promise<SendResult> {
    const tpl = template ?? (await this.repo.getCurrentTemplate("master"));
    const now = this.now();
    if (!tpl || tpl.id !== row.templateId || tpl.version !== row.templateVersion) {
      await this.repo.updateMasterWaiver(row.id, { status: "voided", lastError: "Master template changed before sending", updatedAt: now });
      return { ok: false, error: "The Master waiver changed before it could be sent. Please send it again." };
    }
    const emailOnly = row.deliveryMethod === "email";
    try {
      const api = this.requireApi();
      const recipientId = row.recipientId ?? "1";
      const pdf = await buildWaiverPdf({ title: tpl.templateName, version: tpl.version, kind: "master", body: tpl.bodyText, anchors: anchorsFor(recipientId) });
      const signer = toDsSigner({ id: Number(recipientId), role: "member", fullName: row.signerName, email: row.signerEmail, phone: row.signerPhone }, "1", emailOnly);
      const { envelopeId } = await api.createEnvelope({
        emailSubject: "Rivers Lodge — please sign your Master waiver",
        emailBlurb: "Please review and sign the Rivers Lodge Master waiver. You'll be able to book once it's signed.",
        status: "sent",
        documents: [{ documentId: "1", name: `${tpl.templateName} v${tpl.version}`, fileExtension: "pdf", documentBase64: pdf.toString("base64") }],
        recipients: { signers: [signer] },
      });
      await this.repo.updateMasterWaiver(row.id, {
        status: "sent", envelopeId, sentAt: now, attempts: row.attempts + 1, lastError: null,
        nextAttemptAt: null, firstFailureAt: null, updatedAt: now,
      });
      console.log(`[waivers] master waiver sent (record ${row.id}, envelope ${envelopeId})`);
      return { ok: true };
    } catch (err) {
      return this.recordMasterFailure(row, err);
    }
  }

  private async recordMasterFailure(row: MasterWaiver, err: unknown): Promise<SendResult> {
    const now = this.now();
    const msg = errMessage(err);
    const transient = err instanceof DocuSignError ? err.transient : !(err instanceof WaiverActionError);
    if (transient) {
      const attempts = row.attempts + 1;
      await this.repo.updateMasterWaiver(row.id, {
        status: "queued", attempts, nextAttemptAt: now + backoffMs(attempts),
        firstFailureAt: row.firstFailureAt ?? now, lastError: msg, updatedAt: now,
      });
      console.warn(`[waivers] master send queued for retry (record ${row.id}, attempt ${attempts})`);
      return { ok: false, queued: true, error: msg };
    }
    await this.repo.updateMasterWaiver(row.id, { status: "failed", attempts: row.attempts + 1, lastError: msg, nextAttemptAt: null, updatedAt: now });
    console.warn(`[waivers] master waiver not sent (record ${row.id}): ${err instanceof DocuSignError ? `DocuSign ${err.httpStatus ?? ""} ${err.errorCode ?? ""}` : "configuration"}`);
    return { ok: false, error: msg, canEmailOnly: row.deliveryMethod !== "email" };
  }

  /** Staff: invalidate the member's Master waiver so they must sign again; sends a new one. */
  async requireMasterResign(memberId: number, staffUserId: string): Promise<SendResult> {
    const now = this.now();
    for (const r of await this.repo.listMasterWaivers(memberId)) {
      if (r.status === "signed" && !r.invalidatedAt) {
        await this.repo.updateMasterWaiver(r.id, { invalidatedAt: now, invalidatedReason: "Staff required re-sign", invalidatedByUserId: staffUserId, updatedAt: now });
      }
    }
    if (!this.enabled) return { ok: true };
    try {
      return await this.sendMasterWaiver(memberId);
    } catch (err) {
      return { ok: false, error: errMessage(err) };
    }
  }

  /** New member account: auto-send the Master waiver when the ops toggle is on. */
  async onMemberCreated(memberId: number): Promise<void> {
    if (!this.enabled) return;
    const settings = await this.repo.getSettings();
    if (!settings.autoSendMasterOnNewMember) return;
    if (!this.deps.api()) return;
    try {
      const r = await this.sendMasterWaiver(memberId);
      if (!r.ok) console.warn(`[waivers] auto-send master for member ${memberId} did not send: ${r.queued ? "queued" : "rejected"}`);
    } catch (err) {
      console.warn(`[waivers] auto-send master for member ${memberId} skipped: ${errMessage(err)}`);
    }
  }

  // ─── Booking waivers ───────────────────────────────────────────────────────

  /**
   * Create signer records for every adult on the booking (member + guests)
   * that doesn't have an active one, and send them. Called right after the
   * booking is created (status pending_waiver).
   */
  async startBookingWaivers(bookingId: number, opts: { emailOnly?: boolean } = {}): Promise<SendResult> {
    if (!this.enabled) return { ok: true };
    const booking = await this.repo.getBooking(bookingId);
    if (!booking) throw new WaiverActionError("Booking not found.");
    const template = await this.repo.getCurrentTemplate("booking");
    if (!template) throw new WaiverActionError("No Booking waiver template is published.");

    const [adults, signers] = await Promise.all([this.repo.listPartyAdults(bookingId), this.repo.listSigners(bookingId)]);
    const fresh: Signer[] = [];
    for (const a of adults.filter((x) => !x.removedAt)) {
      const existing = signers.find((s) => s.partyAdultId === a.id && s.status !== "voided" && s.status !== "removed");
      if (existing) {
        if (!existing.envelopeRowId && UNSIGNED.has(existing.status)) fresh.push(existing);
        continue;
      }
      fresh.push(await this.createSignerFor(booking, a, template));
    }
    if (fresh.length === 0) return { ok: true };
    return this.sendSignersInNewEnvelopes(booking, fresh, !!opts.emailOnly);
  }

  private async createSignerFor(booking: BookingInfo, adult: PartyAdult, template: WaiverTemplateInfo): Promise<Signer> {
    const minors = (await this.repo.listPartyMinors(booking.id))
      .filter((m) => m.adultId === adult.id && !m.removedAt)
      .map((m) => ({ fullName: m.fullName, dateOfBirth: m.dateOfBirth }));
    const now = this.now();
    return this.repo.insertSigner({
      bookingId: booking.id,
      partyAdultId: adult.id,
      envelopeRowId: null,
      role: adult.isDesignatedMember ? "member" : "guest",
      fullName: adult.fullName,
      email: adult.email,
      phone: normalizeUsPhone(adult.phone),
      minors,
      templateId: template.id,
      templateVersion: template.version,
      documentId: null,
      status: "queued",
      deliveryMethod: "email_sms",
      lastError: null, sentAt: null, viewedAt: null, signedAt: null, declinedAt: null, declineReason: null,
      reminder72SentAt: null, reminder24SentAt: null, removedAt: null,
      signedPdfKey: null, certificatePdfKey: null,
      createdAt: now, updatedAt: now,
    });
  }

  private async sendSignersInNewEnvelopes(booking: BookingInfo, signers: Signer[], emailOnly: boolean): Promise<SendResult> {
    const chunks = splitSignersIntoEnvelopes(signers, { emailOnly });
    let result: SendResult = { ok: true };
    for (const chunk of chunks) {
      const now = this.now();
      const env = await this.repo.insertEnvelope({
        bookingId: booking.id, envelopeId: null, status: "queued", emailOnly,
        attempts: 0, nextAttemptAt: null, firstFailureAt: null, opsAlertedAt: null, lastError: null,
        sentAt: null, completedAt: null, voidedAt: null, lastPolledAt: null, certificatePdfKey: null,
        createdAt: now, updatedAt: now,
      });
      for (const s of chunk) await this.repo.updateSigner(s.id, { envelopeRowId: env.id, status: "queued", updatedAt: now });
      const r = await this.attemptEnvelopeSend(env);
      if (!r.ok && result.ok) result = r;
    }
    return result;
  }

  /** Build documents + recipients for one envelope row and send it. */
  async attemptEnvelopeSend(env: Envelope): Promise<SendResult> {
    const now = this.now();
    const booking = await this.repo.getBooking(env.bookingId);
    const signers = (await this.repo.listSignersByEnvelopeRow(env.id)).filter((s) => !s.removedAt && s.status !== "voided" && s.status !== "removed");
    if (!booking || signers.length === 0 || !ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
      await this.repo.updateEnvelope(env.id, { status: "voided", voidedAt: now, nextAttemptAt: null, updatedAt: now });
      return { ok: true };
    }
    const template = await this.repo.getCurrentTemplate("booking");
    try {
      if (!template) throw new WaiverActionError("No Booking waiver template is published.");
      const api = this.requireApi();
      const documents = [];
      const dsSigners = [];
      for (let i = 0; i < signers.length; i++) {
        const s = signers[i];
        const documentId = String(i + 1);
        const pdf = await buildWaiverPdf({
          title: template.templateName,
          version: template.version,
          kind: "booking",
          body: template.bodyText,
          booking: { bookingRef: booking.bookingRef, propertyName: booking.propertyName, startDate: booking.startDate, endDate: booking.endDate },
          minors: s.minors ?? [],
          anchors: anchorsFor(String(s.id)),
        });
        documents.push({ documentId, name: `${template.templateName} — ${booking.bookingRef} (${i + 1})`, fileExtension: "pdf", documentBase64: pdf.toString("base64") });
        dsSigners.push(toDsSigner(s, documentId, env.emailOnly));
      }
      const { envelopeId } = await api.createEnvelope({
        emailSubject: `Rivers Lodge waiver — booking ${booking.bookingRef}`,
        emailBlurb: `Please sign the Rivers Lodge Release & Liability Waiver for booking ${booking.bookingRef} before arriving at the property.`,
        status: "sent",
        enforceSignerVisibility: "true",
        documents,
        recipients: { signers: dsSigners },
      });
      await this.repo.updateEnvelope(env.id, {
        envelopeId, status: "sent", sentAt: now, attempts: env.attempts + 1, lastError: null,
        nextAttemptAt: null, firstFailureAt: null, updatedAt: now,
      });
      for (let i = 0; i < signers.length; i++) {
        const s = signers[i];
        await this.repo.updateSigner(s.id, {
          status: "sent", sentAt: now, documentId: String(i + 1), lastError: null,
          templateId: template.id, templateVersion: template.version,
          deliveryMethod: env.emailOnly || !s.phone ? "email" : "email_sms", updatedAt: now,
        });
        if (s.partyAdultId) await this.repo.updatePartyAdult(s.partyAdultId, { waiverStatus: "sent", waiverEnvelopeId: envelopeId, waiverSentAt: now });
      }
      console.log(`[waivers] booking ${booking.id} envelope sent (row ${env.id}, envelope ${envelopeId}, ${signers.length} signers)`);
      return { ok: true };
    } catch (err) {
      const msg = errMessage(err);
      const transient = err instanceof DocuSignError ? err.transient : !(err instanceof WaiverActionError);
      if (transient) {
        const attempts = env.attempts + 1;
        await this.repo.updateEnvelope(env.id, {
          status: "queued", attempts, nextAttemptAt: now + backoffMs(attempts),
          firstFailureAt: env.firstFailureAt ?? now, lastError: msg, updatedAt: now,
        });
        for (const s of signers) await this.repo.updateSigner(s.id, { status: "queued", lastError: msg, updatedAt: now });
        console.warn(`[waivers] booking ${booking.id} envelope queued for retry (row ${env.id}, attempt ${attempts})`);
        return { ok: false, queued: true, error: msg };
      }
      await this.repo.updateEnvelope(env.id, { status: "failed", attempts: env.attempts + 1, lastError: msg, nextAttemptAt: null, updatedAt: now });
      for (const s of signers) await this.repo.updateSigner(s.id, { status: "failed", lastError: msg, updatedAt: now });
      console.warn(`[waivers] booking ${booking.id} envelope rejected by DocuSign (row ${env.id})`);
      return { ok: false, error: msg, canEmailOnly: !env.emailOnly };
    }
  }

  /** Active signer record (latest, not voided/removed) for each party adult. */
  private activeSigners(signers: Signer[]): Signer[] {
    const byAdult = new Map<number, Signer>();
    for (const s of [...signers].sort((a, b) => a.id - b.id)) {
      if (s.status === "voided" || s.status === "removed" || s.removedAt) continue;
      byAdult.set(s.partyAdultId ?? -s.id, s);
    }
    return Array.from(byAdult.values());
  }

  /** Resend one person's waiver (optionally email-only). */
  async resendSigner(signerId: number, opts: { emailOnly?: boolean } = {}): Promise<SendResult> {
    const s = await this.repo.getSigner(signerId);
    if (!s) throw new WaiverActionError("Waiver not found.");
    if (s.status === "signed") throw new WaiverActionError("This person has already signed.");
    if (s.status === "removed" || s.removedAt || s.status === "voided" || s.status === "expired") throw new WaiverActionError("This waiver is no longer active.");
    const env = s.envelopeRowId ? await this.repo.getEnvelope(s.envelopeRowId) : null;
    const booking = await this.repo.getBooking(s.bookingId);
    if (!booking) throw new WaiverActionError("Booking not found.");
    const now = this.now();
    const emailOnly = !!opts.emailOnly;

    if (env && env.status === "sent" && env.envelopeId) {
      try {
        await this.requireApi().updateRecipients(env.envelopeId, [{
          recipientId: String(s.id), name: s.fullName, email: s.email,
          additionalNotifications: smsNotification(s.phone, emailOnly || env.emailOnly) ?? [],
        }], { resend: true });
      } catch (err) {
        const msg = errMessage(err);
        await this.repo.updateSigner(s.id, { lastError: msg, updatedAt: now });
        throw new WaiverActionError(msg, !emailOnly);
      }
      await this.repo.updateSigner(s.id, {
        status: s.status === "declined" || s.status === "failed" ? "sent" : s.status,
        sentAt: now, lastError: null, deliveryMethod: emailOnly || !s.phone ? "email" : "email_sms", updatedAt: now,
      });
      return { ok: true };
    }
    if (env && (env.status === "failed" || env.status === "queued")) {
      // Never reached DocuSign — resend the whole envelope (e.g. "Send by email only").
      const updated = { ...env, emailOnly: emailOnly || env.emailOnly };
      await this.repo.updateEnvelope(env.id, { emailOnly: updated.emailOnly, updatedAt: now });
      return this.attemptEnvelopeSend(updated);
    }
    // Envelope voided/completed or missing: send this person a new envelope.
    return this.sendSignersInNewEnvelopes(booking, [s], emailOnly);
  }

  /** Fix a guest's name/email/phone: corrects the DocuSign recipient and resends. */
  async editSigner(signerId: number, patch: { fullName?: string; email?: string; phone?: string }): Promise<SendResult> {
    const s = await this.repo.getSigner(signerId);
    if (!s) throw new WaiverActionError("Waiver not found.");
    if (s.status === "signed") throw new WaiverActionError("This person has already signed — their details can't be changed.");
    if (s.removedAt || ["removed", "voided", "expired"].includes(s.status)) throw new WaiverActionError("This waiver is no longer active.");
    const fullName = patch.fullName !== undefined ? patch.fullName.trim() : s.fullName;
    const email = patch.email !== undefined ? patch.email.trim() : s.email;
    const phone = patch.phone !== undefined ? normalizeUsPhone(patch.phone) : s.phone;
    if (!fullName) throw new WaiverActionError("Full name is required.");
    if (!isValidEmail(email)) throw new WaiverActionError("Enter a valid email address.");
    if (patch.phone !== undefined && !phone) throw new WaiverActionError("Enter a valid US mobile number.");
    const others = this.activeSigners(await this.repo.listSigners(s.bookingId)).filter((x) => x.id !== s.id);
    if (others.some((x) => x.email.trim().toLowerCase() === email.toLowerCase())) {
      throw new WaiverActionError("Someone else in this party already uses that email.");
    }
    const env = s.envelopeRowId ? await this.repo.getEnvelope(s.envelopeRowId) : null;
    const now = this.now();
    if (env && env.status === "sent" && env.envelopeId) {
      try {
        await this.requireApi().updateRecipients(env.envelopeId, [{
          recipientId: String(s.id), name: fullName, email,
          additionalNotifications: smsNotification(phone, env.emailOnly) ?? [],
        }], { resend: true });
      } catch (err) {
        throw new WaiverActionError(errMessage(err), !env.emailOnly);
      }
    }
    await this.repo.updateSigner(s.id, {
      fullName, email, phone, lastError: null, updatedAt: now,
      ...(env && env.status === "sent" ? { status: s.status === "failed" || s.status === "declined" ? "sent" : s.status, sentAt: now } : {}),
    });
    if (s.partyAdultId) await this.repo.updatePartyAdult(s.partyAdultId, { fullName, email, phone });
    if (!env || env.status === "failed" || env.status === "queued") {
      const fresh = await this.repo.getSigner(s.id);
      if (env) return this.attemptEnvelopeSend((await this.repo.getEnvelope(env.id))!);
      const booking = await this.repo.getBooking(s.bookingId);
      if (booking && fresh) return this.sendSignersInNewEnvelopes(booking, [fresh], false);
    }
    return { ok: true };
  }

  /** Add an adult guest to an existing booking and send their waiver immediately. */
  async addAdultGuest(bookingId: number, guest: { fullName: string; email: string; phone: string }): Promise<SendResult & { partyAdultId: number }> {
    const booking = await this.repo.getBooking(bookingId);
    if (!booking || !ACTIVE_BOOKING_STATUSES.includes(booking.status)) throw new WaiverActionError("Guests can only be added to an active booking.");
    const phone = normalizeUsPhone(guest.phone);
    if (!guest.fullName?.trim()) throw new WaiverActionError("Full name is required.");
    if (!isValidEmail(guest.email)) throw new WaiverActionError("Enter a valid email address.");
    if (!phone) throw new WaiverActionError("Enter a valid US mobile number.");
    const adults = (await this.repo.listPartyAdults(bookingId)).filter((a) => !a.removedAt);
    if (adults.some((a) => a.email.trim().toLowerCase() === guest.email.trim().toLowerCase())) {
      throw new WaiverActionError("Someone in this party already uses that email.");
    }
    const adult = await this.repo.insertPartyAdult({
      bookingId, fullName: guest.fullName.trim(), email: guest.email.trim(), phone, isDesignatedMember: false,
    });
    if (!this.enabled) return { ok: true, partyAdultId: adult.id };
    const template = await this.repo.getCurrentTemplate("booking");
    if (!template) return { ok: false, error: "No Booking waiver template is published.", partyAdultId: adult.id };
    const signer = await this.createSignerFor(booking, adult, template);
    const r = await this.sendSignersInNewEnvelopes(booking, [signer], false);
    return { ...r, partyAdultId: adult.id };
  }

  /**
   * Add a minor. Their guardian must sign a waiver that lists them, so the
   * guardian is sent a fresh booking waiver (any unsigned one is voided; a
   * signed one stays on file but no longer covers everyone).
   */
  async addMinor(bookingId: number, minor: { fullName: string; dateOfBirth: string; guardianAdultId: number }): Promise<SendResult & { minorId: number }> {
    const booking = await this.repo.getBooking(bookingId);
    if (!booking || !ACTIVE_BOOKING_STATUSES.includes(booking.status)) throw new WaiverActionError("Guests can only be added to an active booking.");
    const guardian = (await this.repo.listPartyAdults(bookingId)).find((a) => a.id === minor.guardianAdultId && !a.removedAt);
    if (!guardian) throw new WaiverActionError("Choose the parent/guardian in this party.");
    if (!minor.fullName?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(minor.dateOfBirth)) throw new WaiverActionError("Name and date of birth are required.");
    if (!isMinorOn(minor.dateOfBirth, booking.startDate)) throw new WaiverActionError("A minor must be under 18 at check-in (add 18+ guests as adults).");
    const row = await this.repo.insertPartyMinor({ bookingId, adultId: guardian.id, fullName: minor.fullName.trim(), dateOfBirth: minor.dateOfBirth });
    if (!this.enabled) return { ok: true, minorId: row.id };
    const r = await this.reissueForAdult(booking, guardian);
    return { ...r, minorId: row.id };
  }

  /** Send an adult a new booking waiver reflecting the current party (their minors). */
  private async reissueForAdult(booking: BookingInfo, adult: PartyAdult): Promise<SendResult> {
    const template = await this.repo.getCurrentTemplate("booking");
    if (!template) return { ok: false, error: "No Booking waiver template is published." };
    const current = this.activeSigners(await this.repo.listSigners(booking.id)).find((s) => s.partyAdultId === adult.id);
    if (current && current.status !== "signed") await this.withdrawSigner(current, "voided");
    const fresh = await this.createSignerFor(booking, adult, template);
    return this.sendSignersInNewEnvelopes(booking, [fresh], false);
  }

  /** Remove a recipient from DocuSign (delete, or void if they're alone) and mark the record. */
  private async withdrawSigner(s: Signer, status: "removed" | "voided") {
    const now = this.now();
    const env = s.envelopeRowId ? await this.repo.getEnvelope(s.envelopeRowId) : null;
    if (env && env.status === "sent" && env.envelopeId && s.status !== "signed") {
      const peers = (await this.repo.listSignersByEnvelopeRow(env.id))
        .filter((x) => x.id !== s.id && !x.removedAt && !["removed", "voided"].includes(x.status));
      const api = this.requireApi();
      try {
        if (peers.length === 0) {
          await api.voidEnvelope(env.envelopeId, "Guest removed from booking");
          await this.repo.updateEnvelope(env.id, { status: "voided", voidedAt: now, updatedAt: now });
        } else if (peers.every((x) => x.status === "signed")) {
          // Everyone else already signed: deleting the last open recipient would
          // complete the envelope with an unsigned document — void instead.
          await api.voidEnvelope(env.envelopeId, "Guest removed from booking");
          await this.repo.updateEnvelope(env.id, { status: "voided", voidedAt: now, updatedAt: now });
        } else {
          await api.deleteRecipient(env.envelopeId, String(s.id));
        }
      } catch (err) {
        throw new WaiverActionError(`DocuSign couldn't remove this person: ${errMessage(err)}`);
      }
    } else if (env && (env.status === "queued" || env.status === "failed")) {
      const peers = (await this.repo.listSignersByEnvelopeRow(env.id)).filter((x) => x.id !== s.id && !x.removedAt);
      if (peers.length === 0) await this.repo.updateEnvelope(env.id, { status: "voided", voidedAt: now, nextAttemptAt: null, updatedAt: now });
    }
    await this.repo.updateSigner(s.id, { status, ...(status === "removed" ? { removedAt: now } : {}), updatedAt: now });
  }

  /** Remove an adult guest (and the minors they're responsible for). The member can't be removed. */
  async removeGuest(bookingId: number, partyAdultId: number): Promise<void> {
    const adult = (await this.repo.listPartyAdults(bookingId)).find((a) => a.id === partyAdultId);
    if (!adult || adult.removedAt) throw new WaiverActionError("Guest not found.");
    if (adult.isDesignatedMember) throw new WaiverActionError("The booking member can't be removed. Cancel the booking instead.");
    const now = this.now();
    const signer = this.activeSigners(await this.repo.listSigners(bookingId)).find((s) => s.partyAdultId === adult.id);
    if (signer) {
      if (signer.status === "signed") await this.repo.updateSigner(signer.id, { removedAt: now, updatedAt: now });
      else await this.withdrawSigner(signer, "removed");
    }
    await this.repo.updatePartyAdult(adult.id, { removedAt: now });
    for (const m of await this.repo.listPartyMinors(bookingId)) {
      if (m.adultId === adult.id && !m.removedAt) await this.repo.updatePartyMinor(m.id, { removedAt: now });
    }
  }

  async removeMinor(bookingId: number, minorId: number): Promise<void> {
    const m = (await this.repo.listPartyMinors(bookingId)).find((x) => x.id === minorId);
    if (!m || m.removedAt) throw new WaiverActionError("Minor not found.");
    await this.repo.updatePartyMinor(m.id, { removedAt: this.now() });
  }

  /** Booking cancelled by member/staff: void open envelopes. */
  async onBookingCancelled(bookingId: number, reason = "Booking cancelled"): Promise<void> {
    await this.voidBookingEnvelopes(bookingId, reason, "voided");
  }

  private async voidBookingEnvelopes(bookingId: number, reason: string, signerStatus: "voided" | "expired") {
    const now = this.now();
    const api = this.deps.api();
    for (const env of await this.repo.listEnvelopes(bookingId)) {
      if (env.status === "sent" && env.envelopeId && api) {
        try { await api.voidEnvelope(env.envelopeId, reason); }
        catch (err) { console.warn(`[waivers] couldn't void envelope row ${env.id}: ${errMessage(err)}`); }
      }
      if (["sent", "queued", "failed"].includes(env.status)) {
        await this.repo.updateEnvelope(env.id, { status: "voided", voidedAt: now, nextAttemptAt: null, updatedAt: now });
      }
    }
    for (const s of await this.repo.listSigners(bookingId)) {
      if (UNSIGNED.has(s.status)) await this.repo.updateSigner(s.id, { status: signerStatus, updatedAt: now });
    }
  }

  // ─── Status sync (Connect webhook + polling) ──────────────────────────────

  /** Apply DocuSign's view of an envelope to our records. Safe to call repeatedly. */
  async applyEnvelopeStatus(envelopeId: string, ds: { status: string; signers: DsSignerStatus[] }): Promise<void> {
    const master = await this.repo.findMasterByEnvelope(envelopeId);
    if (master) return this.applyMasterStatus(master, ds);
    const env = await this.repo.findEnvelopeByDsId(envelopeId);
    if (!env) return;
    const now = this.now();
    const booking = await this.repo.getBooking(env.bookingId);
    const signers = await this.repo.listSignersByEnvelopeRow(env.id);
    let memberSignedAt: number | null = null;

    for (const d of ds.signers) {
      const s = signers.find((x) => String(x.id) === String(d.recipientId));
      if (!s) continue;
      const next = mapRecipientStatus(d.status);
      if (!next || !shouldAdvance(s.status, next)) continue;
      const patch: Partial<Signer> = { status: next, updatedAt: now };
      if (next === "viewed") patch.viewedAt = Date.parse(d.deliveredDateTime ?? "") || now;
      if (next === "declined") { patch.declinedAt = Date.parse(d.declinedDateTime ?? "") || now; patch.declineReason = d.declinedReason ?? null; }
      if (next === "signed") {
        patch.signedAt = Date.parse(d.signedDateTime ?? "") || now;
        patch.lastError = null;
        const key = await this.fetchAndStore(envelopeId, s.documentId ?? "1", `waivers/booking/${env.bookingId}/signer-${s.id}.pdf`);
        if (key) patch.signedPdfKey = key;
        if (s.role === "member") memberSignedAt = patch.signedAt;
        if (s.partyAdultId) await this.repo.updatePartyAdult(s.partyAdultId, { waiverStatus: "completed", waiverCompletedAt: patch.signedAt });
      }
      await this.repo.updateSigner(s.id, patch);
    }

    const envStatus = String(ds.status ?? "").toLowerCase();
    if (envStatus === "completed" && env.status !== "completed") {
      const cert = await this.fetchAndStore(envelopeId, "certificate", `waivers/booking/${env.bookingId}/envelope-${env.id}-certificate.pdf`);
      await this.repo.updateEnvelope(env.id, { status: "completed", completedAt: now, certificatePdfKey: cert, updatedAt: now });
      for (const s of await this.repo.listSignersByEnvelopeRow(env.id)) {
        if (s.status === "signed" && cert) await this.repo.updateSigner(s.id, { certificatePdfKey: cert, updatedAt: now });
      }
    } else if ((envStatus === "voided" || envStatus === "declined") && env.status === "sent") {
      await this.repo.updateEnvelope(env.id, { status: envStatus === "voided" ? "voided" : "sent", ...(envStatus === "voided" ? { voidedAt: now } : {}), updatedAt: now });
      if (envStatus === "voided") {
        for (const s of await this.repo.listSignersByEnvelopeRow(env.id)) {
          if (UNSIGNED.has(s.status)) await this.repo.updateSigner(s.id, { status: "expired", updatedAt: now });
        }
      }
    }

    if (memberSignedAt && booking) {
      const r = await this.deps.lifecycle.confirmAfterMemberSigned(booking.id, memberSignedAt);
      if (r !== "noop") console.log(`[waivers] booking ${booking.id} → ${r} (member signed)`);
    }
  }

  private async applyMasterStatus(m: MasterWaiver, ds: { status: string; signers: DsSignerStatus[] }) {
    const d = ds.signers.find((x) => String(x.recipientId) === String(m.recipientId ?? "1")) ?? ds.signers[0];
    const now = this.now();
    const patch: Partial<MasterWaiver> = { updatedAt: now };
    const next = d ? mapRecipientStatus(d.status) : null;
    if (next && shouldAdvance(m.status, next)) {
      patch.status = next;
      if (next === "viewed") patch.viewedAt = Date.parse(d!.deliveredDateTime ?? "") || now;
      if (next === "declined") patch.declinedAt = Date.parse(d!.declinedDateTime ?? "") || now;
      if (next === "signed") {
        patch.signedAt = Date.parse(d!.signedDateTime ?? "") || now;
        patch.lastError = null;
        patch.signedPdfKey = await this.fetchAndStore(m.envelopeId!, "1", `waivers/master/member-${m.memberId}-${m.id}.pdf`);
      }
    }
    const envStatus = String(ds.status ?? "").toLowerCase();
    if (envStatus === "completed" && !m.certificatePdfKey) {
      patch.certificatePdfKey = await this.fetchAndStore(m.envelopeId!, "certificate", `waivers/master/member-${m.memberId}-${m.id}-certificate.pdf`);
      if (!patch.signedPdfKey && !m.signedPdfKey) patch.signedPdfKey = await this.fetchAndStore(m.envelopeId!, "1", `waivers/master/member-${m.memberId}-${m.id}.pdf`);
    }
    if (envStatus === "voided" && UNSIGNED.has(m.status)) patch.status = "expired";
    if (Object.keys(patch).length > 1) await this.repo.updateMasterWaiver(m.id, patch);
  }

  private async fetchAndStore(envelopeId: string, documentId: string, key: string): Promise<string | null> {
    const api = this.deps.api();
    if (!api) return null;
    try {
      const pdf = await api.getDocument(envelopeId, documentId);
      return await this.deps.storage.putPdf(key, pdf);
    } catch (err) {
      console.warn(`[waivers] couldn't store document ${documentId} for envelope ${envelopeId}: ${errMessage(err)}`);
      return null;
    }
  }

  /** Connect webhook body (JSON, already HMAC-verified). */
  async handleConnectEvent(payload: any): Promise<{ envelopeId: string | null }> {
    const data = payload?.data ?? {};
    const envelopeId: string | null = data.envelopeId ?? payload?.envelopeId ?? null;
    if (!envelopeId) return { envelopeId: null };
    const summary = data.envelopeSummary;
    if (summary?.recipients?.signers && summary.status) {
      await this.applyEnvelopeStatus(envelopeId, {
        status: String(summary.status),
        signers: summary.recipients.signers.map((s: any) => ({
          recipientId: String(s.recipientId), status: String(s.status ?? ""),
          deliveredDateTime: s.deliveredDateTime, signedDateTime: s.signedDateTime,
          declinedDateTime: s.declinedDateTime, declinedReason: s.declinedReason,
        })),
      });
    } else {
      const api = this.deps.api();
      if (api) await this.applyEnvelopeStatus(envelopeId, await api.getEnvelopeStatus(envelopeId));
    }
    return { envelopeId };
  }

  /** Fetch one envelope's status from DocuSign now and apply it. */
  async syncEnvelopeNow(envelopeId: string): Promise<void> {
    const api = this.requireApi();
    await this.applyEnvelopeStatus(envelopeId, await api.getEnvelopeStatus(envelopeId));
  }

  /** Poll open envelopes (every 15 min each) when Connect isn't configured. */
  async pollOpenEnvelopes(opts: { force?: boolean } = {}): Promise<number> {
    if (!opts.force && this.deps.connectConfigured()) return 0;
    const api = this.deps.api();
    if (!api) return 0;
    const now = this.now();
    let polled = 0;
    const due = (last: number | null) => opts.force || !last || now - last >= POLL_INTERVAL_MS;
    for (const env of await this.repo.listEnvelopesByStatus(["sent"])) {
      if (!env.envelopeId || !due(env.lastPolledAt)) continue;
      try {
        await this.applyEnvelopeStatus(env.envelopeId, await api.getEnvelopeStatus(env.envelopeId));
        polled++;
      } catch (err) { console.warn(`[waivers] poll failed for envelope row ${env.id}: ${errMessage(err)}`); }
      await this.repo.updateEnvelope(env.id, { lastPolledAt: now });
    }
    for (const m of await this.repo.listMasterWaiversByStatus(["sent", "viewed", "declined"])) {
      if (!m.envelopeId || !due(m.lastPolledAt)) continue;
      try {
        await this.applyEnvelopeStatus(m.envelopeId, await api.getEnvelopeStatus(m.envelopeId));
        polled++;
      } catch (err) { console.warn(`[waivers] poll failed for master record ${m.id}: ${errMessage(err)}`); }
      await this.repo.updateMasterWaiver(m.id, { lastPolledAt: now });
    }
    return polled;
  }

  // ─── Scheduled jobs ───────────────────────────────────────────────────────

  /** Retry queued sends whose backoff has elapsed; alert ops after an hour of failure. */
  async retryQueuedSends(): Promise<void> {
    const now = this.now();
    const isDue = (r: { nextAttemptAt: number | null; createdAt: number }) =>
      r.nextAttemptAt != null ? r.nextAttemptAt <= now : now - r.createdAt >= 2 * MINUTE;
    for (const env of await this.repo.listEnvelopesByStatus(["queued"])) {
      if (isDue(env)) await this.attemptEnvelopeSend(env);
    }
    for (const m of await this.repo.listMasterWaiversByStatus(["queued"])) {
      if (isDue(m)) await this.attemptMasterSend(m);
    }
    // Ops alert: still failing after an hour.
    const ops = this.deps.notifier.opsEmail();
    for (const env of await this.repo.listEnvelopesByStatus(["queued"])) {
      if (env.firstFailureAt && now - env.firstFailureAt >= OPS_ALERT_AFTER_MS && !env.opsAlertedAt) {
        const b = await this.repo.getBooking(env.bookingId);
        if (ops) await this.deps.notifier.email(ops, `DocuSign waivers failing — booking ${b?.bookingRef ?? env.bookingId}`, [
          `We've been unable to send the booking waiver for booking ${b?.bookingRef ?? env.bookingId} for over an hour. It will keep retrying automatically.`,
          `Last error from DocuSign: ${env.lastError ?? "unknown"}`,
          `The booking stays "Pending waiver" and will not be confirmed until the member signs. See Ops → Waivers.`,
        ]);
        await this.repo.updateEnvelope(env.id, { opsAlertedAt: now });
      }
    }
    for (const m of await this.repo.listMasterWaiversByStatus(["queued"])) {
      if (m.firstFailureAt && now - m.firstFailureAt >= OPS_ALERT_AFTER_MS && !m.opsAlertedAt) {
        if (ops) await this.deps.notifier.email(ops, `DocuSign Master waiver failing — member ${m.memberId}`, [
          `We've been unable to send a Master waiver (record ${m.id}, member ${m.memberId}) for over an hour. It will keep retrying automatically.`,
          `Last error from DocuSign: ${m.lastError ?? "unknown"}`,
        ]);
        await this.repo.updateMasterWaiver(m.id, { opsAlertedAt: now });
      }
    }
  }

  /** Release holds where the member hasn't signed within the hold window. */
  async expireUnsignedHolds(): Promise<number[]> {
    const settings = await this.repo.getSettings();
    const holdMs = Math.max(1, settings.memberSignHoldHours) * HOUR;
    const now = this.now();
    const expired: number[] = [];
    for (const b of await this.repo.listBookingsByStatus(["pending_waiver"])) {
      if (now - b.createdAt < holdMs) continue;
      const member = this.activeSigners(await this.repo.listSigners(b.id)).find((s) => s.role === "member");
      if (member?.status === "signed") {
        await this.deps.lifecycle.confirmAfterMemberSigned(b.id, member.signedAt ?? now);
        continue;
      }
      const changed = await this.deps.lifecycle.expireForUnsignedWaiver(b.id);
      if (!changed) continue;
      await this.voidBookingEnvelopes(b.id, "Booking expired — waiver not signed in time", "expired");
      expired.push(b.id);
      const contact = await this.repo.getMemberContact(b.memberId);
      if (contact?.email) {
        await this.deps.notifier.email(contact.email, `Booking ${b.bookingRef} expired — waiver not signed`, [
          `Your booking ${b.bookingRef} at ${b.propertyName} (${b.startDate}${b.endDate !== b.startDate ? ` – ${b.endDate}` : ""}) has been released because the booking waiver wasn't signed within ${settings.memberSignHoldHours} hours.`,
          `If you'd still like to go, please book again from the member portal.`,
        ]);
      }
      console.log(`[waivers] booking ${b.id} expired — member waiver not signed`);
    }
    return expired;
  }

  /** 72h/24h reminders to unsigned adults; at 24h, email member + ops the unsigned list. */
  async sendReminders(): Promise<void> {
    const now = this.now();
    const api = this.deps.api();
    const today = new Date(now).toISOString().slice(0, 10);
    const bookings = await this.repo.listBookingsStartingBetween(addDaysYmd(today, -1), addDaysYmd(today, 4), ACTIVE_BOOKING_STATUSES);
    for (const b of bookings) {
      const arrival = lodgeMidnight(b.startDate);
      const hoursUntil = (arrival - now) / HOUR;
      if (hoursUntil <= 0 || hoursUntil > 72) continue;
      const signers = this.activeSigners(await this.repo.listSigners(b.id));
      const unsigned = signers.filter((s) => UNSIGNED.has(s.status));
      const field: "reminder72SentAt" | "reminder24SentAt" = hoursUntil <= 24 ? "reminder24SentAt" : "reminder72SentAt";
      const toRemind = unsigned.filter((s) => !s[field]);
      // Group by envelope so each envelope gets one resend call.
      const byEnv = new Map<number, Signer[]>();
      for (const s of toRemind) if (s.envelopeRowId) byEnv.set(s.envelopeRowId, [...(byEnv.get(s.envelopeRowId) ?? []), s]);
      for (const [envRowId, list] of Array.from(byEnv.entries())) {
        const env = await this.repo.getEnvelope(envRowId);
        if (!env || env.status !== "sent" || !env.envelopeId || !api) continue;
        try {
          await api.resendRecipients(env.envelopeId, list.map((s) => String(s.id)));
          for (const s of list) {
            await this.repo.updateSigner(s.id, { [field]: now, ...(field === "reminder24SentAt" && !s.reminder72SentAt ? { reminder72SentAt: now } : {}), updatedAt: now });
          }
        } catch (err) {
          console.warn(`[waivers] reminder resend failed for envelope row ${envRowId}: ${errMessage(err)}`);
        }
      }
      if (hoursUntil <= 24 && !b.waiverSummarySentAt) {
        if (unsigned.length > 0) {
          const list = unsigned.map((s) => `• ${s.fullName}${s.role === "member" ? " (member)" : ""} — ${s.status === "viewed" ? "opened, not signed" : s.status === "declined" ? "declined" : s.status === "failed" ? "delivery failed" : "not signed"}`);
          const lines = [
            `Booking ${b.bookingRef} at ${b.propertyName} starts ${b.startDate}. These adults haven't signed the booking waiver yet:`,
            ...list,
            `Everyone must sign before entering the property. Members can resend or fix a guest's email/phone from the booking in the member portal.`,
          ];
          const contact = await this.repo.getMemberContact(b.memberId);
          if (contact?.email) await this.deps.notifier.email(contact.email, `Unsigned waivers for booking ${b.bookingRef}`, lines);
          const ops = this.deps.notifier.opsEmail();
          if (ops) await this.deps.notifier.email(ops, `Unsigned waivers — booking ${b.bookingRef} (arrives within 24h)`, lines);
        }
        await this.repo.setBookingWaiverSummarySent(b.id, now);
      }
    }
  }

  /** One scheduler tick (every minute). Each job is isolated so one failure doesn't stop the rest. */
  async tick(): Promise<void> {
    if (!this.enabled) return;
    for (const [name, job] of [
      ["retry", () => this.retryQueuedSends()],
      ["poll", () => this.pollOpenEnvelopes()],
      ["expire", () => this.expireUnsignedHolds()],
      ["reminders", () => this.sendReminders()],
    ] as const) {
      try { await job(); } catch (err) { console.error(`[waivers] scheduler job ${name} failed: ${errMessage(err)}`); }
    }
  }

  // ─── Read models ──────────────────────────────────────────────────────────

  /** Per-person waiver status for a booking (member portal + ops + check-in list). */
  async bookingWaiverView(bookingId: number) {
    const [booking, adults, minors, signers] = await Promise.all([
      this.repo.getBooking(bookingId),
      this.repo.listPartyAdults(bookingId),
      this.repo.listPartyMinors(bookingId),
      this.repo.listSigners(bookingId),
    ]);
    if (!booking) return null;
    const active = this.activeSigners(signers);
    const signedRows = signers.filter((s) => s.status === "signed");
    const people = adults.filter((a) => !a.removedAt).map((a) => {
      const s = active.find((x) => x.partyAdultId === a.id) ?? null;
      const signedOnFile = [...signedRows].reverse().find((x) => x.partyAdultId === a.id) ?? null;
      return {
        partyAdultId: a.id,
        role: a.isDesignatedMember ? "member" as const : "guest" as const,
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        signerId: s?.id ?? null,
        status: (s?.status ?? (signedOnFile ? "signed" : "queued")) as string,
        sentAt: s?.sentAt ?? null,
        viewedAt: s?.viewedAt ?? null,
        signedAt: s?.signedAt ?? signedOnFile?.signedAt ?? null,
        declineReason: s?.declineReason ?? null,
        lastError: s?.lastError ?? null,
        deliveryMethod: s?.deliveryMethod ?? null,
        hasSignedPdf: !!(s?.signedPdfKey ?? signedOnFile?.signedPdfKey),
        hasCertificate: !!(s?.certificatePdfKey ?? signedOnFile?.certificatePdfKey),
        minors: minors.filter((m) => m.adultId === a.id && !m.removedAt).map((m) => ({ id: m.id, fullName: m.fullName, dateOfBirth: m.dateOfBirth })),
      };
    });
    // A minor is covered once a signed waiver from their guardian lists them.
    const coveredBy = (m: { fullName: string; dateOfBirth: string | null }, adultId: number) =>
      signedRows.some((s) => s.partyAdultId === adultId && (s.minors ?? []).some((x) => x.fullName === m.fullName && (x.dateOfBirth ?? null) === (m.dateOfBirth ?? null)));
    const minorsView = minors.filter((m) => !m.removedAt).map((m) => {
      const guardian = adults.find((a) => a.id === m.adultId);
      return { id: m.id, fullName: m.fullName, dateOfBirth: m.dateOfBirth, guardianAdultId: m.adultId, guardianName: guardian?.fullName ?? "", covered: coveredBy(m, m.adultId) };
    });
    const signedCount = people.filter((p) => p.status === "signed").length;
    const envelopes = await this.repo.listEnvelopes(bookingId);
    return {
      booking,
      people,
      minors: minorsView,
      signedCount,
      totalAdults: people.length,
      envelopes: envelopes.map((e) => ({ id: e.id, status: e.status, emailOnly: e.emailOnly, lastError: e.lastError, sentAt: e.sentAt, attempts: e.attempts, nextAttemptAt: e.nextAttemptAt })),
    };
  }
}
