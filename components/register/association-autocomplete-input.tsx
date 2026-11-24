"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";

export interface AssociationSuggestion {
  value: string;
  subtitle?: string;
  searchTerms?: string[];
}

interface AssociationAutocompleteInputProps {
  id?: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: AssociationSuggestion[];
  emptyHint?: string;
  listTitle?: string;
  className?: string;
}

function normalizeQuery(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * ช่องกรอกชื่อสมาคมกีฬา/หน่วยงานแบบค้นหาและเลือกอัตโนมัติ (Autocomplete Combobox)
 * รองรับทั้งการเลือกจากรายชื่อมาตรฐาน (สมาคมกีฬาแห่งประเทศไทย / สมาคมกีฬาแห่งจังหวัด)
 * และการพิมพ์ระบุชื่อเองอย่างอิสระ
 */
export function AssociationAutocompleteInput({
  id,
  label,
  required = false,
  placeholder,
  value,
  onChange,
  suggestions,
  emptyHint = "ไม่พบรายชื่อที่ตรงกันในรายการมาตรฐาน — สามารถพิมพ์ชื่อสมาคม/หน่วยงานเองได้โดยตรง",
  listTitle = "รายชื่อสมาคมกีฬามาตรฐาน",
  className = "",
}: AssociationAutocompleteInputProps) {
  const generatedId = useId();
  const inputId = id ?? `assoc-autocomplete-${generatedId}`;
  const listboxId = `${inputId}-listbox`;

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const normalizedQuery = useMemo(() => normalizeQuery(value), [value]);

  const filteredSuggestions = useMemo(() => {
    if (!normalizedQuery) {
      return suggestions;
    }

    const compactQuery = normalizedQuery.replace(/\s+/g, "");
    const matches: { item: AssociationSuggestion; score: number }[] = [];

    for (const item of suggestions) {
      const valueNorm = normalizeQuery(item.value);
      const subtitleNorm = item.subtitle ? normalizeQuery(item.subtitle) : "";
      const termsNorm = (item.searchTerms ?? []).map(normalizeQuery);

      const allFields = [valueNorm, subtitleNorm, ...termsNorm].filter(Boolean);
      const exactMatch =
        valueNorm === normalizedQuery ||
        termsNorm.some((t) => t === normalizedQuery);
      const prefixMatch =
        valueNorm.startsWith(normalizedQuery) ||
        termsNorm.some((t) => t.startsWith(normalizedQuery));
      const directIncludes = allFields.some(
        (field) =>
          field.includes(normalizedQuery) ||
          field.replace(/\s+/g, "").includes(compactQuery)
      );

      if (exactMatch) {
        matches.push({ item, score: 0 });
      } else if (prefixMatch) {
        matches.push({ item, score: 1 });
      } else if (directIncludes) {
        matches.push({ item, score: 2 });
      }
    }

    matches.sort((a, b) => a.score - b.score);
    return matches.map((m) => m.item);
  }, [normalizedQuery, suggestions]);

  // ปิด dropdown เมื่อคลิกนอกกรอบคอมโพเนนต์
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // เลื่อนรายการที่เลือกด้วยคีย์บอร์ดให้อยู่ในมุมมอง
  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [isOpen, activeIndex]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onChange("");
    setActiveIndex(-1);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(filteredSuggestions.length > 0 ? 0 : -1);
        return;
      }
      if (filteredSuggestions.length > 0) {
        setActiveIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(
          filteredSuggestions.length > 0 ? filteredSuggestions.length - 1 : -1
        );
        return;
      }
      if (filteredSuggestions.length > 0) {
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      }
      return;
    }

    if (event.key === "Enter") {
      if (
        isOpen &&
        activeIndex >= 0 &&
        activeIndex < filteredSuggestions.length
      ) {
        event.preventDefault();
        handleSelect(filteredSuggestions[activeIndex].value);
      }
      return;
    }

    if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  const activeOptionId =
    isOpen && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[12px] font-semibold text-[#1e3a8a]"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onFocus={() => {
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onBlur={(event) => {
            const nextFocus = event.relatedTarget as Node | null;
            if (nextFocus && containerRef.current?.contains(nextFocus)) {
              return;
            }
            setIsOpen(false);
            setActiveIndex(-1);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="h-9 w-full rounded-[4px] border border-[#d1d5db] bg-white pl-3 pr-14 text-[13px] text-[#1f2937] placeholder:text-[#9ca3af] transition-all focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {value.length > 0 && (
            <button
              type="button"
              aria-label="ล้างข้อความที่พิมพ์"
              onMouseDown={handleClear}
              className="flex h-5 w-5 items-center justify-center rounded text-[11px] text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#1e293b]"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label={isOpen ? "ซ่อนรายการแนะนำ" : "แสดงรายการแนะนำ"}
            onMouseDown={(event) => {
              event.preventDefault();
              if (isOpen) {
                setIsOpen(false);
                setActiveIndex(-1);
              } else {
                setIsOpen(true);
                inputRef.current?.focus();
              }
            }}
            className="flex h-5 w-5 items-center justify-center rounded text-[#6b7280] transition-colors hover:bg-[#f1f5f9]"
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1 overflow-hidden rounded-md border border-[#cbd5e1] bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-[#f1f5f9] bg-[#f8fafc] px-3 py-1.5 text-[10.5px] text-[#64748b]">
            <span className="font-semibold text-[#334155]">{listTitle}</span>
            <span>
              พบ {filteredSuggestions.length} รายการ
              {filteredSuggestions.length > 0 ? " (คลิกเลือกหรือพิมพ์เองได้)" : ""}
            </span>
          </div>

          {filteredSuggestions.length > 0 ? (
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredSuggestions.map((item, idx) => {
                const isActive = idx === activeIndex;
                const isSelected = normalizeQuery(item.value) === normalizedQuery && normalizedQuery.length > 0;
                return (
                  <button
                    key={`${item.value}-${idx}`}
                    ref={(el) => {
                      optionRefs.current[idx] = el;
                    }}
                    id={`${listboxId}-opt-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected || isActive}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(item.value);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12.5px] transition-colors ${
                      isActive
                        ? "bg-[#eff6ff] text-[#1e3a8a]"
                        : isSelected
                          ? "bg-[#f0fdf4] text-[#166534]"
                          : "text-[#1f2937] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <span className="font-medium leading-snug">{item.value}</span>
                    {item.subtitle && (
                      <span className="shrink-0 rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] text-[#475569]">
                        {item.subtitle}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-3 text-[11.5px] text-[#64748b]">
              <p>{emptyHint}</p>
              {value.trim() && (
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setIsOpen(false);
                    setActiveIndex(-1);
                  }}
                  className="mt-2 inline-flex items-center rounded bg-[#eff6ff] px-2.5 py-1 text-[11px] font-medium text-[#1e3a8a] hover:bg-[#dbeafe]"
                >
                  ใช้ชื่อที่พิมพ์นี้: &ldquo;{value.trim()}&rdquo;
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
