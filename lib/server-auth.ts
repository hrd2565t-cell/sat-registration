import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "sat_admin_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function getAuthSecret(): string {
  return (
    process.env.ADMIN_AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "sat-admin-secret-2569-key"
  );
}

export function getExpectedAdminPin(): string {
  return (
    process.env.ADMIN_PIN ||
    process.env.NEXT_PUBLIC_ADMIN_PIN ||
    "336699"
  );
}

/**
 * Creates a signed session token: base64(payload).signature
 */
export function createAdminSessionToken(): string {
  const secret = getAuthSecret();
  const payload = JSON.stringify({
    role: "admin",
    exp: Date.now() + SESSION_MAX_AGE * 1000,
    rnd: crypto.randomBytes(8).toString("hex"),
  });
  const b64Payload = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(b64Payload)
    .digest("base64url");
  return `${b64Payload}.${signature}`;
}

/**
 * Verifies a signed session token. Returns true if valid and not expired.
 */
export function verifyAdminSessionToken(token?: string | null): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [b64Payload, signature] = parts;

  const secret = getAuthSecret();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(b64Payload)
    .digest("base64url");

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSig.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return false;
  }

  try {
    const raw = Buffer.from(b64Payload, "base64url").toString("utf-8");
    const data = JSON.parse(raw) as { role?: string; exp?: number };
    if (data.role !== "admin") return false;
    if (typeof data.exp !== "number" || Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether an incoming HTTP request is authorized as admin:
 * 1. Checks HttpOnly cookie `sat_admin_session`
 * 2. OR checks header `x-admin-pin` against expected PIN
 */
export async function isAdminRequestAuthorized(request: Request): Promise<boolean> {
  // Check header PIN first (used by internal scripts or API clients)
  const pinHeader = request.headers.get("x-admin-pin");
  if (pinHeader && pinHeader === getExpectedAdminPin()) {
    return true;
  }

  // Check Cookie in Request Headers
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (match && verifyAdminSessionToken(match[1])) {
      return true;
    }
  }

  // Fallback check Next.js cookies store
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME)?.value;
    if (sessionCookie && verifyAdminSessionToken(sessionCookie)) {
      return true;
    }
  } catch {
    // cookies() might fail if not in a request context
  }

  return false;
}

export { COOKIE_NAME, SESSION_MAX_AGE };
