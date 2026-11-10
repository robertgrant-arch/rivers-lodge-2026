/**
 * Waiver Deadline & Overdue Status Tests
 * ======================================
 * Rule (Lodge time, America/Chicago): check-in is midnight at the start of the
 * first day; the deadline tier is fixed by how far ahead the booking was made
 * (>12 h → 12 h before check-in; >1 h → 1 h before; otherwise at check-in);
 * an unsigned waiver is overdue once past its deadline, even before check-in.
 *
 * Expected instants are written in UTC with the Central time alongside.
 * August is CDT (UTC−5): midnight Aug 15 CDT = 2026-08-15T05:00Z,
 * noon Aug 14 CDT = 17:00Z, 11 pm Aug 14 CDT = 2026-08-15T04:00Z.
 * These tests pass under any process TZ (run in UTC, Los Angeles, Chicago).
 */

import { describe, it, expect } from "vitest";
import {
  computeWaiverDeadline,
  getNextWaiverStatus,
  formatWaiverDeadline,
  midnightInZone,
  type WaiverStatus,
} from "./waiver-deadline";

const Z = (iso: string) => new Date(iso).getTime();
const H = 60 * 60 * 1000;
const calc = (checkInDate: string, bookedAt: number, now: number, waiverStatus: WaiverStatus = "pending") =>
  computeWaiverDeadline({ checkInDate, bookedAt, now, waiverStatus });
const next = (checkInDate: string, bookedAt: number, now: number, waiverStatus: WaiverStatus) =>
  getNextWaiverStatus({ checkInDate, bookedAt, now, waiverStatus });

