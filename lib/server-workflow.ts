import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { decryptServerPayload, encryptServerPayload } from "./server-auth";
import { getSupabaseAdminClient } from "./supabase/service";
import {
  createDefaultWorkflowPayload,
  isSafeWorkflowStoragePath,
  normalizeFiscalYearBE,
  normalizeWorkflowPayload,
  type WorkflowStorePayload,
} from "./workflow";

const PRIVATE_WORKFLOW_BUCKET = "sat-documents";
const PRIVATE_WORKFLOW_PATH = "_private/operational-workflow.enc.json";
const LOCAL_FALLBACK_PATH = path.join(
  os.tmpdir(),
  "sat-operational-workflow.enc.json"
);
const LOCAL_FILES_ROOT = path.join(os.tmpdir(), "sat-workflow-files");

export const WORKFLOW_FILE_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export const WORKFLOW_ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function readLocalFallbackWorkflow(): Promise<WorkflowStorePayload> {
  try {
    const raw = await fs.readFile(LOCAL_FALLBACK_PATH, "utf8");
    const decrypted = decryptServerPayload(raw);
    if (!decrypted) return createDefaultWorkflowPayload();
    const parsed = JSON.parse(decrypted);
    return normalizeWorkflowPayload(parsed);
  } catch {
    return createDefaultWorkflowPayload();
  }
}

async function writeLocalFallbackWorkflow(
  payload: WorkflowStorePayload
): Promise<boolean> {
  try {
    const encrypted = encryptServerPayload(JSON.stringify(payload));
    await fs.writeFile(LOCAL_FALLBACK_PATH, encrypted, "utf8");
    return true;
  } catch (err) {
    console.warn("Failed to write local fallback workflow:", err);
    return false;
  }
}

/**
 * อ่านและถอดรหัสผังขั้นตอนการดำเนินงานจากพื้นที่ส่วนตัวบน Supabase Storage
 * (`sat-documents/_private/operational-workflow.enc.json`) แยกอิสระจากตารางข้อมูลหลักของระบบ
 */
export async function readServerWorkflow(): Promise<WorkflowStorePayload> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return readLocalFallbackWorkflow();
  }

  try {
    const { data, error } = await supabase.storage
      .from(PRIVATE_WORKFLOW_BUCKET)
      .download(PRIVATE_WORKFLOW_PATH);

    if (!error && data) {
      const rawText = await data.text();
      const decrypted = decryptServerPayload(rawText);
      if (decrypted) {
        const parsed = JSON.parse(decrypted);
        return normalizeWorkflowPayload(parsed);
      }
    }
  } catch (err) {
    console.warn("Failed to read encrypted server workflow:", err);
  }

  return createDefaultWorkflowPayload();
}

/**
 * เข้ารหัส AES-256-GCM และบันทึกผังขั้นตอนการดำเนินงานลงพื้นที่ส่วนตัว
 */
export async function writeServerWorkflow(
  payload: WorkflowStorePayload
): Promise<boolean> {
  const normalized: WorkflowStorePayload = {
    ...normalizeWorkflowPayload(payload),
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return writeLocalFallbackWorkflow(normalized);
  }

  try {
    const encrypted = encryptServerPayload(JSON.stringify(normalized));
    const blob = new Blob([encrypted], { type: "application/json" });
    const { error } = await supabase.storage
      .from(PRIVATE_WORKFLOW_BUCKET)
      .upload(PRIVATE_WORKFLOW_PATH, blob, {
        upsert: true,
        contentType: "application/json",
      });
    if (error) {
      console.warn(
        "Failed to write encrypted workflow to Supabase Storage:",
        error.message
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Failed to upload encrypted server workflow:", err);
    return false;
  }
}

function resolveLocalWorkflowFilePath(storagePath: string): string | null {
  if (!isSafeWorkflowStoragePath(storagePath)) return null;
  const rel = storagePath.replace(/^_private\/workflow-files\//, "");
  const resolved = path.resolve(LOCAL_FILES_ROOT, rel);
  const rootPrefix = path.resolve(LOCAL_FILES_ROOT) + path.sep;
  if (!resolved.startsWith(rootPrefix)) return null;
  return resolved;
}

function inferContentTypeFromPath(storagePath: string): string {
  const lower = storagePath.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function uploadServerWorkflowFile(params: {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  fiscalYearBE: string;
}): Promise<{ ok: boolean; storagePath?: string; error?: string }> {
  const safeYear = normalizeFiscalYearBE(params.fiscalYearBE);
  const safeExt = params.ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  const fileKey = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${safeExt}`;
  const storagePath = `_private/workflow-files/${safeYear}/${fileKey}`;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    try {
      const localPath = resolveLocalWorkflowFilePath(storagePath);
      if (!localPath) {
        return { ok: false, error: "Invalid file path" };
      }
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, params.buffer);
      return { ok: true, storagePath };
    } catch (err) {
      console.warn("Failed local fallback workflow file upload:", err);
      return { ok: false, error: "ไม่สามารถบันทึกไฟล์ลงเครื่องได้" };
    }
  }

  try {
    const blob = new Blob([new Uint8Array(params.buffer)], {
      type: params.mimeType,
    });
    const { error } = await supabase.storage
      .from(PRIVATE_WORKFLOW_BUCKET)
      .upload(storagePath, blob, {
        upsert: false,
        contentType: params.mimeType,
      });
    if (error) {
      console.warn("Failed to upload private workflow file:", error.message);
      return { ok: false, error: "อัปโหลดไฟล์ขึ้นคลาวด์ไม่สำเร็จ" };
    }
    return { ok: true, storagePath };
  } catch (err) {
    console.warn("Workflow file upload error:", err);
    return { ok: false, error: "เกิดข้อผิดพลาดระหว่างอัปโหลดไฟล์" };
  }
}

export async function downloadServerWorkflowFile(
  storagePath: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!isSafeWorkflowStoragePath(storagePath)) return null;
  const contentType = inferContentTypeFromPath(storagePath);

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    const localPath = resolveLocalWorkflowFilePath(storagePath);
    if (!localPath) return null;
    try {
      const buffer = await fs.readFile(localPath);
      return { buffer, contentType };
    } catch {
      return null;
    }
  }

  try {
    const { data, error } = await supabase.storage
      .from(PRIVATE_WORKFLOW_BUCKET)
      .download(storagePath);
    if (error || !data) return null;
    const arrBuf = await data.arrayBuffer();
    return {
      buffer: Buffer.from(arrBuf),
      contentType: data.type || contentType,
    };
  } catch {
    return null;
  }
}

export async function deleteServerWorkflowFiles(
  storagePaths: string[]
): Promise<number> {
  const safePaths = Array.from(
    new Set(storagePaths.filter((p) => isSafeWorkflowStoragePath(p)))
  );
  if (safePaths.length === 0) return 0;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    let deleted = 0;
    for (const sp of safePaths) {
      const localPath = resolveLocalWorkflowFilePath(sp);
      if (!localPath) continue;
      try {
        await fs.unlink(localPath);
        deleted += 1;
      } catch {
        // Ignore already-deleted files
      }
    }
    return deleted;
  }

  try {
    const { data, error } = await supabase.storage
      .from(PRIVATE_WORKFLOW_BUCKET)
      .remove(safePaths);
    if (error) {
      console.warn("Failed to remove private workflow files:", error.message);
      return 0;
    }
    return Array.isArray(data) ? data.length : safePaths.length;
  } catch (err) {
    console.warn("Error removing private workflow files:", err);
    return 0;
  }
}
