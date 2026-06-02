import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: ["./_core/db/schema.ts", "./_core/db/portal-schema.ts", "./_core/db/booking-schema.ts", "./_core/db/property-booking-schema.ts"],
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
