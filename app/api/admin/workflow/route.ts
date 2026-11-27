import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/server-auth";
import { readServerWorkflow, writeServerWorkflow } from "@/lib/server-workflow";
import { normalizeWorkflowPayload } from "@/lib/workflow";

const MAX_PAYLOAD_CHARS = 450_000;

export async function GET(request: Request) {
  const isAdmin = await isAdminRequestAuthorized(request);
  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
      { status: 403 }
    );
  }

  const data = await readServerWorkflow();
  return NextResponse.json(
    { ok: true, data },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(request: Request) {
  try {
    const isAdmin = await isAdminRequestAuthorized(request);
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      data?: unknown;
    };
    if (!body || typeof body !== "object" || !body.data) {
      return NextResponse.json(
        { ok: false, error: "ข้อมูลผังการดำเนินงานไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const serializedLength = JSON.stringify(body.data).length;
    if (serializedLength > MAX_PAYLOAD_CHARS) {
      return NextResponse.json(
        { ok: false, error: "ขนาดข้อมูลผังการดำเนินงานเกินขีดจำกัดที่กำหนด" },
        { status: 413 }
      );
    }

    const normalized = {
      ...normalizeWorkflowPayload(body.data),
      updatedAt: new Date().toISOString(),
    };

    const ok = await writeServerWorkflow(normalized);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถบันทึกข้อมูลลงระบบคลาวด์ได้" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, data: normalized },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("PUT /api/admin/workflow error:", error);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการบันทึกผังการดำเนินงาน" },
      { status: 500 }
    );
  }
}
