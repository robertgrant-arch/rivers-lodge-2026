/**
 * Minimal DocuSign eSignature REST v2.1 client (JWT Grant).
 *
 * Only the calls the waiver flow needs. Uses Node's crypto for the RS256
 * assertion, so there is no SDK dependency. Errors carry DocuSign's own
 * errorCode/message so staff and members see the real reason.
 *
 * Logging: envelope IDs and HTTP status only — never tokens, keys, emails,
 * phone numbers or names.
 */
import { createSign } from "crypto";
import type { DocuSignConfig } from "./config";

export type DsRecipientStatus =
  | "created" | "sent" | "delivered" | "signed" | "completed" | "declined"
  | "autoresponded" | "faxpending" | "voided" | string;

export interface DsSignerStatus {
  recipientId: string;
  status: DsRecipientStatus;
  deliveredDateTime?: string;
  signedDateTime?: string;
  declinedDateTime?: string;
  declinedReason?: string;
}

export interface DsEnvelopeDefinition {
  emailSubject: string;
  emailBlurb?: string;
  status: "sent";
  enforceSignerVisibility?: "true" | "false";
  documents: Array<{ documentId: string; name: string; fileExtension: string; documentBase64: string }>;
  recipients: { signers: DsSigner[] };
}

export interface DsSigner {
  recipientId: string;
  routingOrder: string;
  name: string;
  email: string;
  deliveryMethod: "Email";
  additionalNotifications?: Array<{
    secondaryDeliveryMethod: "SMS";
    phoneNumber: { countryCode: "1"; number: string };
  }>;
  tabs?: {
    signHereTabs?: DsAnchorTab[];
    dateSignedTabs?: DsAnchorTab[];
    fullNameTabs?: DsAnchorTab[];
  };
}

export interface DsAnchorTab {
  documentId?: string;
  anchorString: string;
  anchorUnits: "pixels";
  anchorXOffset: string;
  anchorYOffset: string;
  anchorIgnoreIfNotPresent?: "false" | "true";
}

/** A DocuSign rejection (4xx) or outage (5xx/network). */
export class DocuSignError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number | null,
    public readonly errorCode: string | null,
  ) {
    super(message);
    this.name = "DocuSignError";
  }
  /** True for outages / auth hiccups worth retrying; false for real rejections. */
  get transient(): boolean {
    if (this.httpStatus === null) return true; // network
    if (this.httpStatus >= 500 || this.httpStatus === 429 || this.httpStatus === 408) return true;
    if (this.httpStatus === 401) return true; // token expiry / consent — retry + alert ops
    return false;
  }
}

