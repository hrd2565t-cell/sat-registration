import type { ReactNode } from "react";

type StatTone = "default" | "warning" | "success" | "danger";

interface StatCardProps {
  label: string;
  value: ReactNode;
  secondary?: string;
  suffix?: string;
  tone?: StatTone;
  className?: string;
}

const toneStyles: Record<StatTone, string> = {
  default: "text-[#111827]",
  warning: "text-[#E68A00]",
  success: "text-[#0E7F3C]",
  danger: "text-[#B02730]",
};

export function StatCard({
  label,
  value,
  secondary,
  suffix,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={`flex min-h-[76px] flex-col rounded-md border border-[#e3e6ea] bg-white px-5 pb-2.5 pt-[14px] shadow-[0_1px_2px_rgba(16,24,40,0.05)] ${
        className ?? ""
      }`}
    >
      <p className="text-[12px] font-medium leading-4 text-[#111827]">
        {label}
      </p>
      <p
        className={`mt-1 flex h-[30px] items-baseline gap-2 text-[36px] font-bold leading-[30px] ${toneStyles[tone]}`}
      >
        <span>{value}</span>
        {secondary && (
          <span className="text-[17px] font-semibold text-[#4b5563]">
            {secondary}
          </span>
        )}
        {suffix && (
          <span className="text-[14px] font-bold">{suffix}</span>
        )}
      </p>
    </div>
  );
}
