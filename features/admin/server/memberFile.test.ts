import { describe, expect, it, vi } from "vitest";
import {
  adminSchema,
  assertMemberFileAccess,
  childInput,
  contactSchema,
  familySchema,
  membershipInput,
  preferencesSchema,
  sniffImageType,
  updateSectionInput,
} from "./memberFile.validation";

describe("assertMemberFileAccess", () => {
  it("allows admins without an employee lookup", async () => {
    const lookup = vi.fn();
    await expect(assertMemberFileAccess({ id: "a", role: "admin" }, lookup)).resolves.toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("allows an employee-role user who is an active staff employee", async () => {
    await expect(
      assertMemberFileAccess({ id: "staff-1", role: "employee" }, async (id) => id === "staff-1"),
    ).resolves.toBeUndefined();
  });

  it("blocks an employee-role user with no active staff record (e.g. a member login)", async () => {
    await expect(
      assertMemberFileAccess({ id: "member-1", role: "employee" }, async () => false),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks any other role", async () => {
    const lookup = vi.fn(async () => true);
    await expect(assertMemberFileAccess({ id: "x", role: "member" }, lookup)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("section inputs — all optional, blanks stored as null", () => {
  it("accepts an empty contact section and stores every field as null", () => {
    const out = contactSchema.parse({});
    expect(Object.values(out).every((v) => v === null)).toBe(true);
  });

  it("trims text and turns blank strings into null", () => {
    const out = contactSchema.parse({ fullName: "  Jane Doe  ", preferredName: "   ", cellPhone: "" });
    expect(out.fullName).toBe("Jane Doe");
    expect(out.preferredName).toBeNull();
    expect(out.cellPhone).toBeNull();
  });

  it("allows a birthday without a year", () => {
    const out = contactSchema.parse({ birthdayMonth: 2, birthdayDay: 29 });
    expect(out).toMatchObject({ birthdayMonth: 2, birthdayDay: 29, birthdayYear: null });
  });

  it("rejects impossible birthdays and a day without a month", () => {
    expect(contactSchema.safeParse({ birthdayMonth: 4, birthdayDay: 31 }).success).toBe(false);
    expect(contactSchema.safeParse({ birthdayDay: 5 }).success).toBe(false);
    expect(contactSchema.safeParse({ birthdayMonth: 13 }).success).toBe(false);
  });

  it("validates the preferred contact method", () => {
    expect(contactSchema.parse({ preferredContactMethod: "text" }).preferredContactMethod).toBe("text");
    expect(contactSchema.safeParse({ preferredContactMethod: "fax" }).success).toBe(false);
  });

  it("validates the spouse email only when one is given", () => {
    expect(familySchema.parse({ spouseEmail: "" }).spouseEmail).toBeNull();
    expect(familySchema.safeParse({ spouseEmail: "not-an-email" }).success).toBe(false);
    expect(familySchema.parse({ spouseEmail: " pat@example.com " }).spouseEmail).toBe("pat@example.com");
  });

  it("dedupes activity interests and trip styles, and stores empty lists as null", () => {
    const out = preferencesSchema.parse({
      activityInterests: [
        { activity: "Fishing", level: "Beginner" },
        { activity: "Fishing", level: "Experienced" },
        { activity: "Hiking" },
      ],
      tripStyles: ["Guided", "Guided"],
    });
    expect(out.activityInterests).toEqual([
      { activity: "Fishing", level: "Beginner" },
      { activity: "Hiking", level: null },
    ]);
    expect(out.tripStyles).toEqual(["Guided"]);
    expect(preferencesSchema.parse({ tripStyles: ["Guided", "Family outing"] }).tripStyles).toEqual(["Family outing", "Guided"]);
    expect(preferencesSchema.parse({ activityInterests: [], tripStyles: [] })).toMatchObject({ activityInterests: null, tripStyles: null });
  });

  it("rejects activities and levels outside the allowed lists", () => {
    expect(preferencesSchema.safeParse({ activityInterests: [{ activity: "Golf" }] }).success).toBe(false);
    expect(preferencesSchema.safeParse({ activityInterests: [{ activity: "Fishing", level: "Pro" }] }).success).toBe(false);
  });

  it("accepts an orientation date or blank", () => {
    expect(adminSchema.parse({ orientationCompleted: true, orientationDate: "2026-10-01" })).toMatchObject({ orientationCompleted: true, orientationDate: "2026-10-01" });
    expect(adminSchema.parse({ orientationDate: "" }).orientationDate).toBeNull();
    expect(adminSchema.safeParse({ orientationDate: "10/01/2026" }).success).toBe(false);
  });

  it("routes each section to its own schema", () => {
    expect(updateSectionInput.safeParse({ memberId: 1, section: "health", data: { foodAllergies: "Peanuts" } }).success).toBe(true);
    expect(updateSectionInput.safeParse({ memberId: 1, section: "unknown", data: {} }).success).toBe(false);
  });
});

describe("children and membership inputs", () => {
  it("requires a child's name but nothing else", () => {
    expect(childInput.safeParse({ name: "  " }).success).toBe(false);
    expect(childInput.parse({ name: "Sam" })).toMatchObject({ name: "Sam", birthMonth: null, ageGroup: null, includedInMembership: null });
  });

  it("keeps membership values on the existing enum", () => {
    expect(membershipInput.safeParse({ memberId: 1, membershipType: "Silver", active: true }).success).toBe(true);
    expect(membershipInput.safeParse({ memberId: 1, membershipType: "Gold", active: true }).success).toBe(false);
  });
});

describe("sniffImageType", () => {
  it("detects JPEG, PNG and WebP from their first bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(sniffImageType(webp)).toBe("image/webp");
  });

  it("rejects anything else, whatever the client claims", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
  });
});
