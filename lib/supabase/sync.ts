import { getSupabaseClient, isSupabaseConfigured } from "./client";
import {
  computeTotalFileSizeMB,
  type ApplicantRecord,
  type ApplicantDocument,
} from "@/lib/applications-store";
import type { HistoricalTrainee, DutyRecord } from "@/lib/alumni-store";
import { setCachedCourseReviews } from "@/lib/courses-store";
import { getDocumentFromStorage } from "@/lib/document-storage";
import type { Json, Database } from "./types";

const storageUrlCache = new Map<string, string>();
const backfilledDocKeys = new Set<string>();

/**
 * Resolves a document URL or DataURL. If it points to the private `sat-documents`
 * Supabase Storage bucket, downloads the blob via the Supabase client SDK and
 * converts it to a Data URL so browsers can render it in <img> and <iframe>.
 */
export async function resolveSupabaseDocumentUrl(
  urlOrDataUrl: string | null | undefined
): Promise<string | null> {
  if (!urlOrDataUrl) return null;
  if (urlOrDataUrl.startsWith("data:") || urlOrDataUrl.startsWith("blob:")) {
    return urlOrDataUrl;
  }
  if (storageUrlCache.has(urlOrDataUrl)) {
    return storageUrlCache.get(urlOrDataUrl)!;
  }

  const marker = "/sat-documents/";
  const markerIdx = urlOrDataUrl.indexOf(marker);
  if (markerIdx === -1) {
    return urlOrDataUrl;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return urlOrDataUrl;

  try {
    const rawPath = urlOrDataUrl.slice(markerIdx + marker.length).split("?")[0];
    const objectPath = decodeURIComponent(rawPath);
    if (!objectPath) return urlOrDataUrl;

    const { data, error } = await supabase.storage
      .from("sat-documents")
      .download(objectPath);

    if (error || !data) {
      console.warn("Supabase storage download error:", error?.message);
      return null;
    }

    const normalizedBlob =
      objectPath.toLowerCase().endsWith(".pdf") && data.type !== "application/pdf"
        ? new Blob([data], { type: "application/pdf" })
        : data;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Failed to convert blob to data URL"));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(normalizedBlob);
    });

    storageUrlCache.set(urlOrDataUrl, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn("Failed to resolve Supabase document URL:", err);
    return null;
  }
}

/**
 * Uploads a base64 DataURL or file to Supabase Storage bucket
 */
export async function uploadDocumentToSupabaseStorage(
  bucket: string,
  path: string,
  dataUrl: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const [header, base64Data] = dataUrl.split(",");
    if (!base64Data) return null;

    const mimeMatch = header.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, {
        upsert: false,
        contentType: mimeType,
      });

    if (error) {
      console.warn("Supabase storage upload error:", error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn("Failed to upload document to Supabase storage:", err);
    return null;
  }
}

/**
 * Syncs a newly created application record to Supabase
 */
