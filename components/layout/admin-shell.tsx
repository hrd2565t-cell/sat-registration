"use client";

import { useState, type ReactNode } from "react";
import {
  AdminSidebar,
  type AdminNavKey,
} from "@/components/layout/admin-sidebar";
import { AdminTopbar } from "@/components/layout/admin-topbar";
import { useAdminGuard } from "@/lib/admin-auth";

interface AdminShellProps {
  title: string;
  userName: string;
  activeKey: AdminNavKey;
  children: ReactNode;
}

export function AdminShell({
  title,
  userName,
  activeKey,
  children,
}: AdminShellProps) {
  const { isAuthenticated } = useAdminGuard();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F4F8]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#16265E] border-t-transparent" />
          <p className="text-[12px] text-[#6b7280]">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4F8] print:bg-white">
      <AdminSidebar
        open={open}
        onClose={() => setOpen(false)}
        activeKey={activeKey}
      />

      <div className="flex min-h-screen flex-col lg:pl-[156px] print:pl-0">
        <AdminTopbar
          title={title}
          userName={userName}
          onMenuClick={() => setOpen(true)}
        />
        <main className="flex-1 px-3 pb-[13px] pt-4 sm:px-4 lg:pr-4 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
