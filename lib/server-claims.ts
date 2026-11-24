import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getSupabaseAdminClient } from "./supabase/service";
import { decryptServerPayload, encryptServerPayload } from "./server-auth";
import type { Json } from "./supabase/types";

export interface ServerProfileClaim {
  id: string;
  traineeId: string;
  traineePersonnelId: string;
  traineeName: string;
  currentAffiliation: string;
  currentCourseTitle: string;
  latestYearBE?: number;
  totalCoursesCount?: number;
  claimantName: string;
  idCard: string;
  phone: string;
  email?: string;
  newAffiliation?: string;
  note?: string;
  idCardPhotoUrl?: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

const PRIVATE_CLAIMS_BUCKET = "sat-documents";
const PRIVATE_CLAIMS_PATH = "_private/profile-claims.enc.json";
const LOCAL_FALLBACK_PATH = path.join(os.tmpdir(), "sat-private-claims.enc.json");

let legacyMigrationChecked = false;

async function readLocalFallbackClaims(): Promise<ServerProfileClaim[]> {
  try {
    const raw = await fs.readFile(LOCAL_FALLBACK_PATH, "utf8");
    const decrypted = decryptServerPayload(raw);
    if (!decrypted) return [];
    const parsed = JSON.parse(decrypted);
    return Array.isArray(parsed) ? (parsed as ServerProfileClaim[]) : [];
  } catch {
    return [];
  }
}

async function writeLocalFallbackClaims(
  claims: ServerProfileClaim[]
): Promise<boolean> {
  try {
    const encrypted = encryptServerPayload(JSON.stringify(claims));
    await fs.writeFile(LOCAL_FALLBACK_PATH, encrypted, "utf8");
    return true;
  } catch (err) {
    console.warn("Failed to write local fallback claims:", err);
    return false;
  }
}

/**
 * Persists encrypted profile claims exclusively in private storage (`sat-documents/_private/profile-claims.enc.json`)
 * so applicant national IDs and ID photos never sit in the public `courses` table.
 */
export async function writeServerClaims(
  claims: ServerProfileClaim[]
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return writeLocalFallbackClaims(claims);
  }

  try {
    const encrypted = encryptServerPayload(JSON.stringify(claims));
    const blob = new Blob([encrypted], { type: "application/json" });
    const { error } = await supabase.storage
      .from(PRIVATE_CLAIMS_BUCKET)
      .upload(PRIVATE_CLAIMS_PATH, blob, {
        upsert: true,
        contentType: "application/json",
      });
    if (error) {
      console.warn("Failed to write encrypted claims to Supabase Storage:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Failed to upload encrypted server claims:", err);
    return false;
  }
}

/**
 * Migrates any legacy `profileClaims` previously stored inside `courses.target_quotas._globalTimeline`
 * into encrypted private storage and removes PII from the public `courses` row.
 */
async function migrateLegacyClaimsFromCoursesIfNeeded(
  existingEncryptedClaims: ServerProfileClaim[]
): Promise<ServerProfileClaim[]> {
  if (legacyMigrationChecked) return existingEncryptedClaims;
  legacyMigrationChecked = true;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return existingEncryptedClaims;

  try {
    const { data: row } = await supabase
      .from("courses")
      .select("id, target_quotas")
      .order("id")
      .limit(1)
      .maybeSingle();

    if (!row || !row.target_quotas || typeof row.target_quotas !== "object") {
      return existingEncryptedClaims;
    }

    const quotas = row.target_quotas as Record<string, unknown>;
    const globalTimeline =
      quotas._globalTimeline && typeof quotas._globalTimeline === "object"
        ? (quotas._globalTimeline as Record<string, unknown>)
        : null;

    if (!globalTimeline || !("profileClaims" in globalTimeline)) {
      return existingEncryptedClaims;
    }

    const legacyList = Array.isArray(globalTimeline.profileClaims)
      ? (globalTimeline.profileClaims as ServerProfileClaim[])
      : [];

    let merged = existingEncryptedClaims;
    if (legacyList.length > 0) {
      const seenIds = new Set(existingEncryptedClaims.map((c) => c.id));
      const newOnes = legacyList.filter((c) => c && c.id && !seenIds.has(c.id));
      if (newOnes.length > 0) {
        merged = [...existingEncryptedClaims, ...newOnes];
        const migratedOk = await writeServerClaims(merged);
        if (!migratedOk) {
          legacyMigrationChecked = false;
          return merged;
        }
      }
    }

    const { profileClaims: _removedPii, ...restGlobal } = globalTimeline;
    const cleanedQuotas = {
      ...quotas,
      _globalTimeline: restGlobal,
    };

    await supabase
      .from("courses")
      .update({ target_quotas: cleanedQuotas as unknown as Json })
      .eq("id", row.id);

    return merged;
  } catch (err) {
    console.warn("Legacy profileClaims cleanup warning:", err);
    return existingEncryptedClaims;
  }
}

/**
 * Reads and decrypts all identity verification claims from private server storage.
 */
export async function readServerClaims(): Promise<ServerProfileClaim[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return readLocalFallbackClaims();
  }

  let currentClaims: ServerProfileClaim[] = [];
  try {
    const { data, error } = await supabase.storage
      .from(PRIVATE_CLAIMS_BUCKET)
      .download(PRIVATE_CLAIMS_PATH);

    if (!error && data) {
      const rawText = await data.text();
      const decrypted = decryptServerPayload(rawText);
      if (decrypted) {
        const parsed = JSON.parse(decrypted);
        if (Array.isArray(parsed)) {
          currentClaims = parsed as ServerProfileClaim[];
        }
      }
    }
  } catch (err) {
    console.warn("Failed to read encrypted server claims:", err);
  }

  return migrateLegacyClaimsFromCoursesIfNeeded(currentClaims);
}
