import { describe, it, expect } from "vitest";
import { DocuSignError } from "./api";
import { WaiverGateError, backoffMs } from "./service";
import { MockDocuSign, makeService } from "./testkit";
import { MAX_SMS_SIGNERS_PER_ENVELOPE, splitSignersIntoEnvelopes, mapRecipientStatus } from "./envelopes";
import { waiverDocText, anchorsFor } from "./documents";

const HOUR = 3_600_000;

function guests(n: number, withMinors = false) {
  return Array.from({ length: n }, (_, i) => ({
    fullName: `Guest ${i + 1}`,
    email: `guest${i + 1}@example.com`,
    phone: `81655501${String(i + 10).padStart(2, "0")}`,
    minors: withMinors && i === 0 ? [{ fullName: "Kid One", dateOfBirth: "2015-04-02" }] : [],
  }));
}

/** Sign a member's master waiver end-to-end through the service. */
async function signMaster(t: ReturnType<typeof makeService>, memberId: number) {
  const r = await t.svc.sendMasterWaiver(memberId);
  expect(r.ok).toBe(true);
  const rec = t.repo.masters.find((m) => m.memberId === memberId && m.status === "sent")!;
  await t.svc.applyEnvelopeStatus(rec.envelopeId!, t.ds.sign(rec.envelopeId!, "1"));
  return rec;
}

