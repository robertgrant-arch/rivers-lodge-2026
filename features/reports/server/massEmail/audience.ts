/**
 * Mass email recipients. An audience is one of:
 *   all_members            — every active member with an enabled login
 *   skill_groups (slugs)   — active members in any of the chosen skill groups
 *   customers              — wedding/corporate/hunting-group/other-group bookings, sales leads and website inquiries
 *   individuals (emails)   — hand-picked people from the directory
 * Results are de-duplicated (case-insensitive) and never include anyone in
 * email_unsubscribes.
 */
import { z } from "zod";
import { and, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { members, users, memberProfiles, memberSkillGroups, skillGroups, inquiries } from "@core/db/schema";
import { weddingBookings, corporateBookings } from "@core/db/portal-schema";
import { leads } from "@core/db/booking-schema";
import { huntingGroupBookings } from "@features/hunting-groups/server/public";
import { otherGroupBookings } from "@features/other-groups/public";
import { emailUnsubscribes } from "../../schema";
import { normalizeEmail } from "./unsubscribe";

export const SKILL_GROUP_SLUGS = ["designated", "silver", "social", "employee", "admin"] as const;

export const emailAudienceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all_members") }),
  z.object({ type: z.literal("skill_groups"), slugs: z.array(z.enum(SKILL_GROUP_SLUGS)).min(1) }),
  z.object({ type: z.literal("customers") }),
  z.object({ type: z.literal("individuals"), emails: z.array(z.string().email().max(320)).min(1).max(500) }),
]);
export type EmailAudience = z.infer<typeof emailAudienceSchema>;

export type Person = { email: string; name: string | null; kind: "member" | "customer" };

type Db = { select: (...args: any[]) => any; selectDistinct: (...args: any[]) => any };

const GROUP_LABEL: Record<string, string> = { designated: "Designated", silver: "Silver", social: "Social", employee: "Employee", admin: "Admin" };

export function audienceLabel(a: EmailAudience): string {
  switch (a.type) {
    case "all_members": return "All active members";
    case "skill_groups": return `Members: ${a.slugs.map((s) => GROUP_LABEL[s] ?? s).join(", ")}`;
    case "customers": return "Customers & wedding/corporate/hunting/other group leads";
    case "individuals": return `${a.emails.length} hand-picked ${a.emails.length === 1 ? "person" : "people"}`;
  }
}

