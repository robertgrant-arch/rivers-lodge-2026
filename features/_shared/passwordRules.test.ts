import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, passwordProblems } from "./passwordRules";

describe("password rules", () => {
  it("lists what a weak password is missing", () => {
    expect(passwordProblems("short")).toEqual(["At least 12 characters", "One uppercase letter", "One number", "One special character"]);
    expect(passwordProblems("Abcdefghijk1!")).toEqual([]);
    expect(passwordProblems("A1!" + "a".repeat(200))).toContain("At most 128 characters");
  });
  it("generated temporary passwords always meet every rule and differ", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const p = generateTemporaryPassword();
      expect(p).toHaveLength(16);
      expect(passwordProblems(p)).toEqual([]);
      expect(p).not.toMatch(/[0O1lI]/);
      seen.add(p);
    }
    expect(seen.size).toBe(300);
  });
});
