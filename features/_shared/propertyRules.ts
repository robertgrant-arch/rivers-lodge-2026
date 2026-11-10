/**
 * Member-facing property rules, capacity, directions links and map uploads.
 * Pure module — safe for client and server, so the page and the API agree.
 */

/** The only two booking rules shown to members (owner-approved wording). */
export const MAX_CONSECUTIVE_DAYS = 3;
export const BOOKING_RULES = [
  "Everyone on the property must follow the property rules and sign a waiver.",
  `Maximum ${MAX_CONSECUTIVE_DAYS} consecutive days.`,
] as const;

/** Inclusive number of calendar days from start to end ("YYYY-MM-DD"). */
export function bookingDayCount(startDate: string, endDate: string): number {
  const [ys, ms, ds] = startDate.split("-").map(Number);
  const [ye, me, de] = endDate.split("-").map(Number);
  return Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86_400_000) + 1;
}

/** Error message if the stay is longer than allowed, otherwise null. */
export function consecutiveDaysError(startDate: string, endDate: string): string | null {
  const days = bookingDayCount(startDate, endDate);
  return days > MAX_CONSECUTIVE_DAYS
    ? `Bookings are limited to a maximum of ${MAX_CONSECUTIVE_DAYS} consecutive days (you selected ${days}).`
    : null;
}

/**
 * The single capacity shown to members and used as the party-size limit:
 * the property's Max Capacity (stored as maxGuests). null = not set.
 */
export function propertyCapacity(p: { maxGuests?: number | null } | null | undefined): number | null {
  const n = Number(p?.maxGuests ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

// ─── Directions link ─────────────────────────────────────────────────────────

// google.com, google.de, google.co.uk, google.com.au … (not google.com.evil.example)
const GOOGLE_DOMAIN = String.raw`google\.(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})`;
const DIRECTIONS_HOSTS = [
  new RegExp(`^(www\\.)?${GOOGLE_DOMAIN}$`), // google.com/maps/…
  new RegExp(`^maps\\.${GOOGLE_DOMAIN}$`),
  /^maps\.app\.goo\.gl$/,
  /^goo\.gl$/,
  /^maps\.apple\.com$/,
  /^maps\.apple$/,
];

/** True for an https Google Maps or Apple Maps link. */
export function isDirectionsUrl(value: string): boolean {
  let u: URL;
  try {
    u = new URL(value.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const host = u.hostname.toLowerCase();
  if (!DIRECTIONS_HOSTS.some((re) => re.test(host))) return false;
  // google.com and goo.gl also host non-map pages; require a maps path there.
  if (/^(www\.)?google\./.test(host)) return u.pathname.startsWith("/maps");
  if (host === "goo.gl") return u.pathname.startsWith("/maps");
  return true;
}

export const DIRECTIONS_URL_HELP = "Paste a Google Maps or Apple Maps link (https://…).";

// ─── Map uploads ─────────────────────────────────────────────────────────────

const MB = 1024 * 1024;

export const PROPERTY_MAP_UPLOAD = {
  /** Accepted file types. */
  contentTypes: ["application/pdf", "image/png", "image/jpeg"] as const,
  /** Largest original image staff can pick; it is resized in the browser. */
  maxSourceImageBytes: 25 * MB,
  /** Long edge images are resized to (keeps map detail legible). */
  maxEdgePx: 3200,
  /** Images at or under this size and edge are uploaded untouched. */
  passthroughImageBytes: 3 * MB,
  /** Hard cap on decoded bytes the server accepts (PDFs are not resized). */
  maxUploadBytes: 8 * MB,
  /** Most maps per property. */
  maxMaps: 12,
} as const;

/** JSON body limit for the map-upload route: base64 of maxUploadBytes plus headroom. */
export const PROPERTY_MAP_JSON_LIMIT_BYTES = Math.ceil((PROPERTY_MAP_UPLOAD.maxUploadBytes * 4) / 3) + 64 * 1024;

export type MapContentType = (typeof PROPERTY_MAP_UPLOAD.contentTypes)[number];

/** Real file type from the first bytes (don't trust the client's label). */
export function sniffMapType(buf: Uint8Array): MapContentType | null {
  if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d) return "application/pdf"; // %PDF-
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  return null;
}

export function formatMB(bytes: number): string {
  const mb = bytes / MB;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}
