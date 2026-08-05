/**
 * Waiver Deadline & Overdue Status Tests
 * ======================================
 * Verify deadline computation and overdue status detection works correctly
 * for all three time-window scenarios.
 */

import { describe, it, expect } from "vitest";
import {
  computeWaiverDeadline,
  getNextWaiverStatus,
  formatWaiverDeadline,
} from "./waiver-deadline";

describe("Waiver Deadline Computation", () => {
  // Use fixed time for consistent testing
  const baseTime = new Date("2026-08-10T10:00:00Z").getTime(); // Aug 10, 2026 at 10:00 AM UTC

  describe("Normal case: >12 hours until check-in", () => {
    it("should set deadline to 12 hours before check-in", () => {
      const checkInDate = "2026-08-15"; // 5 days away = 120+ hours
      const result = computeWaiverDeadline(checkInDate, "pending", baseTime);

      // Check-in: Aug 15 at 00:00
      const checkInMs = new Date("2026-08-15T00:00:00Z").getTime();
      const expectedDeadline = checkInMs - 12 * 60 * 60 * 1000; // Aug 14 at 12:00 PM

      expect(result.deadline).toBe(expectedDeadline);
      expect(result.isOverdue).toBe(false);
      expect(result.hoursUntilDue).toBeGreaterThan(80); // ~100 hours away
    });

    it("should not be overdue when deadline is in future", () => {
      const checkInDate = "2026-08-20"; // 10 days away
      const result = computeWaiverDeadline(checkInDate, "pending", baseTime);

      expect(result.isOverdue).toBe(false);
      expect(result.hoursUntilDue).toBeGreaterThan(0);
    });

    it("should be overdue if past normal deadline", () => {
      const checkInDate = "2026-08-15";
      const pastDeadlineTime = new Date("2026-08-14T13:00:00Z").getTime(); // After 12-hour deadline

      const result = computeWaiverDeadline(checkInDate, "pending", pastDeadlineTime);

      expect(result.isOverdue).toBe(true);
      expect(result.hoursUntilDue).toBeLessThan(0);
    });
  });

  describe("Short notice: 1-12 hours until check-in", () => {
    it("should set deadline to 1 hour before check-in", () => {
      const checkInDate = "2026-08-10"; // Same day at midnight, ~14 hours away from 10 AM
      const now = new Date("2026-08-09T13:00:00Z").getTime(); // 11 hours before check-in

      const result = computeWaiverDeadline(checkInDate, "pending", now);

      // Check-in: Aug 10 at 00:00
      const checkInMs = new Date("2026-08-10T00:00:00Z").getTime();
      const expectedDeadline = checkInMs - 1 * 60 * 60 * 1000; // Aug 9 at 11:00 PM

      expect(result.deadline).toBe(expectedDeadline);
      expect(result.isOverdue).toBe(false);
    });

    it("should be overdue if past 1-hour deadline in short-notice window", () => {
      const checkInDate = "2026-08-10"; // 10 hours away
      const now = new Date("2026-08-09T22:30:00Z").getTime(); // 30 min after 1-hour deadline

      const result = computeWaiverDeadline(checkInDate, "pending", now);

      expect(result.isOverdue).toBe(true);
      expect(result.hoursUntilDue).toBeLessThan(0);
    });
  });

  describe("Urgent: <1 hour until check-in", () => {
    it("should set deadline to check-in time", () => {
      const checkInDate = "2026-08-10"; // 50 minutes away
      const now = new Date("2026-08-09T23:10:00Z").getTime();

      const result = computeWaiverDeadline(checkInDate, "pending", now);

      const checkInMs = new Date("2026-08-10T00:00:00Z").getTime();
      expect(result.deadline).toBe(checkInMs); // Deadline is at check-in time
      expect(result.isOverdue).toBe(false);
    });

    it("should be overdue if past check-in time", () => {
      const checkInDate = "2026-08-10";
      const now = new Date("2026-08-10T00:30:00Z").getTime(); // 30 min after check-in

      const result = computeWaiverDeadline(checkInDate, "pending", now);

      expect(result.isOverdue).toBe(true);
      expect(result.hoursUntilDue).toBeLessThan(0);
    });
  });

  describe("Status transitions", () => {
    it("should not transition 'completed' status", () => {
      const checkInDate = "2026-08-01"; // In the past (overdue)
      const now = new Date("2026-08-20T10:00:00Z").getTime(); // After check-in

      const nextStatus = getNextWaiverStatus("completed", checkInDate, now);

      expect(nextStatus).toBe("completed");
    });

    it("should not transition 'overdue' status (terminal)", () => {
      const checkInDate = "2026-08-01";
      const now = new Date("2026-08-20T10:00:00Z").getTime();

      const nextStatus = getNextWaiverStatus("overdue", checkInDate, now);

      expect(nextStatus).toBe("overdue");
    });

    it("should transition 'pending' to 'overdue' when deadline passed", () => {
      const checkInDate = "2026-08-10";
      const pastDeadlineTime = new Date("2026-08-14T13:00:00Z").getTime(); // After normal deadline

      const nextStatus = getNextWaiverStatus("pending", checkInDate, pastDeadlineTime);

      expect(nextStatus).toBe("overdue");
    });

    it("should transition 'sent' to 'overdue' when deadline passed", () => {
      const checkInDate = "2026-08-10";
      const pastDeadlineTime = new Date("2026-08-14T13:00:00Z").getTime();

      const nextStatus = getNextWaiverStatus("sent", checkInDate, pastDeadlineTime);

      expect(nextStatus).toBe("overdue");
    });

    it("should not transition if still before deadline", () => {
      const checkInDate = "2026-08-15";
      const beforeDeadline = new Date("2026-08-14T11:00:00Z").getTime(); // Before 12h deadline

      const nextStatus = getNextWaiverStatus("pending", checkInDate, beforeDeadline);

      expect(nextStatus).toBe("pending");
    });
  });

  describe("Hours until due calculation", () => {
    it("should report negative hours when overdue", () => {
      const checkInDate = "2026-08-10";
      const now = new Date("2026-08-14T14:00:00Z").getTime(); // 2 hours after normal deadline

      const result = computeWaiverDeadline(checkInDate, "pending", now);

      expect(result.hoursUntilDue).toBeLessThan(0);
      expect(Math.abs(result.hoursUntilDue)).toBeCloseTo(2, 0);
    });

    it("should report positive hours when before deadline", () => {
      const checkInDate = "2026-08-15";
      const now = new Date("2026-08-14T10:00:00Z").getTime();

      const result = computeWaiverDeadline(checkInDate, "pending", now);

      expect(result.hoursUntilDue).toBeGreaterThan(0);
    });

    it("should report approximately correct remaining hours", () => {
      const checkInDate = "2026-08-20"; // 10 days away
      const now = baseTime;

      const result = computeWaiverDeadline(checkInDate, "pending", now);

      // Check-in is Aug 20 at 00:00, deadline is Aug 19 at 12:00
      // Now is Aug 10 at 10:00
      // Difference: ~9 days 14 hours = ~238 hours
      expect(result.hoursUntilDue).toBeGreaterThan(230);
      expect(result.hoursUntilDue).toBeLessThan(250);
    });
  });

  describe("Edge cases", () => {
    it("should handle same-day check-in", () => {
      const checkInDate = "2026-08-10";
      const now = new Date("2026-08-09T23:59:00Z").getTime(); // 1 minute before check-in

      const result = computeWaiverDeadline(checkInDate, "pending", now);

      // Within 1-hour window, so deadline is 1 hour before check-in
      const checkInMs = new Date("2026-08-10T00:00:00Z").getTime();
      const expectedDeadline = checkInMs - 1 * 60 * 60 * 1000;

      expect(result.deadline).toBe(expectedDeadline);
      expect(result.isOverdue).toBe(false);
    });

    it("should handle far-future check-in", () => {
      const checkInDate = "2026-12-25"; // 4+ months away
      const now = baseTime;

      const result = computeWaiverDeadline(checkInDate, "pending", now);

      expect(result.hoursUntilDue).toBeGreaterThan(2500); // >100 days
      expect(result.isOverdue).toBe(false);
    });

    it("should handle recent past check-in", () => {
      const checkInDate = "2026-08-05"; // 5 days in past
      const now = baseTime;

      const result = computeWaiverDeadline(checkInDate, "pending", now);

      expect(result.isOverdue).toBe(true);
      expect(result.hoursUntilDue).toBeLessThan(0);
    });
  });

  describe("Deadline formatting", () => {
    it("should format deadline as readable string", () => {
      const deadlineMs = new Date("2026-08-14T12:00:00Z").getTime();
      const formatted = formatWaiverDeadline(deadlineMs);

      expect(formatted).toContain("Aug");
      expect(formatted).toContain("14");
      expect(formatted).toContain("2026");
      expect(formatted).toContain("12:00"); // Hour and minute
    });

    it("should include AM/PM indicator", () => {
      const morningMs = new Date("2026-08-14T08:00:00Z").getTime();
      const afternoonMs = new Date("2026-08-14T14:00:00Z").getTime();

      const morningFormatted = formatWaiverDeadline(morningMs);
      const afternoonFormatted = formatWaiverDeadline(afternoonMs);

      expect(morningFormatted).toContain("AM");
      expect(afternoonFormatted).toContain("PM");
    });
  });

  describe("Different waiver statuses don't affect overdue calculation", () => {
    const checkInDate = "2026-08-15";
    const pastDeadlineTime = new Date("2026-08-14T13:00:00Z").getTime();

    it("'pending' can be overdue", () => {
      const result = computeWaiverDeadline(checkInDate, "pending", pastDeadlineTime);
      expect(result.isOverdue).toBe(true);
    });

    it("'sent' can be overdue", () => {
      const result = computeWaiverDeadline(checkInDate, "sent", pastDeadlineTime);
      expect(result.isOverdue).toBe(true);
    });

    it("'completed' is never overdue (deadline passed but status is completed)", () => {
      const result = computeWaiverDeadline(checkInDate, "completed", pastDeadlineTime);
      expect(result.isOverdue).toBe(false); // Status override: completed never overdue
    });

    it("'overdue' is not overdue (already in terminal state)", () => {
      const result = computeWaiverDeadline(checkInDate, "overdue", pastDeadlineTime);
      expect(result.isOverdue).toBe(false); // Terminal state
    });
  });
});