describe("Master waiver gate", () => {
  it("blocks booking without a signed Master waiver and unblocks once DocuSign reports completion", async () => {
    const t = makeService();
    t.repo.addMember(5);
    await expect(t.svc.assertMasterWaiverForBooking(5)).rejects.toBeInstanceOf(WaiverGateError);
    expect((await t.svc.masterStatus(5)).state).toBe("missing");

    const send = await t.svc.sendMasterWaiver(5);
    expect(send.ok).toBe(true);
    expect((await t.svc.masterStatus(5)).state).toBe("pending");
    await expect(t.svc.assertMasterWaiverForBooking(5)).rejects.toThrow(/master waiver/i);

    const rec = t.repo.masters[0];
    await t.svc.applyEnvelopeStatus(rec.envelopeId!, t.ds.sign(rec.envelopeId!, "1"));
    await expect(t.svc.assertMasterWaiverForBooking(5)).resolves.toBeUndefined();
    const s = await t.svc.masterStatus(5);
    expect(s.valid).toBe(true);
    // Signed PDF + certificate stored on the record.
    expect(t.repo.masters[0].signedPdfKey).toBeTruthy();
    expect(t.repo.masters[0].certificatePdfKey).toBeTruthy();
  });

  it("does nothing while the feature flag is off", async () => {
    const t = makeService({ enabled: false });
    t.repo.addMember(5);
    await expect(t.svc.assertMasterWaiverForBooking(5)).resolves.toBeUndefined();
    expect((await t.svc.startBookingWaivers(1)).ok).toBe(true);
    expect(t.ds.created).toHaveLength(0);
  });

  it("refuses bookings when no Master template is published", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.templates.master = null;
    await expect(t.svc.assertMasterWaiverForBooking(5)).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("a new Master version requires re-sign", async () => {
    const t = makeService();
    t.repo.addMember(5);
    await signMaster(t, 5);
    expect((await t.svc.masterStatus(5)).valid).toBe(true);
    t.repo.templates.master = { ...t.repo.templates.master!, version: 2 };
    const s = await t.svc.masterStatus(5);
    expect(s.valid).toBe(false);
    expect(s.state).toBe("outdated");
    await expect(t.svc.assertMasterWaiverForBooking(5)).rejects.toBeInstanceOf(WaiverGateError);
    // Signing v2 unblocks.
    await signMaster(t, 5);
    expect((await t.svc.masterStatus(5)).valid).toBe(true);
    expect(t.repo.masters.find((m) => m.status === "signed" && m.templateVersion === 2)).toBeTruthy();
  });

  it("staff 'Require re-sign' invalidates the waiver and sends a new one", async () => {
    const t = makeService();
    t.repo.addMember(5);
    await signMaster(t, 5);
    const before = t.ds.created.length;
    const r = await t.svc.requireMasterResign(5, "staff-1");
    expect(r.ok).toBe(true);
    expect(t.ds.created.length).toBe(before + 1);
    const s = await t.svc.masterStatus(5);
    expect(s.valid).toBe(false);
    expect(t.repo.masters.find((m) => m.invalidatedAt)?.invalidatedByUserId).toBe("staff-1");
  });

  it("12-month renewal (ops setting, default off)", async () => {
    const t = makeService();
    t.repo.addMember(5);
    await signMaster(t, 5);
    t.setNow(t.now() + 400 * 24 * HOUR);
    expect((await t.svc.masterStatus(5)).valid).toBe(true); // setting off
    t.repo.settings.masterRenewsEvery12Months = true;
    expect((await t.svc.masterStatus(5)).valid).toBe(false);
  });

  it("auto-sends to new members when the ops toggle is on (default) and not when off", async () => {
    const t = makeService();
    t.repo.addMember(5);
    await t.svc.onMemberCreated(5);
    expect(t.ds.created).toHaveLength(1);
    t.repo.addMember(6);
    t.repo.settings.autoSendMasterOnNewMember = false;
    await t.svc.onMemberCreated(6);
    expect(t.ds.created).toHaveLength(1);
  });

  it("member with no mobile on file gets email only", async () => {
    const t = makeService();
    t.repo.addMember(5, { phone: null });
    await t.svc.sendMasterWaiver(5);
    const signer = t.ds.created[0].def.recipients.signers[0];
    expect(signer.deliveryMethod).toBe("Email");
    expect(signer.additionalNotifications).toBeUndefined();
  });
});

describe("Booking waiver envelope", () => {
  it("sends ONE envelope to the member + every adult guest, parallel, Email + SMS (countryCode 1), own documents", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, guests: guests(3) });
    const r = await t.svc.startBookingWaivers(1);
    expect(r.ok).toBe(true);
    expect(t.ds.created).toHaveLength(1);
    const def = t.ds.created[0].def;
    expect(def.recipients.signers).toHaveLength(4);
    expect((def as any).templateRoles).toBeUndefined();
    expect(def.documents).toHaveLength(4);
    for (const s of def.recipients.signers) {
      expect(s.routingOrder).toBe("1");
      expect(s.deliveryMethod).toBe("Email");
      expect(s.additionalNotifications?.[0]).toMatchObject({ secondaryDeliveryMethod: "SMS", phoneNumber: { countryCode: "1" } });
      expect(s.additionalNotifications?.[0].phoneNumber.number).toMatch(/^\d{10}$/);
      // Anchor tabs for signature, date and printed name on the signer's OWN document.
      const docIds = new Set([...(s.tabs!.signHereTabs ?? []), ...(s.tabs!.dateSignedTabs ?? []), ...(s.tabs!.fullNameTabs ?? [])].map((x) => x.documentId));
      expect(docIds.size).toBe(1);
      expect(s.tabs!.signHereTabs![0].anchorString).toBe(anchorsFor(s.recipientId).signature);
      expect(s.tabs!.dateSignedTabs![0].anchorString).toBe(anchorsFor(s.recipientId).date);
      expect(s.tabs!.fullNameTabs![0].anchorString).toBe(anchorsFor(s.recipientId).name);
    }
    const ownDocs = def.recipients.signers.map((s) => s.tabs!.signHereTabs![0].documentId);
    expect(new Set(ownDocs).size).toBe(4);
    expect(def.enforceSignerVisibility).toBe("true");
    // Booking details are in the subject; every signer row is "sent".
    expect(def.emailSubject).toContain("RL-2026-00001");
    expect(t.repo.signers.every((s) => s.status === "sent")).toBe(true);
  });

  it("never skips prior signers: a second booking sends to everyone again", async () => {
    const t = makeService();
    t.repo.addMember(5);
    const g = guests(2);
    t.repo.addBooking({ id: 1, memberId: 5, guests: g });
    await t.svc.startBookingWaivers(1);
    const env1 = t.ds.created[0].envelopeId;
    for (const s of t.ds.created[0].def.recipients.signers) await t.svc.applyEnvelopeStatus(env1, t.ds.sign(env1, s.recipientId));
    t.repo.addBooking({ id: 2, memberId: 5, guests: g, startDate: "2026-12-27" });
    await t.svc.startBookingWaivers(2);
    expect(t.ds.created).toHaveLength(2);
    expect(t.ds.created[1].def.recipients.signers.map((s) => s.email).sort()).toEqual(["guest1@example.com", "guest2@example.com", "member5@example.com"]);
  });

  it("puts each minor on their guardian's copy only (minors don't sign)", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, guests: guests(2, true), memberMinors: [{ fullName: "Member Kid", dateOfBirth: "2016-01-09" }] });
    await t.svc.startBookingWaivers(1);
    const def = t.ds.created[0].def;
    expect(def.recipients.signers).toHaveLength(3); // minors are not signers
    const bySigner = Object.fromEntries(t.repo.signers.map((s) => [s.fullName, s.minors.map((m) => m.fullName)]));
    expect(bySigner["Member 5"]).toEqual(["Member Kid"]);
    expect(bySigner["Guest 1"]).toEqual(["Kid One"]);
    expect(bySigner["Guest 2"]).toEqual([]);
    const text = waiverDocText({
      title: "Waiver", version: 1, kind: "booking", body: "Body",
      booking: { bookingRef: "RL-2026-00001", propertyName: "North Marsh", startDate: "2026-12-20", endDate: "2026-12-21" },
      minors: t.repo.signers.find((s) => s.fullName === "Guest 1")!.minors, anchors: anchorsFor("9"),
    });
    expect(text).toContain("Minors covered by this waiver");
    expect(text).toContain("Kid One — date of birth April 2, 2015");
    expect(text).toContain("Booking #: RL-2026-00001");
    expect(text).toContain("Property: North Marsh");
  });

  it(`splits into extra envelopes when more than ${MAX_SMS_SIGNERS_PER_ENVELOPE} signers need SMS (member in the first)`, async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, guests: guests(11) }); // 12 signers
    await t.svc.startBookingWaivers(1);
    expect(t.ds.created).toHaveLength(2);
    expect(t.ds.created[0].def.recipients.signers).toHaveLength(10);
    expect(t.ds.created[1].def.recipients.signers).toHaveLength(2);
    expect(t.ds.created[0].def.recipients.signers[0].email).toBe("member5@example.com");
    expect(t.ds.created[1].def.recipients.signers.some((s) => s.email === "member5@example.com")).toBe(false);
  });

  it("does not split exactly 10 SMS signers, nor email-only envelopes", () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, role: i === 0 ? "member" : "guest", fullName: "x", email: `${i}@x.com`, phone: "8165550100" }));
    expect(splitSignersIntoEnvelopes(mk(10), { emailOnly: false })).toHaveLength(1);
    expect(splitSignersIntoEnvelopes(mk(25), { emailOnly: true })).toHaveLength(1);
    const chunks = splitSignersIntoEnvelopes(mk(25), { emailOnly: false });
    expect(chunks.map((c) => c.length)).toEqual([10, 10, 5]);
    expect(chunks[0][0].role).toBe("member");
  });
});

