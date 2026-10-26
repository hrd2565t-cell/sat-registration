"use client";

import * as React from "react";

interface IdCardInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  tone?: "default" | "highlight";
  separator?: boolean;
}

export function IdCardInput({
  value = "",
  onChange,
  disabled = false,
  className,
  tone = "default",
  separator = true,
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

  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const update = (next: string[]) => {
    setDigits(next);
    onChange?.(next.join(""));
  };

  const handleChange = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, "");
    const next = [...digits];

    if (!incoming) {
      next[index] = "";
      update(next);
      return;
    }

    const chars = incoming.slice(0, 13 - index).split("");
    chars.forEach((char, offset) => {
      next[index + offset] = char;
    });
    update(next);

    const target = Math.min(index + chars.length, 12);
    refs.current[target]?.focus();
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

  return (
    <div
      className={`flex min-w-0 items-center gap-[3px] overflow-x-auto pb-0.5 sm:gap-1 ${className ?? ""}`}
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
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
            className={`h-[30px] w-[22px] shrink-0 border text-center text-[13px] text-[#1f2937] transition-all focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 disabled:bg-[#f3f4f6] sm:h-[34px] sm:w-[30px] ${
              tone === "highlight"
                ? "rounded-[5px] border-[#d5cb84] bg-[#fff8ba]"
                : "rounded-[3px] border-[#d1d5db] bg-white"
            }`}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
