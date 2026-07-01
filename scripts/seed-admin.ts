import "dotenv/config";
import { hash } from "argon2";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "../features/auth/schema";
import { eq } from "drizzle-orm";

// Accept either CLI args or env vars
const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").toLowerCase();
const password = process.argv[3] ?? process.env.ADMIN_TEMP_PASSWORD ?? "";

if (!email || !password) {
  console.error("Usage: pnpm tsx scripts/seed-admin.ts <email> <password>");
  console.error("       Or set ADMIN_EMAIL and ADMIN_TEMP_PASSWORD env vars.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

const passwordHash = await hash(password, { type: 2 }); // argon2id

const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

if (existing.length > 0) {
  await db.update(users)
    .set({ passwordHash, role: "admin", status: "active", mustChangePassword: false })
    .where(eq(users.email, email));
  console.log(`Updated ${email} → admin / active.`);
} else {
  await db.insert(users).values({
    id: crypto.randomUUID(),
    email,
    passwordHash,
    role: "admin",
    status: "active",
    mustChangePassword: false,
    createdAt: new Date(),
  });
  console.log(`Created admin user ${email}.`);
}

await pool.end();
