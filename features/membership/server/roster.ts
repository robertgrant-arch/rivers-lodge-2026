/**
 * Membership Roster (member-facing)
 * =================================
 * The portal's Membership Roster lists each active member's name, phone and
 * email so members can reach one another. It is the ONLY member-facing reader
 * of member_profiles, and it reads exactly these columns:
 *
 *   member_profiles.full_name / preferred_name   → name
 *   member_profiles.cell_phone / work_phone      → phone
 *   users.email (the member's login email)       → email
 *
 * Nothing else from the Member File (address, birthday, family, health,
 * staff notes, photo…) is selected, so it can't leak through this path.
 *
 * Who may see it: admins, and signed-in users with an active member record.
 * Everyone else (signed out, staff without a member record, inactive members)
 * is refused at the API, not just hidden in the UI.
 *
 * Who is listed: active members whose login is not disabled.
 */
import { and, eq, ne } from "drizzle-orm";
import { members, users } from "@core/db/schema";
import { memberProfiles } from "../schema";

type Db = { select: (...args: any[]) => any };
type User = { id: string; role?: string | null } | null | undefined;

export type RosterEntry = {
  memberId: number;
  /** Display name, or null when the Member File has no name on record. */
  name: string | null;
  phone: string | null;
  email: string | null;
};

export type RosterRow = {
  memberId: number;
  fullName: string | null;
  preferredName: string | null;
  cellPhone: string | null;
  workPhone: string | null;
  email: string | null;
};

/** Admins, or users with an active member record. */
export async function canViewMemberRoster(db: Db, user: User): Promise<boolean> {
  if (!user?.id) return false;
  if (user.role === "admin") return true;
  const [member] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.userId, user.id), eq(members.active, true)))
    .limit(1);
  return !!member;
}

const clean = (v: string | null | undefined): string | null => {
  const s = (v ?? "").trim();
  return s ? s : null;
};

/** Shape and sort raw rows: by name (A–Z, case-insensitive), unnamed last. */
export function toRosterEntries(rows: RosterRow[]): RosterEntry[] {
  return rows
    .map((r) => ({
      memberId: r.memberId,
      name: clean(r.fullName) ?? clean(r.preferredName),
      phone: clean(r.cellPhone) ?? clean(r.workPhone),
      email: clean(r.email),
    }))
    .sort((a, b) => {
      if (a.name && !b.name) return -1;
      if (!a.name && b.name) return 1;
      const byName = (a.name ?? "").localeCompare(b.name ?? "", "en", { sensitivity: "base" });
      if (byName !== 0) return byName;
      return (a.email ?? "").localeCompare(b.email ?? "", "en", { sensitivity: "base" }) || a.memberId - b.memberId;
    });
}

/** Load the roster. Callers must check canViewMemberRoster first. */
export async function listMemberRoster(db: Db): Promise<RosterEntry[]> {
  const rows: RosterRow[] = await db
    .select({
      memberId: members.id,
      fullName: memberProfiles.fullName,
      preferredName: memberProfiles.preferredName,
      cellPhone: memberProfiles.cellPhone,
      workPhone: memberProfiles.workPhone,
      email: users.email,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .leftJoin(memberProfiles, eq(memberProfiles.memberId, members.id))
    .where(and(eq(members.active, true), ne(users.status, "disabled")));
  return toRosterEntries(rows);
}
