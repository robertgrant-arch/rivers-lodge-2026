import { huntingGroupBookings } from "../schema";

type Db = { insert: (...args: any[]) => any };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Public inquiry form, type "hunting_group": open an Inquiry-status booking so
 * it shows up in /ops/hunting-groups (and, once it has a date, on the Ops
 * Calendar as tentative). Pass the transaction the inquiry is written in.
 */
export async function createHuntingGroupInquiryBooking(db: Db, input: {
  name: string; email: string; phone?: string; eventDate?: string; guestCount?: number; message?: string;
}): Promise<number> {
  const date = input.eventDate && ISO.test(input.eventDate) ? input.eventDate : null;
  const [row] = await db.insert(huntingGroupBookings).values({
    status: "inquiry",
    groupName: input.name,
    contactName: input.name,
    contactEmail: input.email,
    contactPhone: input.phone || null,
    arrivalDate: date,
    partySize: input.guestCount ?? null,
    source: "website",
    notes: input.message || null,
  }).returning({ id: huntingGroupBookings.id });
  return row.id;
}