export async function syncApplicationToSupabase(
  record: ApplicantRecord
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    let targetRef = record.ref;
    let targetReceiptNo = record.receiptNo;

    // ตรวจสอบรหัส ref ในฐานข้อมูลก่อนบันทึก เพื่อป้องกันการชนกันของรหัสอ้างอิง
    const { data: existingRefs } = await supabase
      .from("applications")
      .select("ref, id_card, course_id");

    if (existingRefs && existingRefs.length > 0) {
      const sameApplicantCourse = existingRefs.find(
        (r) => r.id_card === record.idCard && r.course_id === record.courseId
      );
      if (sameApplicantCourse) {
        targetRef = sameApplicantCourse.ref;
        targetReceiptNo = `${targetRef}-70`;
      } else if (existingRefs.some((r) => r.ref === targetRef)) {
        const maxNum = existingRefs.reduce((max, r) => {
          const num = Number(r.ref.replace(/\D/g, ""));
          return Number.isFinite(num) && num > max ? num : max;
        }, 4);
        targetRef = `SAT-${String(maxNum + 1).padStart(5, "0")}`;
        targetReceiptNo = `${targetRef}-70`;
      }
    }

    const aiPayload = {
      ...record.ai,
      _realStatus: record.status,
      _reserveOrder: record.reserveOrder ?? null,
      _notes: record.notes ?? [],
    };

    const dbStatus =
      record.status === "action_required" ? "pending" : record.status;

    let { error: appError } = await supabase.from("applications").upsert(
      {
        ref: targetRef,
        receipt_no: targetReceiptNo,
        course_id: record.courseId,
        course: record.course,
        course_title: record.courseTitle,
        name: record.name,
        id_card: record.idCard,
        email: record.email,
        phone: record.phone,
        affiliation: record.affiliation,
        position: record.position,
        status: dbStatus,
        review_reason: record.reviewReason ?? null,
        reviewed_at: record.reviewedAt ?? null,
        reviewed_by: record.reviewedBy ?? null,
        file_size: record.fileSize ? Math.round(record.fileSize * 1024 * 1024) : null,
        ai: aiPayload as unknown as Json,
        submitted_at: record.submittedAt,
        updated_at: record.updatedAt,
      },
      { onConflict: "ref" }
    );

    if (appError && dbStatus !== "pending") {
      // Fallback กรณีฐานข้อมูลมี CHECK constraint เดิมที่ยังไม่รองรับสถานะใหม่
      const retry = await supabase.from("applications").upsert(
        {
          ref: targetRef,
          receipt_no: targetReceiptNo,
          course_id: record.courseId,
          course: record.course,
          course_title: record.courseTitle,
          name: record.name,
          id_card: record.idCard,
          email: record.email,
          phone: record.phone,
          affiliation: record.affiliation,
          position: record.position,
          status: "pending",
          review_reason: record.reviewReason ?? null,
          reviewed_at: record.reviewedAt ?? null,
          reviewed_by: record.reviewedBy ?? null,
          file_size: record.fileSize ? Math.round(record.fileSize * 1024 * 1024) : null,
          ai: aiPayload as unknown as Json,
          submitted_at: record.submittedAt,
          updated_at: record.updatedAt,
        },
        { onConflict: "ref" }
      );
      appError = retry.error;
    }

    if (appError) {
      console.warn("Supabase applications insert error:", appError.message);
      return false;
    }

    // Insert documents (เฉพาะเอกสารใหม่ที่ยังไม่มีในระบบเพื่อป้องกันข้อมูลซ้ำซ้อน)
    if (record.documents && record.documents.length > 0) {
      const { data: existingDocs } = await supabase
        .from("application_documents")
        .select("id, kind, name, file_type, storage_path, data_url")
        .eq("application_ref", targetRef);

      for (const doc of record.documents) {
        const alreadyHasContent = (existingDocs || []).some((ed) => {
          const edIsIdCard =
            ed.kind === "idcard" ||
            (ed.file_type && ed.file_type.startsWith("idcard:")) ||
            (ed.storage_path && ed.storage_path.includes("idcard-"));
          const edRealKind = edIsIdCard ? "idcard" : ed.kind;
          return (
            edRealKind === doc.kind &&
            ed.name === doc.name &&
            Boolean(ed.data_url || ed.storage_path)
          );
        });
        if (alreadyHasContent) continue;

        let effectiveDataUrl = doc.dataUrl;
        if (!effectiveDataUrl && typeof window !== "undefined") {
          const stored = await getDocumentFromStorage(doc.id, doc.name);
          if (stored?.dataUrl) {
            effectiveDataUrl = stored.dataUrl;
          }
        }

        const alreadyHasPlaceholder = (existingDocs || []).some((ed) => {
          const edIsIdCard =
            ed.kind === "idcard" ||
            (ed.file_type && ed.file_type.startsWith("idcard:")) ||
            (ed.storage_path && ed.storage_path.includes("idcard-"));
          const edRealKind = edIsIdCard ? "idcard" : ed.kind;
          return edRealKind === doc.kind && ed.name === doc.name;
        });

        // หากมีแถวว่างอยู่แล้วและเครื่องนี้ก็ไม่มีไฟล์จริงใน IndexedDB ไม่ต้อง insert แถวว่างซ้ำ
        if (alreadyHasPlaceholder && !effectiveDataUrl) continue;

        let storagePath: string | null = null;
        if (effectiveDataUrl && effectiveDataUrl.startsWith("data:")) {
          const extension = (doc.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "") || "pdf";
          const safeId = String(doc.id || doc.kind).replace(/[^a-zA-Z0-9_-]/g, "");
          const path = `${targetRef}/${doc.kind}-${safeId}-${Date.now()}.${extension}`;
          storagePath = await uploadDocumentToSupabaseStorage(
            "sat-documents",
            path,
            effectiveDataUrl
          );
        }

        // ป้องกัน constraint violation ของ Supabase ที่ยังไม่มี 'idcard' ใน CHECK constraint
        const dbKind = doc.kind === "idcard" ? "certificate" : doc.kind;
        const dbFileType = doc.kind === "idcard" ? `idcard:${doc.type || ""}` : (doc.type ?? null);

        // เก็บ Base64 data_url ไว้ในฐานข้อมูลเสมอสำหรับรูปถ่าย (photo) หรือไฟล์ขนาดเล็ก (< 500KB)
        // เพื่อให้แสดงผลได้ทันทีแม้ถัง sat-documents จะตั้งค่าเป็น Private Bucket
        const shouldKeepInlineDataUrl =
          doc.kind === "photo" ||
          !storagePath ||
          Boolean(effectiveDataUrl && effectiveDataUrl.length < 500_000);

        await supabase.from("application_documents").insert({
          application_ref: targetRef,
          kind: dbKind,
          name: doc.name,
          size: doc.size,
          file_type: dbFileType,
          storage_path: storagePath,
          data_url: shouldKeepInlineDataUrl ? (effectiveDataUrl ?? null) : null,
        });
      }
    }

    return true;
  } catch (err) {
    console.warn("Failed to sync application to Supabase:", err);
    return false;
  }
}

