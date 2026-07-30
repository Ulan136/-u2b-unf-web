import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL не задан. Скопируйте .env.example → .env.local и вставьте строку Neon.");
  }
  const sqlClient = neon(url);
  return drizzle(sqlClient, { schema });
}

export type AppDb = ReturnType<typeof getDb>;
