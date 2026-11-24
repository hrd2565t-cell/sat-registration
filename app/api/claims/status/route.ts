import { NextResponse } from "next/server";
import { readServerClaims } from "@/lib/server-claims";
import { isValidThaiIdCard } from "@/lib/validation";

/**
 * Lightweight endpoint for TraineePortalModal to check whether a given 13-digit Thai ID
 * has a pending identity verification claim, without returning any other user's PII.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      idCard?: string;
    };
    const cleanId = String(body.idCard || "").replace(/\D/g, "");
    if (cleanId.length !== 13 || !isValidThaiIdCard(cleanId)) {
      return NextResponse.json(
        { ok: false, error: "เลขประจำตัวประชาชนไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const claims = await readServerClaims();
    const pendingMatch = claims.find(
      (c) =>
        c.status === "pending" && c.idCard.replace(/\D/g, "") === cleanId
    );

    if (pendingMatch) {
      return NextResponse.json({
        ok: true,
        hasPending: true,
        claimId: pendingMatch.id,
      });
    }

    return NextResponse.json({
      ok: true,
      hasPending: false,
    });
  } catch (err) {
    console.error("Error in POST /api/claims/status:", err);
    return NextResponse.json(
      { ok: false, error: "ไม่สามารถตรวจสอบสถานะคำขอได้" },
      { status: 500 }
    );
  }
}
