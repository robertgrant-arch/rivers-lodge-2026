/**
 * seed-test-member.mjs
 * Creates a test member record for the owner account so the member portal
 * can be tested end-to-end. Run with: node seed-test-member.mjs
 */

import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

// Load .env
dotenv.config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set in .env");
  process.exit(1);
}

const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID;
const OWNER_NAME = process.env.OWNER_NAME;

async function main() {
  const conn = await createConnection(DATABASE_URL);

  try {
    // 1. Find the owner user record
    const [users] = await conn.execute(
      "SELECT id, name, email, role FROM users ORDER BY id ASC LIMIT 5"
    );
    console.log("\n📋  All users in database:");
    console.table(users);

    if (!users.length) {
      console.log("\n⚠️  No users found. You need to log in at least once via the Member Login button first.");
      console.log("   After logging in, run this script again.");
      process.exit(0);
    }

    // Find owner by role or by OWNER_OPEN_ID match
    let ownerUser = users.find(u => u.role === "owner") || users.find(u => u.role === "admin") || users[0];
    console.log(`\n✅  Using user: ${ownerUser.name} (id=${ownerUser.id}, role=${ownerUser.role})`);

    // 2. Check if a member record already exists
    const [existing] = await conn.execute(
      "SELECT id, memberNumber, tier, active FROM members WHERE userId = ?",
      [ownerUser.id]
    );

    if (existing.length > 0) {
      console.log("\n✅  Member record already exists:");
      console.table(existing);

      // Make sure it's active
      await conn.execute(
        "UPDATE members SET active = 1, tier = 'founding' WHERE userId = ?",
        [ownerUser.id]
      );
      console.log("   → Ensured active=true and tier=founding");
    } else {
      // 3. Create a founding member record
      const memberNumber = `RL-${String(ownerUser.id).padStart(4, "0")}`;
      const joinDate = "2024-01-01";
      const renewalDate = "2027-01-01";

      await conn.execute(
        `INSERT INTO members (userId, memberNumber, tier, joinDate, renewalDate, active, notes, createdAt, updatedAt)
         VALUES (?, ?, 'founding', ?, ?, 1, 'Test founding member — owner account', NOW(), NOW())`,
        [ownerUser.id, memberNumber, joinDate, renewalDate]
      );

      console.log(`\n✅  Created founding member record:`);
      console.log(`   Member Number: ${memberNumber}`);
      console.log(`   Tier: Founding`);
      console.log(`   Join Date: ${joinDate}`);
      console.log(`   Renewal Date: ${renewalDate}`);
    }

    // 4. Also seed some test seasonal updates if none exist
    const [updateCount] = await conn.execute("SELECT COUNT(*) as count FROM seasonal_updates");
    if (updateCount[0].count === 0) {
      await conn.execute(`
        INSERT INTO seasonal_updates (title, body, category, publishedAt, createdAt) VALUES
        ('Spring Turkey Season Open', 'Turkey season is now open through May 31st. Guides are available Monday through Saturday. Contact concierge to book your blind.', 'turkey', NOW(), NOW()),
        ('Fishing Report — May 2026', 'Largemouth bass are active on the north pond. Best results on topwater lures early morning. Catfish running strong on the river channel.', 'fishing', NOW(), NOW()),
        ('Sporting Clays Course Update', 'The sporting clays course has been refreshed with 5 new stations for the spring season. Ammunition available at the Timber Edge Clubhouse.', 'general', NOW(), NOW())
      `);
      console.log("\n✅  Seeded 3 test seasonal updates");
    }

    // 5. Seed a test announcement if none exist
    const [announcementCount] = await conn.execute("SELECT COUNT(*) as count FROM cms_announcements");
    if (announcementCount[0].count === 0) {
      await conn.execute(`
        INSERT INTO cms_announcements (title, body, type, audience, status, ctaLabel, ctaUrl, createdAt, updatedAt) VALUES
        ('Welcome to the Member Portal', 'Your founding membership gives you full access to all estate activities, priority booking, and exclusive member events throughout the year.', 'news', 'members', 'published', 'Request a Stay', '/portal', NOW(), NOW())
      `);
      console.log("✅  Seeded 1 test announcement");
    }

    console.log("\n🎉  Done! You can now log in via the Member Login button and access the member portal.");
    console.log("   → Go to /portal after logging in\n");

  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error("❌  Error:", e.message);
  process.exit(1);
});
