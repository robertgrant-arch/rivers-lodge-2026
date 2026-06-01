import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: ["./features/_core/db/schema.ts", "./features/_core/db/portal-schema.ts", "./features/_core/db/booking-schema.ts", "./features/_core/db/property-booking-schema.ts"],
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
