/**
 * Party Adult & Minor Data Persistence
 * ====================================
 * Persist booking party members (adults + minors) to booking_party_adults and
 * booking_party_minors tables (Slice 1 schema).
 *
 * Requires: booking_party_adults and booking_party_minors tables from Slice 1
 */

import { computeWaiverDeadline } from './waiver-deadline';

export interface PartyAdultToPersist {
  fullName: string;
  email: string;
  phone: string;
  minors?: Array<{ fullName: string }>;
  isDesignatedMember: boolean;
}

/**
 * Create party adult and minor records for a booking.
 * Called after booking is created successfully.
 *
 * @param tx - Database transaction
 * @param bookingId - ID of the created booking
 * @param startDate - Check-in date (ISO format YYYY-MM-DD)
 * @param partyAdults - Array of adults and minors to persist
 * @param bookingPartyAdults - Drizzle table reference
 * @param bookingPartyMinors - Drizzle table reference
 * @returns Array of adult IDs created (for later waiver status updates)
 */
export async function persistPartyMembers(
  tx: any,
  bookingId: number,
  startDate: string,
  partyAdults: PartyAdultToPersist[],
  bookingPartyAdults: any,
  bookingPartyMinors: any
): Promise<number[]> {
  if (!partyAdults || partyAdults.length === 0) {
    return [];
  }

  const now = Date.now();
  const adultIds: number[] = [];

  for (const adult of partyAdults) {
    // Compute initial waiver deadline
    const { deadline } = computeWaiverDeadline(startDate, "pending", now);

    // Insert adult record
    const insertResult = await tx
      .insert(bookingPartyAdults)
      .values({
        bookingId,
        fullName: adult.fullName,
        email: adult.email,
        phone: adult.phone,
        isDesignatedMember: adult.isDesignatedMember,
        waiverStatus: "pending", // Initial status
        waiverProvider: null,
        waiverEnvelopeId: null,
        waiverSentAt: null,
        waiverCompletedAt: null,
        createdAt: now,
        updatedAt: now,
      } as any)
      .returning({ id: bookingPartyAdults.id });

    const adultId = insertResult[0]?.id;
    if (adultId) {
      adultIds.push(adultId);

      // Insert minors linked to this adult
      if (adult.minors && adult.minors.length > 0) {
        await tx
          .insert(bookingPartyMinors)
          .values(
            adult.minors.map((minor) => ({
              bookingId,
              adultId,
              fullName: minor.fullName,
              createdAt: now,
            } as any))
          );
      }
    }
  }

  return adultIds;
}

/**
 * Get all party members for a booking (adults + minors).
 * Used by admin views to display waiver status and party details.
 *
 * @param tx - Database transaction
 * @param bookingId - ID of the booking
 * @param bookingPartyAdults - Drizzle table reference
 * @param bookingPartyMinors - Drizzle table reference
 * @returns Array of adults with nested minors
 */
export async function getPartyMembers(
  tx: any,
  bookingId: number,
  bookingPartyAdults: any,
  bookingPartyMinors: any
) {
  const adults = await tx
    .select()
    .from(bookingPartyAdults)
    .where({ bookingId });

  const allMinors = await tx
    .select()
    .from(bookingPartyMinors)
    .where({ bookingId });

  const minorsByAdultId = new Map<number, any[]>();
  allMinors.forEach((minor) => {
    if (!minorsByAdultId.has(minor.adultId)) {
      minorsByAdultId.set(minor.adultId, []);
    }
    minorsByAdultId.get(minor.adultId)!.push(minor);
  });

  return adults.map((adult) => ({
    ...adult,
    minors: minorsByAdultId.get(adult.id) ?? [],
  }));
}
