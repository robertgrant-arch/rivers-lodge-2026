/**
 * Seed script: Insert Bill Grant and Eric Tagtmeyer as admin users + founding members.
 * Safe to re-run — uses INSERT IGNORE for users and checks before inserting members.
 */
import { createConnection } from "mysql2/promise";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const conn = await createConnection(process.env.DATABASE_URL);

const newAdmins = [
  {
    email: "bill.grant@selectquote.com",
    name: "Bill Grant",
    memberNumber: "RL-0002",
    notes: "Founding member — admin account",
  },
  {
    email: "etagtmeyer@riverslodge.com",
    name: "Eric Tagtmeyer",
    memberNumber: "RL-0003",
    notes: "Founding member — admin account",
  },
];

for (const admin of newAdmins) {
  // 1. Upsert user row (INSERT if not exists, UPDATE role if already exists)
  const [existing] = await conn.execute(
    "SELECT id, email, role FROM users WHERE email = ?",
    [admin.email]
  );

  let userId;
  if (existing.length > 0) {
    userId = existing[0].id;
    // Promote to admin if not already
    if (existing[0].role !== "admin" && existing[0].role !== "owner") {
      await conn.execute("UPDATE users SET role = 'admin' WHERE id = ?", [userId]);
      console.log(`✓ Promoted existing user ${admin.email} (id=${userId}) to admin`);
    } else {
      console.log(`  User ${admin.email} (id=${userId}) already has role: ${existing[0].role}`);
    }
  } else {
    // Insert new user — they will link via OAuth on first login using this email
    const [result] = await conn.execute(
      `INSERT INTO users (openId, name, email, loginMethod, role)
       VALUES (?, ?, ?, 'email', 'admin')`,
      [`pre-seeded-${admin.email}`, admin.name, admin.email]
    );
    userId = result.insertId;
    console.log(`✓ Created new admin user: ${admin.email} (id=${userId})`);
  }

  // 2. Check if member record already exists for this userId
  const [existingMember] = await conn.execute(
    "SELECT id, memberNumber FROM members WHERE userId = ?",
    [userId]
  );

  if (existingMember.length > 0) {
    console.log(`  Member record already exists for ${admin.email}: ${existingMember[0].memberNumber}`);
  } else {
    await conn.execute(
      `INSERT INTO members (userId, memberNumber, tier, joinDate, renewalDate, active, notes)
       VALUES (?, ?, 'founding', '2024-01-01', '2027-01-01', 1, ?)`,
      [userId, admin.memberNumber, admin.notes]
    );
    console.log(`✓ Created founding member record: ${admin.memberNumber} for ${admin.email}`);
  }
}

// Final verification
const [users] = await conn.execute(
  "SELECT u.id, u.email, u.name, u.role, m.memberNumber, m.tier, m.active FROM users u LEFT JOIN members m ON m.userId = u.id ORDER BY u.id"
);
console.log("\n=== FINAL STATE ===");
console.table(users);

await conn.end();
console.log("\nDone.");
