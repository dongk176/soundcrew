import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

type PasswordHash = {
  salt: string;
  hash: string;
};

const parseHash = (stored: string): PasswordHash | null => {
  if (!stored) return null;
  const parts = stored.split("$");
  if (parts.length !== 3) return null;
  const [, salt, hash] = parts;
  if (!salt || !hash) return null;
  return { salt, hash };
};

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
};

export const verifyPassword = (password: string, stored: string) => {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  const hash = scryptSync(password, parsed.salt, 64);
  const storedHash = Buffer.from(parsed.hash, "hex");
  if (storedHash.length !== hash.length) return false;
  return timingSafeEqual(storedHash, hash);
};
