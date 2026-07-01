import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  // Complete barrel — includes portal, booking-engine, and property-booking
  // tables. (The old ./schema.ts barrel only listed 9 feature schemas, so
  // drizzle-kit push never created the ops/property tables and every admin
  // page that queried them failed to load.)
  schema: "./_core/db/index.ts",
  out: "./_core/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: connectionString.includes("render.com") || process.env.NODE_ENV === "production",
  },
});
