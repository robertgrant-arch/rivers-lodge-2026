/**
 * DocuSign Connect webhook: POST /api/webhooks/docusign
 *
 * Configure Connect (JSON, "SIM" event model, HMAC enabled) to send Envelope
 * and Recipient events here. Each request is verified against
 * DOCUSIGN_CONNECT_HMAC_SECRET using the X-DocuSign-Signature-1..N headers
 * (base64 HMAC-SHA256 of the raw body). Without a secret the endpoint refuses
 * everything and the scheduler polls open envelopes every 15 minutes instead.
 */
import express, { type Express } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { connectHmacSecret, isWaiversDocuSignEnabled } from "./config";
import { getWaiverService } from "./runtime";

export function verifyConnectHmac(secret: string, rawBody: Buffer | string, headers: Record<string, string | string[] | undefined>): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  for (let i = 1; i <= 10; i++) {
    const h = headers[`x-docusign-signature-${i}`];
    const v = Array.isArray(h) ? h[0] : h;
    if (!v) continue;
    let got: Buffer;
    try { got = Buffer.from(v, "base64"); } catch { continue; }
    if (got.length === expected.length && timingSafeEqual(got, expected)) return true;
  }
  return false;
}

export function registerDocuSignRoutes(app: Express): void {
  app.post("/api/webhooks/docusign", express.raw({ type: "*/*", limit: "5mb" }), async (req, res) => {
    const secret = connectHmacSecret();
    const raw: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ""));
    if (!secret || !verifyConnectHmac(secret, raw, req.headers as any)) {
      console.warn("[docusign-connect] rejected: missing or invalid HMAC signature");
      res.status(401).json({ ok: false });
      return;
    }
    if (!isWaiversDocuSignEnabled()) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }
    let payload: any;
    try { payload = JSON.parse(raw.toString("utf8")); } catch {
      res.status(400).json({ ok: false, error: "Expected JSON (configure Connect with the JSON data format)" });
      return;
    }
    try {
      const { envelopeId } = await getWaiverService().handleConnectEvent(payload);
      console.log(`[docusign-connect] ${String(payload?.event ?? "event")} envelope ${envelopeId ?? "?"}`);
      res.status(200).json({ ok: true });
    } catch (err) {
      // Non-2xx makes DocuSign retry later; polling is the backstop.
      console.error(`[docusign-connect] processing failed: ${(err as Error)?.message ?? err}`);
      res.status(500).json({ ok: false });
    }
  });
}
