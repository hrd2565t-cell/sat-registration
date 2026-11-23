import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getExpectedAdminPin,
  COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { pin } = body as { pin?: string };

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุรหัส PIN" },
        { status: 400 }
      );
    }

    const expectedPin = getExpectedAdminPin();

    if (pin.trim() !== expectedPin) {
      // Artificial slight delay to prevent brute-force timing attacks
      await new Promise((resolve) => setTimeout(resolve, 350));
      return NextResponse.json(
        { ok: false, error: "รหัส PIN ไม่ถูกต้อง" },
        { status: 401 }
      );
    }

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
