"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { refreshApplicationsFromCloud } from "@/lib/applications-store";
import { formatByteSize } from "@/lib/image-compression";
import {
  buildApplicantArchiveCsv,
  buildZipUint8Array,
  sanitizeZipSegment,
  type ZipFileEntry,
} from "@/lib/zip-builder";

interface CourseStorageStat {
  courseId: number;
  courseTitle: string;
  courseStatus: string;
  isHistorical: boolean;
  applicantCount: number;
  activeFileCount: number;
  archivedFileCount: number;
  estimatedBytes: number;
}

interface ArchivePrepareFile {
  docId: string;
  ref: string;
  applicantName: string;
  kind: string;
  name: string;
  size: string;
  downloadUrl?: string;
  inlineDataUrl?: string;
}

interface ArchivePrepareApplicant {
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
}

const KIND_FOLDER_PREFIX: Record<string, string> = {
  photo: "01_รูปถ่าย",
  cover: "02_หนังสือนำส่ง",
  certificate: "03_หนังสือรับรอง",
  idcard: "04_สำเนาบัตรประชาชน",
  saka: "05_ใบสฬ8",
};

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const parts = dataUrl.split(",");
    if (parts.length < 2) return null;
    const binStr = atob(parts[1]);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export function CourseArchiveManager() {
  const [loadingStats, setLoadingStats] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [courses, setCourses] = useState<CourseStorageStat[]>([]);
  const [totalEstimatedBytes, setTotalEstimatedBytes] = useState(0);
  const [totalActiveFiles, setTotalActiveFiles] = useState(0);
  const [freeQuotaBytes, setFreeQuotaBytes] = useState(1024 * 1024 * 1024);

  const [downloadingCourseId, setDownloadingCourseId] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [downloadedCourseIds, setDownloadedCourseIds] = useState<Record<number, boolean>>({});

  const [purgeTarget, setPurgeTarget] = useState<CourseStorageStat | null>(null);
  const [purgeConfirmed, setPurgeConfirmed] = useState(false);
  const [purging, setPurging] = useState(false);
  const [actionNotice, setActionNotice] = useState<{
    tone: "success" | "warn" | "error";
    text: string;
  } | null>(null);

  const busyRef = useRef(false);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError("");
    try {
      const res = await fetch("/api/admin/archive-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stats" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        offline?: boolean;
        error?: string;
        courses?: CourseStorageStat[];
        totalEstimatedBytes?: number;
        totalActiveFiles?: number;
        freeQuotaBytes?: number;
      };
      if (res.status === 503 || data.offline) {
        setOfflineMode(true);
        setLoadingStats(false);
        return;
      }
      if (!res.ok || !data.ok) {
        setStatsError(data.error || "ไม่สามารถโหลดข้อมูลพื้นที่จัดเก็บได้");
        return;
      }
      setOfflineMode(false);
      setCourses(data.courses || []);
      setTotalEstimatedBytes(data.totalEstimatedBytes || 0);
      setTotalActiveFiles(data.totalActiveFiles || 0);
      if (data.freeQuotaBytes) setFreeQuotaBytes(data.freeQuotaBytes);
    } catch {
      setStatsError("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อตรวจสอบพื้นที่จัดเก็บ");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleDownloadCourseZip = async (course: CourseStorageStat) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setDownloadingCourseId(course.courseId);
    setDownloadProgress(null);
    setActionNotice(null);

    try {
      const res = await fetch("/api/admin/archive-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare", courseId: course.courseId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        courseTitle?: string;
        applicants?: ArchivePrepareApplicant[];
        files?: ArchivePrepareFile[];
      };

      if (!res.ok || !data.ok) {
        setActionNotice({
          tone: "error",
          text: data.error || "ไม่สามารถเตรียมรายการไฟล์สำหรับดาวน์โหลดได้",
        });
        return;
      }

      const applicants = data.applicants || [];
      const files = data.files || [];
      if (applicants.length === 0) {
        setActionNotice({
          tone: "warn",
          text: "ยังไม่มีใบสมัครในหลักสูตรนี้",
        });
        return;
      }

      const rootFolder = sanitizeZipSegment(
        `หลักสูตร_${course.courseId}_${data.courseTitle || course.courseTitle}`,
        55
      );
      const zipEntries: ZipFileEntry[] = [
        {
          path: `${rootFolder}/00_รายชื่อผู้สมัครและสรุปไฟล์.csv`,
          data: buildApplicantArchiveCsv(applicants),
        },
      ];

      let completedFiles = 0;
      let successFiles = 0;
      const failedNotes: string[] = [];
      setDownloadProgress({ done: 0, total: files.length });

      for (let i = 0; i < files.length; i += 4) {
        const batch = files.slice(i, i + 4);
        await Promise.all(
          batch.map(async (f) => {
            try {
              let fileBytes: Uint8Array | null = null;
              if (f.downloadUrl) {
                const fileRes = await fetch(f.downloadUrl);
                if (fileRes.ok) {
                  const buf = await fileRes.arrayBuffer();
                  fileBytes = new Uint8Array(buf);
                }
              } else if (f.inlineDataUrl) {
                fileBytes = dataUrlToUint8Array(f.inlineDataUrl);
              }

              if (fileBytes && fileBytes.length > 0) {
                const appFolder = sanitizeZipSegment(`${f.ref}_${f.applicantName}`, 60);
                const prefix = KIND_FOLDER_PREFIX[f.kind] || "99_เอกสารอื่นๆ";
                const safeFileName = sanitizeZipSegment(f.name, 70);
                zipEntries.push({
                  path: `${rootFolder}/${appFolder}/${prefix}_${safeFileName}`,
                  data: fileBytes,
                });
                successFiles++;
              } else {
                failedNotes.push(`${f.ref} (${f.applicantName}) - ${f.name}`);
              }
            } catch {
              failedNotes.push(`${f.ref} (${f.applicantName}) - ${f.name}`);
            } finally {
              completedFiles++;
              setDownloadProgress({ done: completedFiles, total: files.length });
            }
          })
        );
      }

      if (files.length > 0 && successFiles === 0) {
        setActionNotice({
          tone: "error",
          text: "ไม่สามารถดาวน์โหลดไฟล์จริงจากระบบได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง (ยังไม่ควรล้างพื้นที่)",
        });
        return;
      }

      if (failedNotes.length > 0) {
        const encoder = new TextEncoder();
        zipEntries.push({
          path: `${rootFolder}/00_รายการไฟล์ที่ดึงไม่สำเร็จ.txt`,
          data: encoder.encode(
            `รายการไฟล์ที่ไม่สามารถดึงข้อมูลได้ (${failedNotes.length} รายการ):\r\n${failedNotes.join("\r\n")}`
          ),
        });
      }

      const zipBytes = buildZipUint8Array(zipEntries);
      const zipBuffer = new ArrayBuffer(zipBytes.byteLength);
      new Uint8Array(zipBuffer).set(zipBytes);
      const blob = new Blob([zipBuffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `SAT_Archive_Course${course.courseId}_${dateStr}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setDownloadedCourseIds((prev) => ({ ...prev, [course.courseId]: true }));
      setActionNotice(
        failedNotes.length > 0
          ? {
              tone: "warn",
              text: `ดาวน์โหลดไฟล์ ZIP แล้ว (${successFiles}/${files.length} ไฟล์) มี ${failedNotes.length} ไฟล์ที่ไม่สามารถดึงได้ (ดูรายละเอียดในไฟล์ .txt ภายใน ZIP) — แนะนำอัปโหลดขึ้น Google Drive ก่อนกดล้างพื้นที่`,
            }
          : {
              tone: "success",
              text: `ดาวน์โหลดชุดเอกสาร ZIP สำเร็จ (${applicants.length} ผู้สมัคร · ${successFiles} ไฟล์) พร้อมสำหรับอัปโหลดขึ้น Google Drive ของกองฯ แล้วครับ`,
            }
      );
    } catch {
      setActionNotice({
        tone: "error",
        text: "เกิดข้อผิดพลาดระหว่างสร้างไฟล์ ZIP กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      busyRef.current = false;
      setDownloadingCourseId(null);
      setDownloadProgress(null);
    }
  };

  const handleConfirmPurge = async () => {
    if (!purgeTarget || !purgeConfirmed || busyRef.current) return;
    busyRef.current = true;
    setPurging(true);
    setActionNotice(null);

    try {
      const res = await fetch("/api/admin/archive-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "purge",
          courseId: purgeTarget.courseId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        purgedRowCount?: number;
        deletedStorageFiles?: number;
        skippedSharedFiles?: number;
      };

      if (!res.ok || !data.ok) {
        setActionNotice({
          tone: "error",
          text: data.error || "ไม่สามารถล้างไฟล์แนบของหลักสูตรนี้ได้",
        });
        return;
      }

      setPurgeTarget(null);
      setPurgeConfirmed(false);
      await refreshApplicationsFromCloud();
      await loadStats();

      setActionNotice({
        tone: "success",
        text: `คืนพื้นที่สำเร็จ: เคลียร์รายการเอกสาร ${data.purgedRowCount ?? 0} รายการ · ลบไฟล์จริงใน Storage ${data.deletedStorageFiles ?? 0} ไฟล์${
          (data.skippedSharedFiles ?? 0) > 0
            ? ` (เก็บรักษาไฟล์ที่ใช้ร่วมกับหลักสูตรอื่นไว้อัตโนมัติ ${data.skippedSharedFiles} ไฟล์)`
            : ""
        }`,
      });
    } catch {
      setActionNotice({
        tone: "error",
        text: "เกิดข้อผิดพลาดในการเชื่อมต่อระหว่างคืนพื้นที่ Storage",
      });
    } finally {
      busyRef.current = false;
      setPurging(false);
    }
  };

  const usagePercent = Math.min(
    100,
    Math.round((totalEstimatedBytes / Math.max(1, freeQuotaBytes)) * 100)
  );
  const meterBarColor =
    usagePercent >= 85
      ? "bg-[#dc2626]"
      : usagePercent >= 65
        ? "bg-[#d97706]"
        : "bg-[#059669]";

  return (
    <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold text-[#111827]">
            คลังเอกสารหลักสูตร (สำรองขึ้น Google Drive & คืนพื้นที่ Supabase)
          </h2>
          <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#6b7280]">
            ดาวน์โหลดเอกสารทั้งหลักสูตรเป็นไฟล์ ZIP เพื่อเก็บถาวรบน Google Drive แล้วจึงล้างไฟล์แนบออกจาก Supabase เมื่อจบโครงการ (รายชื่อและทำเนียบบุคลากรจะยังอยู่ครบ)
          </p>
        </div>
        {!offlineMode && (
          <button
            type="button"
            onClick={() => void loadStats()}
            disabled={loadingStats}
            className="inline-flex h-7 items-center rounded-[5px] border border-[#d1d5db] bg-white px-2.5 text-[10.5px] font-medium text-[#374151] hover:bg-[#f8fafc] disabled:opacity-50"
          >
            {loadingStats ? "กำลังคำนวณ..." : "รีเฟรชข้อมูลพื้นที่"}
          </button>
        )}
      </div>

      {actionNotice && (
        <div
          role="status"
          className={`mt-3 rounded-[5px] border px-3 py-2 text-[11px] leading-relaxed ${
            actionNotice.tone === "success"
              ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
              : actionNotice.tone === "warn"
                ? "border-[#fde68a] bg-[#fffbeb] text-[#92400e]"
                : "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
          }`}
        >
          {actionNotice.text}
        </div>
      )}

      {offlineMode ? (
        <p className="mt-3 rounded-[5px] bg-[#f8fafc] px-3 py-2.5 text-[11px] text-[#6b7280]">
          โหมดออฟไลน์: การสำรองไฟล์ ZIP จาก Cloud และคืนพื้นที่ Storage จะเปิดใช้งานเมื่อเชื่อมต่อ Supabase
        </p>
      ) : statsError ? (
        <p className="mt-3 rounded-[5px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[11px] text-[#991b1b]">
          {statsError}
        </p>
      ) : (
        <>
          {/* Storage Usage Meter */}
          <div className="mt-3 rounded-[6px] border border-[#e5e7eb] bg-[#f8fafc] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-medium text-[#374151]">
                พื้นที่เอกสารใน Supabase Storage (โดยประมาณ)
              </span>
              <span className="font-semibold text-[#111827]">
                {loadingStats
                  ? "กำลังโหลด..."
                  : `${formatByteSize(totalEstimatedBytes)} / 1.0 GB (${usagePercent}%) · ${totalActiveFiles.toLocaleString()} ไฟล์`}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
              <div
                className={`h-full rounded-full transition-all ${meterBarColor}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[#6b7280]">
              * ระบบบีบอัดภาพอัตโนมัติและใช้รูป/สำเนาบัตรเดิมซ้ำข้ามหลักสูตรโดยไม่เพิ่มไฟล์ใน Storage แล้ว
            </p>
          </div>

          {/* Course Archive List */}
          <div className="mt-3 space-y-2">
            {loadingStats && courses.length === 0 ? (
              <div className="h-20 animate-pulse rounded-[6px] bg-[#f1f5f9]" />
            ) : courses.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-[#6b7280]">
                ยังไม่มีข้อมูลหลักสูตรในระบบ
              </p>
            ) : (
              courses.map((c) => {
                const isDownloadingThis = downloadingCourseId === c.courseId;
                const downloadedInSession = Boolean(downloadedCourseIds[c.courseId]);
                return (
                  <div
                    key={c.courseId}
                    className="flex flex-col gap-2.5 rounded-[6px] border border-[#e5e7eb] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[12px] font-semibold text-[#111827]">
                          {c.courseTitle}
                        </span>
                        {c.isHistorical && (
                          <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[9.5px] font-medium text-[#475569]">
                            โครงการย้อนหลัง
                          </span>
                        )}
                        {downloadedInSession && (
                          <span className="rounded bg-[#dcfce7] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#15803d]">
                            ✓ โหลด ZIP แล้ว
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-[#6b7280]">
                        ผู้สมัคร {c.applicantCount} คน · ไฟล์บน Cloud{" "}
                        <strong className="text-[#111827]">
                          {c.activeFileCount} ไฟล์ ({formatByteSize(c.estimatedBytes)})
                        </strong>
                        {c.archivedFileCount > 0
                          ? ` · เก็บถาวรแล้ว ${c.archivedFileCount} รายการ`
                          : ""}
                      </p>
                      {isDownloadingThis && downloadProgress && (
                        <div className="mt-1.5">
                          <div className="flex justify-between text-[10px] text-[#1e3a8a]">
                            <span>กำลังรวมไฟล์ลง ZIP...</span>
                            <span>
                              {downloadProgress.done}/{downloadProgress.total} ไฟล์
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#dbeafe]">
                            <div
                              className="h-full bg-[#1e3a8a] transition-all"
                              style={{
                                width: `${
                                  downloadProgress.total > 0
                                    ? Math.round(
                                        (downloadProgress.done / downloadProgress.total) * 100
                                      )
                                    : 100
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={
                          c.applicantCount === 0 ||
                          c.activeFileCount === 0 ||
                          downloadingCourseId !== null ||
                          purging
                        }
                        onClick={() => void handleDownloadCourseZip(c)}
                        className="inline-flex h-8 items-center gap-1 rounded-[5px] border border-[#1e3a8a] bg-white px-2.5 text-[10.5px] font-semibold text-[#1e3a8a] transition-colors hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span>{isDownloadingThis ? "กำลังสร้าง ZIP..." : "ดาวน์โหลด ZIP (Google Drive)"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={
                          c.activeFileCount === 0 ||
                          downloadingCourseId !== null ||
                          purging
                        }
                        onClick={() => {
                          setPurgeTarget(c);
                          setPurgeConfirmed(false);
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-[5px] border border-[#fca5a5] bg-[#fff5f5] px-2.5 text-[10.5px] font-semibold text-[#b91c1c] transition-colors hover:bg-[#fee2e2] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span>ล้างไฟล์เพื่อคืนพื้นที่</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Confirm Purge Modal */}
      {purgeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-xl">
            <h3 className="text-[14px] font-bold text-[#991b1b]">
              ยืนยันการล้างไฟล์แนบเพื่อคืนพื้นที่ Supabase
            </h3>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#374151]">
              หลักสูตร: <strong>{purgeTarget.courseTitle}</strong>
              <br />
              จำนวนที่จะเคลียร์: <strong>{purgeTarget.activeFileCount} ไฟล์</strong> (ประมาณ{" "}
              {formatByteSize(purgeTarget.estimatedBytes)})
            </p>

            {!downloadedCourseIds[purgeTarget.courseId] && (
              <div className="mt-2.5 rounded-[5px] border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[11px] text-[#92400e]">
                ⚠️ ท่านยังไม่ได้กดดาวน์โหลดไฟล์ ZIP ของหลักสูตรนี้ในรอบนี้ แนะนำให้ดาวน์โหลดและอัปโหลดขึ้น Google Drive ให้เรียบร้อยก่อนล้างไฟล์
              </div>
            )}

            <p className="mt-2.5 rounded-[5px] bg-[#f8fafc] px-3 py-2 text-[10.5px] leading-relaxed text-[#4b5563]">
              • ข้อมูลรายชื่อผู้สมัคร ประวัติการตรวจสอบ และทำเนียบบุคลากรจะ{" "}
              <strong>ยังอยู่ครบ 100%</strong>
              <br />• ไฟล์ที่ถูกใช้ร่วมกับหลักสูตรอื่นที่ยังไม่ล้าง จะถูกเก็บรักษาไว้โดยอัตโนมัติ
            </p>

            <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] text-[#111827]">
              <input
                type="checkbox"
                checked={purgeConfirmed}
                onChange={(e) => setPurgeConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#d1d5db] text-[#b91c1c]"
              />
              <span>
                ข้าพเจ้าได้ดาวน์โหลดไฟล์ ZIP และอัปโหลดสำรองขึ้น Google Drive เรียบร้อยแล้ว
              </span>
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={purging}
                onClick={() => {
                  setPurgeTarget(null);
                  setPurgeConfirmed(false);
                }}
                className="inline-flex h-8 items-center rounded-[5px] border border-[#d1d5db] bg-white px-3.5 text-[11px] font-medium text-[#374151] hover:bg-[#f8fafc] disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!purgeConfirmed || purging}
                onClick={() => void handleConfirmPurge()}
                className="inline-flex h-8 items-center rounded-[5px] bg-[#b91c1c] px-3.5 text-[11px] font-semibold text-white hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {purging ? "กำลังคืนพื้นที่..." : "ยืนยันล้างไฟล์แนบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