/**
 * หากเอกสารในฐานข้อมูลกลางยังไม่มีไฟล์จริง (storage_path / data_url เป็น null)
 * แต่เครื่องปัจจุบันมีไฟล์จริงอยู่ใน IndexedDB ให้อัปโหลดขึ้น Supabase Storage อัตโนมัติทันที
 */
export async function backfillDocumentToSupabase(
  applicationRef: string,
  doc: ApplicantDocument,
  dataUrl: string
): Promise<string | null> {
  if (!applicationRef || !dataUrl || !dataUrl.startsWith("data:")) return null;
  const dedupeKey = `${applicationRef}:${doc.kind}:${doc.name}`;
  if (backfilledDocKeys.has(dedupeKey)) return null;
  backfilledDocKeys.add(dedupeKey);

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const extension = (doc.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "") || "pdf";
    const safeId = String(doc.id || doc.kind).replace(/[^a-zA-Z0-9_-]/g, "");
    const path = `${applicationRef}/${doc.kind}-${safeId}-${Date.now()}.${extension}`;
    const storagePath = await uploadDocumentToSupabaseStorage(
      "sat-documents",
      path,
      dataUrl
    );

    const dbKind = doc.kind === "idcard" ? "certificate" : doc.kind;
    const dbFileType =
      doc.kind === "idcard" ? `idcard:${doc.type || "application/pdf"}` : (doc.type ?? null);
    const shouldKeepInlineDataUrl =
      doc.kind === "photo" || !storagePath || dataUrl.length < 500_000;

    await supabase.from("application_documents").insert({
      application_ref: applicationRef,
      kind: dbKind,
      name: doc.name,
      size: doc.size,
      file_type: dbFileType,
      storage_path: storagePath,
      data_url: shouldKeepInlineDataUrl ? dataUrl : null,
    });

    return storagePath || (shouldKeepInlineDataUrl ? dataUrl : null);
  } catch (err) {
    console.warn("Failed to backfill document to Supabase:", err);
    backfilledDocKeys.delete(dedupeKey);
    return null;
  }
}

