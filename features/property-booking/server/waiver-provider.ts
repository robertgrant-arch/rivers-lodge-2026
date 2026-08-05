/**
 * Waiver Provider
 * ===============
 * Pluggable interface for waiver distribution and tracking.
 * Supports multiple backends (DocuSign, future providers).
 *
 * This is DORMANT—all methods no-op by default. Enable by setting DOCUSIGN_* env vars.
 */

import { BookingPartyAdult, BookingPartyMinor, PropertyBooking } from "@core/db/property-booking-schema";

export type WaiverStatus = "pending" | "sent" | "completed" | "overdue";

export interface SendWaiverInput {
  adult: BookingPartyAdult;
  minors: BookingPartyMinor[];
  booking: PropertyBooking;
  callbackUrl?: string; // Webhook callback for status updates
}

export interface SendWaiverOutput {
  envelopeId: string;
  status: WaiverStatus;
}

export interface WebhookPayload {
  envelopeId: string;
  status: WaiverStatus;
  timestamp?: number;
  [key: string]: any;
}

/**
 * WaiverProvider: Pluggable interface for waiver workflows.
 * All methods return sensible no-op defaults when dormant.
 */
export interface WaiverProvider {
  /**
   * Send a waiver to an adult (and optionally track dependents).
   * Returns {envelopeId, status} so the booking can record the reference.
   */
  sendWaiver(input: SendWaiverInput): Promise<SendWaiverOutput>;

  /**
   * Poll the status of a previously-sent waiver by envelope ID.
   * Called by admin UI, cron jobs, or webhook handlers to sync state.
   */
  getStatus(envelopeId: string): Promise<WaiverStatus>;

  /**
   * Handle incoming webhook from provider (e.g., DocuSign webhook when envelope is signed).
   * Returns {envelopeId, status} so caller can update the booking record.
   * Implementation should verify webhook signature/token.
   */
  handleWebhook(payload: WebhookPayload): Promise<{ envelopeId: string; status: WaiverStatus }>;
}

/**
 * NoopWaiverProvider: Default no-op implementation.
 * Logs all calls; returns pending status; does not send anything.
 * Used when DOCUSIGN_* env vars are not configured.
 */
export class NoopWaiverProvider implements WaiverProvider {
  async sendWaiver(input: SendWaiverInput): Promise<SendWaiverOutput> {
    console.log(
      `[waiver] NOOP sendWaiver for ${input.adult.fullName} (email: ${input.adult.email}) on booking ${input.booking.id}`,
    );
    return {
      envelopeId: `noop-${Date.now()}`,
      status: "pending",
    };
  }

  async getStatus(_envelopeId: string): Promise<WaiverStatus> {
    console.log(`[waiver] NOOP getStatus for envelope ${_envelopeId}`);
    return "pending";
  }

  async handleWebhook(payload: WebhookPayload): Promise<{ envelopeId: string; status: WaiverStatus }> {
    console.log(`[waiver] NOOP handleWebhook for envelope ${payload.envelopeId}`, payload);
    return {
      envelopeId: payload.envelopeId,
      status: "pending",
    };
  }
}

/**
 * DocuSignWaiverProvider: Stub for future implementation.
 * To be filled in by Slice 2/3 when DOCUSIGN_* env vars are available.
 */
export class DocuSignWaiverProvider implements WaiverProvider {
  constructor(
    private integrationKey: string,
    private accountId: string,
    private templateId: string,
    private baseUrl: string,
    private webhookSecret?: string,
  ) {}

  async sendWaiver(_input: SendWaiverInput): Promise<SendWaiverOutput> {
    // TODO: Implement DocuSign envelope creation
    // 1. Validate input
    // 2. Create envelope with template
    // 3. Add recipient(s) and signer tabs
    // 4. Set callback webhook
    // 5. Send envelope
    // 6. Return envelopeId
    throw new Error("DocuSignWaiverProvider.sendWaiver not yet implemented");
  }

  async getStatus(_envelopeId: string): Promise<WaiverStatus> {
    // TODO: Implement DocuSign envelope status polling
    // 1. Call DocuSign API to fetch envelope status
    // 2. Map to WaiverStatus enum
    // 3. Return status
    throw new Error("DocuSignWaiverProvider.getStatus not yet implemented");
  }

  async handleWebhook(_payload: WebhookPayload): Promise<{ envelopeId: string; status: WaiverStatus }> {
    // TODO: Implement DocuSign webhook handler
    // 1. Verify webhook signature using webhookSecret
    // 2. Extract envelopeId and status from payload
    // 3. Return normalized response
    throw new Error("DocuSignWaiverProvider.handleWebhook not yet implemented");
  }
}

/**
 * Factory: Get the configured WaiverProvider.
 * Returns NoopWaiverProvider by default; switches to DocuSign if env vars are present.
 */
export function getWaiverProvider(): WaiverProvider {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const templateId = process.env.DOCUSIGN_TEMPLATE_ID;
  const baseUrl = process.env.DOCUSIGN_BASE_URL;

  if (integrationKey && accountId && templateId && baseUrl) {
    console.log("[waiver-provider] Initializing DocuSignWaiverProvider");
    return new DocuSignWaiverProvider(
      integrationKey,
      accountId,
      templateId,
      baseUrl,
      process.env.DOCUSIGN_WEBHOOK_SECRET,
    );
  }

  console.log("[waiver-provider] Using NoopWaiverProvider (DOCUSIGN_* env vars not configured)");
  return new NoopWaiverProvider();
}
