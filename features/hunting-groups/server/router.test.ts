/**
 * Hunting groups — permissions, CRUD, audit log, validation and calendar feed.
 * Uses a recording fake DB (no Postgres needed). The real-SQL round trip is in
 * router.db.test.ts (runs when TEST_DATABASE_URL is set).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "@core/server/context";

vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: vi.fn(() => ({})) }));

import { appRouter } from "../../../_core/server/router";
import { collectCalendarItems, getCalendarSources } from "@shared/calendarFeed";
import { __setHuntingGroupsDb, auditFieldList, changedFields, HUNTING_GROUP_AUDIT_ENTITY } from "./router";
import { createHuntingGroupCalendarSource, huntingGroupItem } from "./calendarSource";
import { createHuntingGroupInquiryBooking } from "./inquiry";
import { toHuntingGroupValues, createHuntingGroupInput } from "./validation";
import { huntingGroupBookings } from "../schema";
import { portalAuditLog } from "@core/db/portal-schema";

type Role = "admin" | "employee" | null;
function ctx(role: Role): TrpcContext {
  return {
    user: role ? ({ id: `u-${role}`, email: `${role}@test.invalid`, role, status: "active", mustChangePassword: false } as any) : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}

/** Recording fake drizzle. Each select resolves to the next queued result. */
function fakeDb(selectResults: unknown[][] = []) {
  const log: { op: string; table?: unknown; values?: any }[] = [];
  let sel = 0;
  const chain = (result: unknown, entry?: { values?: any }) => {
    const p: any = Promise.resolve(result);
    for (const m of ["from", "where", "limit", "orderBy", "groupBy", "leftJoin", "innerJoin", "returning"]) p[m] = () => p;
    p.values = (v: any) => { if (entry) entry.values = v; return p; };
    p.set = (v: any) => { if (entry) entry.values = v; return p; };
    return p;
  };
  const db = {
    log,
    select: () => chain(selectResults[sel++] ?? []),
    insert: (table: unknown) => { const e = { op: "insert", table } as any; log.push(e); return chain([{ id: 41 }], e); },
    update: (table: unknown) => { const e = { op: "update", table } as any; log.push(e); return chain(undefined, e); },
    delete: (table: unknown) => { const e = { op: "delete", table } as any; log.push(e); return chain(undefined, e); },
  };
  return db;
}

const caller = (role: Role) => appRouter.createCaller(ctx(role)) as any;
const VALID = { groupName: "Mallard Club", contactName: "Pat Doe", contactEmail: "pat@example.com" };
const ROW = {
  id: 7, status: "inquiry", groupName: "Mallard Club", contactName: "Pat Doe", contactEmail: "pat@example.com",
  arrivalDate: "2026-11-28", departureDate: "2026-12-01",
};