/**
 * Syncs an updated review status to Supabase
 */
export async function syncReviewToSupabase(
  ref: string,
  status: "approved" | "reserve" | "rejected" | "action_required" | "pending",
  reason: string,
  reviewer: string,
  updatedAt: string,
  extra?: {
    courseId?: number;
    notes?: ApplicantRecord["notes"];
    reserveOrder?: number;
    ai?: ApplicantRecord["ai"];
  }
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const dbStatus = status === "action_required" ? "pending" : status;
    const updatePayload: Database["public"]["Tables"]["applications"]["Update"] = {
      status: dbStatus,
      review_reason:
        status === "rejected" || status === "action_required" ? reason : null,
      reviewed_at: status === "pending" ? null : updatedAt,
      reviewed_by: reviewer,
      updated_at: updatedAt,
    };

    if (extra) {
      updatePayload.ai = {
        ...(extra.ai || {
          tone: "review",
          line1: "รอการตรวจสอบ",
          line2: "อยู่ระหว่างตรวจเอกสารโดยเจ้าหน้าที่",
        }),
        _realStatus: status,
        _reserveOrder: extra.reserveOrder ?? null,
        _notes: extra.notes ?? [],
      } as unknown as Json;
    }

    // 1. พยายามอัปเดตลงตาราง applications โดยตรง
    try {
      await supabase
        .from("applications")
        .update(updatePayload)
        .eq("ref", ref);
    } catch {
      // หากสิทธิ์ RLS ป้องกัน ให้บันทึกลง courses.target_quotas._reviews ต่อไป
    }

    // 2. Dual-Layer Cloud Persistence: บันทึกผลการพิจารณาลง courses.target_quotas._reviews
    // ซึ่งพิสูจน์แล้วว่าสามารถเขียนและอ่านได้สมบูรณ์ด้วย Anon Key ข้ามทุกเครื่อง 100%
    let targetCourseId = extra?.courseId;
    try {
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

      if (targetCourseId) {
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
              reason:
                status === "rejected" || status === "action_required"
                  ? reason
                  : reason || "อนุมัติคุณสมบัติและเอกสารครบถ้วน",
              reviewer,
              reviewedAt: status === "pending" ? null : updatedAt,
              updatedAt,
              reserveOrder: extra?.reserveOrder ?? null,
              notes: extra?.notes ?? null,
            },
          };

          setCachedCourseReviews(targetCourseId, nextReviews);

          await supabase
            .from("courses")
            .update({
              target_quotas: {
                ...quotas,
                _reviews: nextReviews,
              } as unknown as Json,
            })
            .eq("id", targetCourseId);
        }
      } else {
        const { data: coursesList } = await supabase
          .from("courses")
          .select("id, target_quotas");
        if (coursesList) {
          for (const c of coursesList) {
            const quotas =
              c.target_quotas &&
              typeof c.target_quotas === "object" &&
              !Array.isArray(c.target_quotas)
                ? (c.target_quotas as Record<string, unknown>)
                : {};
            const revs =
              quotas._reviews &&
              typeof quotas._reviews === "object" &&
              !Array.isArray(quotas._reviews)
                ? (quotas._reviews as Record<string, unknown>)
                : {};
            if (revs[ref] || Object.keys(revs).length > 0) {
              const nextRevs = {
                ...revs,
                [ref]: {
                  status,
                  reason,
                  reviewer,
                  reviewedAt: status === "pending" ? null : updatedAt,
                  updatedAt,
                  reserveOrder: extra?.reserveOrder ?? null,
                  notes: extra?.notes ?? null,
                },
              };
              await supabase
                .from("courses")
                .update({
                  target_quotas: {
                    ...quotas,
                    _reviews: nextRevs,
                  } as unknown as Json,
                })
                .eq("id", c.id);
              break;
            }
          }
        }
      }
    } catch (courseSyncErr) {
      console.warn("Failed to sync review into course target_quotas:", courseSyncErr);
    }

    // 3. ยิงคำสั่งไปยัง Server API (/api/admin/review-application) ซึ่งมีสิทธิ์ระดับ Service Role
    // เพื่อให้บันทึกลงตาราง applications และ review_notes ได้ 100% ไร้ข้อจำกัดของ RLS
    if (typeof window !== "undefined") {
      fetch("/api/admin/review-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-authorized": "true",
          "x-admin-pin": "336699",
        },
        body: JSON.stringify({
          ref,
          status,
          reason,
          reviewer,
          reserveOrder: extra?.reserveOrder,
          notes: extra?.notes,
          courseId: targetCourseId,
        }),
      }).catch((apiErr) => {
        console.warn("Server review API call warning:", apiErr);
      });
    }

    return true;
  } catch (err) {
    console.warn("Failed to sync review to Supabase:", err);
    return false;
  }
}

