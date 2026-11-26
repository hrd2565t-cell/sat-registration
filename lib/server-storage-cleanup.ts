import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  extractStorageObjectPath,
  filterUnreferencedPaths,
} from "@/lib/profile-lookup";

/**
 * Safely deletes objects from the `sat-documents` Supabase Storage bucket ONLY if
 * no remaining row in `application_documents` still references that object path.
 * Fails closed (deletes nothing) if the reference check query fails.
 */
export async function removeUnreferencedStorageObjects(
  supabase: SupabaseClient<Database>,
  candidatePaths: string[]
): Promise<{ deletedCount: number; skippedCount: number }> {
  const normalizedCandidates = Array.from(
    new Set(
      candidatePaths
        .map((p) => extractStorageObjectPath(p))
        .filter((p): p is string => Boolean(p))
    )
  );

  if (normalizedCandidates.length === 0) {
    return { deletedCount: 0, skippedCount: 0 };
  }

  try {
    const { data: remainingRows, error: refErr } = await supabase
      .from("application_documents")
      .select("storage_path")
      .not("storage_path", "is", null);

    if (refErr || !remainingRows) {
      console.warn(
        "Skipped storage cleanup because reference check failed:",
        refErr?.message
      );
      return { deletedCount: 0, skippedCount: normalizedCandidates.length };
    }

    const safeToDelete = filterUnreferencedPaths(
      normalizedCandidates,
      remainingRows.map((row) => row.storage_path)
    );
    const skippedCount = normalizedCandidates.length - safeToDelete.length;

    if (safeToDelete.length === 0) {
      return { deletedCount: 0, skippedCount };
    }

    const { error: removeErr } = await supabase.storage
      .from("sat-documents")
      .remove(safeToDelete);

    if (removeErr) {
      console.warn("Storage remove warning:", removeErr.message);
      return { deletedCount: 0, skippedCount: normalizedCandidates.length };
    }

    return {
      deletedCount: safeToDelete.length,
      skippedCount,
    };
  } catch (err) {
    console.warn("Unexpected error during reference-checked storage cleanup:", err);
    return { deletedCount: 0, skippedCount: normalizedCandidates.length };
  }
}
