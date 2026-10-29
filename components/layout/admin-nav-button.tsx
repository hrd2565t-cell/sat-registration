"use client";

import Link from "next/link";
import { logoutAdmin, useIsAdmin } from "@/lib/admin-auth";

interface AdminNavButtonProps {
  compact?: boolean;
  variant?: "primary" | "outline" | "light";
}

export function AdminNavButton({
  compact = false,
  variant = "primary",
}: AdminNavButtonProps) {
  const isAdmin = useIsAdmin();

  const sizeClass = compact
    ? "inline-flex h-7 items-center whitespace-nowrap rounded-[4px] px-3 text-[12px] font-medium transition-colors"
    : "inline-flex items-center whitespace-nowrap rounded-md px-4 py-2 text-[13px] font-semibold transition-colors";

  const styleClass =
    variant === "light"
      ? "bg-white text-[#183875] hover:bg-[#f1f5f9]"
      : variant === "outline"
      ? "border border-[#d1d5db] bg-white text-[#1f2937] hover:bg-[#f8fafc]"
      : "bg-[#16265E] text-white hover:bg-[#1e3a8a]";

  if (!isAdmin) {
    return (
      <Link href="/admin" className={`${sizeClass} ${styleClass}`}>
        เข้าสู่ระบบ (Admin)
      </Link>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Link
        href="/admin"
        className={`${sizeClass} ${styleClass}`}
        title="ไปยังหน้าจัดการระบบ (Admin Dashboard)"
      >
        ⚙️ จัดการระบบ (Admin)
      </Link>
      <button
        type="button"
        onClick={() => {
          logoutAdmin();
          window.location.href = "/";
        }}
        title="ออกจากระบบผู้ดูแลระบบ เพื่อดูในมุมมองผู้สมัครทั่วไป"
        className={
          compact
            ? "inline-flex h-7 items-center whitespace-nowrap rounded-[4px] border border-[#fecaca] bg-[#fef2f2] px-2.5 text-[11.5px] font-semibold text-[#b91c1c] transition-colors hover:bg-[#fee2e2]"
            : "inline-flex items-center whitespace-nowrap rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12.5px] font-semibold text-[#b91c1c] transition-colors hover:bg-[#fee2e2]"
        }
      >
        ออกจาก Admin
      </button>
    </div>
  );
}
