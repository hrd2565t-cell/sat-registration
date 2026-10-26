"use client";

import * as React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export function Input({
  className,
  label,
  error,
  helperText,
  fullWidth = false,
  ...props
}: InputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full" : "max-w-md"}`}>
      {label && (
        <label className="text-[12.5px] font-medium text-[#1f2937]">{label}</label>
      )}
      <input
        className={`block h-9 w-full rounded-[4px] border border-[#d1d5db] bg-white px-3 text-[13px] text-[#1f2937] placeholder:text-[#9ca3af] transition-all focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 disabled:cursor-not-allowed disabled:bg-[#f3f4f6] ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] text-[#dc2626]">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-[#6b7280]">{helperText}</p>
      )}
    </div>
  );
}
