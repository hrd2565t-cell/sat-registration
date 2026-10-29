import { getSupabaseClient } from "./client";
import type { ApplicantRecord, ApplicantDocument } from "@/lib/applications-store";
import type { Json } from "./types";

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
        upsert: true,
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
    const { error: appError } = await supabase.from("applications").upsert(
      {
        ref: record.ref,
        receipt_no: record.receiptNo,
        course_id: record.courseId,
        course: record.course,
        course_title: record.courseTitle,
        name: record.name,
        id_card: record.idCard,
        email: record.email,
        phone: record.phone,
        affiliation: record.affiliation,
        position: record.position,
        status: record.status,
        review_reason: record.reviewReason ?? null,
        reviewed_at: record.reviewedAt ?? null,
        reviewed_by: record.reviewedBy ?? null,
        file_size: record.fileSize ? Math.round(record.fileSize * 1024 * 1024) : null,
        ai: record.ai as unknown as Json,
        submitted_at: record.submittedAt,
        updated_at: record.updatedAt,
      },
      { onConflict: "ref" }
    );

    if (appError) {
      console.warn("Supabase applications insert error:", appError.message);
      return false;
    }

    // Insert documents
    if (record.documents && record.documents.length > 0) {
      for (const doc of record.documents) {
        let storagePath = null;
        if (doc.dataUrl) {
          const extension = doc.name.split(".").pop() || "bin";
          const path = `${record.ref}/${doc.kind}-${doc.id}.${extension}`;
          storagePath = await uploadDocumentToSupabaseStorage(
            "sat-documents",
            path,
            doc.dataUrl
          );
        }

        await supabase.from("application_documents").upsert({
          application_ref: record.ref,
          kind: doc.kind,
          name: doc.name,
          size: doc.size,
          file_type: doc.type ?? null,
          storage_path: storagePath,
          data_url: storagePath ? null : doc.dataUrl ?? null,
        });
      }
    }

    // Insert notes
    if (record.notes && record.notes.length > 0) {
      for (const note of record.notes) {
        await supabase.from("review_notes").upsert({
          application_ref: record.ref,
          author: note.author,
          kind: note.kind,
          text: note.text,
          created_at: note.at,
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
 * Syncs an updated review status to Supabase
 */
export async function syncReviewToSupabase(
  ref: string,
  status: "approved" | "reserve" | "rejected" | "action_required" | "pending",
  reason: string,
  reviewer: string,
  updatedAt: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("applications")
      .update({
        status,
        review_reason:
          status === "rejected" || status === "action_required" ? reason : null,
        reviewed_at: status === "pending" ? null : updatedAt,
        reviewed_by: reviewer,
        updated_at: updatedAt,
      })
      .eq("ref", ref);

    if (error) {
      console.warn("Supabase update review error:", error.message);
      return false;
    }

    await supabase.from("review_notes").insert({
      application_ref: ref,
      author: reviewer,
      kind: status === "pending" ? "note" : status,
      text: reason,
      created_at: updatedAt,
    });

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

    const { data: allDocs } = await supabase
      .from("application_documents")
      .select("*");

    const { data: allNotes } = await supabase
      .from("review_notes")
      .select("*")
      .order("created_at", { ascending: true });

    return apps.map((app) => {
      const docs = (allDocs || [])
        .filter((doc) => doc.application_ref === app.ref)
        .map((doc): ApplicantDocument => ({
          id: doc.id,
          kind: doc.kind as ApplicantDocument["kind"],
          name: doc.name,
          size: doc.size,
          type: doc.file_type ?? undefined,
          dataUrl: (doc.storage_path || doc.data_url) ?? undefined,
        }));

      const notes = (allNotes || [])
        .filter((note) => note.application_ref === app.ref)
        .map((note) => ({
          id: note.id,
          at: note.created_at,
          author: note.author,
          kind: note.kind as "created" | "note" | "approved" | "rejected",
          text: note.text,
        }));

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
        fileSize: app.file_size ? app.file_size / (1024 * 1024) : null,
        documents: docs,
        ai: (app.ai as unknown as ApplicantRecord["ai"]) || {
          tone: "review",
          line1: "รอการตรวจสอบ",
          line2: "อยู่ระหว่างตรวจเอกสารโดยเจ้าหน้าที่",
        },
        status: app.status as ApplicantRecord["status"],
        reserveOrder: app.reserve_order ?? undefined,
        reviewReason: app.review_reason ?? undefined,
        reviewedAt: app.reviewed_at ?? undefined,
        reviewedBy: app.reviewed_by ?? undefined,
        notes,
      };
    });
  } catch (err) {
    console.warn("Failed to fetch applications from Supabase:", err);
    return null;
  }
}
