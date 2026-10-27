"use client";

import { useState } from "react";
import {
  THAI_MONTHS,
  formatCourseDateFields,
  getDaysInMonth,
  type CourseDateFields,
} from "@/lib/courses";
import type { SportsEvent } from "@/lib/sports-events-store";

const THAI_WEEKDAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."] as const;

export interface DurationPreset {
  days: number;
  label: string;
}

export interface ThaiCalendarRangePickerProps {
  value: CourseDateFields;
  onChange: (next: CourseDateFields) => void;
  tone?: "blue" | "red" | "green";
  badgeLabel: string;
  presets?: DurationPreset[];
  allowCustomDaysInput?: boolean;
  sportsEvents?: SportsEvent[];
  defaultOpen?: boolean;
  onRemoveSession?: () => void;
}

function fieldsToDates(fields: CourseDateFields): { start: Date; end: Date } {
  const endYearCE = fields.yearBE - 543;
  const startYearCE =
    fields.startMonth > fields.endMonth ? endYearCE - 1 : endYearCE;
  const start = new Date(startYearCE, fields.startMonth, fields.startDay);
  const end = new Date(endYearCE, fields.endMonth, fields.endDay);
  return { start, end };
}

function datesToFields(start: Date, end: Date): CourseDateFields {
  const safeEnd = end < start ? start : end;
  return {
    startDay: start.getDate(),
    startMonth: start.getMonth(),
    endDay: safeEnd.getDate(),
    endMonth: safeEnd.getMonth(),
    yearBE: safeEnd.getFullYear() + 543,
  };
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatThaiDateWithWeekday(d: Date): string {
  const wd = THAI_WEEKDAYS_SHORT[d.getDay()];
  const m = THAI_MONTHS[d.getMonth()]?.abbr ?? "";
  const yr = d.getFullYear() + 543;
  return `${wd} ${d.getDate()} ${m} ${String(yr).slice(-2)}`;
}

export function ThaiCalendarRangePicker({
  value,
  onChange,
  tone = "blue",
  badgeLabel,
  presets = [],
  allowCustomDaysInput = false,
  sportsEvents = [],
  defaultOpen = false,
  onRemoveSession,
}: ThaiCalendarRangePickerProps) {
  const { start: startDate, end: endDate } = fieldsToDates(value);

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [viewYearBE, setViewYearBE] = useState(() => startDate.getFullYear() + 543);
  const [viewMonth, setViewMonth] = useState(() => startDate.getMonth());
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const durationDays =
    Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  const theme = {
    blue: {
      badgeBg: "bg-[#1869bc]",
      border: "border-[#bfdbfe]",
      activeBorder: "border-[#3b82f6]",
      headerBg: "bg-[#eff6ff]",
      textMain: "text-[#1e3a8a]",
      selectedDay: "bg-[#1869bc] text-white font-bold shadow-xs",
      inRangeDay: "bg-[#dbeafe] text-[#1e3a8a] font-semibold",
      presetActive: "bg-[#1869bc] text-white shadow-2xs",
      btnToggle:
        "border-[#93c5fd] bg-[#eff6ff] text-[#1d4ed8] hover:bg-[#dbeafe]",
    },
    red: {
      badgeBg: "bg-[#c4080f]",
      border: "border-[#fecaca]",
      activeBorder: "border-[#ef4444]",
      headerBg: "bg-[#fef2f2]",
      textMain: "text-[#991b1b]",
      selectedDay: "bg-[#c4080f] text-white font-bold shadow-xs",
      inRangeDay: "bg-[#fee2e2] text-[#991b1b] font-semibold",
      presetActive: "bg-[#c4080f] text-white shadow-2xs",
      btnToggle:
        "border-[#fca5a5] bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2]",
    },
    green: {
      badgeBg: "bg-[#16803c]",
      border: "border-[#bbf7d0]",
      activeBorder: "border-[#16a34a]",
      headerBg: "bg-[#f0fdf4]",
      textMain: "text-[#166534]",
      selectedDay: "bg-[#16803c] text-white font-bold shadow-xs",
      inRangeDay: "bg-[#dcfce7] text-[#166534] font-semibold",
      presetActive: "bg-[#16803c] text-white shadow-2xs",
      btnToggle:
        "border-[#86efac] bg-[#f0fdf4] text-[#15803d] hover:bg-[#dcfce7]",
    },
  }[tone];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYearBE((y) => Math.max(2568, y - 1));
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYearBE((y) => Math.min(2572, y + 1));
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (day: number) => {
    const clicked = new Date(viewYearBE - 543, viewMonth, day);

    if (!selectingEnd) {
      // คลิกครั้งที่ 1: ตั้งเป็นวันเริ่มต้นทันที (และเป็นวันสิ้นสุดชั่วคราวสำหรับกรณีเลือกวันเดียว)
      onChange(datesToFields(clicked, clicked));
      setSelectingEnd(true);
      setHoverDate(null);
    } else {
      // คลิกครั้งที่ 2: หากคลิกวันก่อนหน้าวันเริ่ม ให้ถือว่าเปลี่ยนวันเริ่มใหม่
      if (clicked < startDate) {
        onChange(datesToFields(clicked, clicked));
        setSelectingEnd(true);
      } else {
        onChange(datesToFields(startDate, clicked));
        setSelectingEnd(false);
        setHoverDate(null);
      }
    }
  };

  const applyDurationDays = (daysCount: number) => {
    const clamped = Math.min(Math.max(1, daysCount), 90);
    const nextEnd = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + clamped - 1
    );
    onChange(datesToFields(startDate, nextEnd));
    setSelectingEnd(false);
    setHoverDate(null);
  };

  // สร้างตารางวันในเดือนที่กำลังเปิดดู
  const viewYearCE = viewYearBE - 543;
  const firstDayOfWeek = new Date(viewYearCE, viewMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInViewMonth = getDaysInMonth(viewMonth, viewYearBE);

  // วันสิ้นสุดที่ใช้แสดงแถบสี (รองรับการลากเมาส์ Preview ก่อนคลิกครั้งที่ 2)
  const effectiveEndDate =
    selectingEnd && hoverDate && hoverDate >= startDate ? hoverDate : endDate;

  const getSportsEventsOnDay = (day: number) => {
    if (!sportsEvents || sportsEvents.length === 0) return [];
    const target = new Date(viewYearCE, viewMonth, day, 12, 0, 0);
    return sportsEvents.filter((evt) => {
      const sYr = (evt.year ?? 2570) - 543;
      const eYr = (evt.endYear ?? evt.year ?? 2570) - 543;
      const s = new Date(sYr, evt.startMonth - 1, evt.startDay, 0, 0, 0);
      const e = new Date(eYr, evt.endMonth - 1, evt.endDay, 23, 59, 59);
      return target >= s && target <= e;
    });
  };

  return (
    <div
      className={`rounded-lg border bg-white p-2.5 shadow-2xs transition ${
        isOpen ? theme.activeBorder : theme.border
      }`}
    >
      {/* Top Summary & Preset Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${theme.badgeBg}`}
          >
            {badgeLabel}
          </span>

          <button
            type="button"
            onClick={() => {
              if (!isOpen) {
                setViewYearBE(startDate.getFullYear() + 543);
                setViewMonth(startDate.getMonth());
              }
              setIsOpen((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] font-bold transition ${theme.btnToggle}`}
          >
            <span>📅</span>
            <span>{formatCourseDateFields(value, true)}</span>
            <span className="rounded-full bg-white/90 px-1.5 py-0.2 text-[10px] font-semibold text-[#334155]">
              {durationDays} วัน
            </span>
            <span className="text-[9.5px] opacity-75">
              {isOpen ? "▲ ปิดปฏิทิน" : "▼ เลือกจากปฏิทิน"}
            </span>
          </button>
        </div>

        {/* Quick Duration Presets */}
        <div className="flex flex-wrap items-center gap-1">
          {presets.length > 0 && (
            <>
              <span className="mr-0.5 text-[9.5px] text-[#64748b]">
                ระยะเวลา:
              </span>
              {presets.map((preset) => {
                const isActive = durationDays === preset.days;
                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => applyDurationDays(preset.days)}
                    className={`rounded px-1.5 py-0.5 text-[9.5px] font-semibold transition ${
                      isActive
                        ? theme.presetActive
                        : "border border-[#cbd5e1] bg-[#f8fafc] text-[#334155] hover:bg-[#e2e8f0]"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </>
          )}

          {allowCustomDaysInput && (
            <div
              title="ระบุจำนวนวันตามต้องการ ระบบจะคำนวณวันสิ้นสุดให้อัตโนมัติ"
              className="ml-0.5 inline-flex items-center gap-1 rounded border border-[#bbf7d0] bg-[#f0fdf4] px-1.5 py-0.5"
            >
              <span className="text-[9.5px] font-medium text-[#166534]">
                ระบุเอง:
              </span>
              <input
                type="number"
                min={1}
                max={90}
                value={durationDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (Number.isFinite(val) && val >= 1 && val <= 90) {
                    applyDurationDays(val);
                  }
                }}
                className="h-5 w-10 rounded border border-[#86efac] bg-white px-1 text-center text-[10.5px] font-bold text-[#166534] outline-none"
              />
              <span className="text-[9.5px] font-medium text-[#166534]">
                วัน
              </span>
            </div>
          )}

          {onRemoveSession && (
            <button
              type="button"
              onClick={onRemoveSession}
              className="ml-1 inline-flex items-center gap-0.5 rounded border border-[#fecaca] bg-[#fef2f2] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#b91c1c] transition hover:bg-[#fee2e2]"
            >
              🗑️ ลบช่วงนี้
            </button>
          )}
        </div>
      </div>

      {/* Sub-line showing exact Weekday start & end */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#475569]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span>
            เริ่ม:{" "}
            <strong className="font-semibold text-[#0f172a]">
              {formatThaiDateWithWeekday(startDate)}
            </strong>
          </span>
          <span>→</span>
          <span>
            สิ้นสุด:{" "}
            <strong className="font-semibold text-[#0f172a]">
              {formatThaiDateWithWeekday(endDate)}
            </strong>
          </span>
        </div>

        {!isOpen && (
          <button
            type="button"
            onClick={() => {
              setViewYearBE(startDate.getFullYear() + 543);
              setViewMonth(startDate.getMonth());
              setIsOpen(true);
            }}
            className="text-[10px] font-semibold text-[#1e40af] hover:underline"
          >
            เปลี่ยนวันที่บนปฏิทิน ›
          </button>
        )}
      </div>

      {/* Expanded Interactive Calendar */}
      {isOpen && (
        <div className="mt-2.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
          {/* Instruction & Status Banner */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5 rounded-md border border-[#e2e8f0] bg-white px-2.5 py-1.5 text-[10.5px]">
            {selectingEnd ? (
              <span className="font-semibold text-[#d97706]">
                👆 คลิกเลือก <strong>วันสิ้นสุด</strong> บนปฏิทิน (หรือคลิกซ้ำที่วันที่{" "}
                {startDate.getDate()} หากต้องการเลือกแค่วันเดียว)
              </span>
            ) : (
              <span className="text-[#334155]">
                💡 <strong>คลิกครั้งที่ 1</strong> = วันเริ่ม •{" "}
                <strong>คลิกครั้งที่ 2</strong> = วันสิ้นสุด (หรือกดปุ่มลัดจำนวนวันด้านบน)
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectingEnd(false);
                setIsOpen(false);
              }}
              className="rounded bg-[#1e293b] px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-[#0f172a]"
            >
              ✓ ตกลง
            </button>
          </div>

          {/* Month & Year Navigation Bar */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="inline-flex h-7 items-center gap-1 rounded border border-[#cbd5e1] bg-white px-2 text-[11px] font-semibold text-[#334155] transition hover:bg-[#f1f5f9]"
            >
              ◀ เดือนก่อน
            </button>

            <div className="flex items-center gap-1.5">
              <select
                aria-label="เลือกเดือน"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="h-7 rounded border border-[#cbd5e1] bg-white px-2 text-[11.5px] font-bold text-[#0f172a] outline-none focus:border-[#1e3a8a]"
              >
                {THAI_MONTHS.map((m) => (
                  <option key={m.index} value={m.index}>
                    {m.full} ({m.abbr})
                  </option>
                ))}
              </select>

              <select
                aria-label="เลือกปี พ.ศ."
                value={viewYearBE}
                onChange={(e) => setViewYearBE(Number(e.target.value))}
                className="h-7 rounded border border-[#cbd5e1] bg-white px-2 text-[11.5px] font-bold text-[#0f172a] outline-none focus:border-[#1e3a8a]"
              >
                <option value={2569}>พ.ศ. 2569</option>
                <option value={2570}>พ.ศ. 2570</option>
                <option value={2571}>พ.ศ. 2571</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="inline-flex h-7 items-center gap-1 rounded border border-[#cbd5e1] bg-white px-2 text-[11px] font-semibold text-[#334155] transition hover:bg-[#f1f5f9]"
            >
              เดือนถัดไป ▶
            </button>
          </div>

          {/* 7-Day Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold">
            {THAI_WEEKDAYS_SHORT.map((wd, idx) => {
              const isWeekend = idx === 0 || idx === 6;
              return (
                <div
                  key={wd}
                  className={`py-1 ${
                    isWeekend ? "text-[#dc2626]" : "text-[#475569]"
                  }`}
                >
                  {wd}
                </div>
              );
            })}
          </div>

          {/* Calendar Days Grid */}
          <div
            className="mt-1 grid grid-cols-7 gap-1"
            onMouseLeave={() => setHoverDate(null)}
          >
            {Array.from({ length: firstDayOfWeek }).map((_, emptyIdx) => (
              <div key={`empty-${emptyIdx}`} className="h-8" />
            ))}

            {Array.from({ length: daysInViewMonth }, (_, i) => i + 1).map(
              (day) => {
                const cellDate = new Date(viewYearCE, viewMonth, day);
                const dayOfWeek = cellDate.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isStart = isSameDay(cellDate, startDate);
                const isEnd = isSameDay(cellDate, effectiveEndDate);
                const isInRange =
                  cellDate > startDate && cellDate < effectiveEndDate;
                const dayEvents = getSportsEventsOnDay(day);

                let cellStyle =
                  "border border-transparent bg-white text-[#1e293b] hover:border-[#94a3b8] hover:bg-[#f1f5f9]";
                if (isWeekend && !isStart && !isEnd && !isInRange) {
                  cellStyle =
                    "border border-transparent bg-[#fff1f2]/60 text-[#dc2626] hover:border-[#fda4af] hover:bg-[#ffe4e6]/60";
                }
                if (isInRange) {
                  cellStyle = theme.inRangeDay;
                }
                if (isStart || isEnd) {
                  cellStyle = theme.selectedDay;
                }

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => {
                      if (selectingEnd) {
                        setHoverDate(cellDate);
                      }
                    }}
                    title={
                      dayEvents.length > 0
                        ? `วันที่ ${day}: มีแข่งขันกีฬา (${dayEvents
                            .map((e) => e.title)
                            .join(", ")})`
                        : undefined
                    }
                    className={`relative flex h-8 flex-col items-center justify-center rounded-md text-[11.5px] transition ${cellStyle}`}
                  >
                    <span className="leading-none">{day}</span>
                    {dayEvents.length > 0 && (
                      <span
                        className="mt-0.5 text-[7px] leading-none"
                        aria-hidden="true"
                      >
                        🏆
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#e2e8f0] pt-1.5 text-[9.5px] text-[#64748b]">
            <span className="text-[#dc2626]">
              *ตัวเลขสีแดง (อา. / ส.) = วันหยุดสุดสัปดาห์
            </span>
            {sportsEvents.length > 0 && (
              <span className="text-[#6d28d9]">
                🏆 = วันที่มีรายการแข่งขันกีฬา กกท.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