/** Merge, de-duplicate (lower-case email) and keep the first non-empty name. */
export function dedupePeople(rows: Array<{ email: string | null; name: string | null; kind: Person["kind"] }>): Person[] {
  const byEmail = new Map<string, Person>();
  for (const r of rows) {
    const email = normalizeEmail(r.email ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    const existing = byEmail.get(email);
    if (!existing) byEmail.set(email, { email, name: r.name?.trim() || null, kind: r.kind });
    else if (!existing.name && r.name?.trim()) existing.name = r.name.trim();
  }
  return Array.from(byEmail.values()).sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
}

const memberName = sql<string | null>`coalesce(nullif(${memberProfiles.fullName}, ''), nullif(${memberProfiles.preferredName}, ''))`;

async function activeMembers(db: Db, skillGroupSlugs?: string[]) {
  let q = db
    .selectDistinct({ email: users.email, name: memberName })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .leftJoin(memberProfiles, eq(memberProfiles.memberId, members.id));
  const conds: any[] = [eq(members.active, true), ne(users.status, "disabled")];
  if (skillGroupSlugs) {
    q = q.innerJoin(memberSkillGroups, eq(memberSkillGroups.memberId, members.id)).innerJoin(skillGroups, eq(skillGroups.id, memberSkillGroups.skillGroupId));
    conds.push(inArray(skillGroups.slug, skillGroupSlugs));
  }
  const rows: Array<{ email: string; name: string | null }> = await q.where(and(...conds));
  return rows.map((r) => ({ ...r, kind: "member" as const }));
}

async function customers(db: Db) {
  const [w, c, h, o, l, i] = await Promise.all([
    db.select({ email: weddingBookings.contactEmail, name: weddingBookings.coupleName }).from(weddingBookings),
    db.select({ email: corporateBookings.contactEmail, name: corporateBookings.contactName }).from(corporateBookings),
    db.select({ email: huntingGroupBookings.contactEmail, name: huntingGroupBookings.contactName }).from(huntingGroupBookings),
    db.select({ email: otherGroupBookings.contactEmail, name: otherGroupBookings.contactName }).from(otherGroupBookings),
    db.select({ email: leads.contactEmail, name: leads.contactName }).from(leads),
    db.select({ email: inquiries.email, name: inquiries.name }).from(inquiries),
  ]);
  return [...w, ...c, ...h, ...o, ...l, ...i].map((r: any) => ({ ...r, kind: "customer" as const }));
}

/** Everyone the audience covers, before removing unsubscribes. */
async function rawPeople(db: Db, a: EmailAudience): Promise<Person[]> {
  if (a.type === "all_members") return dedupePeople(await activeMembers(db));
  if (a.type === "skill_groups") return dedupePeople(await activeMembers(db, a.slugs));
  if (a.type === "customers") return dedupePeople(await customers(db));
  // individuals: only people in the member/customer directory, so this can't
  // be used to email an arbitrary pasted list.
  const wanted = new Set(a.emails.map(normalizeEmail));
  const directory = dedupePeople([...(await activeMembers(db)), ...(await customers(db))]);
  return directory.filter((p) => wanted.has(p.email));
}

export async function unsubscribedSet(db: Db, emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  const out = new Set<string>();
  for (let i = 0; i < emails.length; i += 1000) {
    const rows: Array<{ email: string }> = await db.select({ email: emailUnsubscribes.email }).from(emailUnsubscribes).where(inArray(emailUnsubscribes.email, emails.slice(i, i + 1000)));
    rows.forEach((r) => out.add(r.email));
  }
  return out;
}

/** Recipients for an audience, minus unsubscribed addresses. */
export async function resolveAudience(db: Db, a: EmailAudience): Promise<{ recipients: Person[]; excludedUnsubscribed: number }> {
  const people = await rawPeople(db, a);
  const unsub = await unsubscribedSet(db, people.map((p) => p.email));
  const recipients = people.filter((p) => !unsub.has(p.email));
  return { recipients, excludedUnsubscribed: people.length - recipients.length };
}

/** Directory search for hand-picking recipients (members and customers). */
export async function searchPeople(db: Db, q: string, limit = 20): Promise<Array<Person & { unsubscribed: boolean }>> {
  const term = `%${q.trim()}%`;
  if (q.trim().length < 2) return [];
  const [m, w, c, h, o, l, i] = await Promise.all([
    db.selectDistinct({ email: users.email, name: memberName }).from(members).innerJoin(users, eq(members.userId, users.id)).leftJoin(memberProfiles, eq(memberProfiles.memberId, members.id))
      .where(and(eq(members.active, true), ne(users.status, "disabled"), or(ilike(users.email, term), ilike(memberProfiles.fullName, term), ilike(memberProfiles.preferredName, term)))).limit(limit),
    db.select({ email: weddingBookings.contactEmail, name: weddingBookings.coupleName }).from(weddingBookings).where(or(ilike(weddingBookings.contactEmail, term), ilike(weddingBookings.coupleName, term))).limit(limit),
    db.select({ email: corporateBookings.contactEmail, name: corporateBookings.contactName }).from(corporateBookings).where(or(ilike(corporateBookings.contactEmail, term), ilike(corporateBookings.contactName, term), ilike(corporateBookings.companyName, term))).limit(limit),
    db.select({ email: huntingGroupBookings.contactEmail, name: huntingGroupBookings.contactName }).from(huntingGroupBookings).where(or(ilike(huntingGroupBookings.contactEmail, term), ilike(huntingGroupBookings.contactName, term), ilike(huntingGroupBookings.groupName, term))).limit(limit),
    db.select({ email: otherGroupBookings.contactEmail, name: otherGroupBookings.contactName }).from(otherGroupBookings).where(or(ilike(otherGroupBookings.contactEmail, term), ilike(otherGroupBookings.contactName, term), ilike(otherGroupBookings.groupName, term))).limit(limit),
    db.select({ email: leads.contactEmail, name: leads.contactName }).from(leads).where(or(ilike(leads.contactEmail, term), ilike(leads.contactName, term))).limit(limit),
    db.select({ email: inquiries.email, name: inquiries.name }).from(inquiries).where(or(ilike(inquiries.email, term), ilike(inquiries.name, term))).limit(limit),
  ]);
  const people = dedupePeople([
    ...m.map((r: any) => ({ ...r, kind: "member" as const })),
    ...[...w, ...c, ...h, ...o, ...l, ...i].map((r: any) => ({ ...r, kind: "customer" as const })),
  ]).slice(0, limit);
  const unsub = await unsubscribedSet(db, people.map((p) => p.email));
  return people.map((p) => ({ ...p, unsubscribed: unsub.has(p.email) }));
}
