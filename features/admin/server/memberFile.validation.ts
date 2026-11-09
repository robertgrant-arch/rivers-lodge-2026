// Pure validation + access logic for the Member File router (memberFile.ts).
// Kept free of database/storage imports so it can be unit-tested directly.

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ACTIVITIES,
  CHILD_AGE_GROUPS,
  CONTACT_METHODS,
  EXPERIENCE_LEVELS,
  MEMBERSHIP_TYPES,
  PHOTO_CONTENT_TYPES,
  TRIP_STYLES,
} from "../memberFileOptions";

// ─── Access gate ──────────────────────────────────────────────────────────────

export type GateUser = { id: string; role: string };

/** Throws FORBIDDEN unless the user is an admin or an active staff employee. */
export async function assertMemberFileAccess(
  user: GateUser,
  isActiveEmployee: (userId: string) => Promise<boolean>,
): Promise<void> {
  if (user.role === "admin") return;
  if (user.role === "employee" && (await isActiveEmployee(user.id))) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "The Member File is limited to admins and authorized staff",
  });
}

// ─── Input schemas ────────────────────────────────────────────────────────────
// Every personal field is optional. Blank strings are stored as NULL.

export const text = (max: number) =>
  z.string().max(max).nullish().transform((v) => (v ?? "").trim() || null);
const flag = z.boolean().nullish().transform((v) => v ?? null);
const intIn = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullish().transform((v) => v ?? null);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .nullish()
  .or(z.literal(""))
  .transform((v) => v || null);
const email = z
  .string()
  .max(320)
  .nullish()
  .transform((v) => (v ?? "").trim() || null)
  .refine((v) => v === null || z.string().email().safeParse(v).success, "Enter a valid email");

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const contactSchema = z
  .object({
    fullName: text(255),
    preferredName: text(120),
    cellPhone: text(50),
    workPhone: text(50),
    addressStreet: text(255),
    addressCity: text(120),
    addressState: text(50),
    addressZip: text(20),
    birthdayMonth: intIn(1, 12),
    birthdayDay: intIn(1, 31),
    birthdayYear: intIn(1900, 2100),
    company: text(255),
    jobTitle: text(255),
    preferredContactMethod: z
      .enum(CONTACT_METHODS.map((c) => c.value) as [string, ...string[]])
      .nullish()
      .transform((v) => v ?? null),
    commBookingNotices: flag,
    commNewsletter: flag,
  })
  .superRefine((d, ctx) => {
    if (d.birthdayDay !== null && d.birthdayMonth === null) {
      ctx.addIssue({ code: "custom", path: ["birthdayMonth"], message: "Choose a month for the birthday" });
    }
    if (d.birthdayDay !== null && d.birthdayMonth !== null && d.birthdayDay > DAYS_IN_MONTH[d.birthdayMonth - 1]) {
      ctx.addIssue({ code: "custom", path: ["birthdayDay"], message: "That day doesn't exist in that month" });
    }
  });

export const familySchema = z.object({
  spouseName: text(255),
  spousePhone: text(50),
  spouseEmail: email,
  spouseIncluded: flag,
  emergencyContactName: text(255),
  emergencyContactRelationship: text(120),
  emergencyContactPhone: text(50),
});

export const healthSchema = z.object({
  foodAllergies: text(4000),
  otherAllergies: text(4000),
  dietaryRestrictions: text(4000),
  medicalNotes: text(4000),
  accessibilityNeeds: text(4000),
});

export const preferencesSchema = z.object({
  favoriteDrink: text(255),
  prefersNonalcoholic: flag,
  favoriteFood: text(255),
  favoriteActivity: text(255),
  activityInterests: z
    .array(
      z.object({
        activity: z.enum(ACTIVITIES),
        level: z.enum(EXPERIENCE_LEVELS).nullish().transform((v) => v ?? null),
      }),
    )
    .max(ACTIVITIES.length)
    .nullish()
    .transform((list) => {
      if (!list || list.length === 0) return null;
      const seen = new Set<string>();
      return list.filter((i) => (seen.has(i.activity) ? false : (seen.add(i.activity), true)));
    }),
  favoritePropertyId: z.number().int().positive().nullish().transform((v) => v ?? null),
  equipmentNeeds: text(4000),
  tripStyles: z
    .array(z.enum(TRIP_STYLES))
    .max(TRIP_STYLES.length)
    .nullish()
    // Stored in the fixed option order (not click order) so it always reads the same.
    .transform((list) => (list && list.length ? TRIP_STYLES.filter((t) => list.includes(t)) : null)),
  thingsToKnow: text(4000),
});

export const adminSchema = z.object({
  householdOrCompany: text(255),
  referredBy: text(255),
  referralSource: text(255),
  assignedStaffEmployeeId: z.number().int().positive().nullish().transform((v) => v ?? null),
  orientationCompleted: flag,
  orientationDate: isoDate,
});

export const updateSectionInput = z.discriminatedUnion("section", [
  z.object({ memberId: z.number().int().positive(), section: z.literal("contact"), data: contactSchema }),
  z.object({ memberId: z.number().int().positive(), section: z.literal("family"), data: familySchema }),
  z.object({ memberId: z.number().int().positive(), section: z.literal("health"), data: healthSchema }),
  z.object({ memberId: z.number().int().positive(), section: z.literal("preferences"), data: preferencesSchema }),
  z.object({ memberId: z.number().int().positive(), section: z.literal("admin"), data: adminSchema }),
]);

export const childInput = z.object({
  name: z.string().trim().min(1, "Child's name is required").max(255),
  preferredName: text(120),
  birthMonth: intIn(1, 12),
  birthYear: intIn(1900, 2100),
  ageGroup: z.enum(CHILD_AGE_GROUPS).nullish().transform((v) => v ?? null),
  includedInMembership: flag,
});

export const membershipInput = z.object({
  memberId: z.number().int().positive(),
  memberNumber: text(50),
  membershipType: z.enum(MEMBERSHIP_TYPES),
  active: z.boolean(),
  joinDate: isoDate,
  renewalDate: isoDate,
});

/** Detect the real image type from its first bytes (don't trust the client label). */
export function sniffImageType(buf: Uint8Array): (typeof PHOTO_CONTENT_TYPES)[number] | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (
    buf.length >= 12 &&
    String.fromCharCode(...buf.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...buf.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
