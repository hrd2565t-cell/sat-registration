import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "danger" | "warning" | "info" | "neutral";
}

export function Badge({
  className,
  variant = "neutral",
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-tighter";

  const variants = {
    success: "bg-[#10b981]/10 text-[#059669] border border-[#10b981]/20",
    danger: "bg-[#fecaca]/10 text-[#dc2626] border border-[#fca5a5]/20",
    warning:
      "bg-[#fef3c7]/10 text-[#d97706] border border-[#fcd34d]/20",
    info: "bg-[#dbeafe]/10 text-[#2563eb] border border-[#93c5fd]/20",
    neutral: "bg-[#e5e7eb] text-[#374151] border border-transparent",
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
