/* Password hashing (scrypt) and a small in-memory login throttle. */
import crypto from "node:crypto";

const scrypt = (pw, salt) => new Promise((res, rej) =>
  crypto.scrypt(String(pw).normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => e ? rej(e) : res(k)));

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString("base64")}$${(await scrypt(pw, salt)).toString("base64")}`;
}

const DUMMY = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");
/* Constant-ish time: always runs scrypt, even when there is no stored hash. */
export async function verifyPassword(pw, stored) {
  const [alg, s, h] = String(stored || DUMMY).split("$");
  if (alg !== "scrypt" || !s || !h) return false;
  const k = await scrypt(pw, Buffer.from(s, "base64")), hb = Buffer.from(h, "base64");
  return !!stored && hb.length === k.length && crypto.timingSafeEqual(hb, k);
}

export function passwordProblem(pw) {
  if (typeof pw !== "string" || pw.length < 8) return "Use at least 8 characters for the password.";
  if (pw.length > 200) return "That password is too long.";
  return null;
}

/* Max 8 failed sign-ins per IP+email in 15 minutes. */
const WINDOW = 15 * 60 * 1000, MAX = 8, fails = new Map();
export const throttle = {
  blocked(key) { const a = (fails.get(key) || []).filter(t => Date.now() - t < WINDOW); fails.set(key, a); return a.length >= MAX },
  fail(key) { const a = fails.get(key) || []; a.push(Date.now()); fails.set(key, a); if (fails.size > 5000) fails.clear() },
  clear(key) { fails.delete(key) }
};
