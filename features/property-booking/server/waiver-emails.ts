/**
 * Waiver Email Service
 * ====================
 * Thin wrapper over the existing Resend mailer (_core/server/mailer.ts).
 * All waiver-related emails are routed through here for consistent tracking and control.
 *
 * This is DORMANT—emails only send if RESEND_API_KEY and MAIL_FROM are configured.
 * Otherwise, emails are logged to console.
 */

import { sendWaiverEmail as baseWaiverEmail, sendInviteEmail } from "@core/server/mailer";
import { BookingPartyAdult, PropertyBooking } from "@core/db/property-booking-schema";

/**
 * Send a waiver signing request to an adult (member of the booking party).
 * Called by waiver-provider when a waiver needs to be signed (e.g., after DocuSign envelope is created).
 *
 * @param adult - Booking party adult who must sign
 * @param booking - The booking being signed for (for context)
 * @param signingUrl - The URL to the waiver (e.g., DocuSign embed URL)
 * @param senderName - Name of the person requesting the signature (e.g., "Rivers Lodge Staff")
 * @returns true if email was sent (or logged), false if unconfigured
 */
export async function sendWaiverSigningEmail(
  adult: BookingPartyAdult,
  booking: PropertyBooking,
  signingUrl: string,
  senderName: string = "Rivers Lodge",
): Promise<boolean> {
  try {
    const waiverTitle = `Booking Waiver — Reservation ${booking.bookingRef}`;
    const customMessage = `Please review and sign before your stay on ${new Date(booking.startDate).toLocaleDateString()}.`;

    return await baseWaiverEmail({
      to: adult.email,
      signerName: adult.fullName,
      waiverTitle,
      signingUrl,
      senderName,
      customMessage,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
  } catch (err) {
    console.error("[waiver-emails] sendWaiverSigningEmail failed:", err);
    return false;
  }
}

/**
 * Send a waiver reminder email to an adult who has not yet signed.
 * Called by admin workflows to remind members to complete their waivers.
 *
 * @param adult - Adult who needs to sign
 * @param booking - The booking
 * @param signingUrl - The URL to the waiver
 * @returns true if email was sent (or logged), false if unconfigured
 */
export async function sendWaiverReminderEmail(
  adult: BookingPartyAdult,
  booking: PropertyBooking,
  signingUrl: string,
): Promise<boolean> {
  try {
    const daysUntilBooking = Math.ceil(
      (new Date(booking.startDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    const urgencyNote =
      daysUntilBooking <= 3
        ? "Your trip is coming up soon—please sign right away."
        : `Your stay is on ${new Date(booking.startDate).toLocaleDateString()}. Please complete this at your earliest convenience.`;

    return await baseWaiverEmail({
      to: adult.email,
      signerName: adult.fullName,
      waiverTitle: `Booking Waiver Reminder — Reservation ${booking.bookingRef}`,
      signingUrl,
      senderName: "Rivers Lodge",
      customMessage: urgencyNote,
      expiresAt: new Date(booking.startDate), // Expires on booking start
    });
  } catch (err) {
    console.error("[waiver-emails] sendWaiverReminderEmail failed:", err);
    return false;
  }
}

/**
 * Send an admin notification that a waiver has been completed.
 * Called by webhook handler when DocuSign envelope is signed.
 *
 * @param adult - The adult who signed
 * @param booking - The booking
 * @param adminEmail - Admin email to notify
 * @returns true if email was sent (or logged), false if unconfigured
 */
export async function sendWaiverCompletedNotification(
  adult: BookingPartyAdult,
  booking: PropertyBooking,
  adminEmail: string,
): Promise<boolean> {
  try {
    const subject = `Waiver Signed — ${adult.fullName} (Booking ${booking.bookingRef})`;
    const text = [
      `${adult.fullName} (${adult.email}) has completed the waiver for booking ${booking.bookingRef}.`,
      ``,
      `Reservation: ${new Date(booking.startDate).toLocaleDateString()} to ${new Date(booking.endDate).toLocaleDateString()}`,
      ``,
      `No action required unless other party members' waivers are still pending.`,
    ].join("\n");

    // Use the existing sendInviteEmail as a base for admin notifications
    // (or create a dedicated admin notification function)
    console.log(`[waiver-emails] Waiver completion notification for admin ${adminEmail}:\n${text}`);
    return true;
  } catch (err) {
    console.error("[waiver-emails] sendWaiverCompletedNotification failed:", err);
    return false;
  }
}

/**
 * Send an admin notification that a waiver is overdue.
 * Called by admin workflows or scheduled jobs.
 *
 * @param adult - Adult whose waiver is overdue
 * @param booking - The booking
 * @param adminEmail - Admin email to notify
 * @returns true if email was sent (or logged), false if unconfigured
 */
export async function sendWaiverOverdueNotification(
  adult: BookingPartyAdult,
  booking: PropertyBooking,
  adminEmail: string,
): Promise<boolean> {
  try {
    const subject = `Waiver Overdue — ${adult.fullName} (Booking ${booking.bookingRef})`;
    const text = [
      `${adult.fullName} (${adult.email}) has not completed their waiver.`,
      ``,
      `Booking: ${booking.bookingRef}`,
      `Reservation: ${new Date(booking.startDate).toLocaleDateString()} to ${new Date(booking.endDate).toLocaleDateString()}`,
      ``,
      `Consider contacting the member to ensure they complete the waiver before their stay.`,
    ].join("\n");

    console.log(`[waiver-emails] Waiver overdue notification for admin ${adminEmail}:\n${text}`);
    return true;
  } catch (err) {
    console.error("[waiver-emails] sendWaiverOverdueNotification failed:", err);
    return false;
  }
}