describe("Pending → confirmed / expired", () => {
  it("confirms the booking as soon as the MEMBER signs (guests don't confirm it)", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, guests: guests(2) });
    await t.svc.startBookingWaivers(1);
    const env = t.ds.created[0].envelopeId;
    const member = t.repo.signers.find((s) => s.role === "member")!;
    const guest = t.repo.signers.find((s) => s.role === "guest")!;
    await t.svc.applyEnvelopeStatus(env, t.ds.sign(env, String(guest.id)));
    expect(t.repo.bookings.get(1)!.status).toBe("pending_waiver");
    await t.svc.applyEnvelopeStatus(env, t.ds.sign(env, String(member.id)));
    expect(t.repo.bookings.get(1)!.status).toBe("confirmed");
    // Envelope not complete yet (one guest left) — tracked per recipient.
    expect(t.repo.envelopes[0].status).toBe("sent");
    expect(t.repo.signers.find((s) => s.id === member.id)!.signedPdfKey).toBeTruthy();
  });

  it("goes to pending_approval instead when the property requires approval", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, requiresApproval: true });
    await t.svc.startBookingWaivers(1);
    const env = t.ds.created[0].envelopeId;
    await t.svc.applyEnvelopeStatus(env, t.ds.sign(env, t.ds.created[0].def.recipients.signers[0].recipientId));
    expect(t.repo.bookings.get(1)!.status).toBe("pending_approval");
  });

  it("stores the certificate of completion on every waiver record when the envelope completes", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, guests: guests(1) });
    await t.svc.startBookingWaivers(1);
    const env = t.ds.created[0].envelopeId;
    for (const s of t.repo.signers) await t.svc.applyEnvelopeStatus(env, t.ds.sign(env, String(s.id)));
    expect(t.repo.envelopes[0].status).toBe("completed");
    expect(t.repo.signers.every((s) => s.signedPdfKey && s.certificatePdfKey)).toBe(true);
    expect(t.ds.docsFetched.some((d) => d.documentId === "certificate")).toBe(true);
  });

  it("expires the hold after 24h without the member's signature: voids envelopes and notifies the member", async () => {
    const t = makeService();
    t.repo.addMember(5);
    const created = t.now();
    t.repo.addBooking({ id: 1, memberId: 5, guests: guests(1), createdAt: created });
    await t.svc.startBookingWaivers(1);
    t.setNow(created + 23 * HOUR);
    expect(await t.svc.expireUnsignedHolds()).toEqual([]);
    t.setNow(created + 24 * HOUR + 1);
    expect(await t.svc.expireUnsignedHolds()).toEqual([1]);
    expect(t.repo.bookings.get(1)!.status).toBe("expired_waiver");
    expect(t.ds.voided).toHaveLength(1);
    expect(t.repo.envelopes[0].status).toBe("voided");
    expect(t.repo.signers.every((s) => s.status === "expired")).toBe(true);
    expect(t.emails.some((e) => e.to === "member5@example.com" && /expired/i.test(e.subject))).toBe(true);
    // A late signature can't confirm an expired booking.
    await t.lifecycle.confirmAfterMemberSigned(1);
    expect(t.repo.bookings.get(1)!.status).toBe("expired_waiver");
  });

  it("honours the ops hold-hours setting", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.settings.memberSignHoldHours = 48;
    t.repo.addBooking({ id: 1, memberId: 5, createdAt: t.now() });
    await t.svc.startBookingWaivers(1);
    t.setNow(t.now() + 30 * HOUR);
    expect(await t.svc.expireUnsignedHolds()).toEqual([]);
  });
});

