export type ReusableDocKind = "photo" | "idcard";

export interface ReusableDocumentPayload {
  kind: ReusableDocKind;
  name: string;
  size: string;
  type?: string;
  storagePath?: string;
  dataUrl?: string;
  previewUrl?: string;
  sourceRef: string;
}

export interface LookupDocumentRow {
  id?: string;
  kind: string;
  name: string;
  size?: string | null;
  file_type?: string | null;
  storage_path?: string | null;
  data_url?: string | null;
  created_at?: string | null;
}

/**
 * Masks a Thai phone number while keeping the leading prefix visible as a hint
 * and hiding the last 4 digits so the owner can verify their identity.
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-XXX-XXXX`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-XXX-XXXX`;
  }
  if (digits.length >= 5) {
    return `${digits.slice(0, 2)}X-XXX-XXXX`;
  }
  return "";
}

/**
 * Extracts the last 4 digits from a phone number string.
 */
export function extractLast4Digits(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "";
  return digits.slice(-4);
}

/**
 * Verifies whether the user-supplied 4 digits match the last 4 digits of a stored phone number.
 */
export function matchesPhoneLast4(
  storedPhone: string | null | undefined,
  inputLast4: string | null | undefined
): boolean {
  const cleanInput = String(inputLast4 ?? "").replace(/\D/g, "");
  if (cleanInput.length !== 4) return false;
  const storedLast4 = extractLast4Digits(storedPhone);
  if (storedLast4.length !== 4) return false;
  return storedLast4 === cleanInput;
}

/**
 * Extracts the normalized Supabase Storage object path inside the `sat-documents` bucket.
 * Accepts either a full public/signed Supabase Storage URL or a bucket-relative object path.
 */
export function extractStorageObjectPath(
  storagePath: string | null | undefined
): string | null {
  if (!storagePath || typeof storagePath !== "string") return null;
  const trimmed = storagePath.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return null;
  }

  const marker = "/sat-documents/";
  const idx = trimmed.indexOf(marker);
  if (idx !== -1) {
    const raw = trimmed.slice(idx + marker.length).split("?")[0];
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  const relative = trimmed.replace(/^\/+/, "").split("?")[0];
  if (!relative || !relative.includes("/")) return null;
  try {
    return decodeURIComponent(relative);
  } catch {
    return relative;
  }
}

/**
 * Picks the best prior application record for autofill/verification:
 * prefers the newest non-rejected record; falls back to the newest rejected record if none exist.
 */
export function pickBestPriorApplication<
  T extends {
    status?: string | null;
    submitted_at?: string | null;
    submittedAt?: string | null;
  },
>(rows: T[]): { record: T; isRejectedOnly: boolean } | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const getTimestampMs = (row: T) => {
    const raw = row.submitted_at ?? row.submittedAt ?? "";
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const sorted = [...rows].sort((a, b) => getTimestampMs(b) - getTimestampMs(a));
  const nonRejected = sorted.find((r) => r.status !== "rejected");
  if (nonRejected) {
    return { record: nonRejected, isRejectedOnly: false };
  }
  return { record: sorted[0], isRejectedOnly: true };
}

function resolveDbRowKind(row: LookupDocumentRow): string {
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

function cleanFileTypePrefix(fileType: string | null | undefined): string | undefined {
  if (!fileType) return undefined;
  const cleaned = fileType.replace(/^(idcard:|saka:)/, "").trim();
  return cleaned || undefined;
}

/**
 * Filters a prior application's DB document rows to only reusable personal documents
 * (`photo` and `idcard`), excluding any kind flagged for resubmission and keeping the latest per kind.
 */
export function selectReusableDocsFromRows(
  rows: LookupDocumentRow[],
  sourceRef: string,
  excludedKinds: Iterable<string> = []
): ReusableDocumentPayload[] {
  if (!Array.isArray(rows) || rows.length === 0 || !sourceRef) return [];

  const excluded = new Set(excludedKinds);
  const byKind = new Map<ReusableDocKind, { doc: ReusableDocumentPayload; score: number }>();

  rows.forEach((row, idx) => {
    const resolvedKind = resolveDbRowKind(row);
    if (resolvedKind !== "photo" && resolvedKind !== "idcard") return;
    if (excluded.has(resolvedKind)) return;

    const storagePath = row.storage_path?.trim() || undefined;
    const inlineDataUrl =
      row.data_url && row.data_url.startsWith("data:") ? row.data_url : undefined;
    if (!storagePath && !inlineDataUrl) return;

    const createdMs = row.created_at ? Date.parse(row.created_at) : NaN;
    const score = Number.isFinite(createdMs) ? createdMs : idx + 1;
    const existing = byKind.get(resolvedKind);

    if (!existing || score >= existing.score) {
      byKind.set(resolvedKind, {
        score,
        doc: {
          kind: resolvedKind,
          name: row.name || `${resolvedKind}.file`,
          size: row.size || "ไฟล์จากระบบ",
          type: cleanFileTypePrefix(row.file_type),
          storagePath,
          dataUrl: inlineDataUrl,
          previewUrl: inlineDataUrl,
          sourceRef,
        },
      });
    }
  });

  const ordered: ReusableDocumentPayload[] = [];
  const photo = byKind.get("photo")?.doc;
  if (photo) ordered.push(photo);
  const idcard = byKind.get("idcard")?.doc;
  if (idcard) ordered.push(idcard);
  return ordered;
}

/**
 * Returns only those candidate bucket object paths that are no longer referenced
 * by any remaining row's `storage_path` in `application_documents`.
 */
export function filterUnreferencedPaths(
  candidateObjectPaths: string[],
  remainingStoragePaths: Array<string | null | undefined>
): string[] {
  const referencedSet = new Set<string>();
  for (const rawPath of remainingStoragePaths) {
    const normalized = extractStorageObjectPath(rawPath);
    if (normalized) referencedSet.add(normalized);
  }

  const safeToDelete = new Set<string>();
  for (const candidate of candidateObjectPaths) {
    const normalized = extractStorageObjectPath(candidate);
    if (normalized && !referencedSet.has(normalized)) {
      safeToDelete.add(normalized);
    }
  }
  return Array.from(safeToDelete);
}
