import { describe, it, expect } from "vitest";
import { createHmac, generateKeyPairSync, createVerify } from "crypto";
import { buildJwtAssertion, DocuSignError, HttpDocuSignApi } from "./api";
import { verifyConnectHmac } from "./routes";
import type { DocuSignConfig } from "./config";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const cfg: DocuSignConfig = {
  integrationKey: "ik-123", userId: "user-guid", accountId: "acct-guid",
  basePath: "https://demo.docusign.net/restapi", oauthHost: "account-d.docusign.com",
  privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

describe("JWT Grant assertion", () => {
  it("is an RS256 JWT with the right claims and a valid signature", () => {
    const jwt = buildJwtAssertion(cfg, 1_700_000_000);
    const [h, p, sig] = jwt.split(".");
    const dec = (s: string) => JSON.parse(Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    expect(dec(h)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(dec(p)).toEqual({ iss: "ik-123", sub: "user-guid", aud: "account-d.docusign.com", iat: 1_700_000_000, exp: 1_700_003_600, scope: "signature impersonation" });
    const v = createVerify("RSA-SHA256");
    v.update(`${h}.${p}`);
    expect(v.verify(publicKey, Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64"))).toBe(true);
  });
});

describe("HttpDocuSignApi", () => {
  function fakeFetch(handler: (url: string, init: any) => { status: number; body: any }) {
    const calls: Array<{ url: string; init: any }> = [];
    const f = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      const r = handler(String(url), init);
      return new Response(typeof r.body === "string" ? r.body : JSON.stringify(r.body), { status: r.status });
    }) as unknown as typeof fetch;
    return { f, calls };
  }

  it("gets a token, then creates an envelope against the v2.1 account URL", async () => {
    const { f, calls } = fakeFetch((url) => url.includes("/oauth/token")
      ? { status: 200, body: { access_token: "tok", expires_in: 3600 } }
      : { status: 201, body: { envelopeId: "e-1", status: "sent" } });
    const api = new HttpDocuSignApi(cfg, f);
    const r = await api.createEnvelope({ emailSubject: "s", status: "sent", documents: [], recipients: { signers: [] } });
    expect(r.envelopeId).toBe("e-1");
    expect(calls[0].url).toBe("https://account-d.docusign.com/oauth/token");
    expect(calls[1].url).toBe("https://demo.docusign.net/restapi/v2.1/accounts/acct-guid/envelopes");
    expect(calls[1].init.headers.Authorization).toBe("Bearer tok");
  });

  it("surfaces DocuSign's own error code/message and classifies rejections vs outages", async () => {
    const { f } = fakeFetch((url) => url.includes("/oauth/token")
      ? { status: 200, body: { access_token: "tok", expires_in: 3600 } }
      : { status: 400, body: { errorCode: "INVALID_PHONE_NUMBER", message: "Phone number is invalid." } });
    const api = new HttpDocuSignApi(cfg, f);
    const err = await api.createEnvelope({ emailSubject: "s", status: "sent", documents: [], recipients: { signers: [] } }).catch((e) => e);
    expect(err).toBeInstanceOf(DocuSignError);
    expect(err.message).toBe("INVALID_PHONE_NUMBER: Phone number is invalid.");
    expect(err.transient).toBe(false);
    expect(new DocuSignError("x", 503, null).transient).toBe(true);
    expect(new DocuSignError("x", null, null).transient).toBe(true);
  });

  it("explains consent_required", async () => {
    const { f } = fakeFetch(() => ({ status: 400, body: { error: "consent_required" } }));
    const err = await new HttpDocuSignApi(cfg, f).voidEnvelope("e", "r").catch((e) => e);
    expect(err.message).toMatch(/consent/i);
  });

  it("treats per-recipient update errors as failures", async () => {
    const { f } = fakeFetch((url) => url.includes("/oauth/token")
      ? { status: 200, body: { access_token: "tok", expires_in: 3600 } }
      : { status: 200, body: { recipientUpdateResults: [{ recipientId: "3", errorDetails: { errorCode: "SMS_NOT_ENABLED", message: "SMS delivery is not enabled for this account." } }] } });
    const err = await new HttpDocuSignApi(cfg, f).updateRecipients("e", [{ recipientId: "3" }], { resend: true }).catch((e) => e);
    expect(err.message).toContain("SMS_NOT_ENABLED");
  });
});

describe("Connect HMAC", () => {
  const secret = "s3cret";
  const body = Buffer.from(JSON.stringify({ event: "recipient-completed", data: { envelopeId: "e" } }));
  const sig = createHmac("sha256", secret).update(body).digest("base64");

  it("accepts a valid signature in any X-DocuSign-Signature-N header", () => {
    expect(verifyConnectHmac(secret, body, { "x-docusign-signature-1": sig })).toBe(true);
    expect(verifyConnectHmac(secret, body, { "x-docusign-signature-1": "bogus", "x-docusign-signature-2": sig })).toBe(true);
  });
  it("rejects missing, wrong or tampered signatures", () => {
    expect(verifyConnectHmac(secret, body, {})).toBe(false);
    expect(verifyConnectHmac("other", body, { "x-docusign-signature-1": sig })).toBe(false);
    expect(verifyConnectHmac(secret, Buffer.concat([body, Buffer.from(" ")]), { "x-docusign-signature-1": sig })).toBe(false);
  });
});
