/**
 * Generates a signed waiver PDF and uploads it to S3 storage.
 * Returns the storage key and URL for the generated PDF.
 */
import PDFDocument from "pdfkit";
import { storagePut } from "../../_core/server/storage";

export interface WaiverPdfData {
  waiverTitle: string;
  waiverContent: string;
  signatoryName: string;
  signatoryEmail?: string | null;
  signedAt: Date;
  ipAddress?: string | null;
  waiverToken: string;
}

/**
 * Generates a PDF buffer for a signed waiver.
 */
function generateWaiverPdfBuffer(data: WaiverPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: "LETTER" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Header ────────────────────────────────────────────────────────────────
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Rivers Lodge & Hunt Club", { align: "center" });

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666666")
      .text("La Cygne, Kansas", { align: "center" });

    doc.moveDown(0.5);

    // Divider
    doc
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .strokeColor("#cccccc")
      .lineWidth(1)
      .stroke();

    doc.moveDown(1);

    // ── Title ─────────────────────────────────────────────────────────────────
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#1a1a1a")
      .text(data.waiverTitle, { align: "center" });

    doc.moveDown(1.5);

    // ── Waiver Body ───────────────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#333333")
      .text(data.waiverContent, {
        align: "justify",
        lineGap: 4,
      });

    doc.moveDown(2);

    // ── Signature Block ───────────────────────────────────────────────────────
    // Divider
    doc
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .strokeColor("#cccccc")
      .lineWidth(1)
      .stroke();

    doc.moveDown(1);

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#1a1a1a")
      .text("Electronic Signature Record");

    doc.moveDown(0.5);

    const signedAtStr = data.signedAt.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      dateStyle: "full",
      timeStyle: "long",
    });

    const fields: [string, string][] = [
      ["Signatory Name", data.signatoryName],
      ["Email Address", data.signatoryEmail ?? "Not provided"],
      ["Date & Time Signed", signedAtStr],
      ["IP Address", data.ipAddress ?? "Not recorded"],
      ["Waiver Reference", data.waiverToken.slice(0, 16) + "…"],
    ];

    for (const [label, value] of fields) {
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#666666")
        .text(label + ":", { continued: false });
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#1a1a1a")
        .text(value);
      doc.moveDown(0.4);
    }

    doc.moveDown(1);

    // ── Legal Notice ──────────────────────────────────────────────────────────
    doc
      .moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .stroke();

    doc.moveDown(0.5);

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#888888")
      .text(
        "This document constitutes a legally binding electronic signature under the Electronic Signatures in Global and National Commerce Act (E-SIGN) and the Uniform Electronic Transactions Act (UETA). The electronic signature above is legally equivalent to a handwritten signature. This record is maintained by Rivers Lodge & Hunt Club for compliance purposes.",
        { align: "justify", lineGap: 2 }
      );

    doc.end();
  });
}

/**
 * Generates a signed waiver PDF and uploads it to S3.
 * Returns the storage key and URL.
 */
export async function generateAndStoreWaiverPdf(
  data: WaiverPdfData
): Promise<{ key: string; url: string }> {
  const pdfBuffer = await generateWaiverPdfBuffer(data);
  const fileKey = `waivers/signed/${data.waiverToken.slice(0, 16)}-${Date.now()}.pdf`;
  return storagePut(fileKey, pdfBuffer, "application/pdf");
}
