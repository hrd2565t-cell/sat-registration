import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { decryptServerPayload, encryptServerPayload } from "./server-auth";
import { getSupabaseAdminClient } from "./supabase/service";
import {
  createDefaultWorkflowPayload,
  normalizeWorkflowPayload,
  type WorkflowStorePayload,
} from "./workflow";

const PRIVATE_WORKFLOW_BUCKET = "sat-documents";
const PRIVATE_WORKFLOW_PATH = "_private/operational-workflow.enc.json";
const LOCAL_FALLBACK_PATH = path.join(
  os.tmpdir(),
  "sat-operational-workflow.enc.json"
);

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
