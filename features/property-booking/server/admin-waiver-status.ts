/**
 * Admin Waiver Status Queries
 * ==========================
 * Endpoints for admin dashboard to view and manage waiver status across bookings.
 */

import { computeWaiverDeadline, getNextWaiverStatus } from './waiver-deadline';

export interface AdminBookingWaiverView {
  bookingId: number;
  bookingRef: string;
  status: string;
  memberName: string;
  memberEmail: string;
  startDate: string;
  adults: AdminPartyAdultView[];
  allWaiversSigned: boolean;
  anyOverdue: boolean;
}

export interface AdminPartyAdultView {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  isDesignatedMember: boolean;
  waiverStatus: string;
  minorCount: number;
  deadlineMs: number;
  isOverdue: boolean;
  hoursUntilDue: number;
}

/**
 * Enrich booking data with waiver status for admin display.
 *
 * @param booking - Raw booking record
 * @param partyAdults - Array of adults with minors
 * @param memberName - Booking member's name
 * @param memberEmail - Booking member's email
 * @returns Admin-formatted booking view
 */
export function enrichBookingWithWaiverStatus(
  booking: any,
  partyAdults: any[],
  memberName: string,
  memberEmail: string
): AdminBookingWaiverView {
  const now = Date.now();

  // Compute waiver status for each adult
  const enrichedAdults: AdminPartyAdultView[] = partyAdults.map((adult) => {
    const nextStatus = getNextWaiverStatus(adult.waiverStatus, booking.startDate, now);
    const { deadline, isOverdue, hoursUntilDue } = computeWaiverDeadline(
      booking.startDate,
      nextStatus,
      now
    );

    return {
      id: adult.id,
      fullName: adult.fullName,
      email: adult.email,
      phone: adult.phone,
      isDesignatedMember: adult.isDesignatedMember,
      waiverStatus: nextStatus,
      minorCount: adult.minors?.length ?? 0,
      deadlineMs: deadline,
      isOverdue,
      hoursUntilDue,
    };
  });

  // Check if all waivers are completed
  const allWaiversSigned = enrichedAdults.every((a) => a.waiverStatus === "completed");

  // Check if any are overdue
  const anyOverdue = enrichedAdults.some((a) => a.isOverdue);

  return {
    bookingId: booking.id,
    bookingRef: booking.bookingRef,
    status: booking.status,
    memberName,
    memberEmail,
    startDate: booking.startDate,
    adults: enrichedAdults,
    allWaiversSigned,
    anyOverdue,
  };
}

/**
 * Filter bookings needing immediate attention (overdue waivers).
 *
 * @param bookings - Array of admin booking views
 * @returns Bookings with overdue waivers
 */
export function filterOverdueWaivers(bookings: AdminBookingWaiverView[]): AdminBookingWaiverView[] {
  return bookings.filter((b) => b.anyOverdue);
}

/**
 * Filter bookings with incomplete waivers (not all signed).
 *
 * @param bookings - Array of admin booking views
 * @returns Bookings where not all waivers are signed
 */
export function filterIncompletWaivers(bookings: AdminBookingWaiverView[]): AdminBookingWaiverView[] {
  return bookings.filter((b) => !b.allWaiversSigned);
}
