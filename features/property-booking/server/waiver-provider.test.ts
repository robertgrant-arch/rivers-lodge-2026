/**
 * Waiver Provider Tests
 * ====================
 * Verify no-op provider returns correct defaults, DocuSign stub throws appropriately,
 * and factory function selects the right provider based on env vars.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NoopWaiverProvider, DocuSignWaiverProvider, getWaiverProvider } from "./waiver-provider";
import { BookingPartyAdult, PropertyBooking } from "@core/db/property-booking-schema";

describe("Waiver Provider", () => {
  const mockAdult: BookingPartyAdult = {
    id: 1,
    bookingId: 1,
    fullName: "Test Adult",
    phone: "+1234567890",
    email: "test@example.com",
    isDesignatedMember: false,
    waiverStatus: "pending",
    waiverProvider: null,
    waiverEnvelopeId: null,
    waiverSentAt: null,
    waiverCompletedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockBooking: PropertyBooking = {
    id: 1,
    bookingRef: "RL-2026-00001",
    idempotencyKey: "test-idempotency-key",
    memberId: 1,
    userId: "test-user",
    propertyId: 1,
    seasonId: null,
    startDate: "2026-08-15",
    endDate: "2026-08-17",
    totalDays: 3,
    partySize: 1,
    guestNames: null,
    hasMinors: false,
    activity: "deer",
    timeSlot: "OVERNIGHT",
    huntingLicenseConfirmed: true,
    fishingLicenseConfirmed: false,
    waiverSignedAt: null,
    status: "confirmed",
    requiresApproval: false,
    approvedByUserId: null,
    approvedAt: null,
    declinedAt: null,
    declineReason: null,
    cancelledAt: null,
    cancellationReason: null,
    cancelledByUserId: null,
    isLateCancellation: false,
    totalAmount: 500,
    depositAmount: 250,
    depositPaid: 250,
    balanceDue: 250,
    currency: "USD",
    memberNotes: null,
    staffNotes: null,
    confirmationSentAt: null,
    reminderSentAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  describe("NoopWaiverProvider", () => {
    let noop: NoopWaiverProvider;

    beforeAll(() => {
      noop = new NoopWaiverProvider();
    });

    it("should return pending status on sendWaiver", async () => {
      const result = await noop.sendWaiver({
        adult: mockAdult,
        minors: [],
        booking: mockBooking,
      });

      expect(result).toMatchObject({
        envelopeId: expect.stringMatching(/^noop-/),
        status: "pending",
      });
    });

    it("should return pending status on getStatus", async () => {
      const status = await noop.getStatus("any-envelope-id");
      expect(status).toBe("pending");
    });

    it("should return pending status on handleWebhook", async () => {
      const result = await noop.handleWebhook({
        envelopeId: "test-envelope",
        status: "completed",
      });

      expect(result).toMatchObject({
        envelopeId: "test-envelope",
        status: "pending",
      });
    });

    it("should not throw any errors", async () => {
      await expect(
        noop.sendWaiver({
          adult: mockAdult,
          minors: [],
          booking: mockBooking,
        }),
      ).resolves.toBeDefined();

      await expect(noop.getStatus("envelope-123")).resolves.toBe("pending");

      await expect(
        noop.handleWebhook({ envelopeId: "env-456", status: "sent" }),
      ).resolves.toBeDefined();
    });
  });

  describe("DocuSignWaiverProvider", () => {
    it("should throw NotImplemented on sendWaiver", async () => {
      const provider = new DocuSignWaiverProvider(
        "test-key",
        "test-account",
        "test-template",
        "https://test.docusign.net",
      );

      await expect(
        provider.sendWaiver({
          adult: mockAdult,
          minors: [],
          booking: mockBooking,
        }),
      ).rejects.toThrow("not yet implemented");
    });

    it("should throw NotImplemented on getStatus", async () => {
      const provider = new DocuSignWaiverProvider(
        "test-key",
        "test-account",
        "test-template",
        "https://test.docusign.net",
      );

      await expect(provider.getStatus("envelope-123")).rejects.toThrow("not yet implemented");
    });

    it("should throw NotImplemented on handleWebhook", async () => {
      const provider = new DocuSignWaiverProvider(
        "test-key",
        "test-account",
        "test-template",
        "https://test.docusign.net",
      );

      await expect(
        provider.handleWebhook({ envelopeId: "env-456", status: "completed" }),
      ).rejects.toThrow("not yet implemented");
    });
  });

  describe("getWaiverProvider factory", () => {
    it("should return NoopWaiverProvider when env vars are not set", () => {
      // Clear DocuSign env vars
      delete process.env.DOCUSIGN_INTEGRATION_KEY;
      delete process.env.DOCUSIGN_ACCOUNT_ID;
      delete process.env.DOCUSIGN_TEMPLATE_ID;
      delete process.env.DOCUSIGN_BASE_URL;

      const provider = getWaiverProvider();
      expect(provider).toBeInstanceOf(NoopWaiverProvider);
    });

    it("should return DocuSignWaiverProvider when all required env vars are set", () => {
      // Set DocuSign env vars
      process.env.DOCUSIGN_INTEGRATION_KEY = "test-key";
      process.env.DOCUSIGN_ACCOUNT_ID = "test-account";
      process.env.DOCUSIGN_TEMPLATE_ID = "test-template";
      process.env.DOCUSIGN_BASE_URL = "https://test.docusign.net";

      const provider = getWaiverProvider();
      expect(provider).toBeInstanceOf(DocuSignWaiverProvider);

      // Cleanup
      delete process.env.DOCUSIGN_INTEGRATION_KEY;
      delete process.env.DOCUSIGN_ACCOUNT_ID;
      delete process.env.DOCUSIGN_TEMPLATE_ID;
      delete process.env.DOCUSIGN_BASE_URL;
    });

    it("should return NoopWaiverProvider if only some env vars are set", () => {
      // Set only partial env vars
      process.env.DOCUSIGN_INTEGRATION_KEY = "test-key";
      process.env.DOCUSIGN_ACCOUNT_ID = "test-account";
      // Missing TEMPLATE_ID and BASE_URL

      const provider = getWaiverProvider();
      expect(provider).toBeInstanceOf(NoopWaiverProvider);

      // Cleanup
      delete process.env.DOCUSIGN_INTEGRATION_KEY;
      delete process.env.DOCUSIGN_ACCOUNT_ID;
    });
  });
});
