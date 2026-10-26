"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type {
  ApplicantDocument,
  ApplicantRecord,
} from "@/lib/applications-store";
import { getDocumentLabel } from "@/lib/applications-store";
import { getDocumentFromStorage } from "@/lib/document-storage";

export function DocumentPreviewDialog({
  file,
  applicant,
  onClose,
}: {
  file: ApplicantDocument | null;
  applicant: ApplicantRecord;
  onClose: () => void;
}) {
  const [actualDataUrl, setActualDataUrl] = useState<string | null>(file?.dataUrl ?? null);
  const [loading, setLoading] = useState<boolean>(!file?.dataUrl);

  useEffect(() => {
    if (!file) return;

    let isMounted = true;
    if (file.dataUrl) {
      setActualDataUrl(file.dataUrl);
      setLoading(false);
    } else {
      setLoading(true);
      getDocumentFromStorage(file.id).then((rec) => {
        if (isMounted) {
          setActualDataUrl(rec?.dataUrl ?? null);
          setLoading(false);
        }
      });
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      isMounted = false;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [file, onClose]);

  if (!file) return null;

  const label = getDocumentLabel(file.kind);
  const isPdf =
    file.name.toLowerCase().endsWith(".pdf") ||
    actualDataUrl?.startsWith("data:application/pdf");
  const isImage =
    !isPdf &&
    (file.kind === "photo" ||
      actualDataUrl?.startsWith("data:image/") ||
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name));

  const hasRealFile = Boolean(actualDataUrl);

  const handleOpenNewTab = () => {
    if (!actualDataUrl) return;
    const win = window.open();
    if (win) {
      if (isPdf) {
        win.document.write(
          `<iframe src="${actualDataUrl}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      } else {
        win.document.write(
          `<body style="margin:0; background:#0f172a; display:flex; align-items:center; justify-content:center;"><img src="${actualDataUrl}" style="max-width:100%; max-height:100vh; object-contain:contain;" /></body>`
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="ปิดตัวอย่างเอกสาร"
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-dialog-title"
        className="relative flex max-h-[94vh] w-full max-w-[800px] flex-col overflow-hidden rounded-xl border border-[#dbe2ea] bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                id="document-dialog-title"
                className="truncate text-[14px] font-semibold text-[#111827]"
              >
                {label}
              </h2>
              {hasRealFile ? (
                <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-medium text-[#15803d]">
                  ไฟล์จริง
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-medium text-[#b45309]">
                  เอกสารตัวอย่าง
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-[#6b7280]">
              {file.name} · {file.size} · ผู้สมัคร: {applicant.name} ({applicant.ref})
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {hasRealFile && (
              <>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  title="เปิดในแท็บใหม่"
                  className="hidden h-8 items-center gap-1 rounded-[5px] border border-[#d1d5db] bg-white px-2.5 text-[11px] font-medium text-[#374151] transition hover:bg-[#f8fafc] sm:inline-flex"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M11 3h6m0 0v6m0-6L9 11m-1-7H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-3" />
                  </svg>
                  <span>เปิดแท็บใหม่</span>
                </button>
                <a
                  href={actualDataUrl!}
                  download={file.name}
                  title="ดาวน์โหลดไฟล์"
                  className="inline-flex h-8 items-center gap-1 rounded-[5px] bg-[#1e3a8a] px-3 text-[11px] font-semibold text-white transition hover:bg-[#1e40af]"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16v1a2 2 0 002 2h8a2 2 0 002-2v-1M10 3v10m0 0l-3-3m3 3l3-3" />
                  </svg>
                  <span>ดาวน์โหลด</span>
                </a>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#4b5563] transition-colors hover:bg-[#f3f4f6]"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeWidth="1.8" d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#eef2f6] p-3 sm:p-5">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a8a] border-t-transparent" />
                <p className="text-[11px] text-[#6b7280]">กำลังโหลดเอกสาร...</p>
              </div>
            </div>
          ) : hasRealFile ? (
            <div className="flex min-h-[440px] items-center justify-center">
              {isPdf ? (
                <iframe
                  src={actualDataUrl!}
                  title={file.name}
                  className="h-[580px] w-full rounded-lg border border-[#cbd5e1] bg-white shadow-sm"
                />
              ) : isImage ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={actualDataUrl!}
                    alt={file.name}
                    className="max-h-[540px] max-w-full rounded-lg border border-[#cbd5e1] bg-white object-contain shadow-md"
                  />
                  <p className="text-[11px] text-[#6b7280]">
                    {file.name} · ขนาด {file.size}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-8 text-center shadow-sm">
                  <p className="text-[13px] font-semibold text-[#111827]">
                    เอกสารประเภท {file.type || "ไฟล์แนบ"}
                  </p>
                  <p className="text-[11px] text-[#6b7280]">
                    คลิกปุ่มดาวน์โหลดด้านบนเพื่อเปิดดูไฟล์นี้
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Fallback: Template sample for demo seed records */
            <div className="mx-auto min-h-[440px] w-full max-w-[540px] bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.12)] sm:p-8">
              <div className="flex items-start justify-between gap-4 border-b border-[#d1d5db] pb-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-wide text-[#1e3a8a]">
                    สถาบันพัฒนากีฬาแห่งประเทศไทย
                  </p>
                  <p className="mt-1 text-[8px] text-[#6b7280]">
                    เอกสารประกอบการสมัครเข้ารับการฝึกอบรม (ตัวอย่างจำลอง)
                  </p>
                </div>
                <Image
                  src="/assets/sat-logo-sidebar.png"
                  alt=""
                  width={28}
                  height={34}
                  className="h-auto w-7 opacity-80"
                  aria-hidden="true"
                />
              </div>

              {file.kind === "photo" ? (
                <div className="mt-7 flex flex-col items-center">
                  <Image
                    src="/assets/applicant-photo.png"
                    alt={`รูปถ่าย ${applicant.name}`}
                    width={144}
                    height={176}
                    className="h-[176px] w-[144px] rounded-[3px] border border-[#d1d5db] object-cover"
                  />
                  <p className="mt-3 text-[11px] font-medium text-[#111827]">
                    {applicant.name}
                  </p>
                  <p className="mt-0.5 text-[9px] text-[#6b7280]">
                    รูปถ่ายหน้าตรงสำหรับบัตรประจำตัว
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <h3 className="text-center text-[13px] font-semibold text-[#111827]">
                    {label}
                  </h3>
                  <div className="mx-auto mt-6 max-w-[390px] space-y-2">
                    <p className="text-[10px] leading-relaxed text-[#374151]">
                      เอกสารฉบับนี้รับรองว่า{" "}
                      <span className="font-semibold text-[#111827]">
                        {applicant.name}
                      </span>{" "}
                      สังกัด {applicant.affiliation} ตำแหน่ง {applicant.position}
                    </p>
                    <p className="text-[10px] leading-relaxed text-[#374151]">
                      มีความประสงค์สมัครเข้ารับการฝึกอบรมหลักสูตร{" "}
                      <span className="font-semibold text-[#111827]">
                        {applicant.courseTitle}
                      </span>{" "}
                      และได้แนบเอกสารประกอบการสมัครครบถ้วน
                    </p>
                    <div className="mt-8 space-y-2 text-[9px] text-[#6b7280]">
                      <p>เลขที่อ้างอิง: {applicant.ref}</p>
                      <p>เลขบัตรประชาชน: {applicant.idCard}</p>
                      <p>วันที่ยื่นเอกสาร: {applicant.submittedAt.slice(0, 10)}</p>
                    </div>
                    <div className="flex justify-end pt-10">
                      <div className="text-center">
                        <div className="h-10 w-36 border-b border-[#9ca3af]" />
                        <p className="mt-2 text-[9px] text-[#4b5563]">
                          ผู้มีอำนาจลงนาม
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#e5e7eb] px-4 py-2.5 sm:px-6">
          <span className="text-[11px] text-[#6b7280]">
            {hasRealFile
              ? "ไฟล์นี้ถูกจัดเก็บในระบบและพร้อมนำไปตรวจสอบ"
              : "ข้อมูลจำลองสำหรับทดสอบระบบ"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center rounded-[5px] border border-[#d1d5db] bg-white px-3.5 text-[11.5px] font-medium text-[#374151] transition-colors hover:bg-[#f8fafc]"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
