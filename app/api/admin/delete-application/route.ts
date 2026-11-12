import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/types";

export async function POST(request: Request) {
  try {
    const adminAuthorized = request.headers.get("x-admin-authorized");
    const adminPinHeader = request.headers.get("x-admin-pin");
    const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || "336699";

    if (adminAuthorized !== "true" && adminPinHeader !== expectedPin) {
      return NextResponse.json(
        { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ref, courseId } = body as {
      ref: string;
      courseId?: number;
    };

    if (!ref) {
      return NextResponse.json(
        { ok: false, error: "ข้อมูลไม่ครบถ้วน (ต้องระบุ ref)" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "ไม่พบการตั้งค่าการเชื่อมต่อ Supabase" },
        { status: 500 }
      );
    }

    // 1. ตรวจสอบ course_id ก่อนลบ เพื่อใช้เคลียร์โควตาและแคชรีวิวของหลักสูตร
    let targetCourseId = courseId;
    if (!targetCourseId) {
      const { data: appRow } = await supabase
        .from("applications")
        .select("course_id")
        .eq("ref", ref)
        .maybeSingle();
      if (appRow?.course_id) {
        targetCourseId = Number(appRow.course_id);
      }
    }

    // 2. ลบเอกสารแนบในตาราง application_documents
    try {
      await supabase
        .from("application_documents")
        .delete()
        .eq("application_ref", ref);
    } catch (e) {
      console.warn("Delete application_documents warning:", e);
    }

    // 3. ลบโน้ตในตาราง review_notes
    try {
      await supabase
        .from("review_notes")
        .delete()
        .eq("application_ref", ref);
    } catch (e) {
      console.warn("Delete review_notes warning:", e);
    }

    // 4. ลบไฟล์จริงใน Supabase Storage (ถัง sat-documents) เพื่อคืนพื้นที่จัดเก็บ
    try {
      const { data: fileList } = await supabase.storage
        .from("sat-documents")
        .list(ref);

      if (Array.isArray(fileList) && fileList.length > 0) {
        const filePaths = fileList.map((f) => `${ref}/${f.name}`);
        await supabase.storage.from("sat-documents").remove(filePaths);
      }
    } catch (storageErr) {
      console.warn("Storage files delete warning:", storageErr);
    }

    // 5. ลบแถวผู้สมัครในตาราง applications
    const { error: appDeleteError } = await supabase
      .from("applications")
      .delete()
      .eq("ref", ref);

    if (appDeleteError) {
      console.error("Error deleting application from database:", appDeleteError);
      return NextResponse.json(
        { ok: false, error: `ไม่สามารถลบข้อมูลจากฐานข้อมูลได้: ${appDeleteError.message}` },
        { status: 500 }
      );
    }

    // 6. ลบประวัติรีวิวใน courses.target_quotas._reviews และคืนโควตา
    if (targetCourseId) {
      try {
        const { data: courseRow } = await supabase
          .from("courses")
          .select("id, seats, seats_left, target_quotas")
          .eq("id", targetCourseId)
          .maybeSingle();

        if (courseRow && courseRow.target_quotas && typeof courseRow.target_quotas === "object") {
          const quotas = { ...(courseRow.target_quotas as Record<string, unknown>) };
          const existingReviews =
            quotas._reviews && typeof quotas._reviews === "object"
              ? { ...(quotas._reviews as Record<string, unknown>) }
              : {};

          delete existingReviews[ref];
          quotas._reviews = existingReviews;

          // คำนวณจำนวนคนที่อนุมัติแล้วคงเหลือ
          let approvedRemaining = 0;
          for (const k of Object.keys(existingReviews)) {
            const rev = existingReviews[k] as { status?: string };
            if (rev && rev.status === "approved") {
              approvedRemaining++;
            }
          }

          const parsedCap = Number(courseRow.seats?.match(/\d+/)?.[0]);
          const cap = Number.isFinite(parsedCap) && parsedCap > 0 ? parsedCap : 40;
          const newSeatsLeft = Math.max(0, cap - approvedRemaining);

          const existingMeta =
            quotas._metadata && typeof quotas._metadata === "object"
              ? { ...(quotas._metadata as Record<string, unknown>) }
              : {};
          existingMeta.seatsLeft = newSeatsLeft;
          quotas._metadata = existingMeta;

          await supabase
            .from("courses")
            .update({
              seats_left: newSeatsLeft,
              target_quotas: quotas as unknown as Json,
            })
            .eq("id", targetCourseId);
        }
      } catch (courseErr) {
        console.warn("Course reviews cleanup warning:", courseErr);
      }
    }

    return NextResponse.json({
      ok: true,
      ref,
      message: `ลบข้อมูลผู้สมัครรหัส ${ref} และเอกสารแนบทั้งหมดสำเร็จเรียบร้อยแล้ว`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in /api/admin/delete-application:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
      },
      { status: 500 }
    );
  }
}
