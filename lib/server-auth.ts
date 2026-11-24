import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "sat_admin_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
let warnedMissingAdminPin = false;

function getAuthSecret(): string {
  return (
    process.env.ADMIN_AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "sat-admin-secret-2569-key"
  );
}

export function getExpectedAdminPin(): string {
  const configured = process.env.ADMIN_PIN?.trim();
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "production" && !warnedMissingAdminPin) {
    warnedMissingAdminPin = true;
    console.warn(
      "[SECURITY WARNING] ADMIN_PIN is not configured; using fallback PIN."
    );
  }
  return "336699";
}

/**
 * Constant-time PIN comparison via SHA-256 digests to avoid timing leaks
 * and length-mismatch differences.
 */
export function isPinMatch(candidate: string): boolean {
  const normalizedCandidate = candidate.trim();
  if (!normalizedCandidate) return false;
  const expected = getExpectedAdminPin();
  const candDigest = crypto.createHash("sha256").update(normalizedCandidate).digest();
  const expDigest = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(candDigest, expDigest);
}

function getEncryptionKey(): Buffer {
  return crypto.createHash("sha256").update(getAuthSecret()).digest();
}

/**
 * Encrypts sensitive server payloads using AES-256-GCM into a versioned JSON envelope.
 */
export function encryptServerPayload(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
    data: encrypted.toString("base64url"),
  });
}

/**
 * Decrypts payloads produced by encryptServerPayload. Returns null if tampered or invalid.
 */
export function decryptServerPayload(encoded: string): string | null {
  try {
    if (!encoded || typeof encoded !== "string") return null;
    const rawJson = encoded.trim().startsWith("{")
      ? encoded
      : Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(rawJson) as {
      v?: unknown;
      iv?: unknown;
      tag?: unknown;
      data?: unknown;
    };
    if (
      parsed.v !== 1 ||
      typeof parsed.iv !== "string" ||
      typeof parsed.tag !== "string" ||
      typeof parsed.data !== "string"
    ) {
      return null;
    }
    const key = getEncryptionKey();
    const iv = Buffer.from(parsed.iv, "base64url");
    const tag = Buffer.from(parsed.tag, "base64url");
    const ciphertext = Buffer.from(parsed.data, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
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
  if (pinHeader && isPinMatch(pinHeader)) {
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
