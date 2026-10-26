"use client";

import * as React from "react";

interface CheckboxProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  required?: boolean;
  className?: string;
}

export function Checkbox({
  label,
  description,
  checked,
  defaultChecked,
  onChange,
  required = false,
  className,
}: CheckboxProps) {
  return (
    <label
      className={`flex cursor-pointer select-none items-start gap-2 ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-[2px] h-[15px] w-[15px] shrink-0 cursor-pointer rounded-[2px] border-[#9ca3af] accent-[#16265E]"
        required={required}
      />
      <span className="min-w-0">
        {label && (
          <span className="block text-[12.5px] leading-snug text-[#1f2937]">
            {label}
          </span>
        )}
        {description && (
          <span className="mt-1 block text-[10.5px] leading-relaxed text-[#6b7280]">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
