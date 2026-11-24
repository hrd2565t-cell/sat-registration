import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  isPinMatch,
  COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/server-auth";

const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const loginFailures = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "local";
}

function pruneExpiredFailures(now: number) {
  if (loginFailures.size <= 500) return;
  for (const [k, entry] of loginFailures.entries()) {
    if (now >= entry.resetAt) {
      loginFailures.delete(k);
    }
  }
}

export async function POST(request: Request) {
  try {
    const now = Date.now();
    pruneExpiredFailures(now);
    const clientIp = getClientIp(request);
    const existingEntry = loginFailures.get(clientIp);

    if (existingEntry && now >= existingEntry.resetAt) {
      loginFailures.delete(clientIp);
    } else if (
      existingEntry &&
      existingEntry.count >= MAX_LOGIN_FAILURES &&
      now < existingEntry.resetAt
    ) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((existingEntry.resetAt - now) / 1000)
      );
      const waitMin = Math.max(1, Math.ceil(retryAfterSec / 60));
      return NextResponse.json(
        {
          ok: false,
          retryAfterSec,
          error: `กรอกรหัส PIN ผิดเกินกำหนด กรุณารอ ${waitMin} นาทีแล้วลองใหม่อีกครั้ง`,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { pin } = body as { pin?: string };

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุรหัส PIN" },
        { status: 400 }
      );
    }

    if (!isPinMatch(pin)) {
      const current = loginFailures.get(clientIp);
      const nextCount = current && now < current.resetAt ? current.count + 1 : 1;
      const resetAt =
        current && now < current.resetAt
          ? current.resetAt
          : now + LOCKOUT_WINDOW_MS;
      loginFailures.set(clientIp, { count: nextCount, resetAt });

      // Artificial slight delay to prevent brute-force timing attacks
      await new Promise((resolve) => setTimeout(resolve, 350));

      if (nextCount >= MAX_LOGIN_FAILURES) {
        const retryAfterSec = Math.max(1, Math.ceil((resetAt - now) / 1000));
        const waitMin = Math.max(1, Math.ceil(retryAfterSec / 60));
        return NextResponse.json(
          {
            ok: false,
            retryAfterSec,
            error: `กรอกรหัส PIN ผิดเกินกำหนด กรุณารอ ${waitMin} นาทีแล้วลองใหม่อีกครั้ง`,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { ok: false, error: "รหัส PIN ไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    loginFailures.delete(clientIp);
    const token = createAdminSessionToken();
    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      ok: true,
      message: "เข้าสู่ระบบสำเร็จ",
    });

    // Set HttpOnly, Secure cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" },
      { status: 500 }
    );
  }
}
