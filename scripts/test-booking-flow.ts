/**
 * Test script: Simulate the booking create procedure step by step
 * Run: npx tsx scripts/test-booking-flow.ts
 */
import { createConnection } from "mysql2/promise";

async function main() {
  const db = await createConnection(process.env.DATABASE_URL!);

  console.log("=== Step 1: requireMember ===");
  const [members] = await db.query("SELECT id, memberNumber, tier, active FROM members WHERE userId = 1 AND active = 1");
  const member = (members as any[])[0];
  console.log("Member:", JSON.stringify(member));
  if (!member) { console.error("NO MEMBER FOUND"); await db.end(); return; }

  console.log("\n=== Step 2: Property check ===");
  const [props] = await db.query("SELECT id, name, active FROM hunting_properties WHERE id = 1 AND active = 1");
  const property = (props as any[])[0];
  console.log("Property:", JSON.stringify(property));
  if (!property) { console.error("NO PROPERTY FOUND"); await db.end(); return; }

  console.log("\n=== Step 3: Rules check ===");
  const [rules] = await db.query("SELECT id, requiresApproval, tierAccess, maxConsecutiveDays FROM property_booking_rules WHERE propertyId = 1");
  const rule = (rules as any[])[0];
  console.log("Rules:", JSON.stringify(rule));

  console.log("\n=== Step 4: Blocked dates check ===");
  const [blocked] = await db.query(
    "SELECT id FROM property_blocked_dates WHERE propertyId = 1 AND startDate <= '2026-10-17' AND endDate >= '2026-10-15' LIMIT 1"
  );
  console.log("Blocked:", (blocked as any[]).length > 0 ? "YES - BLOCKED" : "None");

  console.log("\n=== Step 5: Inventory check for 2026-10-15 ===");
  const [inv] = await db.query(
    "SELECT status, capacity, bookedCount FROM property_date_inventory WHERE propertyId = 1 AND date = '2026-10-15' LIMIT 1"
  );
  console.log("Inventory:", (inv as any[]).length > 0 ? JSON.stringify((inv as any[])[0]) : "No row (defaults to open)");

  console.log("\n=== Step 6: Conflict check ===");
  const [conflicts] = await db.query(
    `SELECT id, bookingRef FROM property_bookings WHERE memberId = ? AND status NOT IN ('cancelled','declined','no_show') AND startDate <= '2026-10-17' AND endDate >= '2026-10-15' LIMIT 1`,
    [member.id]
  );
  console.log("Conflicts:", (conflicts as any[]).length > 0 ? JSON.stringify((conflicts as any[])[0]) : "None");

  console.log("\n=== Step 7: Test insert ===");
  const testKey = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Generate a UUID-like key
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
  
  try {
    await db.query(
      `INSERT INTO property_bookings 
       (bookingRef, idempotencyKey, memberId, userId, propertyId, startDate, endDate, totalDays, partySize, activity, huntingLicenseConfirmed, status, requiresApproval, totalAmount, depositAmount, depositPaid, balanceDue, currency, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      ["RL-TEST-001", uuid, member.id, 1, 1, "2026-10-15", "2026-10-17", 3, 1, "deer", 1, "confirmed", 0, "0", "0", "0", "0", "USD"]
    );
    console.log("INSERT SUCCESS - booking created!");
    // Clean up
    await db.query("DELETE FROM property_bookings WHERE bookingRef = 'RL-TEST-001'");
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
