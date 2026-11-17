"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { resolveSupabaseDocumentUrl } from "@/lib/supabase/sync";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string | null;
  courseId?: number;
  title: string;
  subtitle?: string;
  fileName?: string;
  fileSize?: string;
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  courseId,
  title,
  subtitle,
  fileName,
  fileSize,
}: PdfPreviewModalProps) {
  const [resolvedBlobUrl, setResolvedBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // คำนวณ URL ที่ปลอดภัยที่สุดสำหรับเปิดดูเอกสาร PDF
  const targetUrl = useMemo(() => {
    if (courseId) {
      return `/api/announcements/${courseId}`;
    }
    if (pdfUrl) {
      if (pdfUrl.includes("/sat-documents/")) {
        // หากเป็น Supabase URL ชี้ไปยัง Private bucket ให้ใช้ผ่าน API หรือ resolve
        const match = pdfUrl.match(/course-(\d+)-/);
        if (match?.[1]) {
          return `/api/announcements/${match[1]}`;
        }
      }
      return pdfUrl;
    }
    return null;
  }, [courseId, pdfUrl]);

  // URL สำหรับปุ่มดาวน์โหลดไฟล์จริง
  const downloadUrl = useMemo(() => {
    if (courseId) {
      return `/api/announcements/${courseId}?download=1`;
    }
    if (targetUrl?.startsWith("/api/announcements/")) {
      return `${targetUrl}?download=1`;
    }
    return resolvedBlobUrl || targetUrl || "#";
  }, [courseId, targetUrl, resolvedBlobUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // จัดการ resolve URL กรณีเป็น private Supabase Storage URL โดยตรง
  useEffect(() => {
    let isMounted = true;

    if (!isOpen || !targetUrl) {
      setResolvedBlobUrl(null);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    // กรณีเป็น API route ภายใน หรือ data: / blob: ให้ใช้ได้ทันที
    if (
      targetUrl.startsWith("/") ||
      targetUrl.startsWith("data:") ||
      targetUrl.startsWith("blob:")
    ) {
      setResolvedBlobUrl(targetUrl);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    // กรณีเป็น external Supabase URL ที่มี /sat-documents/
    if (targetUrl.includes("/sat-documents/")) {
      setIsLoading(true);
      setLoadError(null);
      (async () => {
        try {
          const resolved = await resolveSupabaseDocumentUrl(targetUrl);
          if (!isMounted) return;
          if (resolved) {
            setResolvedBlobUrl(resolved);
          } else {
            setResolvedBlobUrl(targetUrl);
          }
        } catch (err) {
          if (isMounted) {
            console.warn("Failed to resolve PDF url:", err);
            setLoadError("ไม่สามารถเชื่อมต่อไฟล์ในพื้นที่จัดเก็บได้");
          }
        } finally {
          if (isMounted) setIsLoading(false);
        }
      })();
      return;
    }

    setResolvedBlobUrl(targetUrl);
    setIsLoading(false);

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUrl]);

  // ล้าง Object URL เมื่อปิดหน้าต่าง เพื่อป้องกัน Memory Leak
  useEffect(() => {
    return () => {
      if (resolvedBlobUrl && resolvedBlobUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(resolvedBlobUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [resolvedBlobUrl]);

  if (!isOpen) return null;

  const displayPdfUrl = resolvedBlobUrl || targetUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex h-[94vh] w-full max-w-[1140px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-[#16265E] px-4 py-3 sm:px-6 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white p-0.5">
              <Image
                src="/assets/logo-sat-header.png"
                alt="ตราสัญลักษณ์ กกท."
                width={40}
                height={40}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold sm:text-base text-white leading-tight line-clamp-1">
                {title}
              </h3>
              <p className="text-[11px] text-blue-200 font-light">
                {subtitle || "กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย"}
                {fileName && ` · ${fileName}`}
                {fileSize && ` (${fileSize})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={fileName || "announcement.pdf"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 cursor-pointer"
              title="ดาวน์โหลดไฟล์ PDF เก็บไว้เป็นหลักฐาน"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>ดาวน์โหลด PDF</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95 cursor-pointer"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="relative flex-1 bg-gray-100 p-1 sm:p-2 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center bg-white rounded-lg border border-gray-300">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-[#16265E]" />
              <p className="text-sm font-semibold text-[#16265E]">
                กำลังโหลดเอกสารประกาศทางการ (PDF)...
              </p>
              <p className="text-xs text-gray-500">
                ระบบกำลังดึงข้อมูลต้นฉบับจากคลังเอกสาร กกท.
              </p>
            </div>
          ) : loadError ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-gray-300">
              <span className="text-3xl">⚠️</span>
              <p className="mt-2 text-sm font-bold text-rose-700">{loadError}</p>
              <a
                href={downloadUrl}
                download={fileName || "announcement.pdf"}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a]"
              >
                ลองดาวน์โหลดไฟล์ PDF โดยตรง
              </a>
            </div>
          ) : displayPdfUrl ? (
            <object
              data={displayPdfUrl}
              type="application/pdf"
              className="h-full w-full rounded-lg border border-gray-300 bg-white shadow-inner"
            >
              <iframe
                src={displayPdfUrl}
                title={title}
                className="h-full w-full rounded-lg border-0 bg-white"
              >
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <p className="text-sm font-semibold text-gray-700">
                    เบราว์เซอร์ไม่รองรับการแสดงผลไฟล์ PDF โดยตรงในหน้านี้
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <a
                      href={displayPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a]"
                    >
                      คลิกเพื่อเปิดเอกสารในแท็บใหม่
                    </a>
                    <a
                      href={downloadUrl}
                      download={fileName || "announcement.pdf"}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
                    >
                      ดาวน์โหลด PDF
                    </a>
                  </div>
                </div>
              </iframe>
            </object>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center bg-white rounded-lg">
              <p className="text-sm text-gray-500">ไม่พบลิงก์เอกสาร PDF</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
