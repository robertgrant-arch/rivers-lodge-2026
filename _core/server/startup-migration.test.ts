/**
 * Guard: nothing that runs at boot may delete properties or bookings.
 *
 * A "one-time cleanup" in runStartupMigration() used to DELETE hunting
 * properties by name on every deploy (and an operator-precedence bug let it
 * remove properties that had bookings). This test fails if any boot-time code
 * path — startup-migration.ts, apply-sql-migrations.ts, or a SQL migration
 * file — deletes or truncates those tables again.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..", "..");
const PROTECTED = ["hunting_properties", "property_bookings", "booking_party_adults", "booking_party_minors"];
const destructive = (sql: string) =>
  PROTECTED.filter((t) =>
    new RegExp(`\\b(DELETE\\s+FROM|TRUNCATE(\\s+TABLE)?|DROP\\s+TABLE(\\s+IF\\s+EXISTS)?)\\s+"?${t}"?\\b`, "i").test(sql),
  );

describe("boot never deletes properties or bookings", () => {
  for (const file of ["_core/server/startup-migration.ts", "_core/server/apply-sql-migrations.ts", "_core/server/app.ts"]) {
    it(`${file} has no DELETE/TRUNCATE/DROP of protected tables`, () => {
      expect(destructive(readFileSync(join(root, file), "utf8"))).toEqual([]);
    });
  }

  it("no SQL migration deletes or truncates protected tables", () => {
    const dir = join(root, "_core/db/migrations");
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .flatMap((f) => destructive(readFileSync(join(dir, f), "utf8")).map((t) => `${f}: ${t}`));
    expect(offenders).toEqual([]);
  });

  it("the detector itself catches the removed cleanup", () => {
    expect(destructive(`DELETE FROM hunting_properties WHERE name ILIKE 'test%'`)).toEqual(["hunting_properties"]);
    expect(destructive(`TRUNCATE TABLE property_bookings`)).toEqual(["property_bookings"]);
  });
});
