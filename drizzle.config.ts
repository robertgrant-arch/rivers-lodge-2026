import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./_core/db/schema.ts",
  out: "./_core/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: connectionString.includes("render.com") || process.env.NODE_ENV === "production",
  },
});
