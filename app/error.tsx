"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service if needed
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F9FA]">
      <Header />

      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fee2e2] text-3xl shadow-sm">
          ⚠️
        </div>

        <h1 className="mt-4 text-[22px] font-bold text-[#111827] sm:text-[24px]">
          เกิดข้อผิดพลาดในการโหลดข้อมูล
        </h1>

        <p className="mt-2 text-[12.5px] leading-relaxed text-[#6b7280]">
          ระบบพบข้อขัดข้องชั่วคราวในการประมวลผล กรุณากดลองใหม่อีกครั้ง หรือกลับไปยังหน้าหลัก
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-9 items-center justify-center rounded-[5px] bg-[#16265E] px-4 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-[#1e3a8a]"
          >
            🔄 ลองใหม่อีกครั้ง
          </button>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-[5px] border border-[#d1d5db] bg-white px-4 text-[12.5px] font-medium text-[#374151] shadow-2xs transition hover:bg-[#f8fafc]"
          >
            🏠 กลับหน้าหลัก
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#e5e7eb] bg-white py-4 text-center text-[11px] text-[#6b7280]">
        ระบบรับสมัครผู้เข้ารับการอบรม • การกีฬาแห่งประเทศไทย (กกท.)
      </footer>
    </div>
  );
}
