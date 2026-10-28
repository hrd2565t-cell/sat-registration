import Link from "next/link";
import { Header } from "@/components/layout/header";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F9FA]">
      <Header />

      <main className="mx-auto flex w-full max-w-[600px] flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#eff6ff] text-4xl shadow-sm">
          🔍
        </div>

        <h1 className="mt-5 text-[24px] font-bold text-[#16265E] sm:text-[28px]">
          ไม่พบหน้าที่ท่านต้องการ (404)
        </h1>

        <p className="mt-2 text-[13px] leading-relaxed text-[#4b5563]">
          หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบ หรือคุณอาจพิมพ์ที่อยู่เว็บไซต์ผิด
          กรุณาตรวจสอบลิงก์อีกครั้งหรือกลับไปยังหน้าหลัก
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-[5px] bg-[#16265E] px-4 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-[#1e3a8a]"
          >
            🏠 กลับหน้าหลัก
          </Link>
          <Link
            href="/status"
            className="inline-flex h-9 items-center justify-center rounded-[5px] border border-[#d1d5db] bg-white px-4 text-[12.5px] font-medium text-[#374151] shadow-2xs transition hover:bg-[#f8fafc]"
          >
            📋 ตรวจสอบสถานะการสมัคร
          </Link>
          <Link
            href="/timeline"
            className="inline-flex h-9 items-center justify-center rounded-[5px] border border-[#d1d5db] bg-white px-4 text-[12.5px] font-medium text-[#374151] shadow-2xs transition hover:bg-[#f8fafc]"
          >
            📅 ดูปฏิทินอบรม (Timeline)
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#e5e7eb] bg-white py-4 text-center text-[11px] text-[#6b7280]">
        ระบบรับสมัครผู้เข้ารับการอบรม • การกีฬาแห่งประเทศไทย (กกท.)
      </footer>
    </div>
  );
}
