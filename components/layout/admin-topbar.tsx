"use client";

import Link from "next/link";
import { logoutAdmin } from "@/lib/admin-auth";

interface AdminTopbarProps {
  title: string;
  userName: string;
  onMenuClick: () => void;
}

export function AdminTopbar({
  title,
  userName,
  onMenuClick,
}: AdminTopbarProps) {
  const handleLogout = () => {
    logoutAdmin();
    window.location.href = "/admin/login";
  };
  return (
    <header className="sticky top-0 z-30 flex h-10 items-center justify-between gap-3 border-b border-[#e5e7eb] bg-white px-3 lg:pl-6 lg:pr-5 print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="เปิดเมนู"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#4b5563] transition-colors hover:bg-[#f3f4f6] lg:hidden"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeWidth="1.8"
              d="M3 5h14M3 10h14M3 15h14"
            />
          </svg>
        </button>
        <h1 className="truncate text-[12.5px] font-semibold leading-tight text-[#111827] sm:text-[14px]">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-[4px] border border-[#d1d5db] bg-white px-2 text-[10.5px] font-medium text-[#374151] shadow-xs transition-colors hover:bg-[#f9fafb] hover:text-[#111827]"
          title="เปิดดูหน้าเว็บรับสมัครในมุมมองผู้สมัคร"
        >
          <svg className="h-3 w-3 text-[#4b5563]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="hidden sm:inline">ดูหน้าเว็บผู้สมัคร</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <svg
            className="h-3.5 w-3.5 shrink-0 text-[#4b5563]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9.5" strokeWidth="1.8" />
            <circle cx="12" cy="9.5" r="2.8" strokeWidth="1.8" />
            <path
              strokeLinecap="round"
              strokeWidth="1.8"
              d="M6.8 18.2c.8-2.3 2.7-3.5 5.2-3.5s4.4 1.2 5.2 3.5"
            />
          </svg>
          <span className="hidden whitespace-nowrap text-[10.5px] font-medium text-[#111827] sm:inline">
            {userName}
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-5 items-center whitespace-nowrap rounded-[4px] bg-[#E2E6EC] px-2.5 text-[9.5px] font-medium text-[#111827] transition-colors hover:bg-[#d5dae2]"
        >
          ออกจากระบบ
        </button>
      </div>
    </header>
  );
}