describe("Errors", () => {
  it("shows DocuSign's real rejection, doesn't mark sent, and offers email only", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, guests: guests(1) });
    t.ds.failCreate = new DocuSignError("INVALID_PHONE_NUMBER: The phone number is invalid.", 400, "INVALID_PHONE_NUMBER");
    const r = await t.svc.startBookingWaivers(1);
    expect(r).toMatchObject({ ok: false, canEmailOnly: true });
    expect(r.error).toContain("INVALID_PHONE_NUMBER");
    expect(t.repo.signers.every((s) => s.status === "failed" && s.sentAt === null)).toBe(true);
    expect(t.repo.bookings.get(1)!.status).toBe("pending_waiver");

    t.ds.failCreate = null;
    const member = t.repo.signers.find((s) => s.role === "member")!;
    const again = await t.svc.resendSigner(member.id, { emailOnly: true });
    expect(again.ok).toBe(true);
    const def = t.ds.created[0].def;
    expect(def.recipients.signers.every((s) => s.additionalNotifications === undefined)).toBe(true);
    expect(t.repo.signers.every((s) => s.status === "sent" && s.deliveryMethod === "email")).toBe(true);
  });

  it("queues on outage, retries with backoff, alerts ops after an hour, never confirms", async () => {
    const t = makeService();
    t.repo.addMember(5);
    const start = t.now();
    t.repo.addBooking({ id: 1, memberId: 5, createdAt: start });
    t.ds.failCreate = new DocuSignError("Service unavailable", 503, null);
    const r = await t.svc.startBookingWaivers(1);
    expect(r).toMatchObject({ ok: false, queued: true });
    expect(t.repo.envelopes[0]).toMatchObject({ status: "queued", attempts: 1 });
    expect(t.repo.envelopes[0].nextAttemptAt).toBe(start + backoffMs(1));

    // Not due yet → no call.
    await t.svc.retryQueuedSends();
    expect(t.repo.envelopes[0].attempts).toBe(1);
    // Keep failing for over an hour.
    for (let i = 0; i < 20 && t.now() - start <= 61 * 60_000; i++) {
      t.setNow(t.repo.envelopes[0].nextAttemptAt!);
      await t.svc.retryQueuedSends();
    }
    expect(t.repo.envelopes[0].attempts).toBeGreaterThan(3);
    expect(t.emails.filter((e) => e.to === "ops@example.com" && /failing/i.test(e.subject))).toHaveLength(1);
    expect(t.repo.bookings.get(1)!.status).toBe("pending_waiver");

    // DocuSign comes back.
    t.ds.failCreate = null;
    t.setNow(t.repo.envelopes[0].nextAttemptAt!);
    await t.svc.retryQueuedSends();
    expect(t.repo.envelopes[0].status).toBe("sent");
    expect(t.repo.bookings.get(1)!.status).toBe("pending_waiver");
  });

  it("backoff grows and caps at 15 minutes", () => {
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(2)).toBe(120_000);
    expect(backoffMs(10)).toBe(15 * 60_000);
  });
});

