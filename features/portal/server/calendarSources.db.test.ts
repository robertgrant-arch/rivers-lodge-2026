/**
 * Calendar sources against real Postgres (TEST_DATABASE_URL, a disposable DB
 * with the Drizzle schema pushed — same convention as the other DB tests).
 * Regression: each booking table has its own status enum; filtering with
 * NOT IN ('cancelled','lost') must not break on enums that have no 'lost'.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (TEST_DATABASE_URL) process.env.DATABASE_URL = TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)("portal calendar sources (real database)", () => {
  let pool: any;
  const ids: Record<string, number[]> = { wedding_bookings: [], corporate_bookings: [], hunt_fish_bookings: [] };
  let collect: (start: string, end: string) => Promise<any[]>;

  beforeAll(async () => {
    const pg = await import("pg");
    pool = new pg.Pool({ connectionString: TEST_DATABASE_URL });
    const ins = async (table: string, sql: string, params: unknown[]) => {
      const r = await pool.query(sql, params);
      ids[table].push(r.rows[0].id);
    };
    await ins("wedding_bookings", `INSERT INTO wedding_bookings (status,"coupleName","contactEmail","weddingDate","rehearsalDate") VALUES ('confirmed','DBT Couple','a@x.test','2032-03-07','2032-03-06') RETURNING id`, []);
    await ins("wedding_bookings", `INSERT INTO wedding_bookings (status,"coupleName","contactEmail","weddingDate") VALUES ('cancelled','DBT Cancelled','b@x.test','2032-03-10') RETURNING id`, []);
    await ins("wedding_bookings", `INSERT INTO wedding_bookings (status,"coupleName","contactEmail") VALUES ('inquiry','DBT Undated','c@x.test') RETURNING id`, []);
    await ins("corporate_bookings", `INSERT INTO corporate_bookings (status,"companyName","contactName","contactEmail","arrivalDate","departureDate") VALUES ('inquiry','DBT Corp','P','d@x.test','2032-02-27','2032-03-02') RETURNING id`, []);
    await ins("hunt_fish_bookings", `INSERT INTO hunt_fish_bookings (status,"bookingType","clientName","clientEmail","partySize","bookingDate") VALUES ('requested','fishing','DBT Angler','e@x.test',2,'2032-03-15') RETURNING id`, []);

    const { createWeddingCalendarSource, createCorporateCalendarSource, createHuntFishCalendarSource } = await import("./calendarSources");
    const { collectCalendarItems } = await import("@shared/calendarFeed");
    const sources = [createWeddingCalendarSource(), createCorporateCalendarSource(), createHuntFishCalendarSource()];
    collect = async (start, end) => {
      // A failing source is skipped by the collector — call each one directly so a SQL error fails the test.
      for (const s of sources) await s.listInRange(start, end, { userId: "a", role: "admin", audience: "staff" });
      return (await collectCalendarItems(sources, start, end, { userId: "a", role: "admin", audience: "staff" }))
        .filter((i) => i.title.includes("DBT"));
    };
  });

  afterAll(async () => {
    for (const [table, list] of Object.entries(ids)) if (list.length) await pool.query(`DELETE FROM ${table} WHERE id = ANY($1)`, [list]);
    await pool?.end();
  });

  it("weddings (+ rehearsal), cross-month corporate and hunt & fish; cancelled and undated left out", async () => {
    const march = await collect("2032-03-01", "2032-03-31");
    expect(march.map((i) => [i.title, i.startDate, i.tentative])).toEqual([
      ["Corporate: DBT Corp", "2032-02-27", true],
      ["Rehearsal: DBT Couple", "2032-03-06", false],
      ["Wedding: DBT Couple", "2032-03-07", false],
      ["Fishing: DBT Angler (2)", "2032-03-15", true],
    ]);
    const feb = await collect("2032-02-01", "2032-02-29");
    expect(feb.map((i) => i.title)).toEqual(["Corporate: DBT Corp"]);
  });
});
