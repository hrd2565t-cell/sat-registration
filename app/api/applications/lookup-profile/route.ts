import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/service";
import { isValidThaiIdCard } from "@/lib/validation";
import {
  extractLast4Digits,
  extractStorageObjectPath,
  maskPhoneNumber,
  matchesPhoneLast4,
  pickBestPriorApplication,
  selectReusableDocsFromRows,
  type ReusableDocumentPayload,
} from "@/lib/profile-lookup";

const MAX_VERIFY_FAILURES = 5;
const LOCKOUT_WINDOW_MS = 10 * 60 * 1000;
const verifyFailures = new Map<string, { count: number; resetAt: number }>();

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
  if (verifyFailures.size <= 500) return;
  for (const [k, entry] of verifyFailures.entries()) {
    if (now >= entry.resetAt) {
      verifyFailures.delete(k);
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: "check" | "verify";
      idCard?: string;
      last4?: string;
    };

    const action = body.action === "verify" ? "verify" : "check";
    const cleanId = String(body.idCard ?? "").replace(/\D/g, "");

    if (cleanId.length !== 13 || !isValidThaiIdCard(cleanId)) {
      return NextResponse.json(
        { ok: false, error: "หมายเลขบัตรประจำตัวประชาชนไม่ถูกต้อง" },
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

    const now = Date.now();
    pruneExpiredFailures(now);
    const rateKey = `${getClientIp(request)}:${cleanId}`;

    if (action === "verify") {
      const existing = verifyFailures.get(rateKey);
      if (existing && now >= existing.resetAt) {
        verifyFailures.delete(rateKey);
      } else if (
        existing &&
        existing.count >= MAX_VERIFY_FAILURES &&
        now < existing.resetAt
      ) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((existing.resetAt - now) / 1000)
        );
        const waitMin = Math.max(1, Math.ceil(retryAfterSec / 60));
        return NextResponse.json(
          {
            ok: false,
            retryAfterSec,
            error: `ยืนยันเบอร์โทรศัพท์ผิดเกินกำหนด กรุณารอ ${waitMin} นาที หรือกดกรอกข้อมูลด้วยตนเอง`,
          },
          { status: 429 }
        );
      }
    }

    // 1. ค้นหาจากใบสมัครรอบปัจจุบันก่อน (applications)
    const { data: appRows, error: appErr } = await supabase
      .from("applications")
      .select(
        "ref, course_id, course_title, name, email, phone, affiliation, position, status, submitted_at, ai"
      )
      .eq("id_card", cleanId)
      .order("submitted_at", { ascending: false });

    if (appErr) {
      console.warn("lookup-profile applications query warning:", appErr.message);
    }

    const bestApp = pickBestPriorApplication(appRows || []);

    // 2. หากไม่มีใบสมัครในรอบปัจจุบัน ให้ค้นหาจากทำเนียบบุคลากร (alumni)
    let matchedAlumni: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      affiliation: string;
      affiliation_group: string;
      course_title: string;
      year_be: number;
    } | null = null;

    if (!bestApp) {
      const { data: alumniRows, error: alumniErr } = await supabase
        .from("alumni")
        .select(
          "id, name, phone, email, affiliation, affiliation_group, course_title, year_be"
        )
        .eq("id_card", cleanId)
        .order("year_be", { ascending: false });

      if (alumniErr) {
        console.warn("lookup-profile alumni query warning:", alumniErr.message);
      }
      if (alumniRows && alumniRows.length > 0) {
        matchedAlumni =
          alumniRows.find((r) => extractLast4Digits(r.phone).length === 4) ||
          alumniRows[0];
      }
    }

    if (!bestApp && !matchedAlumni) {
      return NextResponse.json({ ok: true, found: false });
    }

    const source: "application" | "alumni" = bestApp ? "application" : "alumni";
    const storedPhone = bestApp
      ? bestApp.record.phone
      : matchedAlumni?.phone ?? "";
    const hasPhone = extractLast4Digits(storedPhone).length === 4;
    const maskedPhone = maskPhoneNumber(storedPhone);
    const sourceRef = bestApp ? bestApp.record.ref : undefined;
    const courseTitle = bestApp
      ? bestApp.record.course_title
      : matchedAlumni?.course_title;
    const submittedAt = bestApp ? bestApp.record.submitted_at : undefined;

    if (action === "check") {
      return NextResponse.json({
        ok: true,
        found: true,
        source,
        sourceRef,
        courseTitle,
        submittedAt,
        maskedPhone,
        hasPhone,
      });
    }

    // action === "verify"
    const cleanLast4 = String(body.last4 ?? "").replace(/\D/g, "");
    if (cleanLast4.length !== 4) {
      return NextResponse.json(
        { ok: false, error: "กรุณากรอกเลขท้ายเบอร์โทรศัพท์ให้ครบ 4 หลัก" },
        { status: 400 }
      );
    }

    if (!hasPhone || !matchesPhoneLast4(storedPhone, cleanLast4)) {
      const prev = verifyFailures.get(rateKey);
      const nextCount = prev && now < prev.resetAt ? prev.count + 1 : 1;
      verifyFailures.set(rateKey, {
        count: nextCount,
        resetAt:
          prev && now < prev.resetAt
            ? prev.resetAt
            : now + LOCKOUT_WINDOW_MS,
      });
      const remainingAttempts = Math.max(0, MAX_VERIFY_FAILURES - nextCount);
      return NextResponse.json(
        {
          ok: false,
          remainingAttempts,
          error:
            remainingAttempts > 0
              ? `เลขท้ายเบอร์โทรศัพท์ 4 หลักไม่ถูกต้อง (เหลือโอกาสอีก ${remainingAttempts} ครั้ง)`
              : "กรอกรหัสยืนยันผิดเกินกำหนด กรุณารอ 10 นาที หรือกดกรอกข้อมูลด้วยตนเอง",
        },
        { status: 401 }
      );
    }

    verifyFailures.delete(rateKey);

    let reusableDocs: ReusableDocumentPayload[] = [];
    const excludedKindSet = new Set<string>();

    if (bestApp && !bestApp.isRejectedOnly) {
      const appRow = bestApp.record;
      const aiObj =
        appRow.ai && typeof appRow.ai === "object"
          ? (appRow.ai as { requestedDocKinds?: unknown })
          : null;
      if (Array.isArray(aiObj?.requestedDocKinds)) {
        for (const k of aiObj.requestedDocKinds) {
          if (typeof k === "string" && k) excludedKindSet.add(k);
        }
      }

      if (appRow.course_id) {
        const { data: courseRow } = await supabase
          .from("courses")
          .select("target_quotas")
          .eq("id", appRow.course_id)
          .maybeSingle();

        const rawQuotas =
          courseRow?.target_quotas && typeof courseRow.target_quotas === "object"
            ? (courseRow.target_quotas as Record<string, unknown>)
            : null;
        const reviews =
          rawQuotas?._reviews && typeof rawQuotas._reviews === "object"
            ? (rawQuotas._reviews as Record<string, unknown>)
            : null;
        const revEntry =
          reviews?.[appRow.ref] && typeof reviews[appRow.ref] === "object"
            ? (reviews[appRow.ref] as { requestedDocKinds?: unknown })
            : null;
        if (Array.isArray(revEntry?.requestedDocKinds)) {
          for (const k of revEntry.requestedDocKinds) {
            if (typeof k === "string" && k) excludedKindSet.add(k);
          }
        }
      }

      const { data: docRows } = await supabase
        .from("application_documents")
        .select("id, kind, name, size, file_type, storage_path, data_url, created_at")
        .eq("application_ref", appRow.ref)
        .order("created_at", { ascending: true });

      const selected = selectReusableDocsFromRows(
        docRows || [],
        appRow.ref,
        excludedKindSet
      );

      reusableDocs = await Promise.all(
        selected.map(async (doc) => {
          const objPath = extractStorageObjectPath(doc.storagePath);
          if (objPath) {
            try {
              const { data: signed } = await supabase.storage
                .from("sat-documents")
                .createSignedUrl(objPath, 3600);
              if (signed?.signedUrl) {
                return { ...doc, previewUrl: signed.signedUrl };
              }
            } catch {
              // fallback to inline dataUrl if available
            }
          }
          return doc;
        })
      );
    }

    const profile = bestApp
      ? {
          name: bestApp.record.name,
          affiliation: bestApp.record.affiliation,
          position: bestApp.record.position,
          phone: bestApp.record.phone,
          email: bestApp.record.email,
        }
      : {
          name: matchedAlumni!.name,
          affiliation:
            matchedAlumni!.affiliation &&
            matchedAlumni!.affiliation_group &&
            matchedAlumni!.affiliation !== matchedAlumni!.affiliation_group
              ? `${matchedAlumni!.affiliation_group} (${matchedAlumni!.affiliation})`
              : matchedAlumni!.affiliation_group || matchedAlumni!.affiliation || "",
          position: "",
          phone: matchedAlumni!.phone || "",
          email: matchedAlumni!.email || "",
        };

    return NextResponse.json({
      ok: true,
      verified: true,
      source,
      sourceRef,
      courseTitle,
      submittedAt,
      profile,
      reusableDocs,
      excludedDocKinds: Array.from(excludedKindSet),
    });
  } catch (err) {
    console.error("Error in POST /api/applications/lookup-profile:", err);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูลเดิม" },
      { status: 500 }
    );
  }
}