describe("Status sync: Connect webhook + polling", () => {
  it("maps recipient statuses", () => {
    expect(mapRecipientStatus("sent")).toBe("sent");
    expect(mapRecipientStatus("delivered")).toBe("viewed");
    expect(mapRecipientStatus("completed")).toBe("signed");
    expect(mapRecipientStatus("declined")).toBe("declined");
    expect(mapRecipientStatus("created")).toBeNull();
  });

  it("applies a Connect event with envelope data (viewed, declined)", async () => {
    const t = makeService({ connect: true });
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, guests: guests(1) });
    await t.svc.startBookingWaivers(1);
    const env = t.ds.created[0].envelopeId;
    const [m, g] = t.repo.signers;
    await t.svc.handleConnectEvent({
      event: "recipient-delivered",
      data: { envelopeId: env, envelopeSummary: { status: "sent", recipients: { signers: [
        { recipientId: String(m.id), status: "delivered", deliveredDateTime: "2026-12-01T13:00:00Z" },
        { recipientId: String(g.id), status: "declined", declinedReason: "Wrong person" },
      ] } } },
    });
    expect(t.repo.signers[0].status).toBe("viewed");
    expect(t.repo.signers[1]).toMatchObject({ status: "declined", declineReason: "Wrong person" });
    // Out-of-order "sent" doesn't move a viewed signer backwards.
    await t.svc.handleConnectEvent({ data: { envelopeId: env, envelopeSummary: { status: "sent", recipients: { signers: [{ recipientId: String(m.id), status: "sent" }] } } } });
    expect(t.repo.signers[0].status).toBe("viewed");
  });

  it("fetches status from DocuSign when the Connect event has no envelope data", async () => {
    const t = makeService({ connect: true });
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5 });
    await t.svc.startBookingWaivers(1);
    const env = t.ds.created[0].envelopeId;
    t.ds.sign(env, String(t.repo.signers[0].id));
    await t.svc.handleConnectEvent({ event: "recipient-completed", data: { envelopeId: env } });
    expect(t.repo.bookings.get(1)!.status).toBe("confirmed");
  });

  it("polls open envelopes every 15 minutes only when Connect isn't configured", async () => {
    const withConnect = makeService({ connect: true });
    withConnect.repo.addMember(5);
    withConnect.repo.addBooking({ id: 1, memberId: 5 });
    await withConnect.svc.startBookingWaivers(1);
    expect(await withConnect.svc.pollOpenEnvelopes()).toBe(0);

    const t = makeService({ connect: false });
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5 });
    await t.svc.startBookingWaivers(1);
    const env = t.ds.created[0].envelopeId;
    expect(await t.svc.pollOpenEnvelopes()).toBe(1);
    t.ds.sign(env, String(t.repo.signers[0].id));
    t.setNow(t.now() + 5 * 60_000);
    expect(await t.svc.pollOpenEnvelopes()).toBe(0); // polled < 15 min ago
    t.setNow(t.now() + 11 * 60_000);
    expect(await t.svc.pollOpenEnvelopes()).toBe(1);
    expect(t.repo.bookings.get(1)!.status).toBe("confirmed");
  });

  it("polls open Master waivers too", async () => {
    const t = makeService({ connect: false });
    t.repo.addMember(5);
    await t.svc.sendMasterWaiver(5);
    t.ds.sign(t.repo.masters[0].envelopeId!, "1");
    await t.svc.pollOpenEnvelopes();
    expect((await t.svc.masterStatus(5)).valid).toBe(true);
  });
});

