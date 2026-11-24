import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/service";
import {
  isAffiliationAllowedForCourse,
  type TargetGroupQuotas,
} from "@/lib/courses";
import { isValidThaiIdCard } from "@/lib/validation";
import type { Database, Json } from "@/lib/supabase/types";

interface RegisterApplicationBody {
  name?: string;
  idCard?: string;
  email?: string;
  phone?: string;
  affiliation?: string;
  position?: string;
  courseId?: number;
  course?: string;
  courseTitle?: string;
  fileSize?: number | null;
  fiscalYearSuffix?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RegisterApplicationBody;

    const cleanId = String(body.idCard || "").replace(/\D/g, "");
    const cleanName = String(body.name || "").trim();
    const cleanEmail = String(body.email || "").trim();
    const cleanPhone = String(body.phone || "").trim();
    const cleanAffiliation = String(body.affiliation || "").trim();
    const cleanPosition = String(body.position || "").trim();
    const courseId = Number(body.courseId);

    if (!cleanName) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุชื่อ-นามสกุลผู้สมัคร" },
        { status: 400 }
      );
    }

    if (cleanId.length !== 13 || !isValidThaiIdCard(cleanId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "เลขประจำตัวประชาชนไม่ถูกต้อง (กรุณาตรวจสอบ 13 หลัก)",
        },
        { status: 400 }
      );
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุอีเมลที่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { ok: false, error: "ข้อมูลหลักสูตรไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, offline: true, error: "Supabase not configured" },
        { status: 503 }
      );
    }

    // ตรวจสอบกลุ่มเป้าหมายของหลักสูตรจากฐานข้อมูลจริง
    const { data: courseRow } = await supabase
      .from("courses")
      .select("id, title, short_title, target_quotas")
      .eq("id", courseId)
      .maybeSingle();

    if (
      courseRow?.target_quotas &&
      typeof courseRow.target_quotas === "object" &&
      !Array.isArray(courseRow.target_quotas)
    ) {
      const quotas = courseRow.target_quotas as unknown as TargetGroupQuotas;
      if (
        cleanAffiliation &&
        !isAffiliationAllowedForCourse(cleanAffiliation, { targetQuotas: quotas })
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "กลุ่มเป้าหมาย / สังกัดหลักที่เลือกไม่ได้เปิดรับในหลักสูตรนี้ กรุณาเลือกใหม่",
          },
          { status: 400 }
        );
      }
    }

    const resolvedCourseShort =
      courseRow?.short_title ||
      String(body.course || "").trim() ||
      "หลักสูตรอบรม";
    const resolvedCourseTitle =
      courseRow?.title ||
      String(body.courseTitle || "").trim() ||
      "หลักสูตรอบรม กกท.";

    const rawSuffix = String(body.fiscalYearSuffix || "").replace(/\D/g, "");
    const fySuffix = rawSuffix.length >= 2 ? rawSuffix.slice(-2) : "70";
    const dbFileSize =
      typeof body.fileSize === "number" && Number.isFinite(body.fileSize) && body.fileSize > 0
        ? Math.round(body.fileSize * 1024 * 1024)
        : null;

    const now = new Date().toISOString();

    // 1. ตรวจสอบว่าผู้สมัครรายนี้เคยสมัครหลักสูตรนี้แล้วหรือไม่ (ป้องกันเลข ref ซ้ำและอัปเดตข้อมูลล่าสุด)
    const { data: existingApp } = await supabase
      .from("applications")
      .select("id, ref, receipt_no, status, ai, submitted_at")
      .eq("id_card", cleanId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existingApp) {
      const isResetFromRejected = existingApp.status === "rejected";
      const existingAi =
        existingApp.ai &&
        typeof existingApp.ai === "object" &&
        !Array.isArray(existingApp.ai)
          ? (existingApp.ai as Record<string, unknown>)
          : {};
      const existingNotes = Array.isArray(existingAi._notes)
        ? existingAi._notes
        : [];

      const updatePayload: Database["public"]["Tables"]["applications"]["Update"] = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        affiliation: cleanAffiliation,
        position: cleanPosition,
        course: resolvedCourseShort,
        course_title: resolvedCourseTitle,
        updated_at: now,
      };
      if (dbFileSize !== null) {
        updatePayload.file_size = dbFileSize;
      }
      if (isResetFromRejected) {
        updatePayload.status = "pending";
        updatePayload.review_reason = null;
        updatePayload.reviewed_at = null;
        updatePayload.reviewed_by = null;
        updatePayload.ai = {
          tone: "review",
          line1: "รอการตรวจสอบ",
          line2: "อยู่ระหว่างตรวจเอกสารโดยเจ้าหน้าที่",
          _realStatus: "pending",
          _notes: [
            ...existingNotes,
            {
              id: `${existingApp.ref}-resubmit-${Date.now()}`,
              at: now,
              author: "ระบบรับสมัคร",
              kind: "created",
              text: "ผู้สมัครส่งข้อมูลสมัครใหม่เรียบร้อยแล้ว",
            },
          ],
        } as unknown as Json;
      }

      const { data: updatedRow, error: updError } = await supabase
        .from("applications")
        .update(updatePayload)
        .eq("ref", existingApp.ref)
        .select("id, ref, receipt_no, submitted_at, updated_at")
        .single();

      if (updError || !updatedRow) {
        return NextResponse.json(
          {
            ok: false,
            error: updError?.message || "ไม่สามารถอัปเดตข้อมูลใบสมัครเดิมได้",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        id: Number(updatedRow.id),
        ref: updatedRow.ref,
        receiptNo: updatedRow.receipt_no,
        submittedAt: updatedRow.submitted_at,
        updatedAt: updatedRow.updated_at,
        updated: true,
      });
    }

    // 2. ออกเลข SAT-XXXXX ใหม่แบบ Atomic พร้อมวนลองใหม่หากชน unique constraint จากการส่งพร้อมกัน
    const initialAi = {
      tone: "review",
      line1: "รอการตรวจสอบ",
      line2: "อยู่ระหว่างตรวจเอกสารโดยเจ้าหน้าที่",
      _realStatus: "pending",
      _notes: [
        {
          id: `created-${Date.now()}`,
          at: now,
          author: "ระบบรับสมัคร",
          kind: "created",
          text: "ได้รับข้อมูลการสมัครและเอกสารเรียบร้อยแล้ว",
        },
      ],
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: refsData, error: refsError } = await supabase
        .from("applications")
        .select("ref");

      if (refsError) {
        return NextResponse.json(
          { ok: false, error: refsError.message },
          { status: 500 }
        );
      }

      const maxNum = (refsData || []).reduce((max, r) => {
        const num = Number(String(r.ref || "").replace(/\D/g, ""));
        return Number.isFinite(num) && num > max ? num : max;
      }, 4);

      const candidateRef = `SAT-${String(maxNum + 1).padStart(5, "0")}`;
      const candidateReceiptNo = `${candidateRef}-${fySuffix}`;

      const { data: inserted, error: insertError } = await supabase
        .from("applications")
        .insert({
          ref: candidateRef,
          receipt_no: candidateReceiptNo,
          course_id: courseId,
          course: resolvedCourseShort,
          course_title: resolvedCourseTitle,
          name: cleanName,
          id_card: cleanId,
          email: cleanEmail,
          phone: cleanPhone,
          affiliation: cleanAffiliation,
          position: cleanPosition,
          status: "pending",
          file_size: dbFileSize,
          ai: initialAi as unknown as Json,
          submitted_at: now,
          updated_at: now,
        })
        .select("id, ref, receipt_no, submitted_at, updated_at")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          continue;
        }
        return NextResponse.json(
          { ok: false, error: insertError.message },
          { status: 500 }
        );
      }

      if (inserted) {
        try {
          await supabase.from("review_notes").insert({
            application_ref: inserted.ref,
            author: "ระบบรับสมัคร",
            kind: "created",
            text: "ได้รับข้อมูลการสมัครและเอกสารเรียบร้อยแล้ว",
          });
        } catch {
          // Best-effort initial note
        }

        return NextResponse.json(
          {
            ok: true,
            id: Number(inserted.id),
            ref: inserted.ref,
            receiptNo: inserted.receipt_no,
            submittedAt: inserted.submitted_at,
            updatedAt: inserted.updated_at,
            updated: false,
          },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "ระบบมีผู้สมัครพร้อมกันจำนวนมาก กรุณากดส่งอีกครั้ง" },
      { status: 409 }
    );
  } catch (err) {
    console.error("Error in POST /api/applications/register:", err);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการลงทะเบียนใบสมัคร" },
      { status: 500 }
    );
  }
}
