/**
 * Test script: Simulate the booking create procedure step by step
 * Run: npx tsx scripts/test-booking-flow.ts
 */
import pg from "pg";
const { Client } = pg;

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL! });
  await db.connect();

  console.log("=== Step 1: requireMember ===");
  const { rows: memberRows } = await db.query("SELECT id, \"memberNumber\", tier, active FROM members WHERE \"userId\" = 1 AND active = true");
  const member = memberRows[0];
  console.log("Member:", JSON.stringify(member));
  if (!member) { console.error("NO MEMBER FOUND"); await db.end(); return; }

  console.log("\n=== Step 2: Property check ===");
  const { rows: propRows } = await db.query("SELECT id, name, active FROM hunting_properties WHERE id = 1 AND active = true");
  const property = propRows[0];
  console.log("Property:", JSON.stringify(property));
  if (!property) { console.error("NO PROPERTY FOUND"); await db.end(); return; }

  console.log("\n=== Step 3: Rules check ===");
  const { rows: ruleRows } = await db.query("SELECT id, \"requiresApproval\", \"tierAccess\", \"maxConsecutiveDays\" FROM property_booking_rules WHERE \"propertyId\" = 1");
  const rule = ruleRows[0];
  console.log("Rules:", JSON.stringify(rule));

  console.log("\n=== Step 4: Blocked dates check ===");
  const { rows: blocked } = await db.query(
    "SELECT id FROM property_blocked_dates WHERE \"propertyId\" = 1 AND \"startDate\" <= '2026-10-17' AND \"endDate\" >= '2026-10-15' LIMIT 1"
  );
  console.log("Blocked:", blocked.length > 0 ? "YES - BLOCKED" : "None");

  console.log("\n=== Step 5: Inventory check for 2026-10-15 ===");
  const { rows: inv } = await db.query(
    "SELECT status, capacity, \"bookedCount\" FROM property_date_inventory WHERE \"propertyId\" = 1 AND date = '2026-10-15' LIMIT 1"
  );
  console.log("Inventory:", inv.length > 0 ? JSON.stringify(inv[0]) : "No row (defaults to open)");

  console.log("\n=== Step 6: Conflict check ===");
  const { rows: conflicts } = await db.query(
    `SELECT id, "bookingRef" FROM property_bookings WHERE "memberId" = $1 AND status NOT IN ('cancelled','declined','no_show') AND "startDate" <= '2026-10-17' AND "endDate" >= '2026-10-15' LIMIT 1`,
    [member.id]
  );
  console.log("Conflicts:", conflicts.length > 0 ? JSON.stringify(conflicts[0]) : "None");

  console.log("\n=== Step 7: Test insert ===");
  // Generate a UUID-like key
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });

  try {
    await db.query(
      `INSERT INTO property_bookings
       ("bookingRef", "idempotencyKey", "memberId", "userId", "propertyId", "startDate", "endDate", "totalDays", "partySize", activity, "huntingLicenseConfirmed", status, "requiresApproval", "totalAmount", "depositAmount", "depositPaid", "balanceDue", currency, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())`,
      ["RL-TEST-001", uuid, member.id, 1, 1, "2026-10-15", "2026-10-17", 3, 1, "deer", true, "confirmed", false, "0", "0", "0", "0", "USD"]
    );
    console.log("INSERT SUCCESS - booking created!");
    // Clean up
    await db.query("DELETE FROM property_bookings WHERE \"bookingRef\" = 'RL-TEST-001'");
    console.log("Cleanup done.");
  } catch (e: any) {
    console.error("INSERT FAILED:", e.message);
  }

  await db.end();
  console.log("\n=== Test complete ===");
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
