import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// Хеширование пароля через scrypt (встроенный Node crypto, без зависимостей).
// Формат хранения: "<salt-hex>:<hash-hex>".

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const hash = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}
