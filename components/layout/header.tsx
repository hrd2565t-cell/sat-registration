import Image from "next/image";
import type { ReactNode } from "react";
import { AdminNavButton } from "@/components/layout/admin-nav-button";

interface HeaderProps {
  rightSlot?: ReactNode;
  variant?: "light" | "dark";
  compact?: boolean;
}

export function Header({
  rightSlot,
  variant = "light",
  compact = false,
}: HeaderProps) {
  const isDark = variant === "dark";

  return (
    <header
      className={`sticky top-0 z-50 border-b ${
        isDark
          ? "border-[#183875] bg-[#183875]"
          : "border-[#e5e7eb] bg-white"
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-2 ${
          compact
            ? "min-h-[45px] px-5 py-1.5 sm:px-6 lg:h-[45px] lg:py-0 lg:pl-[44px] lg:pr-[30px]"
            : `px-5 ${isDark ? "py-2" : "py-2.5"}`
        }`}
      >
        <div
          className={`flex items-center ${
            compact ? "gap-2.5 lg:gap-[18px]" : "gap-2.5"
          }`}
        >
          <Image
            src={isDark ? "/assets/logo-sat-dark.png" : "/assets/logo-sat-header.png"}
            alt="SAT Logo"
            width={isDark ? 40 : 36}
            height={isDark ? 40 : 36}
            className={`object-contain ${isDark ? "h-10 w-10" : "h-9 w-9"}`}
            priority
          />
          {compact ? (
            <p
              className={`text-[12.5px] font-bold leading-tight sm:text-[13px] sm:whitespace-nowrap lg:text-[15.5px] ${
                isDark ? "text-white" : "text-[#111827]"
              }`}
            >
              ระบบรับสมัครเข้าอบรม บุคลากรกีฬาแห่งประเทศไทย
            </p>
          ) : (
            <div className="leading-tight">
              <p
                className={`text-[12px] font-semibold ${
                  isDark ? "text-white/90" : "text-[#374151]"
                }`}
              >
                ระบบสมัครเข้ารับอบรม
              </p>
              <h1
                className={`text-[15px] font-bold ${
                  isDark ? "text-white" : "text-[#16265E]"
                }`}
              >
                บุคลากรกีฬาแห่งประเทศไทย
              </h1>
            </div>
          )}
        </div>

        <div className="flex min-w-0 max-w-full items-center gap-3">
          {rightSlot ?? (
            <AdminNavButton
              compact={isDark}
              variant={isDark ? "light" : "primary"}
            />
          )}
        </div>
      </div>
    </header>
  );
}
