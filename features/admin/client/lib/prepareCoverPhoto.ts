import { COVER_PHOTO, formatMB } from "@shared/uploadLimits";

export type PreparedCoverPhoto = {
  base64: string;
  contentType: "image/jpeg" | "image/png";
  fileName: string;
};

const ACCEPTED = ["image/jpeg", "image/png"] as const;

/** Re-encode attempts, largest first: [long edge px, JPEG quality]. */
const ATTEMPTS: Array<[number, number]> = [
  [COVER_PHOTO.maxEdgePx, 0.85],
  [2000, 0.8],
  [1600, 0.75],
  [1280, 0.7],
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Couldn't read the photo. Please try again."));
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
      reject(new Error("This image can't be read. Please choose a JPG or PNG photo."));
    };
    img.src = src;
  });
}

/**
 * Validate and, if needed, shrink a picked cover photo so it fits under the
 * server's upload cap. Small photos are sent untouched; larger ones (typical
 * 3–12 MB phone photos) are resized to at most COVER_PHOTO.maxEdgePx on the
 * long side and re-encoded as JPEG. Throws an Error with a staff-readable
 * message when the file can't be used.
 */
export async function prepareCoverPhoto(file: File): Promise<PreparedCoverPhoto> {
  if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
    throw new Error("Cover photo must be a JPG or PNG.");
  }
  if (file.size > COVER_PHOTO.maxSourceBytes) {
    throw new Error(
      `This photo is ${formatMB(file.size)}. The limit is ${formatMB(COVER_PHOTO.maxSourceBytes)} — please choose a smaller file.`,
    );
  }

  const { img, revoke } = await loadImage(file);
  try {
    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    if (file.size <= COVER_PHOTO.passthroughBytes && longEdge <= COVER_PHOTO.maxEdgePx) {
      return {
        base64: await blobToBase64(file),
        contentType: file.type as PreparedCoverPhoto["contentType"],
        fileName: file.name,
      };
    }

    for (const [edge, quality] of ATTEMPTS) {
      const scale = Math.min(1, edge / longEdge);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser couldn't resize this photo. Please try a smaller file.");
      // JPEG has no transparency; give transparent PNGs a neutral backdrop.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= COVER_PHOTO.maxUploadBytes) {
        return {
          base64: await blobToBase64(blob),
          contentType: "image/jpeg",
          fileName: file.name.replace(/\.[^.]+$/, "") + ".jpg",
        };
      }
    }
    throw new Error("This photo is too large even after resizing. Please choose a smaller file.");
  } finally {
    revoke();
  }
}

/** Turn an upload failure into a message staff can act on. */
export function coverPhotoUploadErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  // A body over the server's limit comes back as an HTML 413 page, which the
  // tRPC client reports as a JSON parse error.
  if (/413|payload too large|request entity too large|unexpected token|not valid json/i.test(msg)) {
    return `Upload failed: the photo is larger than the server accepts (${formatMB(COVER_PHOTO.maxUploadBytes)} after resizing). Please choose a smaller file.`;
  }
  return `Upload failed: ${msg}`;
}

/** Help text shown under the picker. */
export const COVER_PHOTO_HELP = `JPG or PNG, up to ${formatMB(COVER_PHOTO.maxSourceBytes)}. Large phone photos are resized automatically.`;
