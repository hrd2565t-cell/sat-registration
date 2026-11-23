import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/server-auth";

export async function GET(request: Request) {
  const isAuth = await isAdminRequestAuthorized(request);
  return NextResponse.json({
    authenticated: isAuth,
  });
}
