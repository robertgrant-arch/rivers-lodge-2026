import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  insertMemberWithUniqueNumber,
  isMemberNumberConflict,
  normalizeMemberNumber,
} from "./memberNumbers";

/** Minimal stand-in for the drizzle query chain used by memberNumbers.ts. */
function fakeDb(opts: { existing?: Array<{ id: number }>; maxN?: number | null } = {}) {
  const chain = (rows: unknown[]) => {
    const p: any = Promise.resolve(rows);
    p.from = () => p;
    p.where = () => p;
    p.limit = () => p;
    return p;
  };
  return {
    select: vi.fn((shape: Record<string, unknown>) =>
      "n" in shape ? chain([{ n: opts.maxN ?? null }]) : chain(opts.existing ?? []),
    ),
  };
}

const uniqueViolation = () =>
  Object.assign(new Error("Failed query"), {
    cause: { code: "23505", constraint: "members_member_number_unique" },
  });

describe("normalizeMemberNumber", () => {
  it("trims and uppercases; blank becomes null", () => {
    expect(normalizeMemberNumber("  rl-2026-0007 ")).toBe("RL-2026-0007");
    expect(normalizeMemberNumber("   ")).toBeNull();
    expect(normalizeMemberNumber(null)).toBeNull();
    expect(normalizeMemberNumber(undefined)).toBeNull();
  });
});

describe("isMemberNumberConflict", () => {
  it("recognises a unique violation on the member-number index, including wrapped drizzle errors", () => {
    expect(isMemberNumberConflict(uniqueViolation())).toBe(true);
    expect(isMemberNumberConflict({ code: "23505", constraint: "members_member_number_unique" })).toBe(true);
  });
  it("ignores other errors and other constraints", () => {
    expect(isMemberNumberConflict({ code: "23505", constraint: "members_userId_unique" })).toBe(false);
    expect(isMemberNumberConflict({ code: "23503" })).toBe(false);
    expect(isMemberNumberConflict(new Error("boom"))).toBe(false);
  });
});

describe("insertMemberWithUniqueNumber", () => {
  it("auto-assigns one more than the highest RL-<year>-NNNN", async () => {
    const year = new Date().getFullYear();
    const insert = vi.fn(async (n: string) => n);
    const { memberNumber } = await insertMemberWithUniqueNumber(fakeDb({ maxN: 41 }), undefined, insert);
    expect(memberNumber).toBe(`RL-${year}-0042`);
    expect(insert).toHaveBeenCalledWith(`RL-${year}-0042`);
  });

  it("starts at 0001 when the year has no numbers yet", async () => {
    const year = new Date().getFullYear();
    const { memberNumber } = await insertMemberWithUniqueNumber(fakeDb({ maxN: null }), "", async (n) => n);
    expect(memberNumber).toBe(`RL-${year}-0001`);
  });

  it("retries the auto number when a concurrent create wins the race", async () => {
    let calls = 0;
    const insert = vi.fn(async (n: string) => {
      if (calls++ === 0) throw uniqueViolation();
      return n;
    });
    await insertMemberWithUniqueNumber(fakeDb({ maxN: 1 }), undefined, insert);
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it("rejects a staff-entered number another member already has (no insert attempted)", async () => {
    const insert = vi.fn();
    await expect(
      insertMemberWithUniqueNumber(fakeDb({ existing: [{ id: 9 }] }), " rl-2026-preview ", insert),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("normalizes and uses a free staff-entered number", async () => {
    const { memberNumber } = await insertMemberWithUniqueNumber(fakeDb(), " rl-2026-0100 ", async (n) => n);
    expect(memberNumber).toBe("RL-2026-0100");
  });

  it("turns a DB unique violation on a staff-entered number into a readable CONFLICT", async () => {
    const err = await insertMemberWithUniqueNumber(fakeDb(), "RL-2026-0100", async () => {
      throw uniqueViolation();
    }).catch((e) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect(err.code).toBe("CONFLICT");
    expect(err.message).toContain("RL-2026-0100");
  });
});
