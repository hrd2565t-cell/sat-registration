"use client";

import { useEffect } from "react";
import Image from "next/image";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string | null;
  title: string;
  subtitle?: string;
  fileName?: string;
  fileSize?: string;
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  title,
  subtitle,
  fileName,
  fileSize,
}: PdfPreviewModalProps) {
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

  if (!isOpen || !pdfUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex h-[94vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-[#16265E] px-4 py-3 sm:px-6 text-white">
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
              href={pdfUrl}
              download={fileName || "announcement.pdf"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
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
        <div className="relative flex-1 bg-gray-100 p-1 sm:p-2 overflow-hidden">
          <object
            data={pdfUrl}
            type="application/pdf"
            className="h-full w-full rounded-lg border border-gray-300 bg-white shadow-inner"
          >
            <iframe
              src={pdfUrl}
              title={title}
              className="h-full w-full rounded-lg border-0 bg-white"
            >
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <p className="text-sm font-semibold text-gray-700">
                  เบราว์เซอร์ไม่รองรับการแสดงผลไฟล์ PDF โดยตรงในหน้านี้
                </p>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a]"
                >
                  คลิกที่นี่เพื่อเปิดดูเอกสาร PDF ในแท็บใหม่
                </a>
              </div>
            </iframe>
          </object>
        </div>
      </div>
    </div>
  );
}
