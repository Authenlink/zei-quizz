import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * Client Postgres pour Neon (TCP) — supporte les transactions (contrairement à neon-http).
 * Singleton en dev pour éviter trop de connexions au hot-reload.
 */
const globalForDb = globalThis as unknown as {
  postgresSql: ReturnType<typeof postgres> | undefined;
};

function createSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

const sql = globalForDb.postgresSql ?? createSql();
if (process.env.NODE_ENV !== "production") {
  globalForDb.postgresSql = sql;
}

export const db = drizzle(sql, { schema });
