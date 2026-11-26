/**
 * Lightweight, zero-dependency PKZIP (Store / method 0) builder with full UTF-8 support
 * for bundling Thai filenames cleanly for Google Drive / Windows / macOS archive extraction.
 */

export interface ZipFileEntry {
  path: string;
  data: Uint8Array;
  modifiedAt?: Date;
}

const textEncoder = new TextEncoder();

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

/**
 * Computes IEEE 802.3 CRC-32 checksum over a byte array.
 */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Sanitizes a single folder or filename segment for Windows, macOS, and Google Drive.
 */
export function sanitizeZipSegment(input: string, maxLen = 80): string {
  const cleaned = String(input ?? "")
    .replace(/[\x00-\x1f<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+|[._]+$/g, "");

  if (!cleaned) return "untitled";
  if (cleaned.length <= maxLen) return cleaned;

  const dotIdx = cleaned.lastIndexOf(".");
  if (dotIdx > 0 && cleaned.length - dotIdx <= 8) {
    const ext = cleaned.slice(dotIdx);
    const stem = cleaned.slice(0, Math.max(1, maxLen - ext.length)).replace(/[._]+$/g, "");
    return `${stem || "file"}${ext}`;
  }
  return cleaned.slice(0, maxLen).replace(/[._]+$/g, "") || "untitled";
}

function toDosTimeDate(date: Date): { time: number; dosDate: number } {
  const year = Math.min(2107, Math.max(1980, date.getFullYear()));
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const time = ((hours & 0x1f) << 11) | ((minutes & 0x3f) << 5) | (seconds & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9) | ((month & 0x0f) << 5) | (day & 0x1f);
  return { time, dosDate };
}

function makeUniqueEntryPath(rawPath: string, usedLower: Set<string>): string {
  const normalized = rawPath
    .split("/")
    .map((seg) => seg.trim())
    .filter(Boolean)
    .join("/");

  const basePath = normalized || "file";
  if (!usedLower.has(basePath.toLowerCase())) {
    usedLower.add(basePath.toLowerCase());
    return basePath;
  }

  const slashIdx = basePath.lastIndexOf("/");
  const dir = slashIdx >= 0 ? basePath.slice(0, slashIdx + 1) : "";
  const fileName = slashIdx >= 0 ? basePath.slice(slashIdx + 1) : basePath;
  const dotIdx = fileName.lastIndexOf(".");
  const stem = dotIdx > 0 ? fileName.slice(0, dotIdx) : fileName;
  const ext = dotIdx > 0 ? fileName.slice(dotIdx) : "";

  let counter = 2;
  while (true) {
    const candidate = `${dir}${stem}_${counter}${ext}`;
    if (!usedLower.has(candidate.toLowerCase())) {
      usedLower.add(candidate.toLowerCase());
      return candidate;
    }
    counter++;
  }
}

/**
 * Bundles file entries into a valid PKZIP archive (`Uint8Array`) with UTF-8 filenames.
 */
export function buildZipUint8Array(entries: ZipFileEntry[]): Uint8Array {
  const usedPathsLower = new Set<string>();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const safePath = makeUniqueEntryPath(entry.path, usedPathsLower);
    const nameBytes = textEncoder.encode(safePath);
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const fileCrc = crc32(data);
    const { time, dosDate } = toDosTimeDate(entry.modifiedAt ?? new Date());

    // Local File Header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const ldv = new DataView(localHeader.buffer);
    ldv.setUint32(0, 0x04034b50, true); // Local file header signature
    ldv.setUint16(4, 20, true); // Version needed to extract (2.0)
    ldv.setUint16(6, 0x0800, true); // UTF-8 filename encoding flag (bit 11)
    ldv.setUint16(8, 0, true); // Compression method 0 (Store)
    ldv.setUint16(10, time, true);
    ldv.setUint16(12, dosDate, true);
    ldv.setUint32(14, fileCrc, true);
    ldv.setUint32(18, data.length, true);
    ldv.setUint32(22, data.length, true);
    ldv.setUint16(26, nameBytes.length, true);
    ldv.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    // Central Directory Header (46 bytes + name)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(centralHeader.buffer);
    cdv.setUint32(0, 0x02014b50, true); // Central file header signature
    cdv.setUint16(4, 20, true); // Version made by
    cdv.setUint16(6, 20, true); // Version needed
    cdv.setUint16(8, 0x0800, true); // UTF-8 flag
    cdv.setUint16(10, 0, true); // Store
    cdv.setUint16(12, time, true);
    cdv.setUint16(14, dosDate, true);
    cdv.setUint32(16, fileCrc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true); // Extra length
    cdv.setUint16(32, 0, true); // Comment length
    cdv.setUint16(34, 0, true); // Disk number start
    cdv.setUint16(36, 0, true); // Internal attrs
    cdv.setUint32(38, 0, true); // External attrs
    cdv.setUint32(42, offset, true); // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  let centralSize = 0;
  for (const part of centralParts) {
    centralSize += part.length;
  }

  // End of Central Directory (22 bytes)
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, offset, true);
  edv.setUint16(20, 0, true);

  const totalLength = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalLength);
  let cursor = 0;
  for (const part of localParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  out.set(eocd, cursor);

  return out;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a UTF-8 with BOM CSV summary of archived applicants for Excel & Google Sheets.
 */
export function buildApplicantArchiveCsv(
  rows: Array<{
    ref: string;
    name: string;
    idCard: string;
    affiliation: string;
    position: string;
    phone: string;
    email: string;
    status: string;
    submittedAt: string;
    fileCount: number;
  }>
): Uint8Array {
  const header = [
    "รหัสอ้างอิง",
    "ชื่อ-นามสกุล",
    "เลขบัตรประชาชน",
    "สังกัด/สมาคม",
    "ตำแหน่ง",
    "โทรศัพท์",
    "อีเมล",
    "สถานะ",
    "วันที่สมัคร",
    "จำนวนไฟล์ที่แนบ",
  ];
  const lines = [header.map(escapeCsvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.ref,
        r.name,
        r.idCard,
        r.affiliation,
        r.position,
        r.phone,
        r.email,
        r.status,
        r.submittedAt,
        r.fileCount,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }
  return textEncoder.encode(`\uFEFF${lines.join("\r\n")}`);
}
