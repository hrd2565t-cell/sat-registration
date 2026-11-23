import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/server-auth";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
    message: "ออกจากระบบสำเร็จ",
  });

  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
