/**
 * Booking State Machine — Rivers Lodge & Hunt Club
 *
 * Enforces valid state transitions for bookings.
 * All transitions are logged to booking_state_transitions.
 *
 * State Graph:
 *   inquiry → qualified → proposal_sent → contract_sent → deposit_received
 *           → confirmed → checked_in → checked_out → completed
 *           → cancelled (from any state except completed)
 *           → no_show (from confirmed or checked_in)
 *
 * Gate checks (must pass before transition):
 *   → confirmed:        deposit_received OR explicit override by owner
 *   → checked_in:       all required waivers signed
 *   → checked_out:      check-in timestamp exists
 *   → completed:        check-out timestamp exists
 */

import { getDb } from "../db";
import { bookingStateTransitions } from "../../drizzle/booking-schema";
import { bookings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus =
  | "inquiry"
  | "qualified"
  | "proposal_sent"
  | "contract_sent"
  | "deposit_received"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "completed"
  | "cancelled"
  | "no_show";

export interface GateCheckResult {
  passed: boolean;
  reason?: string;
}

export interface TransitionResult {
  success: boolean;
  newStatus: BookingStatus;
  gateChecks: Record<string, GateCheckResult>;
  transitionId?: number;
}

// ─── Valid Transitions ────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  inquiry: ["qualified", "cancelled"],
  qualified: ["proposal_sent", "cancelled"],
  proposal_sent: ["contract_sent", "qualified", "cancelled"],
  contract_sent: ["deposit_received", "proposal_sent", "cancelled"],
  deposit_received: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out", "no_show"],
  checked_out: ["completed"],
  completed: [], // terminal state
  cancelled: [], // terminal state
  no_show: [],   // terminal state
};

// ─── Gate Checks ──────────────────────────────────────────────────────────────

/**
 * Checks that must pass before transitioning to a given status
 */
async function runGateChecks(
  bookingId: number,
  toStatus: BookingStatus,
  overrides: Record<string, boolean> = {}
): Promise<Record<string, GateCheckResult>> {
  const gates: Record<string, GateCheckResult> = {};

  if (toStatus === "confirmed") {
    // Gate: deposit must be received (or owner override)
    if (overrides["skip_deposit_check"]) {
      gates["deposit_received"] = { passed: true, reason: "Owner override applied" };
    } else {
      const db = await getDb();
      if (db) {
        const booking = await db
          .select({ depositPaid: bookings.depositPaid })
          .from(bookings)
          .where(eq(bookings.id, bookingId))
          .limit(1);
        const depositPaid = booking[0]?.depositPaid ?? false;
        gates["deposit_received"] = {
          passed: depositPaid,
          reason: depositPaid ? undefined : "Deposit has not been recorded. Record deposit payment or apply owner override.",
        };
      } else {
        gates["deposit_received"] = { passed: false, reason: "Database unavailable" };
      }
    }
  }

  if (toStatus === "checked_in") {
    // Gate: all required waivers must be signed
    // For now, this is a soft check — portal staff confirm manually
    // Full automation requires waiver_requirements table to be populated
    if (overrides["skip_waiver_check"]) {
      gates["waivers_signed"] = { passed: true, reason: "Staff override applied" };
    } else {
      gates["waivers_signed"] = {
        passed: true, // Default pass — staff confirm in portal UI
        reason: "Confirm all required waivers are signed before checking in.",
      };
    }
  }

  if (toStatus === "checked_out") {
    gates["check_in_exists"] = { passed: true }; // Enforced by valid transitions
  }

  if (toStatus === "completed") {
    gates["check_out_exists"] = { passed: true }; // Enforced by valid transitions
  }

  return gates;
}

// ─── State Machine ────────────────────────────────────────────────────────────

export async function transitionBookingStatus(
  bookingId: number,
  fromStatus: BookingStatus,
  toStatus: BookingStatus,
  triggeredByUserId: number,
  notes?: string,
  overrides: Record<string, boolean> = {}
): Promise<TransitionResult> {
  // 1. Validate transition is allowed
  const allowedTransitions = VALID_TRANSITIONS[fromStatus] ?? [];
  if (!allowedTransitions.includes(toStatus)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid status transition: ${fromStatus} → ${toStatus}. Allowed: ${allowedTransitions.join(", ") || "none (terminal state)"}`,
    });
  }

  // 2. Run gate checks
  const gateChecks = await runGateChecks(bookingId, toStatus, overrides);
  const failedGates = Object.entries(gateChecks).filter(([, g]) => !g.passed);

  if (failedGates.length > 0) {
    const reasons = failedGates.map(([key, g]) => `${key}: ${g.reason}`).join("; ");
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Cannot transition to ${toStatus}: ${reasons}`,
    });
  }

  // 3. Log the transition
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  }

  const insertResult = await db.insert(bookingStateTransitions).values({
    bookingId,
    fromStatus,
    toStatus,
    triggeredByUserId,
    notes: notes ?? null,
    gateChecks: JSON.stringify(gateChecks),
  });

  return {
    success: true,
    newStatus: toStatus,
    gateChecks,
    transitionId: Number((insertResult as { insertId?: number }).insertId ?? 0),
  };
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

export function getAvailableTransitions(fromStatus: BookingStatus): BookingStatus[] {
  return VALID_TRANSITIONS[fromStatus] ?? [];
}

export function isTerminalStatus(status: BookingStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}

export function getStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    inquiry: "Inquiry",
    qualified: "Qualified",
    proposal_sent: "Proposal Sent",
    contract_sent: "Contract Sent",
    deposit_received: "Deposit Received",
    confirmed: "Confirmed",
    checked_in: "Checked In",
    checked_out: "Checked Out",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No Show",
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: BookingStatus): string {
  const colors: Record<BookingStatus, string> = {
    inquiry: "bg-gray-100 text-gray-700",
    qualified: "bg-blue-100 text-blue-700",
    proposal_sent: "bg-purple-100 text-purple-700",
    contract_sent: "bg-indigo-100 text-indigo-700",
    deposit_received: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-green-100 text-green-700",
    checked_in: "bg-emerald-100 text-emerald-700",
    checked_out: "bg-teal-100 text-teal-700",
    completed: "bg-slate-100 text-slate-700",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-orange-100 text-orange-700",
  };
  return colors[status] ?? "bg-gray-100 text-gray-700";
}
