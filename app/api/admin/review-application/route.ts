import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/lib/supabase/types";

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
    const {
      ref,
      status,
      reason,
      reviewer = "กองพัฒนาบุคลากรกีฬา",
      reserveOrder,
      notes,
      courseId,
    } = body as {
      ref: string;
      status: "approved" | "reserve" | "rejected" | "action_required" | "pending";
      reason: string;
      reviewer?: string;
      reserveOrder?: number;
      notes?: Array<{ id: string; at: string; author: string; kind: string; text: string }>;
      courseId?: number;
    };

    if (!ref || !status) {
      return NextResponse.json(
        { ok: false, error: "ข้อมูลไม่ครบถ้วน (ต้องระบุ ref และ status)" },
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

    const nowIso = new Date().toISOString();
    const dbStatus = status === "action_required" ? "pending" : status;

    // 1. อัปเดตตาราง applications โดยตรง
    const updatePayload: Database["public"]["Tables"]["applications"]["Update"] = {
      status: dbStatus,
      review_reason: status === "rejected" || status === "action_required" ? reason : null,
      reviewed_at: status === "pending" ? null : nowIso,
      reviewed_by: reviewer,
      updated_at: nowIso,
      ai: {
        tone: status === "approved" ? "pass" : status === "rejected" ? "fail" : "review",
        line1: status === "approved" ? "ผ่านการตรวจสอบ" : status === "rejected" ? "ไม่ผ่านการตรวจสอบ" : "รอการตรวจสอบ",
        line2: reason || "อยู่ระหว่างตรวจเอกสารโดยเจ้าหน้าที่",
        _realStatus: status,
        _reserveOrder: reserveOrder ?? null,
        _notes: notes ?? [],
      } as unknown as Json,
    };

    let directAppUpdateSuccess = false;
    try {
      const { data, error } = await supabase
        .from("applications")
        .update(updatePayload)
        .eq("ref", ref)
        .select("ref");

      if (!error && Array.isArray(data) && data.length > 0) {
        directAppUpdateSuccess = true;
      }
    } catch (e) {
      console.warn("Server direct app update error:", e);
    }

    // 2. บันทึกลงตาราง review_notes
    if (status !== "pending") {
      try {
        await supabase.from("review_notes").insert({
          application_ref: ref,
          author: reviewer,
          kind: status,
          text: reason || (status === "approved" ? "อนุมัติคุณสมบัติและเอกสารครบถ้วน" : "บันทึกผลการพิจารณา"),
        });
      } catch (noteErr) {
        console.warn("Server review_notes insert warning:", noteErr);
      }
    }

    // 3. Dual-Layer Persistence: บันทึกลงใน courses.target_quotas._reviews เสมอ
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

    let courseReviewsUpdated = false;
    if (targetCourseId) {
      try {
        const { data: courseRow } = await supabase
          .from("courses")
          .select("id, target_quotas")
          .eq("id", targetCourseId)
          .maybeSingle();

        if (courseRow) {
          const quotas =
            courseRow.target_quotas &&
            typeof courseRow.target_quotas === "object" &&
            !Array.isArray(courseRow.target_quotas)
              ? (courseRow.target_quotas as Record<string, unknown>)
              : {};

          const existingReviews =
            quotas._reviews &&
            typeof quotas._reviews === "object" &&
            !Array.isArray(quotas._reviews)
              ? (quotas._reviews as Record<string, unknown>)
              : {};

          const nextReviews = {
            ...existingReviews,
            [ref]: {
              status,
              reason: reason || (status === "approved" ? "อนุมัติคุณสมบัติและเอกสารครบถ้วน" : ""),
              reviewer,
              reviewedAt: status === "pending" ? null : nowIso,
              updatedAt: nowIso,
              reserveOrder: reserveOrder ?? null,
              notes: notes ?? null,
            },
          };

          const { error: courseUpErr } = await supabase
            .from("courses")
            .update({
              target_quotas: {
                ...quotas,
                _reviews: nextReviews,
              } as unknown as Json,
            })
            .eq("id", targetCourseId);

          if (!courseUpErr) {
            courseReviewsUpdated = true;
          }
        }
      } catch (courseErr) {
        console.warn("Server course reviews update error:", courseErr);
      }
    }

    return NextResponse.json({
      ok: true,
      ref,
      status,
      directAppUpdateSuccess,
      courseReviewsUpdated,
      timestamp: nowIso,
      message: `บันทึกสถานะ "${status}" ของผู้สมัคร ${ref} สำเร็จ`,
    });
  } catch (error) {
    console.error("Error in /api/admin/review-application:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการประมวลผล",
      },
      { status: 500 }
    );
  }
}
