/**
 * Server-generated waiver documents (one PDF per signer).
 *
 * Each document is pre-filled with the waiver text and, for booking waivers,
 * the booking details and the "Minors covered by this waiver" list for that
 * adult. Signature, date and printed-name positions are marked with anchor
 * strings unique to the signer (drawn in white, so they're invisible but
 * still searchable by DocuSign), which the envelope's anchor tabs target.
 */
import PDFDocument from "pdfkit";

export interface WaiverDocInput {
  title: string;
  version: number;
  kind: "master" | "booking";
  body: string;
  /** Booking waivers only. */
  booking?: { bookingRef: string; propertyName: string; startDate: string; endDate: string };
  /** Booking waivers only: the minors this adult is responsible for. */
  minors?: Array<{ fullName: string; dateOfBirth: string | null }>;
  anchors: SignerAnchors;
}

export interface SignerAnchors {
  signature: string;
  date: string;
  name: string;
}

/** Anchor strings for a recipient — unique per recipient within an envelope. */
export function anchorsFor(recipientId: string): SignerAnchors {
  return { signature: `\\rls${recipientId}\\`, date: `\\rld${recipientId}\\`, name: `\\rln${recipientId}\\` };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function longDate(ymd: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd ?? ""));
  if (!m) return String(ymd ?? "");
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** Plain-text rendering of a document (used for tests and the read-only HTML view). */
export function waiverDocText(input: WaiverDocInput): string {
  const lines: string[] = [];
  lines.push("Rivers Lodge & Hunt Club", `${input.title} (version ${input.version})`, "");
  if (input.kind === "booking" && input.booking) {
    const b = input.booking;
    lines.push(`Booking #: ${b.bookingRef}`, `Property: ${b.propertyName}`,
      `Dates: ${longDate(b.startDate)}${b.endDate && b.endDate !== b.startDate ? ` – ${longDate(b.endDate)}` : ""}`, "");
  }
  lines.push(input.body, "");
  if (input.kind === "booking") {
    lines.push("Minors covered by this waiver");
    const minors = input.minors ?? [];
    if (minors.length === 0) lines.push("None listed.");
    for (const m of minors) lines.push(`• ${m.fullName}${m.dateOfBirth ? ` — date of birth ${longDate(m.dateOfBirth)}` : ""}`);
    lines.push("");
  }
  lines.push(`Signature: ${input.anchors.signature}`, `Printed name: ${input.anchors.name}`, `Date: ${input.anchors.date}`);
  return lines.join("\n");
}

export function buildWaiverPdf(input: WaiverDocInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: "LETTER" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a1a").text("Rivers Lodge & Hunt Club", { align: "center" });
    doc.fontSize(10).font("Helvetica").fillColor("#666666").text("La Cygne, Kansas", { align: "center" });
    doc.moveDown(0.8);
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a1a1a").text(input.title, { align: "center" });
    doc.fontSize(9).font("Helvetica").fillColor("#666666").text(`Version ${input.version}`, { align: "center" });
    doc.moveDown(1);

    if (input.kind === "booking" && input.booking) {
      const b = input.booking;
      const rows: Array<[string, string]> = [
        ["Booking #", b.bookingRef],
        ["Property", b.propertyName],
        ["Dates", `${longDate(b.startDate)}${b.endDate && b.endDate !== b.startDate ? ` – ${longDate(b.endDate)}` : ""}`],
      ];
      for (const [k, v] of rows) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#333333").text(`${k}: `, { continued: true }).font("Helvetica").text(v);
      }
      doc.moveDown(1);
    }

    doc.fontSize(10).font("Helvetica").fillColor("#333333").text(input.body, { align: "justify", lineGap: 3 });
    doc.moveDown(1.2);

    if (input.kind === "booking") {
      doc.fontSize(11).font("Helvetica-Bold").fillColor("#1a1a1a").text("Minors covered by this waiver");
      doc.moveDown(0.3);
      const minors = input.minors ?? [];
      if (minors.length === 0) {
        doc.fontSize(10).font("Helvetica").fillColor("#333333").text("None listed.");
      } else {
        for (const m of minors) {
          doc.fontSize(10).font("Helvetica").fillColor("#333333")
            .text(`•  ${m.fullName}${m.dateOfBirth ? ` — date of birth ${longDate(m.dateOfBirth)}` : ""}`);
        }
      }
      doc.moveDown(1.2);
    }

    if (doc.y > doc.page.height - 200) doc.addPage();
    const line = (label: string, anchor: string) => {
      const y = doc.y;
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#1a1a1a").text(label, 60, y);
      // Invisible anchor where the DocuSign tab is placed.
      doc.fontSize(6).font("Helvetica").fillColor("#ffffff").text(anchor, 160, y + 2, { lineBreak: false });
      doc.moveTo(160, y + 14).lineTo(doc.page.width - 60, y + 14).strokeColor("#999999").lineWidth(0.5).stroke();
      doc.x = 60;
      doc.y = y + 34;
    };
    line("Signature", input.anchors.signature);
    line("Printed name", input.anchors.name);
    line("Date", input.anchors.date);

    doc.end();
  });
}
