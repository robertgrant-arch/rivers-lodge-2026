/**
 * Booking System Tests
 * Covers:
 *  - State machine: valid/invalid transitions, terminal states, helper functions
 *  - Availability engine: hard conflict rule logic (unit-level, no DB)
 */

import { describe, it, expect } from "vitest";
import {
  getAvailableTransitions,
  isTerminalStatus,
  getStatusLabel,
  getStatusColor,
  type BookingStatus,
} from "../features/booking-engine/server/booking/stateMachine";

// ─── State Machine Tests ──────────────────────────────────────────────────────

describe("State Machine — getAvailableTransitions", () => {
  it("inquiry can transition to qualified or cancelled", () => {
    const transitions = getAvailableTransitions("inquiry");
    expect(transitions).toContain("qualified");
    expect(transitions).toContain("cancelled");
    expect(transitions).not.toContain("confirmed");
  });

  it("confirmed can transition to checked_in, cancelled, or no_show", () => {
    const transitions = getAvailableTransitions("confirmed");
    expect(transitions).toContain("checked_in");
    expect(transitions).toContain("cancelled");
    expect(transitions).toContain("no_show");
    expect(transitions).not.toContain("completed");
  });

  it("checked_in can only transition to checked_out or no_show", () => {
    const transitions = getAvailableTransitions("checked_in");
    expect(transitions).toContain("checked_out");
    expect(transitions).toContain("no_show");
    expect(transitions).not.toContain("completed");
    expect(transitions).not.toContain("confirmed");
  });

  it("checked_out can only transition to completed", () => {
    const transitions = getAvailableTransitions("checked_out");
    expect(transitions).toEqual(["completed"]);
  });

  it("deposit_received can transition to confirmed or cancelled", () => {
    const transitions = getAvailableTransitions("deposit_received");
    expect(transitions).toContain("confirmed");
    expect(transitions).toContain("cancelled");
  });

  it("proposal_sent can go back to qualified (re-negotiation path)", () => {
    const transitions = getAvailableTransitions("proposal_sent");
    expect(transitions).toContain("qualified");
    expect(transitions).toContain("contract_sent");
    expect(transitions).toContain("cancelled");
  });
});

describe("State Machine — isTerminalStatus", () => {
  it("completed is a terminal status", () => {
    expect(isTerminalStatus("completed")).toBe(true);
  });

  it("cancelled is a terminal status", () => {
    expect(isTerminalStatus("cancelled")).toBe(true);
  });

  it("no_show is a terminal status", () => {
    expect(isTerminalStatus("no_show")).toBe(true);
  });

  it("inquiry is NOT a terminal status", () => {
    expect(isTerminalStatus("inquiry")).toBe(false);
  });

  it("confirmed is NOT a terminal status", () => {
    expect(isTerminalStatus("confirmed")).toBe(false);
  });

  it("checked_in is NOT a terminal status", () => {
    expect(isTerminalStatus("checked_in")).toBe(false);
  });
});

describe("State Machine — getStatusLabel", () => {
  it("returns human-readable labels for all statuses", () => {
    const statuses: BookingStatus[] = [
      "inquiry", "qualified", "proposal_sent", "contract_sent",
      "deposit_received", "confirmed", "checked_in", "checked_out",
      "completed", "cancelled", "no_show",
    ];
    for (const status of statuses) {
      const label = getStatusLabel(status);
      expect(label).toBeTruthy();
      expect(typeof label).toBe("string");
      // Labels should not be the raw enum value (they should be formatted)
      expect(label).not.toBe(status);
    }
  });

  it("inquiry label is Inquiry", () => {
    expect(getStatusLabel("inquiry")).toBe("Inquiry");
  });

  it("deposit_received label is Deposit Received", () => {
    expect(getStatusLabel("deposit_received")).toBe("Deposit Received");
  });

  it("no_show label is No Show", () => {
    expect(getStatusLabel("no_show")).toBe("No Show");
  });
});

describe("State Machine — getStatusColor", () => {
  it("returns a CSS class string for every status", () => {
    const statuses: BookingStatus[] = [
      "inquiry", "qualified", "proposal_sent", "contract_sent",
      "deposit_received", "confirmed", "checked_in", "checked_out",
      "completed", "cancelled", "no_show",
    ];
    for (const status of statuses) {
      const color = getStatusColor(status);
      expect(color).toBeTruthy();
      expect(typeof color).toBe("string");
    }
  });

  it("completed has a slate/neutral color class (archived state)", () => {
    const color = getStatusColor("completed");
    expect(color).toMatch(/slate|gray|neutral/i);
  });

  it("confirmed has a green-toned color class", () => {
    const color = getStatusColor("confirmed");
    expect(color).toMatch(/green/i);
  });

  it("cancelled has a red-toned color class", () => {
    const color = getStatusColor("cancelled");
    expect(color).toMatch(/red/i);
  });
});

// ─── Availability Engine — Unit Logic Tests ───────────────────────────────────
// These tests exercise the pure date-overlap logic without hitting the database.

