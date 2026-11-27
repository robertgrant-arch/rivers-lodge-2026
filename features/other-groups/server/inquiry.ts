import { otherGroupBookings } from "../schema";

type Db = { insert: (...args: any[]) => any };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Public inquiry form, type "other_group": open an Inquiry-status booking so
 * it shows up in /ops/other-groups (and, once it has a date, on the Ops
 * Calendar as tentative). Pass the transaction the inquiry is written in.
 */
export async function createOtherGroupInquiryBooking(db: Db, input: {
  name: string; email: string; phone?: string; eventDate?: string; guestCount?: number; message?: string;
}): Promise<number> {
  const date = input.eventDate && ISO.test(input.eventDate) ? input.eventDate : null;
  const [row] = await db.insert(otherGroupBookings).values({
    status: "inquiry",
    groupName: input.name,
    contactName: input.name,
    contactEmail: input.email,
    contactPhone: input.phone || null,
    arrivalDate: date,
    guestCount: input.guestCount ?? null,
    source: "website",
    notes: input.message || null,
  }).returning({ id: otherGroupBookings.id });
  return row.id;
}
