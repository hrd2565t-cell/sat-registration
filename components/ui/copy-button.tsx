"use client";

import * as React from "react";
import { useState } from "react";

export interface CopyButtonProps {
  /** The text to copy to clipboard */
  text: string;
  /** Optional button label shown when not copied (omit for icon only) */
  label?: string;
  /** Optional label shown when copied (defaults to "คัดลอกแล้ว!") */
  copiedLabel?: string;
  /** Tooltip title */
  title?: string;
  className?: string;
  /** Size variant */
  size?: "xs" | "sm" | "md";
  /** Style variant */
  variant?: "ghost" | "outline" | "badge";
}

export function CopyButton({
  text,
  label,
  copiedLabel = "คัดลอกแล้ว!",
  title = "คลิกเพื่อคัดลอกเลขบัตรประชาชน",
  className = "",
  size = "sm",
  variant = "outline",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!text) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback prompt if clipboard access fails
      window.prompt("คัดลอกเลขบัตรประชาชน:", text);
    }
  };

  const sizeClasses = {
    xs: "h-[22px] px-1.5 text-[9.5px] gap-1",
    sm: "h-[26px] px-2 text-[10.5px] gap-1",
    md: "h-[30px] px-2.5 text-[11.5px] gap-1.5",
  }[size];

  const variantClasses = {
    ghost: "bg-transparent text-[#4b5563] hover:bg-black/5 hover:text-[#111827]",
    outline:
      "border border-[#d1d5db] bg-white text-[#374151] hover:border-[#1e3a8a] hover:bg-[#eff6ff] hover:text-[#1e3a8a] shadow-2xs",
    badge:
      "border border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af] hover:bg-[#dbeafe] hover:border-[#93c5fd] font-semibold",
  }[variant];

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "คัดลอกสำเร็จแล้ว" : title}
      aria-label={copied ? "คัดลอกสำเร็จแล้ว" : title}
      className={`inline-flex shrink-0 items-center justify-center rounded-[4px] font-medium transition-all cursor-pointer ${sizeClasses} ${
        copied
          ? "border border-[#86efac] bg-[#f0fdf4] text-[#15803d]"
          : variantClasses
      } ${className}`}
    >
      {copied ? (
        <>
          <svg
            className="h-3.5 w-3.5 text-[#16a34a] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="font-semibold text-[#15803d]">{copiedLabel}</span>
        </>
      ) : (
        <>
          <svg
            className="h-3.5 w-3.5 opacity-80 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
