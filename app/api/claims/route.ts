import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/server-auth";
import {
  readServerClaims,
  writeServerClaims,
  type ServerProfileClaim,
} from "@/lib/server-claims";
import { isValidThaiIdCard } from "@/lib/validation";

const MAX_PHOTO_DATA_URL_LENGTH = 350_000;

function generateCollisionSafeClaimId(claims: ServerProfileClaim[]): string {
  const yearBE = new Date().getFullYear() + 543;
  const maxSeq = claims.reduce((max, item) => {
    const match = typeof item.id === "string" ? item.id.match(/(\d+)$/) : null;
    const seq = match ? Number(match[1]) : 0;
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, 0);
  return `CLM-${yearBE}-${String(maxSeq + 1).padStart(4, "0")}`;
}

export async function GET(request: Request) {
  const isAdmin = await isAdminRequestAuthorized(request);
  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
      { status: 403 }
    );
  }

  const claims = await readServerClaims();
  return NextResponse.json({ ok: true, claims });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<ServerProfileClaim>;
    const cleanId = String(body.idCard || "").replace(/\D/g, "");
    const cleanPhone = String(body.phone || "").replace(/\D/g, "");
    const traineeName = String(body.traineeName || "").trim();

    if (!traineeName) {
      return NextResponse.json(
        { ok: false, error: "ไม่พบข้อมูลชื่อบุคลากรเจ้าของประวัติ" },
        { status: 400 }
      );
    }

    if (cleanId.length !== 13 || !isValidThaiIdCard(cleanId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "เลขประจำตัวประชาชนไม่ถูกต้องตามหลักการทะเบียนราษฎร์ (โปรดตรวจสอบอีกครั้ง)",
        },
        { status: 400 }
      );
    }

    if (cleanPhone.length < 9 || cleanPhone.length > 10) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุหมายเลขโทรศัพท์ 9-10 หลักให้ถูกต้อง" },
        { status: 400 }
      );
    }

    const claims = await readServerClaims();
    const traineePersonnelId = String(body.traineePersonnelId || "").trim();

    const existingPending = claims.find(
      (c) =>
        c.status === "pending" &&
        ((traineePersonnelId && c.traineePersonnelId === traineePersonnelId) ||
          c.idCard.replace(/\D/g, "") === cleanId)
    );

    if (existingPending) {
      return NextResponse.json(
        {
          ok: false,
          error: `มีคำขอยืนยันตัวตนสำหรับบุคคลนี้อยู่ในคิวรอการตรวจสอบแล้ว (รหัสอ้างอิง: ${existingPending.id})`,
        },
        { status: 409 }
      );
    }

    const rawPhoto =
      typeof body.idCardPhotoUrl === "string" &&
      body.idCardPhotoUrl.startsWith("data:image/") &&
      body.idCardPhotoUrl.length <= MAX_PHOTO_DATA_URL_LENGTH
        ? body.idCardPhotoUrl
        : undefined;

    const newClaim: ServerProfileClaim = {
      id: generateCollisionSafeClaimId(claims),
      traineeId: String(body.traineeId || "").trim(),
      traineePersonnelId,
      traineeName,
      currentAffiliation: String(body.currentAffiliation || "").trim(),
      currentCourseTitle: String(body.currentCourseTitle || "").trim(),
      latestYearBE:
        typeof body.latestYearBE === "number" ? body.latestYearBE : undefined,
      totalCoursesCount:
        typeof body.totalCoursesCount === "number"
          ? body.totalCoursesCount
          : undefined,
      claimantName: String(body.claimantName || traineeName).trim(),
      idCard: cleanId,
      phone: String(body.phone || "").trim(),
      email:
        typeof body.email === "string" && body.email.trim()
          ? body.email.trim()
          : undefined,
      newAffiliation:
        typeof body.newAffiliation === "string" && body.newAffiliation.trim()
          ? body.newAffiliation.trim()
          : undefined,
      note:
        typeof body.note === "string" && body.note.trim()
          ? body.note.trim()
          : undefined,
      idCardPhotoUrl: rawPhoto,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };

    const nextClaims = [newClaim, ...claims];
    const saved = await writeServerClaims(nextClaims);
    if (!saved) {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถบันทึกคำขอลงฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง" },
        { status: 500 }
      );
    }

    // คืนเฉพาะฟิลด์อ้างอิงที่จำเป็น ไม่เปิดเผยคำร้องหรือข้อมูล PDPA ของบุคคลอื่น
    return NextResponse.json(
      {
        ok: true,
        claim: {
          id: newClaim.id,
          status: newClaim.status,
          submittedAt: newClaim.submittedAt,
          traineeName: newClaim.traineeName,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error in POST /api/claims:", err);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการส่งคำขอยืนยันตัวตน" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const isAdmin = await isAdminRequestAuthorized(request);
  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      claimId?: string;
      action?: "approve" | "reject";
      reason?: string;
      adminName?: string;
    };

    const claimId = String(body.claimId || "").trim();
    const action = body.action;
    const adminName = String(body.adminName || "เจ้าหน้าที่ กกท.").trim();

    if (!claimId || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { ok: false, error: "ข้อมูลคำขอไม่ครบถ้วน (ต้องระบุ claimId และ action)" },
        { status: 400 }
      );
    }

    const claims = await readServerClaims();
    const target = claims.find((c) => c.id === claimId);
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "ไม่พบข้อมูลคำขอยืนยันตัวตน" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    let updatedClaim: ServerProfileClaim = target;
    const nextClaims = claims.map((c) => {
      if (c.id !== claimId) return c;
      updatedClaim = {
        ...c,
        status: action === "approve" ? "approved" : "rejected",
        rejectionReason:
          action === "reject"
            ? String(body.reason || "เอกสารหรือหลักฐานไม่เพียงพอ").trim()
            : undefined,
        reviewedAt: now,
        reviewedBy: adminName,
      };
      return updatedClaim;
    });

    const saved = await writeServerClaims(nextClaims);
    if (!saved) {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถบันทึกผลการพิจารณาลงระบบได้" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      claim: updatedClaim,
      claims: nextClaims,
    });
  } catch (err) {
    console.error("Error in PATCH /api/claims:", err);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะคำขอ" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const isAdmin = await isAdminRequestAuthorized(request);
  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
      { status: 403 }
    );
  }

  try {
    const url = new URL(request.url);
    let claimId = url.searchParams.get("claimId")?.trim() || "";
    if (!claimId) {
      const body = (await request.json().catch(() => ({}))) as {
        claimId?: string;
      };
      claimId = String(body.claimId || "").trim();
    }

    if (!claimId) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุรหัสคำขอที่ต้องการลบ" },
        { status: 400 }
      );
    }

    const claims = await readServerClaims();
    const nextClaims = claims.filter((c) => c.id !== claimId);
    const saved = await writeServerClaims(nextClaims);
    if (!saved) {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถลบข้อมูลคำขอได้" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, claims: nextClaims });
  } catch (err) {
    console.error("Error in DELETE /api/claims:", err);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการลบคำขอ" },
      { status: 500 }
    );
  }
}
