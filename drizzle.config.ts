import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Charge .env puis .env.local (comme Next.js) pour les CLI Drizzle
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});