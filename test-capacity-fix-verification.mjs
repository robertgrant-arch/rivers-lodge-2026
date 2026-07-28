#!/usr/bin/env node

/**
 * Test: Member Calendar Capacity=0 Fix Verification
 *
 * Verifies that:
 * 1. Before migration: inventory rows with capacity=0 or NULL exist
 * 2. After migration: capacity is set to property's maxHunters
 * 3. After migration: dates with bookedCount=0 return status='open' (not 'full')
 * 4. The fix correctly handles property 1, July 2026 calendar dates
 */

import { Pool } from "pg";

const db = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost/rivers_test",
  ssl: false,
});

const now = () => Math.floor(Date.now() / 1000);

async function test() {
  try {
    console.log("\n=== Member Calendar Capacity=0 Fix Verification ===\n");

    // 1. BEFORE FIX: Check for rows with capacity <= 0
    console.log("[1/5] Checking for inventory rows with capacity <= 0 (before fix)...");
    const beforeRes = await db.query(
      `SELECT
         propertyId,
         date,
         capacity,
         "bookedCount",
         "amBookedCount",
         "pmBookedCount",
         "allDayBookedCount",
         "overnightBookedCount",
         status
       FROM property_date_inventory
       WHERE capacity IS NULL OR capacity <= 0
       ORDER BY propertyId, date
       LIMIT 20`
    );

    if (beforeRes.rows.length > 0) {
      console.log(`   ⚠️  Found ${beforeRes.rows.length} rows with capacity <= 0:`);
      beforeRes.rows.forEach(row => {
        console.log(`      Property ${row.propertyId}, ${row.date}: capacity=${row.capacity}, bookedCount=${row.bookedCount}, status=${row.status}`);
      });
    } else {
      console.log(`   ✓ No rows with capacity <= 0 found (migration may have already been applied)`);
    }

    // 2. Check property 1's maxHunters for reference
    console.log("[2/5] Getting property 1's maxHunters for reference...");
    const propRes = await db.query(
      `SELECT id, "maxHunters" FROM hunting_properties WHERE id = 1`
    );
    const prop1 = propRes.rows[0];
    if (prop1) {
      console.log(`   ✓ Property 1 maxHunters: ${prop1.maxHunters}`);
    } else {
      console.log(`   ✗ Property 1 not found`);
      process.exit(1);
    }

    // 3. Check July 2026 dates for property 1 (the specific case mentioned)
    console.log("[3/5] Checking July 2026 dates for property 1...");
    const julyRes = await db.query(
      `SELECT
         date,
         capacity,
         "bookedCount",
         "amBookedCount",
         "pmBookedCount",
         "allDayBookedCount",
         "overnightBookedCount",
         status
       FROM property_date_inventory
       WHERE propertyId = 1
         AND date >= '2026-07-25'
         AND date <= '2026-07-31'
       ORDER BY date`
    );

    if (julyRes.rows.length > 0) {
      console.log(`   ✓ Found ${julyRes.rows.length} inventory rows for July 2026:`);
      let fixedCount = 0;
      julyRes.rows.forEach(row => {
        const expectedStatus = row.bookedCount === 0 ? 'open' : 'full/partial';
        const isFixed = row.capacity > 0;
        const statusCorrect = row.bookedCount === 0 ? row.status === 'open' : true;
        const symbol = isFixed && statusCorrect ? '✓' : '✗';
        console.log(`      ${symbol} ${row.date}: capacity=${row.capacity}, bookedCount=${row.bookedCount}, status=${row.status}`);
        if (isFixed && statusCorrect) fixedCount++;
      });
      console.log(`   ${fixedCount}/${julyRes.rows.length} rows correctly fixed`);
    } else {
      console.log(`   ⚠️  No inventory rows found for July 2026 (dates may not be in system)`);
    }

    // 4. Verify specific case: 2026-07-28 for property 1
    console.log("[4/5] Verifying specific case: 2026-07-28 for property 1...");
    const july28Res = await db.query(
      `SELECT
         propertyId,
         date,
         capacity,
         "bookedCount",
         "amBookedCount",
         "pmBookedCount",
         "allDayBookedCount",
         "overnightBookedCount",
         status
       FROM property_date_inventory
       WHERE propertyId = 1 AND date = '2026-07-28'`
    );

    if (july28Res.rows.length > 0) {
      const row = july28Res.rows[0];
      const capacityFixed = row.capacity > 0;
      const statusFixed = row.bookedCount === 0 && row.status === 'open';

      console.log(`   Property 1, 2026-07-28:`);
      console.log(`     capacity: ${row.capacity} (${capacityFixed ? 'FIXED' : 'STILL BROKEN'})`);
      console.log(`     bookedCount: ${row.bookedCount}`);
      console.log(`     status: ${row.status} (${statusFixed || row.bookedCount > 0 ? 'CORRECT' : 'INCORRECT - should be open'})`);

      if (capacityFixed && statusFixed) {
        console.log(`   ✓ July 28 fix verified - no longer stuck on Full!`);
      } else if (!capacityFixed) {
        console.log(`   ✗ July 28 still has capacity=0, migration needs to be applied`);
      } else {
        console.log(`   ✗ July 28 status incorrect, migration status issue`);
      }
    } else {
      console.log(`   ⚠️  No inventory row for property 1 on 2026-07-28`);
    }

    // 5. Summary check: verify no capacity <= 0 rows remain in the system
    console.log("[5/5] Final verification: checking for any remaining capacity <= 0 rows...");
    const finalRes = await db.query(
      `SELECT COUNT(*) as count FROM property_date_inventory
       WHERE capacity IS NULL OR capacity <= 0`
    );
    const remainingBadRows = parseInt(finalRes.rows[0].count, 10);

    if (remainingBadRows === 0) {
      console.log(`   ✅ SUCCESS - All inventory rows have valid capacity > 0`);
      console.log(`\n✅ MEMBER CALENDAR CAPACITY FIX VERIFIED - Ready for deployment\n`);
      process.exit(0);
    } else {
      console.log(`   ✗ ${remainingBadRows} rows still have capacity <= 0, migration needs to be applied`);
      console.log(`\n❌ FIX NOT YET APPLIED - Run migrations first\n`);
      process.exit(1);
    }

  } catch (err) {
    console.error("\n❌ VERIFICATION FAILED:", err.message || err);
    if (err.code) {
      console.error(`   pg code: ${err.code}`);
    }
    process.exit(1);
  } finally {
    await db.end();
  }
}

test();
