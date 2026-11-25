import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/service";
import { isAdminRequestAuthorized } from "@/lib/server-auth";

const VALID_DOC_KINDS = new Set([
  "photo",
  "cover",
  "certificate",
  "idcard",
  "saka",
]);

interface KeepByKindItem {
  kind: string;
  keepDocId: string;
}

function resolveRealDocKind(row: {
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

function extractStorageObjectPath(
  storagePath: string | null | undefined
): string | null {
  if (!storagePath || typeof storagePath !== "string") return null;
  const marker = "/sat-documents/";
  const idx = storagePath.indexOf(marker);
  if (idx === -1) return null;
  const raw = storagePath.slice(idx + marker.length).split("?")[0];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      ref?: string;
      idCard?: string;
      keepByKind?: KeepByKindItem[];
    };

    const ref = typeof body.ref === "string" ? body.ref.trim() : "";
    const keepByKind = Array.isArray(body.keepByKind)
      ? body.keepByKind.filter(
          (item) =>
            item &&
            typeof item.kind === "string" &&
            VALID_DOC_KINDS.has(item.kind) &&
            typeof item.keepDocId === "string" &&
            item.keepDocId.trim().length > 0
        )
      : [];

    if (!ref || keepByKind.length === 0) {
      return NextResponse.json(
        { ok: false, error: "ข้อมูลคำขอแทนที่เอกสารไม่ครบถ้วน" },
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

    // ตรวจสอบสิทธิ์: แอดมิน OR ผู้สมัครที่ยื่นเลขบัตรประชาชนตรงกับใบสมัคร ref นั้น
    const isAdmin = await isAdminRequestAuthorized(request);
    if (!isAdmin) {
      const cleanInputId = String(body.idCard || "").replace(/\D/g, "");
      if (cleanInputId.length !== 13) {
        return NextResponse.json(
          { ok: false, error: "ไม่ได้รับอนุญาตให้แทนที่เอกสาร" },
          { status: 403 }
        );
      }

      const { data: appRow } = await supabase
        .from("applications")
        .select("id_card")
        .eq("ref", ref)
        .maybeSingle();

      const ownerId = String(appRow?.id_card || "").replace(/\D/g, "");
      if (!ownerId || ownerId !== cleanInputId) {
        return NextResponse.json(
          { ok: false, error: "ข้อมูลยืนยันตัวตนไม่ตรงกับเจ้าของใบสมัคร" },
          { status: 403 }
        );
      }
    }

    const { data: allDocs, error: docsError } = await supabase
      .from("application_documents")
      .select("id, kind, file_type, storage_path, data_url")
      .eq("application_ref", ref);

    if (docsError || !allDocs || allDocs.length === 0) {
      return NextResponse.json({
        ok: true,
        deletedRowCount: 0,
        deletedFileCount: 0,
      });
    }

    const keepIdsSet = new Set(keepByKind.map((k) => k.keepDocId.trim()));
    const keptObjectPaths = new Set<string>();
    for (const row of allDocs) {
      if (keepIdsSet.has(String(row.id))) {
        const objPath = extractStorageObjectPath(row.storage_path);
        if (objPath) keptObjectPaths.add(objPath);
      }
    }

    const idsToDelete: string[] = [];
    const pathsToDelete = new Set<string>();

    for (const item of keepByKind) {
      const keepDocId = item.keepDocId.trim();
      const keptRow = allDocs.find((r) => String(r.id) === keepDocId);

      // Safe Replace Guard: ต้องยืนยันก่อนว่าแถวใหม่มีข้อมูลไฟล์จริงอยู่ใน DB แล้วเท่านั้นจึงจะลบของเก่า
      if (!keptRow || !(keptRow.storage_path || keptRow.data_url)) {
        continue;
      }

      for (const row of allDocs) {
        const rowId = String(row.id);
        if (rowId === keepDocId) continue;
        if (resolveRealDocKind(row) !== item.kind) continue;

        idsToDelete.push(rowId);
        const oldPath = extractStorageObjectPath(row.storage_path);
        if (oldPath && !keptObjectPaths.has(oldPath)) {
          pathsToDelete.add(oldPath);
        }
      }
    }

    if (idsToDelete.length > 0) {
      const { error: delErr } = await supabase
        .from("application_documents")
        .delete()
        .in("id", idsToDelete);
      if (delErr) {
        console.warn("Failed to delete stale application_documents rows:", delErr.message);
      }
    }

    const pathsList = Array.from(pathsToDelete);
    let deletedFileCount = 0;
    if (pathsList.length > 0) {
      const { error: storageErr } = await supabase.storage
        .from("sat-documents")
        .remove(pathsList);
      if (storageErr) {
        console.warn("Failed to remove stale storage objects:", storageErr.message);
      } else {
        deletedFileCount = pathsList.length;
      }
    }

    return NextResponse.json({
      ok: true,
      deletedRowCount: idsToDelete.length,
      deletedFileCount,
    });
  } catch (err) {
    console.error("Error in POST /api/applications/replace-documents:", err);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการจัดการไฟล์เอกสารเก่า" },
      { status: 500 }
    );
  }
}
