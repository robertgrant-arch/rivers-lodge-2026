/**
 * Booking party ("Who's coming?") + waiver acceptance — shared rules.
 *
 * Used by the booking form (client) and the create-booking API (server), so a
 * party that passes in the browser is exactly a party the server accepts.
 */

/** Exact acceptance text members must check at booking (stored verbatim). */
export const BOOKING_WAIVER_ACCEPTANCE_TEXT =
  "I have read and agree to the Rivers Lodge Release & Liability Waiver. I confirm that every adult in my party will sign the waiver before entering the property, that only listed guests will attend, and that I am the parent or legal guardian of, or have the guardian's permission for, any minor I list.";

/** The words in the acceptance text that link to the read-only Booking waiver. */
export const BOOKING_WAIVER_LINK_TEXT = "Rivers Lodge Release & Liability Waiver";

/** "member" = the booking member; a number = index into `guests` (must be an adult). */
export type GuardianRef = "member" | number;

export type PartyGuestInput =
  | { type: "adult"; fullName: string; email: string; phone: string }
  | { type: "minor"; fullName: string; dateOfBirth: string; guardian: GuardianRef };

export interface PartyInput {
  member: { fullName: string; email: string; phone: string };
  guests: PartyGuestInput[];
}

/**
 * Normalize a US mobile number to 10 digits ("8165551234").
 * Accepts "(816) 555-1234", "816.555.1234", "+1 816 555 1234", "18165551234".
 * Returns null when it isn't a plausible US number (NANP: area code and
 * exchange can't start with 0 or 1).
 */
export function normalizeUsPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return digits;
}

/** "(816) 555-1234" for display. */
export function formatUsPhone(digits: string | null | undefined): string {
  const d = normalizeUsPhone(digits);
  if (!d) return digits ?? "";
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (email: string) => EMAIL_RE.test(String(email ?? "").trim());

/** True when `dob` (YYYY-MM-DD) is a real past date and the person is under 18 on `onDate`. */
export function isMinorOn(dob: string, onDate: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  const o = /^(\d{4})-(\d{2})-(\d{2})$/.exec(onDate);
  if (!m || !o) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const [oy, omo, od] = [Number(o[1]), Number(o[2]), Number(o[3])];
  let age = oy - y;
  if (omo < mo || (omo === mo && od < d)) age--;
  return age >= 0 && age < 18;
}

function isRealDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return dt.getUTCFullYear() === Number(m[1]) && dt.getUTCMonth() === Number(m[2]) - 1 && dt.getUTCDate() === Number(m[3]);
}

export interface PartyValidationResult {
  ok: boolean;
  /** Field-keyed errors: "member.phone", "guests.2.email", "guests.3.guardian", "party". */
  errors: Record<string, string>;
  /** Total people including the member. */
  partySize: number;
}

/**
 * Validate a booking party.
 * - Adults: full name, valid email, valid US mobile — all required.
 * - Minors: full name, date of birth (under 18 at check-in), guardian = the
 *   member or a listed adult.
 * - No duplicate emails (case-insensitive, member included).
 * - Party size (member + guests) within `capacity` when given.
 */
export function validateParty(
  party: PartyInput,
  opts: { capacity?: number | null; checkInDate?: string } = {},
): PartyValidationResult {
  const errors: Record<string, string> = {};
  const m = party.member ?? { fullName: "", email: "", phone: "" };
  if (!m.fullName?.trim()) errors["member.fullName"] = "Your full name is required";
  if (!isValidEmail(m.email)) errors["member.email"] = "A valid email is required";
  if (!normalizeUsPhone(m.phone)) errors["member.phone"] = "Enter a valid US mobile number";

  const seenEmails = new Map<string, string>();
  if (isValidEmail(m.email)) seenEmails.set(m.email.trim().toLowerCase(), "member");

  const guests = Array.isArray(party.guests) ? party.guests : [];
  guests.forEach((g, i) => {
    const k = `guests.${i}`;
    if (!g?.fullName?.trim()) errors[`${k}.fullName`] = "Full name is required";
    if (g?.type === "adult") {
      if (!isValidEmail(g.email)) errors[`${k}.email`] = "A valid email is required";
      else {
        const key = g.email.trim().toLowerCase();
        if (seenEmails.has(key)) errors[`${k}.email`] = "This email is already used by someone else in the party";
        else seenEmails.set(key, k);
      }
      if (!normalizeUsPhone(g.phone)) errors[`${k}.phone`] = "Enter a valid US mobile number";
    } else if (g?.type === "minor") {
      if (!g.dateOfBirth || !isRealDate(g.dateOfBirth)) errors[`${k}.dateOfBirth`] = "Date of birth is required";
      else if (opts.checkInDate && !isMinorOn(g.dateOfBirth, opts.checkInDate)) {
        errors[`${k}.dateOfBirth`] = "A minor must be under 18 at check-in (add 18+ guests as adults)";
      }
      const gd = g.guardian;
      if (gd === "member") {
        // ok
      } else if (typeof gd === "number" && Number.isInteger(gd) && guests[gd]?.type === "adult") {
        // ok
      } else {
        errors[`${k}.guardian`] = "Choose the parent/guardian in this party";
      }
    } else {
      errors[`${k}.type`] = "Choose Adult or Minor";
    }
  });

  const partySize = 1 + guests.length;
  if (opts.capacity != null && partySize > opts.capacity) {
    errors.party = `This property allows a maximum of ${opts.capacity} ${opts.capacity === 1 ? "person" : "people"}.`;
  }
  return { ok: Object.keys(errors).length === 0, errors, partySize };
}
