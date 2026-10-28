"use client";

import * as React from "react";

export interface IdCardInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  tone?: "default" | "highlight";
  separator?: boolean;
  /** Whether to show quick "📋 วาง" and "✕ ล้าง" action buttons */
  showActions?: boolean;
}

export function IdCardInput({
  value = "",
  onChange,
  disabled = false,
  className,
  tone = "default",
  separator = true,
  showActions = false,
}: IdCardInputProps) {
  const [digits, setDigits] = React.useState<string[]>(() => {
    const arr = Array(13).fill("");
    value
      .replace(/\D/g, "")
      .slice(0, 13)
      .split("")
      .forEach((d, i) => {
        arr[i] = d;
      });
    return arr;
  });

  const [feedback, setFeedback] = React.useState<string>("");
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Adjust internal digits during render when external value prop changes
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const clean = (value || "").replace(/\D/g, "").slice(0, 13);
    const arr = Array(13).fill("");
    clean.split("").forEach((d, i) => {
      arr[i] = d;
    });
    setDigits(arr);
  }

  const update = (next: string[]) => {
    setDigits(next);
    onChange?.(next.join(""));
  };

  /**
   * Intelligently fills the 13 boxes from any text string.
   * Strips hyphens, spaces, and non-digits.
   */
  const fillFromText = (raw: string, preferStartIndex = 0) => {
    const incomingDigits = (raw || "").replace(/\D/g, "");
    if (!incomingDigits) return false;

    // If pasted string has 13 digits (or 10+ digits), always populate from box 0
    const startIndex = incomingDigits.length >= 10 ? 0 : preferStartIndex;
    const next = [...digits];
    const chars = incomingDigits.slice(0, 13 - startIndex).split("");
    chars.forEach((char, offset) => {
      next[startIndex + offset] = char;
    });
    update(next);

    const target = Math.min(startIndex + chars.length - 1, 12);
    refs.current[target]?.focus();
    return true;
  };

  const handlePaste = (
    index: number,
    event: React.ClipboardEvent<HTMLInputElement>
  ) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text");
    if (fillFromText(pastedText, index)) {
      setFeedback("วางเลขบัตรแล้ว!");
      setTimeout(() => setFeedback(""), 1800);
    }
  };

  const handleChange = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, "");

    // If more than 1 digit typed or pasted into input
    if (incoming.length > 1) {
      fillFromText(incoming, index);
      return;
    }

    const next = [...digits];
    if (!incoming) {
      next[index] = "";
      update(next);
      return;
    }

    next[index] = incoming;
    update(next);

    if (index < 12) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      update(next);
      refs.current[index - 1]?.focus();
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 12) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && fillFromText(text, 0)) {
          setFeedback("วางเลขบัตรแล้ว!");
          setTimeout(() => setFeedback(""), 1800);
          return;
        }
      }
    } catch {
      // If permission is denied or blocked, prompt user
    }

    const manual = window.prompt("กรุณาวางเลขประจำตัวประชาชน (13 หลัก):");
    if (manual && fillFromText(manual, 0)) {
      setFeedback("วางเลขบัตรแล้ว!");
      setTimeout(() => setFeedback(""), 1800);
    }
  };

  const handleClear = () => {
    const empty = Array(13).fill("");
    update(empty);
    refs.current[0]?.focus();
  };

  const hasAnyDigit = digits.some(Boolean);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`flex min-w-0 items-center gap-[3px] overflow-x-auto pb-0.5 sm:gap-1 ${
          className ?? ""
        }`}
      >
        {digits.map((digit, index) => (
          <React.Fragment key={index}>
            {separator && index === 4 && (
              <span className="px-0.5 text-[13px] text-[#9ca3af]">-</span>
            )}
            <input
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={digit}
              disabled={disabled}
              onChange={(e) => handleChange(index, e.target.value)}
              onPaste={(e) => handlePaste(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={(e) => e.target.select()}
              className={`h-[30px] w-[22px] shrink-0 border text-center text-[13px] font-semibold text-[#1f2937] transition-all focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 disabled:bg-[#f3f4f6] sm:h-[34px] sm:w-[30px] ${
                tone === "highlight"
                  ? "rounded-[5px] border-[#d5cb84] bg-[#fff8ba]"
                  : "rounded-[3px] border-[#d1d5db] bg-white"
              }`}
            />
          </React.Fragment>
        ))}
      </div>

      {showActions && (
        <div className="flex items-center gap-2 text-[10.5px]">
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="inline-flex items-center gap-1 rounded-[4px] border border-[#cbd5e1] bg-white px-2 py-0.5 font-semibold text-[#1e3a8a] shadow-2xs transition hover:border-[#1e3a8a] hover:bg-[#eff6ff]"
            title="วางเลขบัตรประชาชนจากคลิปบอร์ด (จะกรอกลง 13 ช่องอัตโนมัติ)"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span>{feedback || "วางเลขบัตร"}</span>
          </button>

          {hasAnyDigit && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-0.5 rounded-[4px] border border-[#e2e8f0] bg-white px-1.5 py-0.5 text-[#64748b] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:text-[#0f172a]"
              title="ล้างตัวเลขทั้งหมด"
            >
              <span>✕</span>
              <span>ล้าง</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
