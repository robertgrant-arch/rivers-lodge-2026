import "dotenv/config";
import { hash } from "argon2";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users } from "../features/auth/schema";
import { eq } from "drizzle-orm";

const email = process.env.ADMIN_EMAIL;
const tempPassword = process.env.ADMIN_TEMP_PASSWORD;

if (!email || !tempPassword) {
  console.error("ADMIN_EMAIL and ADMIN_TEMP_PASSWORD must be set");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

const pool = mysql.createPool({ uri: databaseUrl });
const db = drizzle(pool);

const passwordHash = await hash(tempPassword, { type: 2 }); // argon2id

const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

if (existing.length > 0) {
  console.log(`Admin user ${email} already exists, skipping.`);
} else {
  await db.insert(users).values({
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    passwordHash,
    role: "admin",
    status: "active",
    mustChangePassword: true,
    createdAt: new Date(),
  });
  console.log(`Admin user ${email} created.`);
}

await pool.end();