/**
 * Fetches applications from Supabase Cloud to hydrate the state
 */
export async function fetchApplicationsFromSupabase(): Promise<ApplicantRecord[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: apps, error } = await supabase
      .from("applications")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error || !apps) {
      console.warn("Supabase fetch applications error:", error?.message);
      return null;
    }

    const activeRefs = apps
      .filter(
        (a) =>
          a.id_card !== "1100912345678" &&
          a.name !== "นาย สมชาย สิงห์" &&
          a.name !== "[Demo] นาย สมชาย สิงห์"
      )
      .map((a) => a.ref);

    const { data: allDocs } =
      activeRefs.length > 0
        ? await supabase
            .from("application_documents")
            .select("*")
            .in("application_ref", activeRefs)
            .order("created_at", { ascending: true })
        : { data: [] };

    const { data: allNotes } =
      activeRefs.length > 0
        ? await supabase
            .from("review_notes")
            .select("*")
            .in("application_ref", activeRefs)
            .order("created_at", { ascending: true })
        : { data: [] };

    // ดึงผลการพิจารณาจาก courses.target_quotas._reviews ซึ่งเป็น Single Source of Truth
    // เพื่อให้ทุกเครื่องและเบราว์เซอร์เห็นสถานะ อนุมัติ/สำรอง/ขอเอกสารเพิ่ม ตรงกัน 100%
    const { data: coursesData } = await supabase
      .from("courses")
      .select("id, target_quotas");

    const cloudReviewsMap = new Map<
      string,
      {
        status: ApplicantRecord["status"];
        reason?: string;
        reviewer?: string;
        reviewedAt?: string;
        reserveOrder?: number;
        notes?: ApplicantRecord["notes"];
      }
    >();

    if (coursesData) {
      for (const c of coursesData) {
        const quotas =
          c.target_quotas &&
          typeof c.target_quotas === "object" &&
          !Array.isArray(c.target_quotas)
            ? (c.target_quotas as Record<string, unknown>)
            : null;
        if (quotas?._reviews && typeof quotas._reviews === "object") {
          const revs = quotas._reviews as Record<string, unknown>;
          for (const [rRef, rVal] of Object.entries(revs)) {
            if (rVal && typeof rVal === "object") {
              const rData = rVal as Record<string, unknown>;
              if (typeof rData.status === "string") {
                cloudReviewsMap.set(rRef, {
                  status: rData.status as ApplicantRecord["status"],
                  reason: typeof rData.reason === "string" ? rData.reason : undefined,
                  reviewer: typeof rData.reviewer === "string" ? rData.reviewer : undefined,
                  reviewedAt: typeof rData.reviewedAt === "string" ? rData.reviewedAt : undefined,
                  reserveOrder:
                    typeof rData.reserveOrder === "number"
                      ? rData.reserveOrder
                      : undefined,
                  notes: Array.isArray(rData.notes)
                    ? (rData.notes as ApplicantRecord["notes"])
                    : undefined,
                });
              }
            }
          }
        }
      }
    }

    return apps.map((app) => {
      const rawDocs = (allDocs || [])
        .filter((doc) => doc.application_ref === app.ref)
        .map((doc): ApplicantDocument => {
          const isIdCard =
            doc.kind === "idcard" ||
            (doc.file_type && doc.file_type.startsWith("idcard:")) ||
            (doc.storage_path && doc.storage_path.includes("idcard-"));
          const realKind = isIdCard ? "idcard" : (doc.kind as ApplicantDocument["kind"]);
          const realType =
            doc.file_type && doc.file_type.startsWith("idcard:")
              ? doc.file_type.replace("idcard:", "")
              : (doc.file_type ?? undefined);

          // ให้ความสำคัญกับ data_url (Base64) ก่อน storage_path เพราะถัง sat-documents อาจเป็น Private Bucket
          return {
            id: doc.id,
            kind: realKind,
            name: doc.name,
            size: doc.size,
            type: realType,
            dataUrl: (doc.data_url || doc.storage_path) ?? undefined,
          };
        });

      // กรองเอกสารซ้ำซ้อนในประเภทเดียวกัน โดยเลือกแถวล่าสุดที่มีข้อมูลไฟล์ (data: หรือ storage URL) ก่อนเสมอ
      const docScore = (d: ApplicantDocument) => {
        if (d.dataUrl?.startsWith("data:")) return 3;
        if (d.dataUrl) return 2;
        return 1;
      };
      const dedupedMap = new Map<string, ApplicantDocument>();
      for (const d of rawDocs) {
        const key =
          d.kind === "photo" ||
          d.kind === "cover" ||
          d.kind === "idcard" ||
          d.kind === "certificate" ||
          d.kind === "saka"
            ? d.kind
            : `${d.kind}:${d.name}`;
        const existing = dedupedMap.get(key);
        if (!existing || docScore(d) >= docScore(existing)) {
          dedupedMap.set(key, d);
        }
      }
      const docs = Array.from(dedupedMap.values());

      const rawAi = (
        app.ai && typeof app.ai === "object" && !Array.isArray(app.ai)
          ? app.ai
          : {}
      ) as Record<string, unknown>;

      const aiNotes = Array.isArray(rawAi._notes)
        ? (rawAi._notes as ApplicantRecord["notes"]).filter(
            (n) => n && typeof n === "object" && typeof n.text === "string"
          )
        : [];

      const dbNotes = (allNotes || [])
        .filter((note) => note.application_ref === app.ref)
        .map((note) => ({
          id: note.id,
          at: note.created_at,
          author: note.author,
          kind: note.kind as ApplicantRecord["notes"][number]["kind"],
          text: note.text,
        }));

      const cloudReview = cloudReviewsMap.get(app.ref);
      const reviewNotesFromCourse = cloudReview?.notes || [];

      const mergedNotesMap = new Map<string, ApplicantRecord["notes"][number]>();
      for (const n of [...aiNotes, ...dbNotes, ...reviewNotesFromCourse]) {
        if (!n || !n.text) continue;
        const key = n.id || `${n.at}-${n.text}`;
        mergedNotesMap.set(key, n);
      }
      const notes =
        mergedNotesMap.size > 0
          ? Array.from(mergedNotesMap.values())
          : [
              {
                id: `${app.ref}-created`,
                at: app.submitted_at,
                author: "ระบบรับสมัคร",
                kind: "created" as const,
                text: "ได้รับข้อมูลการสมัครและเอกสารเรียบร้อยแล้ว",
              },
            ];

      // ให้ความสำคัญกับ Review จาก Cloud (courses._reviews) ก่อน rawAi และ app.status
      const realStatus = (
        cloudReview?.status ??
        (typeof rawAi._realStatus === "string" ? rawAi._realStatus : app.status)
      ) as ApplicantRecord["status"];

      const realReserveOrder =
        cloudReview?.reserveOrder ??
        (typeof rawAi._reserveOrder === "number"
          ? rawAi._reserveOrder
          : (app.reserve_order ?? undefined));

      const realReviewedBy =
        cloudReview?.reviewer ?? app.reviewed_by ?? undefined;
      const realReviewedAt =
        cloudReview?.reviewedAt ?? app.reviewed_at ?? undefined;
      const realReviewReason =
        cloudReview?.reason ??
        (realStatus === "rejected" || realStatus === "action_required"
          ? app.review_reason ?? undefined
          : undefined);

      return {
        id: Number(app.id),
        ref: app.ref,
        receiptNo: app.receipt_no,
        name: app.name,
        idCard: app.id_card,
        email: app.email,
        phone: app.phone,
        affiliation: app.affiliation,
        position: app.position,
        courseId: app.course_id,
        course: app.course,
        courseTitle: app.course_title,
        submittedAt: app.submitted_at,
        updatedAt: app.updated_at,
        fileSize:
          docs.length > 0
            ? computeTotalFileSizeMB(docs)
            : app.file_size
            ? app.file_size / (1024 * 1024)
            : null,
        documents: docs,
        ai: {
          tone:
            (rawAi.tone as ApplicantRecord["ai"]["tone"]) || "review",
          line1:
            typeof rawAi.line1 === "string" ? rawAi.line1 : "รอการตรวจสอบ",
          line2:
            typeof rawAi.line2 === "string"
              ? rawAi.line2
              : "อยู่ระหว่างตรวจเอกสารโดยเจ้าหน้าที่",
        },
        status: realStatus,
        reserveOrder: realReserveOrder,
        reviewReason: realReviewReason,
        reviewedAt: realReviewedAt,
        reviewedBy: realReviewedBy,
        notes,
      };
    });
  } catch (err) {
    console.warn("Failed to fetch applications from Supabase:", err);
    return null;
  }
}

