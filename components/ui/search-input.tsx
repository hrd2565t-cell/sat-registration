"use client";

import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function SearchInput({
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <svg
        className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#9ca3af]"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <circle cx="8.5" cy="8.5" r="5.5" strokeWidth="1.8" />
        <path
          strokeLinecap="round"
          strokeWidth="1.8"
          d="M12.5 12.5L16 16"
        />
      </svg>
      <Input
        fullWidth
        className="h-[24px] rounded-[4px] border-[#d1d5db] pl-7 pr-2 !text-[10px] placeholder:!text-[10px] placeholder:text-[#9ca3af]"
        {...props}
      />
    </div>
  );
}
