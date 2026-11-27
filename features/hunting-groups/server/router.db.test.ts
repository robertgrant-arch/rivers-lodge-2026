/**
 * Real-Postgres round trip for hunting groups: migration 0042 → create →
 * calendar feed → edit → cancel → delete, plus the audit log.
 * Runs only when TEST_DATABASE_URL points at a DISPOSABLE database (it
 * applies migration 0042 and inserts rows); skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TrpcContext } from "@core/server/context";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (TEST_DATABASE_URL) process.env.DATABASE_URL = TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)("hunting groups (real database)", () => {
  let pool: any;
  let caller: any;
  let collect: (start: string, end: string) => Promise<any[]>;
  const created: number[] = [];

  beforeAll(async () => {
    const pg = await import("pg");
    pool = new pg.Pool({ connectionString: TEST_DATABASE_URL });
    // portal_audit_log normally comes from the startup migration; make sure it exists.
    await pool.query(`DO $$ BEGIN CREATE TYPE audit_action_type AS ENUM ('create','update','delete','status_change','login','export','override'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await pool.query(`CREATE TABLE IF NOT EXISTS portal_audit_log (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "actingUserId" varchar(36) NOT NULL, "actingUserName" varchar(255) NOT NULL,
      "actionType" audit_action_type NOT NULL, "entityType" varchar(100) NOT NULL, "entityId" varchar(100), "fieldChanged" varchar(100),
      "oldValue" text, "newValue" text, notes text, "ipAddress" varchar(45), "createdAt" timestamp NOT NULL DEFAULT now())`);
    const sql = await readFile(join(process.cwd(), "_core/db/migrations/0042_hunting_group_bookings.sql"), "utf8");
    await pool.query(sql);
    await pool.query(sql); // repeat-safe

    const { appRouter } = await import("../../../_core/server/router");
    const { huntingGroupCalendarSource } = await import("./calendarSource");
    const { collectCalendarItems } = await import("@shared/calendarFeed");
    caller = appRouter.createCaller({
      user: { id: "db-test-admin", email: "admin@test.invalid", role: "admin", status: "active", mustChangePassword: false },
      req: { protocol: "https", headers: {} }, res: { clearCookie: () => {}, cookie: () => {} },
    } as unknown as TrpcContext);
    collect = (start, end) => collectCalendarItems([huntingGroupCalendarSource], start, end, { userId: "a", role: "admin", audience: "staff" });
  });

  afterAll(async () => {
    if (created.length) await pool.query(`DELETE FROM hunting_group_bookings WHERE id = ANY($1)`, [created]);
    await pool?.end();
  });

  it("create → calendar (cross-month) → edit → cancel → delete", async () => {
    const { id } = await caller.huntingGroups.create({
      groupName: "DB Test Mallard Club", contactName: "Pat", contactEmail: "pat@example.com",
      arrivalDate: "2031-01-30", departureDate: "2031-02-02", partySize: 5,
      species: ["waterfowl", "upland"], propertyIds: [1], guideUserIds: ["g-1"], contractValue: "4500.5",
    });
    created.push(id);

    const row = await caller.huntingGroups.get({ id });
    expect(row).toMatchObject({ status: "inquiry", species: ["waterfowl", "upland"], propertyIds: [1], guideUserIds: ["g-1"], contractValue: "4500.50" });
    expect(String(row.arrivalDate).slice(0, 10)).toBe("2031-01-30");

    // Shows in January AND February (overlap rule), tentative while an inquiry.
    const jan = (await collect("2031-01-01", "2031-01-31")).filter((i) => i.recordId === id);
    const feb = (await collect("2031-02-01", "2031-02-28")).filter((i) => i.recordId === id);
    expect(jan).toHaveLength(1);
    expect(feb).toHaveLength(1);
    expect(jan[0]).toMatchObject({ tentative: true, startDate: "2031-01-30", endDate: "2031-02-02" });

    await caller.huntingGroups.update({ id, status: "confirmed", departureDate: "2031-01-31" });
    const feb2 = (await collect("2031-02-01", "2031-02-28")).filter((i) => i.recordId === id);
    const jan2 = (await collect("2031-01-01", "2031-01-31")).filter((i) => i.recordId === id);
    expect(feb2).toHaveLength(0);
    expect(jan2[0].tentative).toBe(false);

    const counts = await caller.huntingGroups.counts();
    expect(counts.confirmed).toBeGreaterThanOrEqual(1);
    const listed = await caller.huntingGroups.list({ search: "db test mallard" });
    expect(listed.items.map((b: any) => b.id)).toContain(id);

    await caller.huntingGroups.updateStatus({ id, status: "cancelled" });
    expect((await collect("2031-01-01", "2031-01-31")).filter((i) => i.recordId === id)).toHaveLength(0);

    await caller.huntingGroups.delete({ id });
    await expect(caller.huntingGroups.get({ id })).rejects.toMatchObject({ code: "NOT_FOUND" });

    const audit = await pool.query(`SELECT "actionType" FROM portal_audit_log WHERE "entityType" = 'HuntingGroupBooking' AND "entityId" = $1 ORDER BY id`, [String(id)]);
    expect(audit.rows.map((r: any) => r.actionType)).toEqual(["create", "status_change", "status_change", "delete"]);
  });

  it("saving the full edit form works (audit stays within varchar(100))", async () => {
    const { id } = await caller.huntingGroups.create({ groupName: "DB Test Full Form", contactName: "Pat", contactEmail: "pat@example.com", contractValue: "100" });
    created.push(id);
    await caller.huntingGroups.update({
      id, groupName: "DB Test Full Form", contactName: "Pat", contactEmail: "pat@example.com", status: "contacted",
      contactPhone: "555", mailingStreet: "1 Main", mailingCity: "La Cygne", mailingState: "KS", mailingZip: "66040",
      arrivalDate: "2031-05-01", departureDate: "2031-05-03", partySize: 4, species: ["turkey"], propertyIds: [], guideUserIds: [],
      lodgingRequired: true, lodgingNotes: "x", mealsRequired: true, cateringNotes: "y", licensesConfirmed: true, linkedMemberId: null,
      contractValue: "100.00", depositAmount: "50", depositReceivedDate: "2031-04-01", balanceDueDate: "2031-04-20", balanceReceivedDate: "",
      source: "referral", referredBy: "Lee", repeatClient: true, notes: "Full form",
    });
    const row = await caller.huntingGroups.get({ id });
    expect(row).toMatchObject({ status: "contacted", mailingCity: "La Cygne", depositAmount: "50.00", contractValue: "100.00", notes: "Full form" });
    const audit = await pool.query(`SELECT "actionType", "fieldChanged" FROM portal_audit_log WHERE "entityType" = 'HuntingGroupBooking' AND "entityId" = $1 ORDER BY id`, [String(id)]);
    expect(audit.rows.map((r: any) => r.actionType)).toEqual(["create", "status_change"]);
    expect(audit.rows[1].fieldChanged.length).toBeLessThanOrEqual(100);
    expect(audit.rows[1].fieldChanged).not.toContain("contractValue"); // 100 == 100.00
  });

  it("undated inquiries are stored but never on the calendar", async () => {
    const { id } = await caller.huntingGroups.create({ groupName: "DB Test Undated", contactName: "Pat", contactEmail: "pat@example.com" });
    created.push(id);
    const all = await collect("1900-01-01", "2999-12-31");
    expect(all.find((i) => i.recordId === id)).toBeUndefined();
  });
});