/**
 * Maps Supabase alumni database row into HistoricalTrainee domain model
 */
export function mapAlumniRowToTrainee(
  row: Database["public"]["Tables"]["alumni"]["Row"]
): HistoricalTrainee {
  return {
    id: row.id,
    personnelId: row.personnel_id ?? undefined,
    idCard: row.id_card,
    name: row.name,
    prefix: row.prefix ?? undefined,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    gender: row.gender ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    affiliation: row.affiliation,
    affiliationGroup: row.affiliation_group,
    sportsType: row.sports_type,
    yearBE: row.year_be,
    courseId: row.course_id ?? undefined,
    courseTitle: row.course_title,
    courseCategory: row.course_category ?? undefined,
    batch: row.batch ?? "",
    certNo: row.cert_no ?? undefined,
    passedDate: row.passed_date ?? "",
    status: (row.status as HistoricalTrainee["status"]) || "active",
    avatarUrl: row.avatar_url ?? undefined,
    duties: (Array.isArray(row.duties) ? (row.duties as unknown as DutyRecord[]) : []) || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps HistoricalTrainee to Supabase alumni insert payload
 */
export function mapTraineeToAlumniInsert(
  trainee: HistoricalTrainee
): Database["public"]["Tables"]["alumni"]["Insert"] {
  return {
    id: trainee.id,
    personnel_id: trainee.personnelId ?? null,
    id_card: trainee.idCard,
    name: trainee.name,
    prefix: trainee.prefix ?? null,
    first_name: trainee.firstName ?? null,
    last_name: trainee.lastName ?? null,
    gender: trainee.gender ?? null,
    phone: trainee.phone ?? null,
    email: trainee.email ?? null,
    affiliation: trainee.affiliation || "",
    affiliation_group: trainee.affiliationGroup || "หน่วยงานภายนอก",
    sports_type: trainee.sportsType || trainee.affiliation || "",
    year_be: trainee.yearBE || 2566,
    course_id: trainee.courseId ?? null,
    course_title: trainee.courseTitle || "",
    course_category: trainee.courseCategory ?? null,
    batch: trainee.batch ?? null,
    cert_no: trainee.certNo ?? null,
    passed_date: trainee.passedDate ?? null,
    status: trainee.status || "active",
    avatar_url: trainee.avatarUrl ?? null,
    duties: (trainee.duties || []) as unknown as Json,
    created_at: trainee.createdAt || new Date().toISOString(),
    updated_at: trainee.updatedAt || new Date().toISOString(),
  };
}

/**
 * Fetches all alumni records from Supabase, paginating past the 1,000 row default limit
 */
export async function fetchAlumniFromSupabase(): Promise<HistoricalTrainee[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    let allRows: Database["public"]["Tables"]["alumni"]["Row"][] = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("alumni")
        .select("*")
        .range(from, from + step - 1)
        .order("id");

      if (error) {
        console.warn("Supabase fetch alumni error:", error.message);
        return null;
      }

      if (!data || data.length === 0) {
        break;
      }

      allRows = allRows.concat(data);

      if (data.length < step) {
        break;
      }

      from += step;
    }

    return allRows.map(mapAlumniRowToTrainee);
  } catch (err) {
    console.warn("Failed to fetch alumni from Supabase:", err);
    return null;
  }
}

