import { describe, expect, it } from "vitest";
import {
  BOOKING_RULES,
  MAX_CONSECUTIVE_DAYS,
  bookingDayCount,
  consecutiveDaysError,
  isDirectionsUrl,
  propertyCapacity,
  sniffMapType,
} from "./propertyRules";

describe("booking rules", () => {
  it("shows exactly the two approved rules", () => {
    expect(BOOKING_RULES).toEqual([
      "Everyone on the property must follow the property rules and sign a waiver.",
      "Maximum 3 consecutive days.",
    ]);
    expect(BOOKING_RULES.join(" ")).not.toMatch(/advance|season|harvest/i);
  });

  it("counts days inclusively, across month and DST boundaries", () => {
    expect(bookingDayCount("2026-11-10", "2026-11-10")).toBe(1);
    expect(bookingDayCount("2026-11-10", "2026-11-12")).toBe(3);
    expect(bookingDayCount("2026-10-31", "2026-11-02")).toBe(3); // DST ends Nov 1
    expect(bookingDayCount("2026-03-07", "2026-03-09")).toBe(3); // DST starts Mar 8
  });

  it("allows up to 3 consecutive days and rejects 4+", () => {
    expect(MAX_CONSECUTIVE_DAYS).toBe(3);
    expect(consecutiveDaysError("2026-11-10", "2026-11-12")).toBeNull();
    expect(consecutiveDaysError("2026-11-10", "2026-11-13")).toMatch(/maximum of 3 consecutive days/);
  });
});

describe("propertyCapacity", () => {
  it("is Max Capacity (maxGuests) only — never deer/hunter counts", () => {
    expect(propertyCapacity({ maxGuests: 6, maxDeerHunters: 2 } as any)).toBe(6);
    expect(propertyCapacity({ maxGuests: 0 })).toBeNull();
    expect(propertyCapacity({ maxGuests: null })).toBeNull();
    expect(propertyCapacity(null)).toBeNull();
  });
});

describe("isDirectionsUrl", () => {
  it("accepts Google Maps and Apple Maps links", () => {
    for (const u of [
      "https://maps.app.goo.gl/AbCdEf123",
      "https://www.google.com/maps/place/La+Cygne,+KS/@38.35,-94.76,12z",
      "https://google.com/maps?q=38.35,-94.76",
      "https://maps.google.com/?q=38.35,-94.76",
      "https://goo.gl/maps/xyz",
      "https://maps.apple.com/?daddr=38.35,-94.76",
    ]) expect(isDirectionsUrl(u), u).toBe(true);
  });

  it("rejects non-map links and unsafe schemes", () => {
    for (const u of [
      "javascript:alert(1)",
      "https://www.google.com/search?q=x",
      "https://evil.example/maps",
      "https://maps.google.com.evil.example/",
      "ftp://maps.apple.com/",
      "not a url",
      "",
    ]) expect(isDirectionsUrl(u), u).toBe(false);
  });
});

describe("sniffMapType", () => {
  it("detects PDF, PNG and JPEG from their first bytes", () => {
    expect(sniffMapType(new TextEncoder().encode("%PDF-1.7\n"))).toBe("application/pdf");
    expect(sniffMapType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffMapType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });
  it("rejects anything else", () => {
    expect(sniffMapType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(sniffMapType(new Uint8Array([]))).toBeNull();
  });
});
