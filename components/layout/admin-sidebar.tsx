"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePendingCount } from "@/lib/applications-store";

export type AdminNavKey = "dashboard" | "courses" | "review" | "settings";

const navItems: {
  key: AdminNavKey;
  label: string;
  href: string;
}[] = [
  { key: "dashboard", label: "แดชบอร์ด", href: "/admin" },
  { key: "courses", label: "จัดการหลักสูตร", href: "/admin/courses" },
  { key: "review", label: "ตรวจสอบคุณสมบัติ", href: "/admin/review" },
  { key: "settings", label: "ตั้งค่าระบบ", href: "/admin/settings" },
];

function DashboardTileIcon() {
  return (
    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] bg-white">
      <span className="flex h-2 items-end gap-[1px]">
        <span className="h-1 w-[2px] bg-[#2386D3]" />
        <span className="h-2 w-[2px] bg-[#2386D3]" />
        <span className="h-1.5 w-[2px] bg-[#2386D3]" />
      </span>
    </span>
  );
}

function DashboardLineIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" strokeWidth="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" strokeWidth="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" strokeWidth="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" strokeWidth="1.8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" strokeWidth="1.8" />
      <path strokeWidth="1.8" d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M6 3.5h8l4 4v13H6z"
      />
      <path strokeLinejoin="round" strokeWidth="1.8" d="M14 3.5v4h4" />
      <path strokeLinecap="round" strokeWidth="1.8" d="M9 12h6M9 16h6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
      <path
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1.03 1.56V21a2 2 0 11-4 0v-.09A1.7 1.7 0 008.94 19.4a1.7 1.7 0 00-1.88.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.88 1.7 1.7 0 00-1.56-1.03H3a2 2 0 110-4h.09A1.7 1.7 0 004.6 8.94a1.7 1.7 0 00-.34-1.88l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.88.34H9a1.7 1.7 0 001.03-1.56V3a2 2 0 114 0v.09a1.7 1.7 0 001.03 1.56 1.7 1.7 0 001.88-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.88V9c.2.63.8 1.03 1.56 1.03H21a2 2 0 110 4h-.09A1.7 1.7 0 0019.4 15z"
      />
    </svg>
  );
}

function NavIcon({ itemKey }: { itemKey: (typeof navItems)[number]["key"] }) {
  if (itemKey === "courses") return <CalendarIcon />;
  if (itemKey === "review") return <DocumentIcon />;
  if (itemKey === "settings") return <SettingsIcon />;
  return null;
}

function SidebarContent({
  activeKey,
  onNavigate,
}: {
  activeKey: AdminNavKey;
  onNavigate?: () => void;
}) {
  const pendingCount = usePendingCount();

  return (
    <>
      <div className="flex flex-col items-center pt-[7px]">
        <Image
          src="/assets/sat-logo-sidebar.png"
          alt="SAT"
          width={53}
          height={64}
          className="h-auto w-[53px]"
          priority
        />
        <p className="mt-[5px] text-center text-[12px] font-semibold leading-[13px] text-white">
          ฝ่ายฝึกอบรมและระเบียบ
        </p>
      </div>

      <div className="mx-1.5 mt-1 h-px bg-white/10" />

      <nav className="mt-4 flex flex-col gap-1 px-1.5">
        {navItems.map((item) => {
          const active = item.key === activeKey;
          const isDashboard = item.key === "dashboard";

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center gap-2 rounded-[5px] px-2.5 text-[13px] font-medium transition-colors lg:min-h-0 lg:h-[27px] lg:gap-1.5 lg:px-2 lg:text-[11.5px] ${
                active
                  ? "bg-[#2386D3] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.18)]"
                  : "text-white/90 hover:bg-white/5"
              }`}
            >
              <span
                className={
                  active
                    ? "text-white"
                    : "text-[#9DB0CC]"
                }
              >
                {isDashboard ? (
                  active ? (
                    <DashboardTileIcon />
                  ) : (
                    <DashboardLineIcon />
                  )
                ) : (
                  <NavIcon itemKey={item.key} />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.key === "review" && pendingCount > 0 && (
                <span
                  aria-label={`รอตรวจสอบ ${pendingCount} รายการ`}
                  className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${
                    active
                      ? "bg-white text-[#0E2554]"
                      : "bg-[#2386D3] text-white"
                  }`}
                >
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AdminSidebar({
  open,
  onClose,
  activeKey,
}: {
  open: boolean;
  onClose: () => void;
  activeKey: AdminNavKey;
}) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[156px] flex-col bg-[#0E2554] lg:flex print:hidden">
        <SidebarContent activeKey={activeKey} />
      </aside>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          open ? "" : "pointer-events-none"
        }`}
        aria-hidden={!open}
        inert={!open}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดเมนู"
          className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="เมนูผู้ดูแลระบบ"
          className={`absolute inset-y-0 left-0 flex w-[260px] max-w-[85vw] flex-col bg-[#0E2554] pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดเมนู"
            className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeWidth="1.8"
                d="M5 5l10 10M15 5L5 15"
              />
            </svg>
          </button>
          <SidebarContent activeKey={activeKey} onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