describe("permissions", () => {
  const calls: [string, unknown][] = [
    ["list", undefined], ["counts", undefined], ["get", { id: 1 }], ["options", undefined],
    ["create", VALID], ["update", { id: 1, notes: "x" }], ["updateStatus", { id: 1, status: "confirmed" }], ["delete", { id: 1 }],
  ];
  const procs = Object.keys((appRouter as any)._def.procedures).filter((p) => p.startsWith("huntingGroups."));

  it("every huntingGroups procedure is covered here", () => {
    expect(procs.sort()).toEqual(calls.map(([n]) => `huntingGroups.${n}`).sort());
  });

  it.each(calls)("%s: signed out → UNAUTHORIZED", async (name, input) => {
    await expect(caller(null).huntingGroups[name](input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each(calls)("%s: member login (employee role) → FORBIDDEN", async (name, input) => {
    const db = fakeDb();
    __setHuntingGroupsDb(() => db as any);
    await expect(caller("employee").huntingGroups[name](input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.log).toHaveLength(0); // refused before touching the DB
    __setHuntingGroupsDb(null);
  });
});

describe("CRUD (admin)", () => {
  let db: ReturnType<typeof fakeDb>;
  const use = (results: unknown[][] = []) => { db = fakeDb(results); __setHuntingGroupsDb(() => db as any); };
  afterEach(() => __setHuntingGroupsDb(null));

  it("create inserts the booking (defaults to Inquiry) and writes an audit row", async () => {
    use();
    const out = await caller("admin").huntingGroups.create({
      ...VALID, arrivalDate: "2026-11-28", departureDate: "2026-12-01", partySize: 6,
      species: ["waterfowl", "upland", "waterfowl"], propertyIds: [2, 3], guideUserIds: ["g1"],
      contractValue: "4500", depositAmount: 1000, contactPhone: "", lodgingRequired: true,
    });
    expect(out).toEqual({ id: 41 });
    const [ins, audit] = db.log;
    expect(ins.table).toBe(huntingGroupBookings);
    expect(ins.values).toMatchObject({
      groupName: "Mallard Club", arrivalDate: "2026-11-28", departureDate: "2026-12-01", partySize: 6,
      species: ["waterfowl", "upland"], propertyIds: [2, 3], guideUserIds: ["g1"],
      contractValue: "4500.00", depositAmount: "1000.00", contactPhone: null, lodgingRequired: true,
      assignedUserId: "u-admin",
    });
    expect(ins.values.status).toBeUndefined(); // DB default 'inquiry'
    expect(audit.table).toBe(portalAuditLog);
    expect(audit.values).toMatchObject({ actionType: "create", entityType: HUNTING_GROUP_AUDIT_ENTITY, entityId: "41" });
  });

  it("create rejects departure before arrival, bad email, unknown species", async () => {
    use();
    await expect(caller("admin").huntingGroups.create({ ...VALID, arrivalDate: "2026-11-28", departureDate: "2026-11-01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller("admin").huntingGroups.create({ ...VALID, contactEmail: "nope" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller("admin").huntingGroups.create({ ...VALID, species: ["dragons"] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.log).toHaveLength(0);
  });

  it("update only touches the fields sent; status changes are audited as status_change", async () => {
    use([[ROW]]);
    await caller("admin").huntingGroups.update({ id: 7, status: "confirmed", notes: "  Bring decoys  " });
    const [upd, audit] = db.log;
    expect(upd.op).toBe("update");
    expect(upd.values).toEqual({ status: "confirmed", notes: "Bring decoys" });
    expect(audit.values).toMatchObject({ actionType: "status_change", oldValue: "inquiry", newValue: "confirmed", entityId: "7" });
  });

  it("update checks dates against the stored booking", async () => {
    use([[ROW]]);
    await expect(caller("admin").huntingGroups.update({ id: 7, departureDate: "2026-11-01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.log).toHaveLength(0);
  });

  it("update clears a field with an empty string", async () => {
    use([[ROW]]);
    await caller("admin").huntingGroups.update({ id: 7, departureDate: "", contractValue: "" });
    // contractValue was already empty, so only departureDate is written.
    expect(db.log[0].values).toEqual({ departureDate: null });
  });

  it("saving the whole edit form only writes and audits what changed (audit column is varchar(100))", async () => {
    use([[{ ...ROW, partySize: 6, contractValue: "4500.00", species: ["upland", "waterfowl"], propertyIds: [], guideUserIds: [], notes: null }]]);
    await caller("admin").huntingGroups.update({
      id: 7, ...VALID, status: "inquiry", arrivalDate: "2026-11-28", departureDate: "2026-12-01", partySize: 6,
      contractValue: "4500", species: ["waterfowl", "upland"], propertyIds: [], guideUserIds: [],
      contactPhone: "", mailingStreet: "", mailingCity: "", mailingState: "", mailingZip: "", lodgingNotes: "",
      cateringNotes: "", referredBy: "", notes: "New note", depositAmount: "", depositReceivedDate: "",
      balanceDueDate: "", balanceReceivedDate: "", linkedMemberId: null,
    });
    const [upd, audit] = db.log;
    expect(upd.values).toEqual({ notes: "New note" });
    expect(audit.values).toMatchObject({ actionType: "update", fieldChanged: "notes" });
  });

  it("an update that changes nothing writes nothing", async () => {
    use([[ROW]]);
    await caller("admin").huntingGroups.update({ id: 7, groupName: "Mallard Club" });
    expect(db.log).toHaveLength(0);
  });

  it("update / delete / get of a missing booking → NOT_FOUND", async () => {
    use([[], [], []]);
    await expect(caller("admin").huntingGroups.update({ id: 99, notes: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller("admin").huntingGroups.delete({ id: 99 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller("admin").huntingGroups.get({ id: 99 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updateStatus (e.g. cancel) and delete are audited", async () => {
    use([[ROW], [ROW]]);
    await caller("admin").huntingGroups.updateStatus({ id: 7, status: "cancelled" });
    await caller("admin").huntingGroups.delete({ id: 7 });
    expect(db.log.map((e) => e.op)).toEqual(["update", "insert", "delete", "insert"]);
    expect(db.log[1].values).toMatchObject({ actionType: "status_change", newValue: "cancelled" });
    expect(db.log[3].values).toMatchObject({ actionType: "delete", oldValue: "Mallard Club" });
  });

  it("counts returns every status, zero-filled", async () => {
    use([[{ status: "inquiry", count: 3 }, { status: "confirmed", count: 1 }]]);
    const out = await caller("admin").huntingGroups.counts();
    expect(out).toEqual({ inquiry: 3, contacted: 0, proposal_sent: 0, contract_out: 0, confirmed: 1, completed: 0, cancelled: 0, lost: 0 });
  });

  it("list pages by id cursor", async () => {
    use([[{ id: 3 }, { id: 2 }, { id: 1 }]]);
    const out = await caller("admin").huntingGroups.list({ limit: 2 });
    expect(out).toEqual({ items: [{ id: 3 }, { id: 2 }], nextCursor: 2 });
  });
});

describe("validation helpers", () => {
  it("auditFieldList caps the list at 100 characters", () => {
    const keys = Array.from({ length: 30 }, (_, i) => `someLongFieldName${i}`);
    expect(auditFieldList(keys).length).toBe(100);
    expect(auditFieldList(["a", "b"])).toBe("a,b");
  });
  it("changedFields treats 4500 and 4500.00, Date and ISO string, reordered arrays as equal", () => {
    expect(changedFields(
      { contractValue: "4500.00", arrivalDate: new Date("2026-11-28T00:00:00Z"), species: ["b", "a"], notes: null },
      { contractValue: "4500", arrivalDate: "2026-11-28", species: ["a", "b"], notes: "" },
    )).toEqual([]);
  });
  it("toHuntingGroupValues leaves unsent keys out", () => {
    expect(toHuntingGroupValues({ notes: "a" })).toEqual({ notes: "a" });
  });
  it("money accepts numbers and 2-dp strings only", () => {
    expect(createHuntingGroupInput.safeParse({ ...VALID, contractValue: "12.345" }).success).toBe(false);
    expect(createHuntingGroupInput.safeParse({ ...VALID, contractValue: "12.34" }).success).toBe(true);
  });
});

describe("hunting groups on the calendar", () => {
  const STAFF = { userId: "a", role: "admin", audience: "staff" as const };
  const MEMBER = { userId: "m", role: "employee", audience: "member" as const };

  it("is registered in the calendar feed at boot", () => {
    expect(getCalendarSources().map((s) => s.kind)).toEqual([
      "ops_event", "member_event", "wedding", "corporate", "hunting_group", "other_group", "hunt_fish", "blocked",
    ]);
  });

  it("maps a booking to an Ops-linked, member-hidden item", () => {
    const it1 = huntingGroupItem({ id: 7, groupName: "Mallard Club", partySize: 6, arrivalDate: "2026-11-28", departureDate: "2026-12-01", status: "confirmed" });
    expect(it1).toMatchObject({ id: "hunting_group-7", kind: "hunting_group", title: "Hunting Group: Mallard Club (6)", href: "/ops/hunting-groups/7", hiddenFromMembers: true });
  });

  const rows = [
    { ...ROW, partySize: 6, status: "confirmed" },
    { id: 8, groupName: "Undated", partySize: 2, arrivalDate: null, departureDate: null, status: "inquiry" },
    { id: 9, groupName: "Tentative", partySize: 2, arrivalDate: "2026-11-10", departureDate: null, status: "proposal_sent" },
    { id: 10, groupName: "Gone", partySize: 2, arrivalDate: "2026-11-11", departureDate: null, status: "cancelled" },
  ];
  const src = createHuntingGroupCalendarSource(() => fakeDb([rows, rows]) as any);

  it("overlap across the month end, undated skipped, cancelled out, tentative flagged", async () => {
    const nov = await collectCalendarItems([src], "2026-11-01", "2026-11-30", STAFF);
    expect(nov.map((i) => [i.id, i.tentative])).toEqual([["hunting_group-9", true], ["hunting_group-7", false]]);
  });

  it("members only get Unavailable", async () => {
    const items = await collectCalendarItems([createHuntingGroupCalendarSource(() => fakeDb([rows]) as any)], "2026-11-01", "2026-11-30", MEMBER);
    expect(new Set(items.map((i) => i.title))).toEqual(new Set(["Unavailable"]));
    expect(JSON.stringify(items)).not.toMatch(/Mallard|hunting-groups/);
  });
});

describe("public inquiry → Inquiry booking", () => {
  beforeEach(() => vi.clearAllMocks());
  it("creates an Inquiry-status booking (date only when it's a real date)", async () => {
    const db = fakeDb();
    const id = await createHuntingGroupInquiryBooking(db, { name: "Pat", email: "pat@example.com", eventDate: "2026-12-05", guestCount: 4, message: "Ducks" });
    expect(id).toBe(41);
    expect(db.log[0].values).toMatchObject({ status: "inquiry", groupName: "Pat", contactEmail: "pat@example.com", arrivalDate: "2026-12-05", partySize: 4, notes: "Ducks" });
    const db2 = fakeDb();
    await createHuntingGroupInquiryBooking(db2, { name: "Pat", email: "pat@example.com", eventDate: "sometime in fall" });
    expect(db2.log[0].values.arrivalDate).toBeNull();
  });
});
