import type { ReactNode } from "react";

export type StatusTone = "pending" | "approved" | "rejected" | "reserve" | "action_required";

const toneStyles: Record<
  StatusTone,
  {
    header: string;
    border: string;
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    badgeLabel: string;
  }
> = {
  pending: {
    header: "bg-[#fef3c7]/80",
    border: "border-[#f59e0b]/40",
    iconBg: "bg-[#f59e0b]",
    iconColor: "text-white",
    badgeBg: "bg-[#fffbeb] border-[#fde68a]",
    badgeText: "text-[#b45309]",
    badgeLabel: "กำลังตรวจสอบ",
  },
  approved: {
    header: "bg-[#d1fae5]/80",
    border: "border-[#10b981]/50",
    iconBg: "bg-[#059669]",
    iconColor: "text-white",
    badgeBg: "bg-[#ecfdf5] border-[#a7f3d0]",
    badgeText: "text-[#047857]",
    badgeLabel: "ผ่านการคัดเลือก (ตัวจริง)",
  },
  reserve: {
    header: "bg-[#dbeafe]/80",
    border: "border-[#3b82f6]/40",
    iconBg: "bg-[#1d4ed8]",
    iconColor: "text-white",
    badgeBg: "bg-[#eff6ff] border-[#bfdbfe]",
    badgeText: "text-[#1e40af]",
    badgeLabel: "บัญชีรายชื่อสำรอง",
  },
  rejected: {
    header: "bg-[#fee2e2]/80",
    border: "border-[#ef4444]/40",
    iconBg: "bg-[#dc2626]",
    iconColor: "text-white",
    badgeBg: "bg-[#fef2f2] border-[#fecaca]",
    badgeText: "text-[#b91c1c]",
    badgeLabel: "ไม่ผ่านเกณฑ์",
  },
  action_required: {
    header: "bg-[#ffedd5]",
    border: "border-[#f97316]/60",
    iconBg: "bg-[#ea580c]",
    iconColor: "text-white",
    badgeBg: "bg-[#fff7ed] border-[#fed7aa]",
    badgeText: "text-[#c2410c]",
    badgeLabel: "ต้องส่งเอกสารเพิ่ม",
  },
};

function StatusToneIcon({ tone }: { tone: StatusTone }) {
  if (tone === "approved") {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (tone === "rejected") {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  if (tone === "action_required") {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    );
  }
  if (tone === "reserve") {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

interface StatusPanelProps {
  tone: StatusTone;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function StatusPanel({
  tone,
  title,
  description,
  action,
  className,
}: StatusPanelProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white ${styles.border} ${
        className ?? ""
      }`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 ${styles.header}`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-2xs ${styles.iconBg} ${styles.iconColor}`}
          >
            <StatusToneIcon tone={tone} />
          </span>
          <h3 className="text-[12.5px] font-bold leading-snug text-[#111827]">
            {title}
          </h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles.badgeBg} ${styles.badgeText}`}
        >
          {styles.badgeLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-2.5">
        <p className="text-[11.5px] leading-[1.5] text-[#374151]">
          {description}
        </p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
