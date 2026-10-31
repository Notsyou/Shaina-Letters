import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";

export type Role = "reader" | "admin";
const COOKIE = "sl_session";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (at least 16 characters).");
  return new TextEncoder().encode(s);
}

export function checkPassword(given: string, role: Role): boolean {
  const expected = role === "admin" ? process.env.ADMIN_PASSWORD : process.env.READER_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startSession(role: Role) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function getRole(): Promise<Role | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "admin" || payload.role === "reader" ? payload.role : null;
  } catch {
    return null;
  }
}

/** Shai or the admin may read. */
export async function requireReader(): Promise<Role> {
  const role = await getRole();
  if (!role) redirect("/login");
  return role;
}

export async function requireAdmin(): Promise<void> {
  if ((await getRole()) !== "admin") redirect("/admin/login");
}
