"use client";

import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectOption[];
  onValueChange?: (value: string) => void;
  className?: string;
}

export function Select({
  options,
  onValueChange,
  className,
  ...props
}: SelectProps) {
  return (
    <div className={`relative flex ${className ?? ""}`}>
      <select
        className="h-[21px] w-full appearance-none rounded-[4px] border border-[#d1d5db] bg-white pl-2 pr-6 text-[9.5px] text-[#374151] transition-colors focus:border-[#1e3a8a] focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]/20"
        onChange={(event) => onValueChange?.(event.target.value)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-[#4b5563]"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M5 7.5l5 5 5-5"
        />
      </svg>
    </div>
  );
}
