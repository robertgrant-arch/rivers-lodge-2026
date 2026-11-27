import { z } from "zod";
import { OTHER_GROUP_EVENT_TYPES, OTHER_GROUP_SOURCES, OTHER_GROUP_STATUSES } from "../types";
import type { InsertOtherGroupBooking } from "../schema";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** "" and null clear the field; anything else must be YYYY-MM-DD. */
const optDate = z.union([z.string().regex(ISO, "Use YYYY-MM-DD"), z.literal(""), z.null()]).optional();
const optText = (max: number) => z.union([z.string().max(max), z.null()]).optional();
/** Money as a number or numeric string; "" / null clear it. */
const optMoney = z
  .union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 1500 or 1500.00"), z.literal(""), z.null()])
  .optional();

export const otherGroupFields = z.object({
  status: z.enum(OTHER_GROUP_STATUSES).optional(),
  groupName: z.string().trim().min(1, "Group name is required").max(255),
  contactName: z.string().trim().min(1, "Contact name is required").max(255),
  contactEmail: z.string().trim().email(),
  contactPhone: optText(50),
  mailingStreet: optText(255),
  mailingCity: optText(120),
  mailingState: optText(50),
  mailingZip: optText(20),
  eventType: z.union([z.enum(OTHER_GROUP_EVENT_TYPES), z.null()]).optional(),
  eventTypeOther: optText(255),
  arrivalDate: optDate,
  departureDate: optDate,
  guestCount: z.union([z.number().int().positive().max(5000), z.null()]).optional(),
  propertyIds: z.array(z.number().int().positive()).optional(),
  lodgingRequired: z.boolean().optional(),
  lodgingNotes: optText(5000),
  mealsRequired: z.boolean().optional(),
  cateringNotes: optText(5000),
  hostingMemberId: z.union([z.number().int().positive(), z.null()]).optional(),
  source: z.union([z.enum(OTHER_GROUP_SOURCES), z.null()]).optional(),
  referredBy: optText(255),
  contractValue: optMoney,
  depositAmount: optMoney,
  depositReceivedDate: optDate,
  balanceDueDate: optDate,
  balanceReceivedDate: optDate,
  notes: optText(10000),
});

const datesInOrder = (v: { arrivalDate?: string | null; departureDate?: string | null }) =>
  !v.arrivalDate || !v.departureDate || v.departureDate >= v.arrivalDate;
const DATE_ORDER = { message: "Departure can't be before arrival", path: ["departureDate"] };

export const createOtherGroupInput = otherGroupFields.refine(datesInOrder, DATE_ORDER);
export const updateOtherGroupInput = otherGroupFields.partial()
  .extend({ id: z.number().int().positive() })
  .refine(datesInOrder, DATE_ORDER);

export type CreateOtherGroupInput = z.infer<typeof createOtherGroupInput>;
export type UpdateOtherGroupInput = z.infer<typeof updateOtherGroupInput>;

const DATE_KEYS = ["arrivalDate", "departureDate", "depositReceivedDate", "balanceDueDate", "balanceReceivedDate"] as const;
const MONEY_KEYS = ["contractValue", "depositAmount"] as const;
const TEXT_KEYS = ["contactPhone", "mailingStreet", "mailingCity", "mailingState", "mailingZip", "eventTypeOther", "lodgingNotes", "cateringNotes", "referredBy", "notes"] as const;

/**
 * Turn validated input into column values: "" → null, trimmed text, money as
 * a 2-dp string, dates as YYYY-MM-DD. Keys that weren't sent stay absent, so
 * an update only touches the fields it names. eventTypeOther is only kept for
 * eventType "other"; choosing another type clears it.
 */
export function toOtherGroupValues(input: Partial<CreateOtherGroupInput>): Partial<InsertOtherGroupBooking> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  for (const k of DATE_KEYS) if (k in out) out[k] = out[k] || null;
  for (const k of TEXT_KEYS) if (k in out) out[k] = typeof out[k] === "string" ? ((out[k] as string).trim() || null) : null;
  for (const k of MONEY_KEYS) {
    if (!(k in out)) continue;
    const v = out[k];
    out[k] = v === "" || v == null ? null : Number(v).toFixed(2);
  }
  if ("eventType" in out && out.eventType !== "other") out.eventTypeOther = null;
  if ("propertyIds" in out) out.propertyIds = Array.from(new Set(out.propertyIds as number[]));
  return out as Partial<InsertOtherGroupBooking>;
}
