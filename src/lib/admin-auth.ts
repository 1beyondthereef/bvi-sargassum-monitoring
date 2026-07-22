import crypto from "crypto";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";

/**
 * Minimal signed-cookie admin session.
 *
 * Token format: `<expiryMs>.<hex hmac>` where the HMAC is over the string
 * `v1.<expiryMs>` keyed by ADMIN_SESSION_SECRET. No secret is stored in the
 * cookie itself; the signature can only be produced/verified server-side.
 */

export const ADMIN_COOKIE = "bvi_admin_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function hmac(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length || ab.length === 0) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Constant-time password comparison (hash both to fixed length first). */
export function verifyPassword(provided: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Create a signed session token valid for 7 days. */
export function createSessionToken(): string {
  const { adminSessionSecret } = getServerEnv();
  const expiry = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `v1.${expiry}`;
  return `${expiry}.${hmac(payload, adminSessionSecret)}`;
}

/** Validate a session token: signature must match and not be expired. */
export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;

  const expiryStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;

  const { adminSessionSecret } = getServerEnv();
  const expected = hmac(`v1.${expiryStr}`, adminSessionSecret);
  return timingSafeEqualHex(sig, expected);
}

/** Read the admin session cookie and verify it (server components + routes). */
export function isAdminAuthenticated(): boolean {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  return isValidSessionToken(token);
}
