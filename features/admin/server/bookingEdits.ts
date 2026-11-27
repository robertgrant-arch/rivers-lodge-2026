/**
 * Ops booking edits: validation + column mapping for the Weddings and
 * Corporate Groups edit dialogs (portal.weddings.update / portal.corporate.update).
 *
 * Same rules as Hunting Groups / Other Groups (features/*-groups/server/validation.ts):
 * "" or null clears an optional field, dates are YYYY-MM-DD, money is a
 * non-negative amount with up to 2 decimals, and only fields that actually
 * changed are written and audited.
 */
import { z } from "zod";

export const WEDDING_STATUSES = [
  "inquiry", "contacted", "site_visit", "proposal_sent", "contract_out", "confirmed", "completed", "cancelled",
] as const;
export const CORPORATE_STATUSES = [
  "inquiry", "contacted", "proposal_sent", "contract_out", "confirmed", "completed", "cancelled",
] as const;
export const CORPORATE_EVENT_TYPES = [
  "team_retreat", "board_meeting", "incentive_trip", "company_hunt", "private_buyout", "other",
] as const;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const optDate = z.union([z.string().regex(ISO, "Use a date like 2026-06-14"), z.literal(""), z.null()]).optional();
const optText = (max: number) => z.union([z.string().max(max), z.null()]).optional();
const optCount = (label: string) =>
  z.union([z.number().int(`${label} must be a whole number`).min(0, `${label} can't be negative`).max(5000, `${label} looks too large`), z.null()]).optional();
const optMoney = z
  .union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 1500 or 1500.00"), z.literal(""), z.null()])
  .optional();
const requiredText = (label: string, max = 255) => z.string().trim().min(1, `${label} is required`).max(max);

export const updateWeddingInput = z.object({
  id: z.number().int().positive(),
  coupleName: requiredText("Couple name").optional(),
  contactEmail: z.string().trim().email("Enter a valid email").optional(),
  contactPhone: optText(50),
  weddingDate: optDate,
  status: z.enum(WEDDING_STATUSES).optional(),
  guestCountEstimate: optCount("Estimated guests"),
  guestCountFinal: optCount("Final guest count"),
  contractValue: optMoney,
  notes: optText(10000),
});

export const updateCorporateInput = z.object({
  id: z.number().int().positive(),
  companyName: requiredText("Company name").optional(),
  contactName: requiredText("Contact name").optional(),
  contactEmail: z.string().trim().email("Enter a valid email").optional(),
  contactPhone: optText(50),
  eventType: z.enum(CORPORATE_EVENT_TYPES).optional(),
  arrivalDate: optDate,
  departureDate: optDate,
  status: z.enum(CORPORATE_STATUSES).optional(),
  attendeeCount: optCount("Attendees"),
  contractValue: optMoney,
  notes: optText(10000),
}).refine(
  (v) => !v.arrivalDate || !v.departureDate || v.departureDate >= v.arrivalDate,
  { message: "Departure can't be before arrival", path: ["departureDate"] },
);

const DATE_KEYS = new Set(["weddingDate", "arrivalDate", "departureDate"]);
const TEXT_KEYS = new Set(["contactPhone", "notes"]);
const TRIM_KEYS = new Set(["coupleName", "companyName", "contactName", "contactEmail"]);
const MONEY_KEYS = new Set(["contractValue"]);

/**
 * Validated input → column values. Keys not sent stay absent, so an update
 * only touches what it names. "" → null; money → "1500.00"; text trimmed.
 */
export function toBookingValues(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "id" || v === undefined) continue;
    if (DATE_KEYS.has(k)) out[k] = v || null;
    else if (TEXT_KEYS.has(k)) out[k] = typeof v === "string" ? v.trim() || null : null;
    else if (TRIM_KEYS.has(k)) out[k] = String(v).trim();
    else if (MONEY_KEYS.has(k)) out[k] = v === "" || v == null ? null : Number(v).toFixed(2);
    else out[k] = v;
  }
  return out;
}

function comparable(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return String(v);
  const s = String(v);
  // decimal columns come back as "1500.00"; dates as "2026-06-14"
  if (/^\d+(\.\d+)?$/.test(s)) return String(Number(s));
  return s;
}

/** Keys in `next` whose value differs from `before`. */
export function changedFields(before: Record<string, unknown>, next: Record<string, unknown>): string[] {
  return Object.keys(next).filter((k) => comparable(before[k]) !== comparable(next[k]));
}
