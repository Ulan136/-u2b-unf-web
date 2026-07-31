import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";

export async function countUsers() {
  const db = getDb();
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  return row?.n ?? 0;
}

export async function findByUsername(username: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return row ?? null;
}

export async function findById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function createUser(input: {
  username: string;
  passwordHash: string;
  name?: string | null;
  role?: string;
}) {
  const db = getDb();
  const [row] = await db
    .insert(users)
    .values({
      username: input.username.trim().toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name,
      role: input.role ?? "user",
    })
    .returning();
  return row;
}

export async function listUsers() {
  const db = getDb();
  return db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .orderBy(asc(users.username));
}
