/**
 * Upload size limits shared by the browser uploaders and the server procedures,
 * so the limit shown on screen is always the one the server enforces.
 *
 * Pure constants — safe to import from both client and server code.
 */

const MB = 1024 * 1024;

/** Property cover photos (/ops/properties → Cover Photo). */
export const COVER_PHOTO = {
  /** Largest original file staff can pick. Anything up to this is resized in
   *  the browser before upload, so normal 3–12 MB phone photos just work. */
  maxSourceBytes: 25 * MB,
  /** Long-edge pixel size the browser resizes to (plenty for a full-width hero). */
  maxEdgePx: 2400,
  /** Files at or under this size and edge are uploaded untouched (no re-encode). */
  passthroughBytes: 1.5 * MB,
  /** Hard cap on the decoded bytes the server accepts after resizing. */
  maxUploadBytes: 2.5 * MB,
} as const;

/** JSON body limit for routes that carry a base64 cover photo: the base64 form
 *  of maxUploadBytes (×4/3) plus headroom for the rest of the payload. */
export const COVER_PHOTO_JSON_LIMIT_BYTES = Math.ceil((COVER_PHOTO.maxUploadBytes * 4) / 3) + 64 * 1024;

export function formatMB(bytes: number): string {
  const mb = bytes / MB;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}
