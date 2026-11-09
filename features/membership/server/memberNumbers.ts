/**
 * Member numbers — assignment and uniqueness.
 *
 * Format: RL-<year>-<NNNN>, e.g. RL-2026-0007. The next number for a year is
 * one more than the highest RL-<year>-NNNN already on file (not count(*)+1,
 * which collides after any deletion or with non-standard numbers).
 *
 * Uniqueness is enforced in two places:
 *  1. DB: unique index members_member_number_unique on upper(btrim("memberNumber"))
 *     (migration 0036). Numbers that were already shared when that migration ran
 *     are grandfathered out of the index and left untouched until the owner
 *     approves renumbering them.
 *  2. Here: assertMemberNumberAvailable() gives staff a readable error and also
 *     refuses to hand out a grandfathered (already-shared) value again.
 */
import { TRPCError } from "@trpc/server";
import { and, ne, sql } from "drizzle-orm";
import { members } from "../schema";

export const MEMBER_NUMBER_INDEX = "members_member_number_unique";

/** Trim + uppercase; blank → null. Matches the unique index expression. */
export function normalizeMemberNumber(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toUpperCase();
  return v === "" ? null : v;
}

/** True if a DB error is a unique-violation on the member-number index. */
export function isMemberNumberConflict(err: unknown): boolean {
  const seen = new Set<unknown>();
  let e: any = err;
  while (e && typeof e === "object" && !seen.has(e)) {
    seen.add(e);
    if (e.code === "23505" && (!e.constraint || e.constraint === MEMBER_NUMBER_INDEX)) return true;
    e = e.cause;
  }
  return false;
}

export function memberNumberConflictError(memberNumber: string): TRPCError {
  return new TRPCError({
    code: "CONFLICT",
    message: `Member number ${memberNumber} is already used by another member. Choose a different number or leave it blank to assign the next one automatically.`,
  });
}

type Db = { select: (...args: any[]) => any };

/** Throw CONFLICT if another member already has this (normalized) number. */
export async function assertMemberNumberAvailable(db: Db, memberNumber: string, exceptMemberId?: number): Promise<void> {
  const sameNumber = sql`upper(btrim(${members.memberNumber})) = ${memberNumber}`;
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(exceptMemberId ? and(sameNumber, ne(members.id, exceptMemberId)) : sameNumber)
    .limit(1);
  if (rows.length > 0) throw memberNumberConflictError(memberNumber);
}

/** Next unused RL-<year>-NNNN (4+ digits, zero-padded). */
export async function nextMemberNumber(db: Db, year: number = new Date().getFullYear()): Promise<string> {
  const pattern = `^RL-${year}-[0-9]+$`;
  const [row] = await db
    .select({
      n: sql<number | null>`max(substring(upper(btrim(${members.memberNumber})) from '^RL-[0-9]{4}-([0-9]+)$')::int)`,
    })
    .from(members)
    .where(sql`upper(btrim(${members.memberNumber})) ~ ${pattern}`);
  const next = Number(row?.n ?? 0) + 1;
  return `RL-${year}-${String(next).padStart(4, "0")}`;
}

/**
 * Insert a member, assigning a unique number. If `requested` is given it is
 * normalized and must be unused; otherwise the next RL-<year>-NNNN is used,
 * retrying if a concurrent create took it first.
 */
export async function insertMemberWithUniqueNumber<T>(
  db: Db,
  requested: string | null | undefined,
  insert: (memberNumber: string) => Promise<T>,
): Promise<{ result: T; memberNumber: string }> {
  const manual = normalizeMemberNumber(requested);
  if (manual) {
    await assertMemberNumberAvailable(db, manual);
    try {
      return { result: await insert(manual), memberNumber: manual };
    } catch (err) {
      if (isMemberNumberConflict(err)) throw memberNumberConflictError(manual);
      throw err;
    }
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const auto = await nextMemberNumber(db);
    try {
      return { result: await insert(auto), memberNumber: auto };
    } catch (err) {
      if (!isMemberNumberConflict(err)) throw err;
      // someone else just took it — recompute and try again
    }
  }
  throw new TRPCError({ code: "CONFLICT", message: "Couldn't assign a unique member number — please try again." });
}