describe("Waiver Deadline Computation", () => {
  // Aug 10, 2026 10:00 UTC = 5:00 AM CDT — used as "booking made" time for advance bookings.
  const baseTime = Z("2026-08-10T10:00:00Z");

  describe("Check-in is midnight Lodge time (America/Chicago)", () => {
    it("uses Central midnight, not the server's midnight", () => {
      expect(midnightInZone("2026-08-15")).toBe(Z("2026-08-15T05:00:00Z")); // CDT
      expect(midnightInZone("2026-12-05")).toBe(Z("2026-12-05T06:00:00Z")); // CST
    });

    it("handles both DST change days", () => {
      expect(midnightInZone("2026-11-01")).toBe(Z("2026-11-01T05:00:00Z")); // still CDT at 00:00
      expect(midnightInZone("2026-03-08")).toBe(Z("2026-03-08T06:00:00Z")); // still CST at 00:00
      expect(calc("2026-11-01", baseTime, baseTime).deadline).toBe(Z("2026-10-31T17:00:00Z")); // noon CDT Oct 31
      expect(calc("2026-03-08", Z("2026-02-01T00:00:00Z"), Z("2026-02-01T00:00:00Z")).deadline).toBe(Z("2026-03-07T18:00:00Z")); // noon CST Mar 7
    });
  });

  describe("Normal case: booked >12 hours before check-in", () => {
    it("should set deadline to 12 hours before check-in (noon the day before)", () => {
      const result = calc("2026-08-15", baseTime, baseTime);
      expect(result.tier).toBe("normal");
      expect(result.deadline).toBe(Z("2026-08-14T17:00:00Z")); // Aug 14, 12:00 PM CDT
      expect(result.isOverdue).toBe(false);
      expect(result.hoursUntilDue).toBeCloseTo(103, 0); // Aug 10 05:00 → Aug 14 12:00 CDT
    });

    it("should not be overdue when deadline is in future", () => {
      const result = calc("2026-08-20", baseTime, baseTime);
      expect(result.isOverdue).toBe(false);
      expect(result.hoursUntilDue).toBeGreaterThan(0);
    });

    it("should be overdue once past the 12-hour deadline — before check-in", () => {
      const now = Z("2026-08-14T18:00:00Z"); // Aug 14, 1:00 PM CDT: past noon deadline, 11 h before check-in
      const result = calc("2026-08-15", baseTime, now);
      expect(result.isOverdue).toBe(true);
      expect(result.hoursUntilDue).toBeLessThan(0);
      expect(now).toBeLessThan(result.checkIn);
    });

    it("the deadline does not move as check-in approaches", () => {
      const checkIns = [baseTime, Z("2026-08-14T16:00:00Z"), Z("2026-08-14T23:30:00Z"), Z("2026-08-15T04:59:00Z"), Z("2026-08-16T00:00:00Z")]
        .map((now) => calc("2026-08-15", baseTime, now).deadline);
      expect(new Set(checkIns)).toEqual(new Set([Z("2026-08-14T17:00:00Z")]));
    });
  });

  describe("Short notice: booked >1 and ≤12 hours before check-in", () => {
    it("should set deadline to 1 hour before check-in", () => {
      const bookedAt = Z("2026-08-09T18:00:00Z"); // Aug 9, 1:00 PM CDT = 11 h before Aug 10 check-in
      const result = calc("2026-08-10", bookedAt, bookedAt);
      expect(result.tier).toBe("short_notice");
      expect(result.deadline).toBe(Z("2026-08-10T04:00:00Z")); // Aug 9, 11:00 PM CDT
      expect(result.isOverdue).toBe(false);
    });

    it("should be overdue if past the 1-hour deadline", () => {
      const bookedAt = Z("2026-08-09T18:00:00Z");
      const now = Z("2026-08-10T04:30:00Z"); // 11:30 PM CDT: 30 min after deadline, 30 min before check-in
      const result = calc("2026-08-10", bookedAt, now);
      expect(result.isOverdue).toBe(true);
      expect(result.hoursUntilDue).toBeCloseTo(-0.5, 5);
    });

    it("exactly 12 hours ahead is short notice (more than 12 is normal)", () => {
      const checkIn = midnightInZone("2026-08-10");
      expect(calc("2026-08-10", checkIn - 12 * H, checkIn - 12 * H).tier).toBe("short_notice");
      expect(calc("2026-08-10", checkIn - 12 * H - 1, checkIn - 12 * H).tier).toBe("normal");
    });
  });

  describe("Urgent: booked ≤1 hour before check-in", () => {
    it("should set deadline to check-in time", () => {
      const bookedAt = Z("2026-08-10T04:10:00Z"); // 11:10 PM CDT, 50 min before check-in
      const result = calc("2026-08-10", bookedAt, bookedAt);
      expect(result.tier).toBe("urgent");
      expect(result.deadline).toBe(Z("2026-08-10T05:00:00Z"));
      expect(result.isOverdue).toBe(false);
    });

    it("should be overdue if past check-in time", () => {
      const bookedAt = Z("2026-08-10T04:10:00Z");
      const result = calc("2026-08-10", bookedAt, Z("2026-08-10T05:30:00Z")); // 30 min after check-in
      expect(result.isOverdue).toBe(true);
      expect(result.hoursUntilDue).toBeLessThan(0);
    });

    it("exactly 1 hour ahead is urgent (more than 1 is short notice)", () => {
      const checkIn = midnightInZone("2026-08-10");
      expect(calc("2026-08-10", checkIn - H, checkIn - H).tier).toBe("urgent");
      expect(calc("2026-08-10", checkIn - H - 1, checkIn - H).tier).toBe("short_notice");
    });
  });

  describe("Status transitions", () => {
    const bookedAt = Z("2026-08-01T15:00:00Z");

    it("should not transition 'completed' status", () => {
      expect(next("2026-08-01", bookedAt, Z("2026-08-20T10:00:00Z"), "completed")).toBe("completed");
    });

    it("should not transition 'overdue' status (terminal)", () => {
      expect(next("2026-08-01", bookedAt, Z("2026-08-20T10:00:00Z"), "overdue")).toBe("overdue");
    });

    it("should transition 'pending' to 'overdue' when deadline passed", () => {
      const now = Z("2026-08-09T18:00:00Z"); // Aug 9, 1 PM CDT: past the noon deadline for Aug 10
      expect(next("2026-08-10", bookedAt, now, "pending")).toBe("overdue");
    });

    it("should transition 'sent' to 'overdue' when deadline passed", () => {
      const now = Z("2026-08-09T18:00:00Z");
      expect(next("2026-08-10", bookedAt, now, "sent")).toBe("overdue");
    });

    it("should not transition if still before deadline", () => {
      const beforeDeadline = Z("2026-08-14T16:00:00Z"); // Aug 14, 11 AM CDT: before noon deadline
      expect(next("2026-08-15", bookedAt, beforeDeadline, "pending")).toBe("pending");
    });
  });

  describe("Hours until due calculation", () => {
    it("should report negative hours when overdue", () => {
      const now = Z("2026-08-14T19:00:00Z"); // 2 PM CDT: 2 hours after the noon deadline
      const result = calc("2026-08-15", baseTime, now);
      expect(result.hoursUntilDue).toBeCloseTo(-2, 5);
    });

    it("should report positive hours when before deadline", () => {
      const now = Z("2026-08-14T15:00:00Z"); // 10 AM CDT: 2 hours before deadline
      const result = calc("2026-08-15", baseTime, now);
      expect(result.hoursUntilDue).toBeCloseTo(2, 5);
    });

    it("should report approximately correct remaining hours", () => {
      // Check-in Aug 20 00:00 CDT; deadline Aug 19 12:00 CDT (17:00Z).
      // Now Aug 10 10:00Z → 9 days 7 hours = 223 hours.
      const result = calc("2026-08-20", baseTime, baseTime);
      expect(result.hoursUntilDue).toBeCloseTo(223, 5);
    });
  });

  describe("Edge cases", () => {
    it("should handle a same-day booking made 1 minute before check-in (urgent: due at check-in)", () => {
      const bookedAt = Z("2026-08-10T04:59:00Z"); // 11:59 PM CDT Aug 9
      const result = calc("2026-08-10", bookedAt, bookedAt);
      expect(result.tier).toBe("urgent");
      expect(result.deadline).toBe(Z("2026-08-10T05:00:00Z"));
      expect(result.isOverdue).toBe(false);
    });

    it("should handle far-future check-in", () => {
      const result = calc("2026-12-25", baseTime, baseTime);
      expect(result.deadline).toBe(Z("2026-12-24T18:00:00Z")); // noon CST Dec 24
      expect(result.hoursUntilDue).toBeGreaterThan(2500);
      expect(result.isOverdue).toBe(false);
    });

    it("should handle recent past check-in", () => {
      const result = calc("2026-08-05", Z("2026-07-20T12:00:00Z"), baseTime);
      expect(result.isOverdue).toBe(true);
      expect(result.hoursUntilDue).toBeLessThan(0);
    });
  });

  describe("Deadline formatting (Lodge time)", () => {
    it("should format deadline as readable string in Central time", () => {
      expect(formatWaiverDeadline(Z("2026-08-14T17:00:00Z"))).toBe("Aug 14, 2026 at 12:00 PM CDT");
      expect(formatWaiverDeadline(Z("2026-12-24T18:00:00Z"))).toBe("Dec 24, 2026 at 12:00 PM CST");
    });

    it("should include AM/PM indicator", () => {
      expect(formatWaiverDeadline(Z("2026-08-14T13:00:00Z"))).toContain("8:00 AM"); // 8 AM CDT
      expect(formatWaiverDeadline(Z("2026-08-14T19:00:00Z"))).toContain("2:00 PM"); // 2 PM CDT
    });
  });

  describe("Overdue applies to every unsigned status", () => {
    const pastDeadlineTime = Z("2026-08-14T18:00:00Z"); // 1 PM CDT, after the noon deadline for Aug 15

    it("'pending' can be overdue", () => {
      expect(calc("2026-08-15", baseTime, pastDeadlineTime, "pending").isOverdue).toBe(true);
    });

    it("'sent' can be overdue", () => {
      expect(calc("2026-08-15", baseTime, pastDeadlineTime, "sent").isOverdue).toBe(true);
    });

    it("'completed' is never overdue (deadline passed but waiver is signed)", () => {
      expect(calc("2026-08-15", baseTime, pastDeadlineTime, "completed").isOverdue).toBe(false);
    });

    it("'overdue' (still unsigned) reports overdue", () => {
      // Changed: this used to expect false, which made the admin view's
      // "any overdue" flag miss waivers already marked overdue.
      expect(calc("2026-08-15", baseTime, pastDeadlineTime, "overdue").isOverdue).toBe(true);
    });
  });
});