/** The surface the waiver service uses — mocked in tests. */
export interface DocuSignApi {
  createEnvelope(def: DsEnvelopeDefinition): Promise<{ envelopeId: string }>;
  getEnvelopeStatus(envelopeId: string): Promise<{ status: string; signers: DsSignerStatus[] }>;
  /** Correct recipients (name/email/SMS) and optionally resend notifications. */
  updateRecipients(envelopeId: string, signers: Array<Partial<DsSigner> & { recipientId: string }>, opts: { resend: boolean }): Promise<void>;
  /** Resend notifications (email + SMS) to unsigned recipients. */
  resendRecipients(envelopeId: string, recipientIds: string[]): Promise<void>;
  deleteRecipient(envelopeId: string, recipientId: string): Promise<void>;
  voidEnvelope(envelopeId: string, reason: string): Promise<void>;
  /** documentId "certificate" = certificate of completion. */
  getDocument(envelopeId: string, documentId: string): Promise<Buffer>;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** Build the RS256 JWT assertion for the JWT Grant. Exported for tests. */
export function buildJwtAssertion(cfg: DocuSignConfig, nowSec = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: cfg.integrationKey,
    sub: cfg.userId,
    aud: cfg.oauthHost,
    iat: nowSec,
    exp: nowSec + 3600,
    scope: "signature impersonation",
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${b64url(signer.sign(cfg.privateKey))}`;
}

type FetchLike = typeof fetch;

export class HttpDocuSignApi implements DocuSignApi {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly cfg: DocuSignConfig, private readonly fetchImpl: FetchLike = fetch) {}

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    let res: Response;
    try {
      res = await this.fetchImpl(`https://${this.cfg.oauthHost}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: buildJwtAssertion(this.cfg),
        }).toString(),
      });
    } catch (err) {
      throw new DocuSignError(`Couldn't reach DocuSign sign-in: ${(err as Error)?.message ?? "network error"}`, null, null);
    }
    const text = await res.text().catch(() => "");
    let body: any = {};
    try { body = JSON.parse(text); } catch { /* not JSON */ }
    if (!res.ok || !body.access_token) {
      const code = body.error ?? null;
      const msg = code === "consent_required"
        ? "DocuSign consent is required for the API user (open the consent URL once — see the PR setup notes)."
        : `DocuSign sign-in failed: ${body.error_description ?? body.error ?? res.statusText}`;
      console.error(`[docusign] token request failed (${res.status}) ${code ?? ""}`);
      throw new DocuSignError(msg, res.status === 400 ? 401 : res.status, code);
    }
    this.token = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in ?? 3600) * 1000 };
    return this.token.value;
  }

  private url(path: string) {
    return `${this.cfg.basePath}/v2.1/accounts/${this.cfg.accountId}${path}`;
  }

  private async request(method: string, path: string, body?: unknown, binary = false): Promise<any> {
    const token = await this.accessToken();
    let res: Response;
    try {
      res = await this.fetchImpl(this.url(path), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: binary ? "application/pdf" : "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new DocuSignError(`Couldn't reach DocuSign: ${(err as Error)?.message ?? "network error"}`, null, null);
    }
    if (res.status === 401) this.token = null;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let code: string | null = null;
      let message = text.slice(0, 300) || res.statusText;
      try { const j = JSON.parse(text); code = j.errorCode ?? null; message = j.message ?? message; } catch { /* not JSON */ }
      console.error(`[docusign] ${method} ${path.replace(/[0-9a-f-]{36}/gi, ":id")} failed (${res.status}) ${code ?? ""}`);
      throw new DocuSignError(code ? `${code}: ${message}` : message, res.status, code);
    }
    if (binary) return Buffer.from(await res.arrayBuffer());
    const text = await res.text().catch(() => "");
    if (!text) return {};
    try { return JSON.parse(text); } catch { return {}; }
  }

  async createEnvelope(def: DsEnvelopeDefinition) {
    const r = await this.request("POST", "/envelopes", def);
    if (!r.envelopeId) throw new DocuSignError("DocuSign didn't return an envelope ID", 502, null);
    return { envelopeId: String(r.envelopeId) };
  }

  async getEnvelopeStatus(envelopeId: string) {
    const [env, rec] = await Promise.all([
      this.request("GET", `/envelopes/${envelopeId}`),
      this.request("GET", `/envelopes/${envelopeId}/recipients`),
    ]);
    return {
      status: String(env.status ?? ""),
      signers: (rec.signers ?? []).map((s: any) => ({
        recipientId: String(s.recipientId),
        status: String(s.status ?? ""),
        deliveredDateTime: s.deliveredDateTime,
        signedDateTime: s.signedDateTime,
        declinedDateTime: s.declinedDateTime,
        declinedReason: s.declinedReason,
      })),
    };
  }

  async updateRecipients(envelopeId: string, signers: Array<Partial<DsSigner> & { recipientId: string }>, opts: { resend: boolean }) {
    const r = await this.request("PUT", `/envelopes/${envelopeId}/recipients${opts.resend ? "?resend_envelope=true" : ""}`, { signers });
    const failed = (r.recipientUpdateResults ?? []).find((x: any) => x?.errorDetails?.errorCode && x.errorDetails.errorCode !== "SUCCESS");
    if (failed) {
      const d = failed.errorDetails;
      throw new DocuSignError(`${d.errorCode}: ${d.message ?? "recipient update failed"}`, 400, d.errorCode);
    }
  }

  async resendRecipients(envelopeId: string, recipientIds: string[]) {
    if (recipientIds.length === 0) return;
    await this.updateRecipients(envelopeId, recipientIds.map((recipientId) => ({ recipientId })), { resend: true });
  }

  async deleteRecipient(envelopeId: string, recipientId: string) {
    await this.request("DELETE", `/envelopes/${envelopeId}/recipients`, { signers: [{ recipientId }] });
  }

  async voidEnvelope(envelopeId: string, reason: string) {
    await this.request("PUT", `/envelopes/${envelopeId}`, { status: "voided", voidedReason: reason.slice(0, 200) });
  }

  async getDocument(envelopeId: string, documentId: string) {
    return this.request("GET", `/envelopes/${envelopeId}/documents/${documentId}`, undefined, true) as Promise<Buffer>;
  }
}
