import type { AiVerdict } from "@/lib/admin-data";

const toneStyles: Record<
  AiVerdict["tone"],
  { wrapper: string; icon: string }
> = {
  pass: {
    wrapper: "bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]",
    icon: "text-[#15803d]",
  },
  fail: {
    wrapper: "bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]",
    icon: "text-[#b91c1c]",
  },
  review: {
    wrapper: "bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]",
    icon: "text-[#2563eb]",
  },
};

function RobotIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeWidth="2" d="M12 2.5v3" />
      <circle cx="12" cy="2" r="1.2" fill="currentColor" stroke="none" />
      <rect
        x="4.5"
        y="6"
        width="15"
        height="12"
        rx="3"
        strokeWidth="1.8"
      />
      <path strokeLinecap="round" strokeWidth="1.8" d="M1.5 10.5v3M22.5 10.5v3" />
      <circle cx="9" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" strokeWidth="1.8" d="M9.5 15h5" />
    </svg>
  );
}

export function AiVerdictBadge({
  verdict,
  className,
  size = "sm",
}: {
  verdict: AiVerdict;
  className?: string;
  size?: "sm" | "md";
}) {
  const styles = toneStyles[verdict.tone];
  const compact = size === "sm";

  return (
    <div
      className={`flex w-full items-start rounded-[6px] ${
        compact ? "gap-1.5 px-2 py-1.5" : "gap-2 px-2.5 py-2"
      } ${styles.wrapper} ${className ?? ""}`}
    >
      <RobotIcon
        className={`shrink-0 ${
          compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-5 w-5"
        } ${styles.icon}`}
      />
      <div
        className={`min-w-0 ${
          compact ? "text-[9.5px] leading-[1.35]" : "text-[11px] leading-relaxed"
        }`}
      >
        <p className="font-semibold">{verdict.line1}</p>
        <p className={compact ? "text-[8.5px] opacity-90" : "mt-0.5 text-[10px] opacity-90"}>
          {verdict.line2}
        </p>
      </div>
    </div>
  );
}
