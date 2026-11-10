import { PROPERTY_MAP_UPLOAD, formatMB, type MapContentType } from "@shared/propertyRules";

export type PreparedMap = { base64: string; contentType: MapContentType; fileName: string };

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Couldn't read the file. Please try again."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  const src = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, revoke: () => URL.revokeObjectURL(src) });
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("This image can't be read. Please choose a JPG, PNG or PDF."));
    };
    img.src = src;
  });
}

/** Re-encode attempts for photos: [long edge px, JPEG quality]. */
const ATTEMPTS: Array<[number, number]> = [
  [PROPERTY_MAP_UPLOAD.maxEdgePx, 0.88],
  [2600, 0.84],
  [2000, 0.8],
];

/**
 * Validate a picked map and make it fit the server cap. PDFs are sent as-is
 * (up to PROPERTY_MAP_UPLOAD.maxUploadBytes). Small images are sent untouched;
 * larger ones (phone photos) are resized and re-encoded as JPEG.
 * Throws an Error with a staff-readable message.
 */
export async function prepareMapUpload(file: File): Promise<PreparedMap> {
  const type = file.type || (/\.pdf$/i.test(file.name) ? "application/pdf" : "");
  if (!(PROPERTY_MAP_UPLOAD.contentTypes as readonly string[]).includes(type)) {
    throw new Error(`"${file.name}" isn't a PDF, PNG or JPG.`);
  }

  if (type === "application/pdf") {
    if (file.size > PROPERTY_MAP_UPLOAD.maxUploadBytes) {
      throw new Error(`"${file.name}" is ${formatMB(file.size)}. PDF maps can be up to ${formatMB(PROPERTY_MAP_UPLOAD.maxUploadBytes)}.`);
    }
    return { base64: await blobToBase64(file), contentType: "application/pdf", fileName: file.name };
  }

  if (file.size > PROPERTY_MAP_UPLOAD.maxSourceImageBytes) {
    throw new Error(`"${file.name}" is ${formatMB(file.size)}. Images can be up to ${formatMB(PROPERTY_MAP_UPLOAD.maxSourceImageBytes)}.`);
  }
  const { img, revoke } = await loadImage(file);
  try {
    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    if (file.size <= PROPERTY_MAP_UPLOAD.passthroughImageBytes && longEdge <= PROPERTY_MAP_UPLOAD.maxEdgePx) {
      return { base64: await blobToBase64(file), contentType: type as MapContentType, fileName: file.name };
    }
    for (const [edge, quality] of ATTEMPTS) {
      const scale = Math.min(1, edge / longEdge);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser couldn't resize this image. Please try a smaller file.");
      ctx.fillStyle = "#ffffff"; // JPEG has no transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && blob.size <= PROPERTY_MAP_UPLOAD.maxUploadBytes) {
        return { base64: await blobToBase64(blob), contentType: "image/jpeg", fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
      }
    }
    throw new Error(`"${file.name}" is too large even after resizing. Please choose a smaller file.`);
  } finally {
    revoke();
  }
}

/** Turn an upload failure into a message staff can act on. */
export function mapUploadErrorMessage(fileName: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/413|payload too large|request entity too large|unexpected token|not valid json/i.test(msg)) {
    return `"${fileName}" is larger than the server accepts (${formatMB(PROPERTY_MAP_UPLOAD.maxUploadBytes)}). Please choose a smaller file.`;
  }
  return msg.startsWith('"') ? msg : `Upload of "${fileName}" failed: ${msg}`;
}

export const MAP_UPLOAD_HELP = `PDF, PNG or JPG. Photos up to ${formatMB(PROPERTY_MAP_UPLOAD.maxSourceImageBytes)} are resized automatically; PDFs up to ${formatMB(PROPERTY_MAP_UPLOAD.maxUploadBytes)}.`;
