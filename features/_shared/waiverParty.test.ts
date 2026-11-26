import { describe, it, expect } from "vitest";
import { BOOKING_WAIVER_ACCEPTANCE_TEXT, isMinorOn, normalizeUsPhone, validateParty } from "./waiverParty";

const member = { fullName: "Pat Member", email: "pat@example.com", phone: "816-555-0100" };

describe("normalizeUsPhone", () => {
  it.each([
    ["(816) 555-1234", "8165551234"],
    ["816.555.1234", "8165551234"],
    ["+1 816 555 1234", "8165551234"],
    ["18165551234", "8165551234"],
  ])("%s → %s", (raw, out) => expect(normalizeUsPhone(raw)).toBe(out));
  it.each(["555-1234", "016-555-1234", "816-155-1234", "+44 20 7946 0958", ""])("rejects %s", (raw) => expect(normalizeUsPhone(raw)).toBeNull());
});

describe("validateParty", () => {
  it("accepts a valid party with a minor under the member and one under a guest", () => {
    const r = validateParty({
      member,
      guests: [
        { type: "adult", fullName: "Sam", email: "sam@example.com", phone: "9135550101" },
        { type: "minor", fullName: "Kid A", dateOfBirth: "2015-01-01", guardian: "member" },
        { type: "minor", fullName: "Kid B", dateOfBirth: "2017-01-01", guardian: 0 },
      ],
    }, { capacity: 4, checkInDate: "2026-12-20" });
    expect(r).toEqual({ ok: true, errors: {}, partySize: 4 });
  });

  it("requires every adult field", () => {
    const r = validateParty({ member: { fullName: "", email: "x", phone: "1" }, guests: [{ type: "adult", fullName: "", email: "", phone: "" }] });
    expect(Object.keys(r.errors).sort()).toEqual(["guests.0.email", "guests.0.fullName", "guests.0.phone", "member.email", "member.fullName", "member.phone"]);
  });

  it("requires a guardian who is the member or a listed adult", () => {
    const r = validateParty({ member, guests: [
      { type: "minor", fullName: "Kid", dateOfBirth: "2015-01-01", guardian: 1 },
      { type: "minor", fullName: "Kid 2", dateOfBirth: "2015-01-01", guardian: 0 },
    ] });
    expect(r.errors["guests.0.guardian"]).toBeTruthy();
    expect(r.errors["guests.1.guardian"]).toBeTruthy();
  });

  it("rejects duplicate emails (case-insensitive, including the member)", () => {
    const r = validateParty({ member, guests: [
      { type: "adult", fullName: "A", email: "PAT@example.com", phone: "9135550101" },
      { type: "adult", fullName: "B", email: "b@example.com", phone: "9135550102" },
      { type: "adult", fullName: "C", email: "B@example.com ", phone: "9135550103" },
    ] });
    expect(Object.keys(r.errors).sort()).toEqual(["guests.0.email", "guests.2.email"]);
  });

  it("enforces property capacity", () => {
    const r = validateParty({ member, guests: [{ type: "adult", fullName: "A", email: "a@example.com", phone: "9135550101" }] }, { capacity: 1 });
    expect(r.errors.party).toMatch(/maximum of 1 person/);
  });

  it("requires minors to be under 18 at check-in with a real date of birth", () => {
    const r = validateParty({ member, guests: [
      { type: "minor", fullName: "Adult-ish", dateOfBirth: "2000-01-01", guardian: "member" },
      { type: "minor", fullName: "Bad date", dateOfBirth: "2015-02-30", guardian: "member" },
    ] }, { checkInDate: "2026-12-20" });
    expect(r.errors["guests.0.dateOfBirth"]).toMatch(/under 18/);
    expect(r.errors["guests.1.dateOfBirth"]).toBeTruthy();
    expect(isMinorOn("2008-12-21", "2026-12-20")).toBe(true);
    expect(isMinorOn("2008-12-20", "2026-12-20")).toBe(false);
  });

  it("acceptance text is the exact wording", () => {
    expect(BOOKING_WAIVER_ACCEPTANCE_TEXT).toBe("I have read and agree to the Rivers Lodge Release & Liability Waiver. I confirm that every adult in my party will sign the waiver before entering the property, that only listed guests will attend, and that I am the parent or legal guardian of, or have the guardian's permission for, any minor I list.");
  });
});