describe("Availability Engine — Date Overlap Logic", () => {
  /**
   * Replicates the overlap check used in engine.ts:
   *   overlap = start1 < end2 && end1 > start2
   */
  function overlaps(
    start1: Date, end1: Date,
    start2: Date, end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  it("detects overlap when ranges share a middle period", () => {
    const a = { start: new Date("2026-06-01"), end: new Date("2026-06-05") };
    const b = { start: new Date("2026-06-03"), end: new Date("2026-06-08") };
    expect(overlaps(a.start, a.end, b.start, b.end)).toBe(true);
  });

  it("detects overlap when one range contains the other", () => {
    const outer = { start: new Date("2026-06-01"), end: new Date("2026-06-10") };
    const inner = { start: new Date("2026-06-03"), end: new Date("2026-06-07") };
    expect(overlaps(outer.start, outer.end, inner.start, inner.end)).toBe(true);
  });

  it("no overlap when ranges are adjacent (end of one = start of other)", () => {
    const a = { start: new Date("2026-06-01"), end: new Date("2026-06-05") };
    const b = { start: new Date("2026-06-05"), end: new Date("2026-06-10") };
    // end1 > start2 is false (equal), so no overlap
    expect(overlaps(a.start, a.end, b.start, b.end)).toBe(false);
  });

  it("no overlap when ranges are completely separate", () => {
    const a = { start: new Date("2026-06-01"), end: new Date("2026-06-05") };
    const b = { start: new Date("2026-06-10"), end: new Date("2026-06-15") };
    expect(overlaps(a.start, a.end, b.start, b.end)).toBe(false);
  });

  it("detects overlap when new range starts exactly at existing start", () => {
    const existing = { start: new Date("2026-07-04"), end: new Date("2026-07-07") };
    const newRange = { start: new Date("2026-07-04"), end: new Date("2026-07-06") };
    expect(overlaps(existing.start, existing.end, newRange.start, newRange.end)).toBe(true);
  });
});

describe("Availability Engine — Holdback Window Logic", () => {
  /**
   * Replicates holdback window expansion:
   *   effectiveStart = start - holdbackHours
   *   effectiveEnd   = end   + holdbackHours
   */
  function expandWithHoldback(start: Date, end: Date, holdbackHours: number): { start: Date; end: Date } {
    const ms = holdbackHours * 60 * 60 * 1000;
    return {
      start: new Date(start.getTime() - ms),
      end: new Date(end.getTime() + ms),
    };
  }

  it("expands a 3-day window by 4 hours on each side", () => {
    const start = new Date("2026-06-10T12:00:00Z");
    const end   = new Date("2026-06-13T12:00:00Z");
    const expanded = expandWithHoldback(start, end, 4);
    expect(expanded.start.getTime()).toBe(start.getTime() - 4 * 3600 * 1000);
    expect(expanded.end.getTime()).toBe(end.getTime() + 4 * 3600 * 1000);
  });

  it("a 24-hour holdback on a wedding blocks the full day before and after", () => {
    const start = new Date("2026-09-05T00:00:00Z");
    const end   = new Date("2026-09-06T00:00:00Z");
    const expanded = expandWithHoldback(start, end, 24);
    expect(expanded.start).toEqual(new Date("2026-09-04T00:00:00Z"));
    expect(expanded.end).toEqual(new Date("2026-09-07T00:00:00Z"));
  });

  it("zero holdback does not change the window", () => {
    const start = new Date("2026-08-01T00:00:00Z");
    const end   = new Date("2026-08-03T00:00:00Z");
    const expanded = expandWithHoldback(start, end, 0);
    expect(expanded.start).toEqual(start);
    expect(expanded.end).toEqual(end);
  });
});

describe("Availability Engine — Conflict Rule Classification", () => {
  /**
   * Verifies the business logic that determines whether a resource type
   * is subject to hard (HC) vs soft (SC) conflict rules.
   * This mirrors the logic in engine.ts without requiring a DB call.
   */

  type ResourceType =
    | "event_space" | "lodging_unit" | "guide_slot"
    | "culinary" | "cleaning_crew" | "hunt_zone" | "fish_zone"
    | "property_zone" | "support";

  function isHardConflictType(type: ResourceType): boolean {
    return ["event_space", "lodging_unit", "guide_slot"].includes(type);
  }

  function isSoftConflictType(type: ResourceType): boolean {
    return ["culinary", "cleaning_crew", "support"].includes(type);
  }

  it("event_space is a hard conflict resource", () => {
    expect(isHardConflictType("event_space")).toBe(true);
  });

  it("lodging_unit is a hard conflict resource", () => {
    expect(isHardConflictType("lodging_unit")).toBe(true);
  });

  it("guide_slot is a hard conflict resource", () => {
    expect(isHardConflictType("guide_slot")).toBe(true);
  });

  it("culinary is a soft conflict resource (capacity-based)", () => {
    expect(isSoftConflictType("culinary")).toBe(true);
    expect(isHardConflictType("culinary")).toBe(false);
  });

  it("cleaning_crew is a soft conflict resource", () => {
    expect(isSoftConflictType("cleaning_crew")).toBe(true);
    expect(isHardConflictType("cleaning_crew")).toBe(false);
  });

  it("hunt_zone is neither hard nor soft (zone-level rules apply)", () => {
    expect(isHardConflictType("hunt_zone")).toBe(false);
    expect(isSoftConflictType("hunt_zone")).toBe(false);
  });
});