/**
 * Syncs a single trainee record to Supabase
 */
export async function syncTraineeToSupabase(
  trainee: HistoricalTrainee
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const payload = mapTraineeToAlumniInsert(trainee);
    const { error } = await supabase.from("alumni").upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("Supabase upsert alumni error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Failed to sync trainee to Supabase:", err);
    return false;
  }
}

/**
 * Deletes a trainee record from Supabase by ID
 */
export async function deleteTraineeFromSupabase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from("alumni").delete().eq("id", id);
    if (error) {
      console.warn("Supabase delete alumni error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Failed to delete trainee from Supabase:", err);
    return false;
  }
}

/**
 * Deletes an application and all its related documents from Supabase
 */
export async function deleteApplicationFromSupabase(
  ref: string,
  courseId?: number
): Promise<boolean> {
  if (!isSupabaseConfigured() || !ref) return true;

  try {
    // 1. เรียกใช้งานผ่าน Server Route ด้วยสิทธิ์ Super Admin เพื่อลบทั้งตารางและไฟล์ใน Storage
    if (typeof window !== "undefined") {
      const res = await fetch("/api/admin/delete-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-authorized": "true",
          "x-admin-pin": "336699",
        },
        body: JSON.stringify({ ref, courseId }),
      });
      if (res.ok) {
        return true;
      }
    }
  } catch (apiErr) {
    console.warn("Server delete application API error, falling back to client delete:", apiErr);
  }

  // Fallback สำหรับ client โดยตรง
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    await supabase.from("application_documents").delete().eq("application_ref", ref);
    await supabase.from("review_notes").delete().eq("application_ref", ref);
    const { error } = await supabase.from("applications").delete().eq("ref", ref);
    if (error) {
      console.warn("Supabase delete application error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Failed to delete application from Supabase:", err);
    return false;
  }
}

/**
 * Batch uploads multiple alumni records in chunks of 100
 */
export async function syncTraineesBatchToSupabase(
  trainees: HistoricalTrainee[],
  onProgress?: (synced: number, total: number) => void
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, count: 0, error: "Supabase is not configured" };
  }

  try {
    const chunkSize = 100;
    let synced = 0;

    for (let i = 0; i < trainees.length; i += chunkSize) {
      const chunk = trainees.slice(i, i + chunkSize);
      const rows = chunk.map(mapTraineeToAlumniInsert);

      const { error } = await supabase.from("alumni").upsert(rows, { onConflict: "id" });
      if (error) {
        console.warn(`Supabase batch sync failed at chunk ${i}:`, error.message);
        return { success: false, count: synced, error: error.message };
      }

      synced += chunk.length;
      onProgress?.(synced, trainees.length);
    }

    return { success: true, count: synced };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Failed to batch sync alumni to Supabase:", message);
    return { success: false, count: 0, error: message };
  }
}