describe("Reminders", () => {
  it("resends to unsigned adults at 72h and 24h, and emails member + ops the unsigned list at 24h", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, status: "confirmed", startDate: "2026-12-10", guests: guests(2) });
    await t.svc.startBookingWaivers(1);
    const env = t.ds.created[0].envelopeId;
    const member = t.repo.signers.find((s) => s.role === "member")!;
    await t.svc.applyEnvelopeStatus(env, t.ds.sign(env, String(member.id)));

    const arrival = Date.parse("2026-12-10T06:00:00Z"); // midnight CST
    t.setNow(arrival - 100 * HOUR);
    await t.svc.sendReminders();
    expect(t.ds.resends).toHaveLength(0);

    t.setNow(arrival - 70 * HOUR);
    await t.svc.sendReminders();
    expect(t.ds.resends).toHaveLength(1);
    expect(t.ds.resends[0].recipientIds.sort()).toEqual(t.repo.signers.filter((s) => s.role === "guest").map((s) => String(s.id)).sort());
    await t.svc.sendReminders(); // no duplicate 72h reminder
    expect(t.ds.resends).toHaveLength(1);
    expect(t.emails).toHaveLength(0);

    t.setNow(arrival - 20 * HOUR);
    await t.svc.sendReminders();
    expect(t.ds.resends).toHaveLength(2);
    const summary = t.emails.filter((e) => /Unsigned waivers/.test(e.subject));
    expect(summary.map((e) => e.to).sort()).toEqual(["member5@example.com", "ops@example.com"]);
    expect(summary[0].paragraphs.join("\n")).toContain("Guest 1");
    expect(summary[0].paragraphs.join("\n")).not.toContain("Member 5 (member)");
    await t.svc.sendReminders();
    expect(t.emails.filter((e) => /Unsigned waivers/.test(e.subject))).toHaveLength(2);
  });
});

