/**
 * Waiver Deadline & Overdue Status Computation
 * =============================================
 * Determines when a waiver is due (deadline) and whether it's overdue based on
 * booking check-in time relative to now.
 *
 * Deadline logic:
 * - Normal (>12h until check-in): 12 hours before check-in
 * - Short notice (1-12h): 1 hour before check-in
 * - Urgent (<1h): immediately (deadline = check-in time)
 */

export type WaiverStatus = "pending" | "sent" | "completed" | "overdue";

interface WaiverDeadlineResult {
  deadline: number; // Unix timestamp (milliseconds)
  isOverdue: boolean; // true if current time > deadline and waiverStatus is not 'completed'
  hoursUntilDue: number; // negative if overdue
}

/**
 * Compute waiver deadline based on check-in date and current time.
 * Returns the deadline timestamp and whether the waiver is currently overdue.
 *
 * @param checkInDateStr - ISO date string (YYYY-MM-DD) of booking check-in
 * @param waiverStatus - Current waiver status (pending, sent, completed, overdue)
 * @param nowMs - Current time in milliseconds (default: Date.now())
 * @returns {deadline, isOverdue, hoursUntilDue}
 */
export function computeWaiverDeadline(
  checkInDateStr: string,
  waiverStatus: WaiverStatus,
  nowMs: number = Date.now()
): WaiverDeadlineResult {
  const checkInDate = new Date(checkInDateStr);
  checkInDate.setHours(0, 0, 0, 0); // Start of check-in day
  const checkInMs = checkInDate.getTime();

  // Time until check-in in milliseconds
  const msUntilCheckIn = checkInMs - nowMs;
  const hoursUntilCheckIn = msUntilCheckIn / (1000 * 60 * 60);

  let deadlineMs: number;

  if (hoursUntilCheckIn > 12) {
    // Normal case: deadline is 12 hours before check-in
    deadlineMs = checkInMs - 12 * 60 * 60 * 1000;
  } else if (hoursUntilCheckIn > 1) {
    // Short notice: deadline is 1 hour before check-in
    deadlineMs = checkInMs - 1 * 60 * 60 * 1000;
  } else {
    // Urgent: deadline is at check-in time
    deadlineMs = checkInMs;
  }

  // Is the waiver overdue?
  // Only 'pending' and 'sent' statuses can be overdue; 'completed' and 'overdue' are terminal
  const isOverdue = waiverStatus !== "completed" && nowMs > deadlineMs;

  // Hours remaining (negative if overdue)
  const hoursUntilDue = (deadlineMs - nowMs) / (1000 * 60 * 60);

  return {
    deadline: deadlineMs,
    isOverdue,
    hoursUntilDue,
  };
}

/**
 * Determine the next waiver status based on current status and deadline.
 * Used for automated status updates (e.g., from 'pending' → 'overdue').
 *
 * @param currentStatus - Current waiver status
 * @param checkInDateStr - ISO date string of booking check-in
 * @param nowMs - Current time in milliseconds (default: Date.now())
 * @returns Next status (same if no change needed)
 */
export function getNextWaiverStatus(
  currentStatus: WaiverStatus,
  checkInDateStr: string,
  nowMs: number = Date.now()
): WaiverStatus {
  // Terminal states: don't change
  if (currentStatus === "completed") return currentStatus;

  const { isOverdue } = computeWaiverDeadline(checkInDateStr, currentStatus, nowMs);

  // If pending or sent and now overdue, mark as overdue
  if ((currentStatus === "pending" || currentStatus === "sent") && isOverdue) {
    return "overdue";
  }

  return currentStatus;
}

/**
 * Format deadline for display (e.g., "Aug 15, 2026 at 10:00 AM").
 *
 * @param deadlineMs - Deadline in milliseconds
 * @returns Formatted string
 */
export function formatWaiverDeadline(deadlineMs: number): string {
  const d = new Date(deadlineMs);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();
  const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${month} ${day}, ${year} at ${time}`;
}
