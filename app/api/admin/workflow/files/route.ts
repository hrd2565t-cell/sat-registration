import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/server-auth";
import {
  WORKFLOW_ALLOWED_MIME_TYPES,
  WORKFLOW_FILE_MAX_BYTES,
  deleteServerWorkflowFiles,
  downloadServerWorkflowFile,
  uploadServerWorkflowFile,
} from "@/lib/server-workflow";
import { isSafeWorkflowStoragePath } from "@/lib/workflow";

function formatSizeLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "1 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function buildContentDisposition(fileName: string, download: boolean): string {
  const cleanName = fileName.replace(/[\r\n"]/g, "_").slice(0, 140) || "document";
  const asciiFallback = cleanName.replace(/[^\x20-\x7E]/g, "_") || "document";
  const encoded = encodeURIComponent(cleanName);
  const mode = download ? "attachment" : "inline";
  return `${mode}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: Request) {
  const isAdmin = await isAdminRequestAuthorized(request);
  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const storagePath = searchParams.get("path") || "";
  const fileName = searchParams.get("name") || "document";
  const forceDownload = searchParams.get("download") === "1";

  if (!isSafeWorkflowStoragePath(storagePath)) {
    return NextResponse.json(
      { ok: false, error: "ที่อยู่ไฟล์ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const downloaded = await downloadServerWorkflowFile(storagePath);
  if (!downloaded) {
    return NextResponse.json(
      { ok: false, error: "ไม่พบไฟล์เอกสารในระบบ" },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(downloaded.buffer), {
    status: 200,
    headers: {
      "Content-Type": downloaded.contentType,
      "Content-Disposition": buildContentDisposition(fileName, forceDownload),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminRequestAuthorized(request);
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
        { status: 403 }
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { ok: false, error: "รูปแบบข้อมูลอัปโหลดไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const fileEntry = formData.get("file");
    const fiscalYearBE = String(formData.get("fiscalYearBE") || "");
    const customLabel = String(formData.get("label") || "").trim();

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "ไม่พบไฟล์ที่ต้องการอัปโหลด" },
        { status: 400 }
      );
    }

    const ext = WORKFLOW_ALLOWED_MIME_TYPES[fileEntry.type];
    if (!ext) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "รองรับเฉพาะไฟล์ PDF หรือรูปภาพ (JPG, PNG, WEBP) สำหรับไฟล์ประเภทอื่นแนะนำฝากใน Google Drive แล้วแปะลิงก์ครับ",
        },
        { status: 400 }
      );
    }

    if (fileEntry.size <= 0 || fileEntry.size > WORKFLOW_FILE_MAX_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "ไฟล์ต้องมีขนาดไม่เกิน 4 MB (หากไฟล์ใหญ่กว่านี้แนะนำอัปโหลดลง Google Drive แล้วแปะลิงก์)",
        },
        { status: 413 }
      );
    }

    const arrayBuf = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const uploaded = await uploadServerWorkflowFile({
      buffer,
      mimeType: fileEntry.type,
      ext,
      fiscalYearBE,
    });

    if (!uploaded.ok || !uploaded.storagePath) {
      return NextResponse.json(
        { ok: false, error: uploaded.error || "อัปโหลดไฟล์ไม่สำเร็จ" },
        { status: 500 }
      );
    }

    const displayName = (customLabel || fileEntry.name || "เอกสารแนบ")
      .trim()
      .slice(0, 140);

    return NextResponse.json({
      ok: true,
      attachment: {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: "file" as const,
        name: displayName,
        storagePath: uploaded.storagePath,
        mimeType: fileEntry.type,
        size: formatSizeLabel(buffer.length),
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/admin/workflow/files error:", error);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการอัปโหลดไฟล์" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const isAdmin = await isAdminRequestAuthorized(request);
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      storagePath?: unknown;
      storagePaths?: unknown;
    };

    const candidates: string[] = [];
    if (typeof body.storagePath === "string") {
      candidates.push(body.storagePath);
    }
    if (Array.isArray(body.storagePaths)) {
      for (const item of body.storagePaths) {
        if (typeof item === "string") candidates.push(item);
      }
    }

    const deleted = await deleteServerWorkflowFiles(candidates);
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error("DELETE /api/admin/workflow/files error:", error);
    return NextResponse.json(
      { ok: false, error: "ลบไฟล์แนบไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
