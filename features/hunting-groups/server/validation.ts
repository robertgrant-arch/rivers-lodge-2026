import { z } from "zod";
import { HUNTING_GROUP_SOURCES, HUNTING_GROUP_SPECIES, HUNTING_GROUP_STATUSES } from "../types";
import type { InsertHuntingGroupBooking } from "../schema";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** "" and null clear the field; anything else must be YYYY-MM-DD. */
const optDate = z.union([z.string().regex(ISO, "Use YYYY-MM-DD"), z.literal(""), z.null()]).optional();
const optText = (max: number) => z.union([z.string().max(max), z.null()]).optional();
/** Money as a number or numeric string; "" / null clear it. */
const optMoney = z
  .union([z.number().nonnegative(), z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 1500 or 1500.00"), z.literal(""), z.null()])
  .optional();

export const huntingGroupFields = z.object({
  status: z.enum(HUNTING_GROUP_STATUSES).optional(),
  groupName: z.string().trim().min(1, "Group name is required").max(255),
  contactName: z.string().trim().min(1, "Contact name is required").max(255),
  contactEmail: z.string().trim().email(),
  contactPhone: optText(50),
  mailingStreet: optText(255),
  mailingCity: optText(120),
  mailingState: optText(50),
  mailingZip: optText(20),
  arrivalDate: optDate,
  departureDate: optDate,
  partySize: z.union([z.number().int().positive().max(500), z.null()]).optional(),
  species: z.array(z.enum(HUNTING_GROUP_SPECIES)).optional(),
  propertyIds: z.array(z.number().int().positive()).optional(),
  guideUserIds: z.array(z.string().min(1).max(36)).optional(),
  lodgingRequired: z.boolean().optional(),
  lodgingNotes: optText(5000),
  mealsRequired: z.boolean().optional(),
  cateringNotes: optText(5000),
  licensesConfirmed: z.boolean().optional(),
  linkedMemberId: z.union([z.number().int().positive(), z.null()]).optional(),
  contractValue: optMoney,
  depositAmount: optMoney,
  depositReceivedDate: optDate,
  balanceDueDate: optDate,
  balanceReceivedDate: optDate,
  source: z.union([z.enum(HUNTING_GROUP_SOURCES), z.null()]).optional(),
  referredBy: optText(255),
  repeatClient: z.boolean().optional(),
  assignedUserId: z.union([z.string().max(36), z.null()]).optional(),
  notes: optText(10000),
});

const datesInOrder = (v: { arrivalDate?: string | null; departureDate?: string | null }) =>
  !v.arrivalDate || !v.departureDate || v.departureDate >= v.arrivalDate;
const DATE_ORDER = { message: "Departure can't be before arrival", path: ["departureDate"] };

export const createHuntingGroupInput = huntingGroupFields.refine(datesInOrder, DATE_ORDER);
export const updateHuntingGroupInput = huntingGroupFields.partial()
  .extend({ id: z.number().int().positive() })
  .refine(datesInOrder, DATE_ORDER);

export type CreateHuntingGroupInput = z.infer<typeof createHuntingGroupInput>;
export type UpdateHuntingGroupInput = z.infer<typeof updateHuntingGroupInput>;

const DATE_KEYS = ["arrivalDate", "departureDate", "depositReceivedDate", "balanceDueDate", "balanceReceivedDate"] as const;
const MONEY_KEYS = ["contractValue", "depositAmount"] as const;
const TEXT_KEYS = ["contactPhone", "mailingStreet", "mailingCity", "mailingState", "mailingZip", "lodgingNotes", "cateringNotes", "referredBy", "notes"] as const;

/**
 * Turn validated input into column values: "" → null, trimmed text, money as
 * a 2-dp string, dates as YYYY-MM-DD. Keys that weren't sent stay absent, so
 * an update only touches the fields it names.
 */
export function toHuntingGroupValues(input: Partial<CreateHuntingGroupInput>): Partial<InsertHuntingGroupBooking> {
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
  if ("species" in out) out.species = Array.from(new Set(out.species as string[]));
  if ("propertyIds" in out) out.propertyIds = Array.from(new Set(out.propertyIds as number[]));
  if ("guideUserIds" in out) out.guideUserIds = Array.from(new Set(out.guideUserIds as string[]));
  return out as Partial<InsertHuntingGroupBooking>;
}
