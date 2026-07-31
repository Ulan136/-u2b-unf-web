import { z } from "zod";
import * as repo from "@/repositories/users.repo";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signSession, type SessionPayload } from "@/lib/session";

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 дней

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET не задан на сервере");
  return s;
}

const credsSchema = z.object({
  username: z.string().trim().min(3, "Логин минимум 3 символа").max(64),
  password: z.string().min(4, "Пароль минимум 4 символа"),
  name: z.string().trim().optional(),
});

function publicUser(u: {
  id: string;
  username: string;
  name: string | null;
  role: string;
}) {
  return { id: u.id, username: u.username, name: u.name, role: u.role };
}

async function makeToken(u: {
  id: string;
  username: string;
  name: string | null;
  role: string;
}) {
  const payload: SessionPayload = {
    sub: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    exp: Date.now() + SESSION_TTL,
  };
  return signSession(payload, secret());
}

/** Нужна ли первичная настройка (нет ни одного пользователя). */
export async function status() {
  return { needsSetup: (await repo.countUsers()) === 0 };
}

/** Регистрация первого администратора (только когда пользователей ещё нет). */
export async function register(body: unknown) {
  const data = credsSchema.parse(body);
  if ((await repo.countUsers()) > 0) {
    throw new Error("Регистрация закрыта. Обратитесь к администратору.");
  }
  const existing = await repo.findByUsername(data.username.toLowerCase());
  if (existing) throw new Error("Такой логин уже занят");
  const user = await repo.createUser({
    username: data.username,
    passwordHash: hashPassword(data.password),
    name: data.name ?? data.username,
    role: "admin",
  });
  return { user: publicUser(user), token: await makeToken(user) };
}

export async function login(body: unknown) {
  const data = credsSchema.pick({ username: true, password: true }).parse(body);
  const user = await repo.findByUsername(data.username.trim().toLowerCase());
  if (!user || !user.isActive) throw new Error("Неверный логин или пароль");
  if (!verifyPassword(data.password, user.passwordHash)) {
    throw new Error("Неверный логин или пароль");
  }
  return { user: publicUser(user), token: await makeToken(user) };
}