describe("Add / edit / remove guests", () => {
  async function setup() {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, status: "confirmed", guests: guests(2) });
    await t.svc.startBookingWaivers(1);
    return t;
  }

  it("adding an adult guest sends them a booking waiver immediately", async () => {
    const t = await setup();
    const r = await t.svc.addAdultGuest(1, { fullName: "Late Guest", email: "late@example.com", phone: "(913) 555-0199" });
    expect(r.ok).toBe(true);
    expect(t.ds.created).toHaveLength(2);
    const s = t.ds.created[1].def.recipients.signers;
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ email: "late@example.com" });
    expect(s[0].additionalNotifications?.[0].phoneNumber.number).toBe("9135550199");
  });

  it("rejects a duplicate email when adding a guest", async () => {
    const t = await setup();
    await expect(t.svc.addAdultGuest(1, { fullName: "Dup", email: "GUEST1@example.com", phone: "9135550199" })).rejects.toThrow(/already/);
  });

  it("adding a minor re-sends their guardian a waiver that lists them", async () => {
    const t = await setup();
    const guardian = t.repo.adults.find((a) => a.fullName === "Guest 1")!;
    const r = await t.svc.addMinor(1, { fullName: "New Kid", dateOfBirth: "2018-06-01", guardianAdultId: guardian.id });
    expect(r.ok).toBe(true);
    const fresh = t.repo.signers.filter((s) => s.partyAdultId === guardian.id);
    expect(fresh.map((s) => s.status)).toEqual(["voided", "sent"]);
    expect(fresh[1].minors).toEqual([{ fullName: "New Kid", dateOfBirth: "2018-06-01" }]);
    expect(t.ds.deleted).toHaveLength(1); // old recipient removed from the first envelope
  });

  it("editing a guest corrects the DocuSign recipient and resends", async () => {
    const t = await setup();
    const g = t.repo.signers.find((s) => s.fullName === "Guest 2")!;
    const r = await t.svc.editSigner(g.id, { email: "fixed@example.com", phone: "913-555-0177" });
    expect(r.ok).toBe(true);
    expect(t.ds.updates).toHaveLength(1);
    expect(t.ds.updates[0]).toMatchObject({ resend: true, signers: [{ recipientId: String(g.id), email: "fixed@example.com" }] });
    expect(t.ds.updates[0].signers[0].additionalNotifications?.[0].phoneNumber.number).toBe("9135550177");
    expect(t.repo.signers.find((s) => s.id === g.id)!.email).toBe("fixed@example.com");
    expect(t.repo.adults.find((a) => a.id === g.partyAdultId)!.email).toBe("fixed@example.com");
  });

  it("an edit DocuSign rejects is not saved and offers email only", async () => {
    const t = await setup();
    const g = t.repo.signers.find((s) => s.fullName === "Guest 2")!;
    t.ds.failUpdate = new DocuSignError("SMS_OPTED_OUT: The recipient has opted out of SMS.", 400, "SMS_OPTED_OUT");
    await expect(t.svc.editSigner(g.id, { phone: "913-555-0177" })).rejects.toMatchObject({ canEmailOnly: true, message: expect.stringContaining("SMS_OPTED_OUT") });
    expect(t.repo.signers.find((s) => s.id === g.id)!.phone).toBe(g.phone);
  });

  it("removing a guest deletes their recipient; the member can't be removed", async () => {
    const t = await setup();
    const g = t.repo.adults.find((a) => a.fullName === "Guest 1")!;
    await t.svc.removeGuest(1, g.id);
    expect(t.ds.deleted).toEqual([{ envelopeId: t.ds.created[0].envelopeId, recipientId: String(t.repo.signers.find((s) => s.partyAdultId === g.id)!.id) }]);
    expect(t.repo.signers.find((s) => s.partyAdultId === g.id)!.status).toBe("removed");
    const view = await t.svc.bookingWaiverView(1);
    expect(view!.people.map((p) => p.fullName)).toEqual(["Member 5", "Guest 2"]);
    const member = t.repo.adults.find((a) => a.isDesignatedMember)!;
    await expect(t.svc.removeGuest(1, member.id)).rejects.toThrow(/can't be removed/);
  });

  it("removing a guest who is alone in their envelope voids it", async () => {
    const t = await setup();
    await t.svc.addAdultGuest(1, { fullName: "Late Guest", email: "late@example.com", phone: "9135550199" });
    const late = t.repo.adults.find((a) => a.fullName === "Late Guest")!;
    await t.svc.removeGuest(1, late.id);
    expect(t.ds.voided.map((v) => v.envelopeId)).toEqual([t.ds.created[1].envelopeId]);
  });

  it("per-person view: 'x of y signed', and minors covered by whom", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, guests: guests(2, true) });
    await t.svc.startBookingWaivers(1);
    const env = t.ds.created[0].envelopeId;
    const g1 = t.repo.signers.find((s) => s.fullName === "Guest 1")!;
    await t.svc.applyEnvelopeStatus(env, t.ds.sign(env, String(g1.id)));
    const v = (await t.svc.bookingWaiverView(1))!;
    expect(v.signedCount).toBe(1);
    expect(v.totalAdults).toBe(3);
    expect(v.minors).toEqual([expect.objectContaining({ fullName: "Kid One", guardianName: "Guest 1", covered: true })]);
  });
});

describe("Cancellation", () => {
  it("voids open envelopes when the booking is cancelled", async () => {
    const t = makeService();
    t.repo.addMember(5);
    t.repo.addBooking({ id: 1, memberId: 5, guests: guests(1) });
    await t.svc.startBookingWaivers(1);
    await t.svc.onBookingCancelled(1);
    expect(t.ds.voided).toHaveLength(1);
    expect(t.repo.signers.every((s) => s.status === "voided")).toBe(true);
  });
});

describe("DocuSign not configured", () => {
  it("master send explains that DocuSign isn't configured", async () => {
    const t = makeService({ api: null });
    t.repo.addMember(5);
    const r = await t.svc.sendMasterWaiver(5);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/isn't configured/);
    expect(new MockDocuSign().created).toHaveLength(0);
  });
});
