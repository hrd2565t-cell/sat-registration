"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsAdmin } from "@/lib/admin-auth";
import { AdminNavButton } from "@/components/layout/admin-nav-button";

interface AppHeaderNavProps {
  page?: "home" | "courses" | "alumni" | "survey" | "status" | "verify" | "timeline";
  extraButtons?: React.ReactNode;
}

export function AppHeaderNav({ page, extraButtons }: AppHeaderNavProps) {
  const isAdmin = useIsAdmin();
  const pathname = usePathname();

  // ================= ADMIN LOGGED IN =================
  // Display the complete full menu suite like before, so admins can navigate freely
  if (isAdmin) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <Link
          href="/"
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            pathname === "/"
              ? "bg-[#16265E] text-white shadow-xs"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
          title="หน้าแรก (ศูนย์รวมบริการ)"
        >
          🏠 หน้าแรก
        </Link>

        <Link
          href="/courses"
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            pathname === "/courses"
              ? "bg-[#16265E] text-white shadow-xs"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
          title="รายการหลักสูตรที่เปิดรับสมัคร"
        >
          📝 หลักสูตร
        </Link>

        <Link
          href="/alumni"
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            pathname === "/alumni"
              ? "bg-[#16265E] text-white shadow-xs"
              : "border border-blue-200 bg-blue-50/70 text-[#16265E] hover:bg-blue-100"
          }`}
          title="ทำเนียบผู้ผ่านการอบรม และประเมินผลโครงการ"
        >
          🏅 ทำเนียบ & ประเมินผล
        </Link>

        <Link
          href="/survey"
          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
            pathname === "/survey"
              ? "bg-amber-500 text-slate-950 shadow-xs"
              : "border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          }`}
          title="สำรวจและโหวตหลักสูตรอนาคต"
        >
          🗳️ โหวตหลักสูตร
        </Link>

        <Link
          href="/verify"
          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors shadow-xs flex items-center gap-1 ${
            pathname === "/verify"
              ? "bg-emerald-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
          title="เปิดกล้องสแกน QR Code ตรวจสอบคุณวุฒิและบัตรบุคลากรหน้างาน"
        >
          <span>📷</span>
          <span className="hidden md:inline">สแกนหน้างาน</span>
        </Link>

        <Link
          href="/status"
          className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            pathname === "/status"
              ? "bg-[#0b3c92] text-white shadow-xs"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
          title="ตรวจสอบสถานะการสมัคร"
        >
          ตรวจสถานะ
        </Link>

        {extraButtons}

        <AdminNavButton />
      </div>
    );
  }

  // ================= NORMAL PUBLIC VISITOR (NOT ADMIN) =================
  // Display only the exact minimal buttons specified by the user
  return (
    <div className="flex items-center gap-2">
      {page === "home" && (
        <>
          <Link
            href="/verify"
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5"
            title="เปิดกล้องสแกน QR Code ตรวจสอบคุณวุฒิและบัตรบุคลากรหน้างาน"
          >
            <span>📷</span>
            <span className="hidden sm:inline">สแกนบัตรหน้างาน</span>
          </Link>
          <AdminNavButton />
        </>
      )}

      {page === "courses" && (
        <>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            กลับสู่หน้าแรก
          </Link>
          <Link
            href="/status"
            className="whitespace-nowrap rounded-lg border border-[#d1d5db] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#374151] transition-colors hover:bg-[#f8fafc]"
          >
            ตรวจสอบสถานะ
          </Link>
          <AdminNavButton />
        </>
      )}

      {page === "alumni" && (
        <>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            กลับสู่หน้าแรก
          </Link>
          <AdminNavButton />
        </>
      )}

      {page === "survey" && (
        <>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            กลับสู่หน้าแรก
          </Link>
          {extraButtons}
        </>
      )}

      {(page === "status" || page === "verify" || page === "timeline") && (
        <>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            กลับสู่หน้าแรก
          </Link>
          <AdminNavButton />
        </>
      )}
    </div>
  );
}
