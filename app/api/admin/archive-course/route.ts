import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/service";
import { isAdminRequestAuthorized } from "@/lib/server-auth";
import { extractStorageObjectPath } from "@/lib/profile-lookup";
import { removeUnreferencedStorageObjects } from "@/lib/server-storage-cleanup";

const ARCHIVED_SIZE_MARKER = "เก็บถาวรแล้ว";
const FREE_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB Free Plan benchmark

function parseSizeLabelToBytes(sizeStr: string | null | undefined): number {
  if (!sizeStr || sizeStr.includes(ARCHIVED_SIZE_MARKER)) return 0;
  const match = String(sizeStr).match(/([\d.]+)\s*(bytes?|kb|mb|gb)?/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  if (!Number.isFinite(val) || val <= 0) return 0;
  const unit = (match[2] || "bytes").toLowerCase();
  if (unit.startsWith("gb")) return Math.round(val * 1024 * 1024 * 1024);
  if (unit.startsWith("mb")) return Math.round(val * 1024 * 1024);
  if (unit.startsWith("kb")) return Math.round(val * 1024);
  return Math.round(val);
}

function resolveDocKind(row: {
  kind: string;
  file_type?: string | null;
  storage_path?: string | null;
}): string {
  if (
    row.kind === "idcard" ||
    (row.file_type && row.file_type.startsWith("idcard:")) ||
    (row.storage_path && row.storage_path.includes("idcard-"))
  ) {
    return "idcard";
  }
  if (
    row.kind === "saka" ||
    (row.file_type && row.file_type.startsWith("saka:")) ||
    (row.storage_path && row.storage_path.includes("saka-"))
  ) {
    return "saka";
  }
  return row.kind;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function POST(request: Request) {
  try {
    const isAuth = await isAdminRequestAuthorized(request);
    if (!isAuth) {
      return NextResponse.json(
        { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, offline: true, error: "Supabase not configured" },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: "stats" | "prepare" | "purge";
      courseId?: number;
    };

    const action = body.action || "stats";

    if (action === "stats") {
      const [{ data: courseRows }, { data: appRows }, { data: docRows }] =
        await Promise.all([
          supabase
            .from("courses")
            .select("id, title, short_title, status, target_quotas")
            .order("id", { ascending: true }),
          supabase
            .from("applications")
            .select("ref, course_id, course_title, id_card, name")
            .order("id", { ascending: true }),
          supabase
            .from("application_documents")
            .select("id, application_ref, kind, size, file_type, storage_path, created_at")
            .order("created_at", { ascending: true }),
        ]);

      const activeApps = (appRows || []).filter(
        (a) =>
          a.id_card !== "1100912345678" &&
          a.name !== "นาย สมชาย สิงห์" &&
          a.name !== "[Demo] นาย สมชาย สิงห์"
      );

      const appCourseMap = new Map<string, number>();
      const appCountByCourse = new Map<number, number>();
      const courseTitleFallback = new Map<number, string>();

      for (const a of activeApps) {
        appCourseMap.set(a.ref, a.course_id);
        appCountByCourse.set(a.course_id, (appCountByCourse.get(a.course_id) || 0) + 1);
        if (!courseTitleFallback.has(a.course_id) && a.course_title) {
          courseTitleFallback.set(a.course_id, a.course_title);
        }
      }

      const activeFilesByCourse = new Map<number, number>();
      const archivedFilesByCourse = new Map<number, number>();
      const bytesByCourse = new Map<number, number>();
      const uniqueBucketBytes = new Map<string, number>();
      let unsharedInlineBytes = 0;

      for (const doc of docRows || []) {
        const cId = appCourseMap.get(doc.application_ref);
        if (cId === undefined) continue;

        const isArchived =
          !doc.storage_path && Boolean(doc.size?.includes(ARCHIVED_SIZE_MARKER));
        const bytes = parseSizeLabelToBytes(doc.size);

        if (isArchived) {
          archivedFilesByCourse.set(cId, (archivedFilesByCourse.get(cId) || 0) + 1);
          continue;
        }

        if (!doc.storage_path && bytes <= 0) {
          continue;
        }

        activeFilesByCourse.set(cId, (activeFilesByCourse.get(cId) || 0) + 1);
        bytesByCourse.set(cId, (bytesByCourse.get(cId) || 0) + bytes);

        const objPath = extractStorageObjectPath(doc.storage_path);
        if (objPath) {
          const prevSize = uniqueBucketBytes.get(objPath) || 0;
          if (bytes > prevSize) {
            uniqueBucketBytes.set(objPath, bytes);
          }
        } else {
          unsharedInlineBytes += bytes;
        }
      }

      let totalEstimatedBytes = unsharedInlineBytes;
      for (const b of uniqueBucketBytes.values()) {
        totalEstimatedBytes += b;
      }

      const allCourseIds = new Set<number>();
      for (const c of courseRows || []) allCourseIds.add(c.id);
      for (const cId of appCountByCourse.keys()) allCourseIds.add(cId);

      const courseMetaMap = new Map(
        (courseRows || []).map((c) => [c.id, c])
      );

      const courses = Array.from(allCourseIds)
        .sort((a, b) => a - b)
        .map((cId) => {
          const meta = courseMetaMap.get(cId);
          const rawQuotas =
            meta?.target_quotas && typeof meta.target_quotas === "object"
              ? (meta.target_quotas as Record<string, unknown>)
              : null;
          const metaObj =
            rawQuotas?._metadata && typeof rawQuotas._metadata === "object"
              ? (rawQuotas._metadata as Record<string, unknown>)
              : null;
          const isHistorical = Boolean(metaObj?.isHistorical);
          return {
            courseId: cId,
            courseTitle:
              meta?.title ||
              meta?.short_title ||
              courseTitleFallback.get(cId) ||
              `หลักสูตร #${cId}`,
            courseStatus: String(metaObj?.status || meta?.status || "open"),
            isHistorical,
            applicantCount: appCountByCourse.get(cId) || 0,
            activeFileCount: activeFilesByCourse.get(cId) || 0,
            archivedFileCount: archivedFilesByCourse.get(cId) || 0,
            estimatedBytes: bytesByCourse.get(cId) || 0,
          };
        })
        .filter((c) => c.applicantCount > 0 || !c.isHistorical);

      let totalActiveFiles = 0;
      for (const count of activeFilesByCourse.values()) {
        totalActiveFiles += count;
      }

      return NextResponse.json({
        ok: true,
        courses,
        totalEstimatedBytes,
        totalActiveFiles,
        freeQuotaBytes: FREE_STORAGE_QUOTA_BYTES,
      });
    }

    const courseId = Number(body.courseId);
    if (!Number.isFinite(courseId) || courseId <= 0) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุรหัสหลักสูตรให้ถูกต้อง" },
        { status: 400 }
      );
    }

    const { data: courseRow } = await supabase
      .from("courses")
      .select("id, title, short_title")
      .eq("id", courseId)
      .maybeSingle();

    const { data: appRows, error: appsErr } = await supabase
      .from("applications")
      .select(
        "ref, name, id_card, affiliation, position, phone, email, status, submitted_at"
      )
      .eq("course_id", courseId)
      .order("ref", { ascending: true });

    if (appsErr) {
      return NextResponse.json(
        { ok: false, error: `ไม่สามารถอ่านข้อมูลใบสมัครได้: ${appsErr.message}` },
        { status: 500 }
      );
    }

    const validApps = (appRows || []).filter(
      (a) =>
        a.id_card !== "1100912345678" &&
        a.name !== "นาย สมชาย สิงห์" &&
        a.name !== "[Demo] นาย สมชาย สิงห์"
    );

    const appRefs = validApps.map((a) => a.ref);
    const courseTitle =
      courseRow?.title || courseRow?.short_title || `หลักสูตร_${courseId}`;

    if (appRefs.length === 0) {
      if (action === "purge") {
        return NextResponse.json({
          ok: true,
          courseId,
          purgedRowCount: 0,
          deletedStorageFiles: 0,
          skippedSharedFiles: 0,
        });
      }
      return NextResponse.json({
        ok: true,
        courseId,
        courseTitle,
        applicants: [],
        files: [],
      });
    }

    const allDocRows: Array<{
      id: string;
      application_ref: string;
      kind: string;
      name: string;
      size: string;
      file_type: string | null;
      storage_path: string | null;
      data_url: string | null;
      created_at: string;
    }> = [];

    for (const refChunk of chunkArray(appRefs, 100)) {
      const { data: chunkDocs, error: docErr } = await supabase
        .from("application_documents")
        .select(
          "id, application_ref, kind, name, size, file_type, storage_path, data_url, created_at"
        )
        .in("application_ref", refChunk)
        .order("created_at", { ascending: true });

      if (docErr) {
        return NextResponse.json(
          { ok: false, error: `ไม่สามารถอ่านข้อมูลเอกสารได้: ${docErr.message}` },
          { status: 500 }
        );
      }
      if (chunkDocs) allDocRows.push(...chunkDocs);
    }

    if (action === "prepare") {
      // Keep latest real-file row per (ref, kind)
      const latestMap = new Map<string, (typeof allDocRows)[number]>();
      for (const row of allDocRows) {
        if (!row.storage_path && !(row.data_url && row.data_url.startsWith("data:"))) {
          continue;
        }
        const realKind = resolveDocKind(row);
        latestMap.set(`${row.application_ref}::${realKind}`, row);
      }

      const appNameByRef = new Map(validApps.map((a) => [a.ref, a.name]));
      const fileCountByRef = new Map<string, number>();

      const selectedDocs = Array.from(latestMap.values());
      const files: Array<{
        docId: string;
        ref: string;
        applicantName: string;
        kind: string;
        name: string;
        size: string;
        downloadUrl?: string;
        inlineDataUrl?: string;
      }> = [];

      // Sign URLs in batches of 8 for fast preparation
      for (const batch of chunkArray(selectedDocs, 8)) {
        const resolvedBatch = await Promise.all(
          batch.map(async (row) => {
            const realKind = resolveDocKind(row);
            fileCountByRef.set(
              row.application_ref,
              (fileCountByRef.get(row.application_ref) || 0) + 1
            );

            let downloadUrl: string | undefined;
            const objPath = extractStorageObjectPath(row.storage_path);
            if (objPath) {
              try {
                const { data: signed } = await supabase.storage
                  .from("sat-documents")
                  .createSignedUrl(objPath, 3600);
                if (signed?.signedUrl) {
                  downloadUrl = signed.signedUrl;
                }
              } catch {
                // fallback to inlineDataUrl if present
              }
            }

            const inlineDataUrl =
              !downloadUrl && row.data_url?.startsWith("data:")
                ? row.data_url
                : undefined;

            return {
              docId: row.id,
              ref: row.application_ref,
              applicantName: appNameByRef.get(row.application_ref) || row.application_ref,
              kind: realKind,
              name: row.name,
              size: row.size,
              downloadUrl,
              inlineDataUrl,
            };
          })
        );
        files.push(...resolvedBatch);
      }

      return NextResponse.json({
        ok: true,
        courseId,
        courseTitle,
        applicants: validApps.map((a) => ({
          ref: a.ref,
          name: a.name,
          idCard: a.id_card,
          affiliation: a.affiliation,
          position: a.position,
          phone: a.phone,
          email: a.email,
          status: a.status,
          submittedAt: a.submitted_at,
          fileCount: fileCountByRef.get(a.ref) || 0,
        })),
        files,
      });
    }

    if (action === "purge") {
      const targetDocs = allDocRows.filter(
        (d) => Boolean(d.storage_path) || Boolean(d.data_url)
      );

      if (targetDocs.length === 0) {
        return NextResponse.json({
          ok: true,
          courseId,
          purgedRowCount: 0,
          deletedStorageFiles: 0,
          skippedSharedFiles: 0,
        });
      }

      const candidatePaths = targetDocs
        .map((d) => d.storage_path)
        .filter((p): p is string => Boolean(p));

      const docIds = targetDocs.map((d) => d.id);
      for (const idChunk of chunkArray(docIds, 100)) {
        const { error: updErr } = await supabase
          .from("application_documents")
          .update({
            storage_path: null,
            data_url: null,
            size: "เก็บถาวรแล้ว (Google Drive)",
          })
          .in("id", idChunk);

        if (updErr) {
          return NextResponse.json(
            {
              ok: false,
              error: `ไม่สามารถล้างข้อมูลไฟล์ในฐานข้อมูลได้: ${updErr.message}`,
            },
            { status: 500 }
          );
        }
      }

      // Reference-checked safe storage removal: NEVER deletes files still referenced by other courses!
      const { deletedCount, skippedCount } = await removeUnreferencedStorageObjects(
        supabase,
        candidatePaths
      );

      return NextResponse.json({
        ok: true,
        courseId,
        purgedRowCount: docIds.length,
        deletedStorageFiles: deletedCount,
        skippedSharedFiles: skippedCount,
      });
    }

    return NextResponse.json(
      { ok: false, error: "คำสั่งไม่ถูกต้อง" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Error in POST /api/admin/archive-course:", err);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการจัดการคลังเอกสารหลักสูตร" },
      { status: 500 }
    );
  }
}
