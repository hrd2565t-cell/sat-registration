"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useIsAdmin } from "@/lib/admin-auth";
import {
  formatCourseDateFields,
  parseCourseDateSessions,
  type Course,
  type CourseDateFields,
} from "@/lib/courses";
import {
  updateCourse,
  useCourses,
  type CourseUpdate,
} from "@/lib/courses-store";
import {
  useSportsEvents,
  type SportsEvent,
  dateToTimelinePercent,
  getEventYear,
  resetSportsEvents,
} from "@/lib/sports-events-store";
import { CourseEditDialog } from "@/components/admin/course-edit-dialog";
import { AddSportsEventDialog } from "@/components/timeline/add-sports-event-dialog";
import { EditSportsEventDialog } from "@/components/timeline/edit-sports-event-dialog";
import { SyncDefaultsButton } from "@/components/admin/sync-defaults-button";

type BarTone = "open" | "review" | "training" | "result";
type YearFilter = 2570 | 2571 | "all";
type ViewMode = "gantt" | "monthly";

interface TimelineBar {
  label: string;
  tooltip?: string;
  tone: BarTone;
  left: number;
  width: number;
}

interface SessionSegment {
  left: number;
  width: number;
  label: string;
}

interface TimelineRow {
  course: Course;
  year: number;
  title: string;
  shortBadge?: string;
  dateSummary: string;
  compactDateLabel: string;
  sessionSummary: string;
  totalDays: number;
  sessions: CourseDateFields[];
  sessionSegments: SessionSegment[];
  spanLeft: number;
  spanWidth: number;
  subPhaseBars: TimelineBar[];
}

const FISCAL_MONTHS = [
  { monthNumber: 10, short: "ต.ค.", full: "ตุลาคม", quarter: 1 },
  { monthNumber: 11, short: "พ.ย.", full: "พฤศจิกายน", quarter: 1 },
  { monthNumber: 12, short: "ธ.ค.", full: "ธันวาคม", quarter: 1 },
  { monthNumber: 1, short: "ม.ค.", full: "มกราคม", quarter: 2 },
  { monthNumber: 2, short: "ก.พ.", full: "กุมภาพันธ์", quarter: 2 },
  { monthNumber: 3, short: "มี.ค.", full: "มีนาคม", quarter: 2 },
  { monthNumber: 4, short: "เม.ย.", full: "เมษายน", quarter: 3 },
  { monthNumber: 5, short: "พ.ค.", full: "พฤษภาคม", quarter: 3 },
  { monthNumber: 6, short: "มิ.ย.", full: "มิถุนายน", quarter: 3 },
  { monthNumber: 7, short: "ก.ค.", full: "กรกฎาคม", quarter: 4 },
  { monthNumber: 8, short: "ส.ค.", full: "สิงหาคม", quarter: 4 },
  { monthNumber: 9, short: "ก.ย.", full: "กันยายน", quarter: 4 },
] as const;

const MONTH_HEADERS = FISCAL_MONTHS.map((m) => m.short);

const bars: Record<BarTone, string> = {
  open: "bg-[#1869bc]",
  review: "bg-[#ef8507]",
  training: "bg-[#16803c]",
  result: "bg-[#c4080f]",
};

function getCourseYear(course: Course): number {
  const sessions = parseCourseDateSessions(course.date);
  const yr = sessions[0]?.yearBE;
  if (yr && yr >= 2568 && yr <= 2580) return yr;
  const match = course.date.match(/(25\d{2})/);
  return match ? parseInt(match[1], 10) : 2570;
}

function buildCourseTimelineRow(course: Course): TimelineRow {
  const sessions = parseCourseDateSessions(course.date);
  const year = getCourseYear(course);

  const totalDays = sessions.reduce((acc, s) => {
    const yearCE = s.yearBE - 543;
    const start = new Date(yearCE, s.startMonth, s.startDay);
    const end = new Date(yearCE, s.endMonth, s.endDay);
    const diff =
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return acc + Math.max(1, diff);
  }, 0);

  const sessionSegments: SessionSegment[] = sessions.map((s) => {
    const sLeft = dateToTimelinePercent(s.startDay, s.startMonth + 1);
    const sRight = dateToTimelinePercent(s.endDay + 1, s.endMonth + 1);
    const sWidth = Math.max(1.4, Math.round((sRight - sLeft) * 10) / 10);
    return {
      left: Math.round(sLeft * 10) / 10,
      width: sWidth,
      label: formatCourseDateFields(s, false),
    };
  });

  const firstSeg = sessionSegments[0] ?? { left: 8, width: 4, label: course.date };
  const lastSeg = sessionSegments[sessionSegments.length - 1] ?? firstSeg;

  const spanLeft = firstSeg.left;
  const spanRight = lastSeg.left + lastSeg.width;
  const spanWidth = Math.max(2.2, Math.round((spanRight - spanLeft) * 10) / 10);

  const compactDateLabel = course.date.replace(/\s*25\d{2}$/, "").trim();

  // Sub-phase bars (only displayed if user toggles showSubPhases on)
  const subPhaseBars: TimelineBar[] = [];
  if (spanLeft >= 14) {
    const openLeft = Math.max(0.8, Math.round((spanLeft - 11.5) * 10) / 10);
    const openWidth = 5.5;
    const reviewLeft = Math.round((openLeft + openWidth + 0.4) * 10) / 10;
    const reviewWidth = Math.max(
      3.8,
      Math.round((spanLeft - reviewLeft - 0.4) * 10) / 10
    );
    subPhaseBars.push({
      label: "รับสมัคร",
      tooltip: `เปิดรับสมัครล่วงหน้า (${course.title})`,
      tone: "open",
      left: openLeft,
      width: openWidth,
    });
    subPhaseBars.push({
      label: "ตรวจสิทธิ",
      tooltip: `ตรวจสอบคุณสมบัติ (${course.title})`,
      tone: "review",
      left: reviewLeft,
      width: reviewWidth,
    });
  } else if (spanLeft >= 5) {
    const available = Math.max(3.5, spanLeft - 0.8);
    const openWidth = Math.round(available * 0.52 * 10) / 10;
    const reviewWidth = Math.max(
      1.8,
      Math.round((available - openWidth - 0.3) * 10) / 10
    );
    subPhaseBars.push({
      label: "รับสมัคร",
      tooltip: `เปิดรับสมัคร (${course.title})`,
      tone: "open",
      left: 0.5,
      width: openWidth,
    });
    subPhaseBars.push({
      label: "ตรวจสิทธิ",
      tooltip: `ตรวจสอบคุณสมบัติ (${course.title})`,
      tone: "review",
      left: Math.round((0.5 + openWidth + 0.2) * 10) / 10,
      width: reviewWidth,
    });
  }

  const resultLeft = Math.min(
    94.5,
    Math.round((spanLeft + spanWidth + 0.5) * 10) / 10
  );
  subPhaseBars.push({
    label: "ประกาศผล",
    tooltip: `ประกาศผลผู้ผ่านการอบรม (${course.title})`,
    tone: "result",
    left: resultLeft,
    width: 4.5,
  });

  return {
    course,
    year,
    title: course.title,
    shortBadge: course.shortTitle,
    dateSummary: course.date,
    compactDateLabel,
    sessionSummary:
      sessions.length > 1
        ? `${sessions.length} ช่วง · รวม ${totalDays} วัน`
        : `${totalDays} วัน`,
    totalDays,
    sessions,
    sessionSegments,
    spanLeft,
    spanWidth,
    subPhaseBars,
  };
}

/**
 * Free slots across the timeline without major conflicts
 */
const FREE_SLOTS = [
  {
    id: "slot-1",
    label: "ว่างช่วง มี.ค. – เม.ย.",
    dateRange: "5 มี.ค. – 30 เม.ย.",
    left: dateToTimelinePercent(5, 3),
    width: 15.2,
    description: "ช่วงว่างไตรมาส 1 ต่อไตรมาส 2 เหมาะจัดอบรมเพิ่มเติม",
  },
  {
    id: "slot-2",
    label: "ว่างช่วง มิ.ย. – ก.ค. (แนะนำ)",
    dateRange: "1 มิ.ย. – 25 ก.ค.",
    left: dateToTimelinePercent(1, 6),
    width: 15.0,
    description: "ช่วงกลางปี ไม่มีรายการแข่งขันกีฬาใหญ่ชน เหมาะจัดอบรม 3–10 วัน",
  },
  {
    id: "slot-3",
    label: "ว่างช่วง ก.ย.",
    dateRange: "1 – 30 ก.ย.",
    left: dateToTimelinePercent(1, 9),
    width: 8.0,
    description: "ก่อนเข้าสู่ฤดูกาลแข่งขันกีฬาไตรมาส 4 (ต.ค.–ธ.ค.)",
  },
];

const EVENT_GRADIENTS: Record<SportsEvent["colorTone"], string> = {
  purple: "bg-gradient-to-r from-[#7c3aed] to-[#6d28d9]",
  indigo: "bg-gradient-to-r from-[#4f46e5] to-[#4338ca]",
  amber: "bg-gradient-to-r from-[#d97706] to-[#b45309]",
  teal: "bg-gradient-to-r from-[#0d9488] to-[#0f766e]",
};

const EVENT_TEXT_COLORS: Record<SportsEvent["colorTone"], string> = {
  purple: "text-[#5b21b6] bg-[#f5f3ff] border-[#ddd6fe]",
  indigo: "text-[#3730a3] bg-[#eef2ff] border-[#c7d2fe]",
  amber: "text-[#92400e] bg-[#fffbeb] border-[#fde68a]",
  teal: "text-[#115e59] bg-[#f0fdfa] border-[#99f6e4]",
};

function Legend({
  showSportsEvents,
  showSubPhases,
  highlightFreeSlots,
}: {
  showSportsEvents: boolean;
  showSubPhases: boolean;
  highlightFreeSlots: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-xl bg-[#f8fafc] px-3 py-2 text-[11px] text-[#374151] border border-[#e2e8f0]">
      <span className="inline-flex items-center gap-1.5 font-semibold text-[#166534]">
        <span className="h-3 w-5 rounded-full bg-[#16803c] shadow-xs" />
        ช่วงวันจัดอบรมจริง
      </span>

      {showSubPhases && (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#1869bc]" />
            เปิดรับสมัคร
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef8507]" />
            ตรวจคุณสมบัติ
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#c4080f]" />
            ประกาศผล
          </span>
        </>
      )}

      {showSportsEvents && (
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#6d28d9] bg-[#f5f3ff] px-2.5 py-0.5 rounded-full border border-[#ddd6fe]">
          <span>🏆</span>
          รายการแข่งขันกีฬา กกท.
        </span>
      )}

      {highlightFreeSlots && (
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#059669] bg-[#ecfdf5] px-2.5 py-0.5 rounded-full border border-[#a7f3d0]">
          <span>✨</span>
          ช่วงเวลาว่าง (Free Slot)
        </span>
      )}
    </div>
  );
}

function CourseTrainingTrack({
  row,
  showSubPhases,
}: {
  row: TimelineRow;
  showSubPhases: boolean;
}) {
  // Position the outside label on the right unless the bar ends past 68% of the timeline
  const placeLabelOnLeft = row.spanLeft + row.spanWidth > 68;
  const sessionDetails = row.sessions
    .map((s, idx) => `ช่วงที่ ${idx + 1}: ${formatCourseDateFields(s, false)}`)
    .join(" | ");

  const fullTooltip =
    row.sessions.length > 1
      ? `${row.title} — จัดอบรม ${row.sessions.length} ช่วง (รวม ${row.totalDays} วัน): ${sessionDetails}`
      : `${row.title} — จัดอบรม (${row.totalDays} วัน): ${row.dateSummary}`;

  return (
    <>
      {/* Optional Sub-Phase Bars (Open / Review / Result) */}
      {showSubPhases &&
        row.subPhaseBars.map((bar, idx) => (
          <div
            key={`${row.course.id}-sub-${idx}`}
            title={bar.tooltip || bar.label}
            className={`absolute top-1/2 z-10 flex h-[18px] -translate-y-1/2 items-center justify-center rounded-full px-1 text-[7.5px] font-semibold leading-none text-white opacity-90 shadow-xs ${bars[bar.tone]}`}
            style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
          >
            <span className="truncate">{bar.label}</span>
          </div>
        ))}

      {/* Multi-session connecting background bar (when >1 session) */}
      {row.sessionSegments.length > 1 && (
        <div
          title={fullTooltip}
          className="absolute top-1/2 z-10 h-[10px] -translate-y-1/2 rounded-full border border-[#16803c]/40 bg-[#dcfce7]"
          style={{ left: `${row.spanLeft}%`, width: `${row.spanWidth}%` }}
        />
      )}

      {/* Individual Training Session Bars */}
      {row.sessionSegments.map((seg, idx) => (
        <div
          key={`${row.course.id}-seg-${idx}`}
          title={`ช่วงที่ ${idx + 1}: ${seg.label} (${row.title})`}
          className="group absolute top-1/2 z-20 flex h-[22px] -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-r from-[#16a34a] to-[#15803d] px-1.5 text-[9px] font-bold text-white shadow-[0_2px_5px_rgba(22,163,74,0.3)] ring-1 ring-white transition-transform hover:scale-105"
          style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
        >
          {seg.width >= 7.5 && (
            <span className="truncate">{seg.label}</span>
          )}
        </div>
      ))}

      {/* Crisp Outside Date Label — Never Truncated! */}
      {!showSubPhases && (
        <div
          title={fullTooltip}
          className="pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 whitespace-nowrap"
          style={
            placeLabelOnLeft
              ? { right: `${100 - row.spanLeft + 0.8}%` }
              : { left: `${row.spanLeft + row.spanWidth + 0.8}%` }
          }
        >
          <span className="inline-flex items-center gap-1 rounded-md border border-[#bbf7d0] bg-[#f0fdf4]/95 px-2 py-0.5 text-[10px] font-bold text-[#166534] shadow-2xs">
            <span>{row.compactDateLabel}</span>
            <span className="font-normal text-[#15803d]">
              ({row.totalDays} วัน)
            </span>
          </span>
        </div>
      )}
    </>
  );
}

function SportsEventBarItem({
  event,
  onHover,
  onClickEdit,
  isAdmin,
}: {
  event: SportsEvent;
  onHover: (event: SportsEvent | null) => void;
  onClickEdit?: (event: SportsEvent) => void;
  isAdmin?: boolean;
}) {
  const gradient = EVENT_GRADIENTS[event.colorTone] || EVENT_GRADIENTS.purple;
  const badgeStyle = EVENT_TEXT_COLORS[event.colorTone] || EVENT_TEXT_COLORS.purple;
  const placeLabelOnLeft = event.left + event.width > 68;
  const cleanDate = event.dateRange.replace(/\s*25\d{2}$/, "").trim();

  return (
    <>
      {/* Colored Bar on the 12-Month Grid */}
      <div
        onMouseEnter={() => onHover(event)}
        onMouseLeave={() => onHover(null)}
        onClick={() => isAdmin && onClickEdit?.(event)}
        className={`group absolute top-1/2 z-20 flex h-[22px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full px-1.5 text-[9px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(109,40,217,0.3)] ring-1 ring-white transition-all hover:scale-105 hover:z-30 ${gradient}`}
        style={{ left: `${event.left}%`, width: `${event.width}%` }}
        title={`${event.title} (${event.dateRange}) ณ ${event.location}`}
      >
        <span className="text-[10px]">🏆</span>
        {event.width >= 9 && (
          <span className="ml-1 truncate">{cleanDate}</span>
        )}
      </div>

      {/* Crisp Outside Date Label — Never Truncated! */}
      <div
        onMouseEnter={() => onHover(event)}
        onMouseLeave={() => onHover(null)}
        onClick={() => isAdmin && onClickEdit?.(event)}
        className=" absolute top-1/2 z-25 -translate-y-1/2 cursor-pointer whitespace-nowrap"
        style={
          placeLabelOnLeft
            ? { right: `${100 - event.left + 0.8}%` }
            : { left: `${event.left + event.width + 0.8}%` }
        }
      >
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-2xs transition hover:brightness-95 ${badgeStyle}`}
        >
          <span>{cleanDate}</span>
          <span className="font-normal opacity-80">• {event.location}</span>
        </span>
      </div>
    </>
  );
}

export function TimelineSchedule() {
  const isAdmin = useIsAdmin();
  const { courses } = useCourses();
  const { events, deleteSportsEvent } = useSportsEvents();

  // New controls: Year Tab & View Mode
  const [selectedYear, setSelectedYear] = useState<YearFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("gantt");
  const [showSportsEvents, setShowSportsEvents] = useState(true);
  const [showSubPhases, setShowSubPhases] = useState(false);
  const [highlightFreeSlots, setHighlightFreeSlots] = useState(false);
  const [onlyActiveMonths, setOnlyActiveMonths] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SportsEvent | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<SportsEvent | null>(null);

  const allCourseRows = courses.map(buildCourseTimelineRow);

  // Counts per year
  const count2570 =
    allCourseRows.filter((r) => r.year === 2570).length +
    events.filter((e) => getEventYear(e) === 2570 || e.endYear === 2570).length;
  const count2571 =
    allCourseRows.filter((r) => r.year === 2571).length +
    events.filter((e) => getEventYear(e) === 2571 || e.endYear === 2571).length;

  // Filtered rows and events by selectedYear
  const filteredRows =
    selectedYear === "all"
      ? allCourseRows
      : allCourseRows.filter((r) => r.year === selectedYear);

  const filteredEvents =
    selectedYear === "all"
      ? events
      : events.filter(
          (e) => getEventYear(e) === selectedYear || e.endYear === selectedYear
        );

  function handleSaveCourse(patch: CourseUpdate): boolean {
    if (!editingCourse) return false;
    updateCourse(editingCourse.id, patch);
    return true;
  }

  const activeYearLabel =
    selectedYear === "all" ? "ปี 2570 – 2571" : `ปี พ.ศ. ${selectedYear}`;

  return (
    <>
      <section className="mx-auto mt-[7px] w-full max-w-[920px] rounded-2xl border border-[#e0e5e8] bg-white p-3.5 shadow-[0_2px_10px_rgba(16,24,40,0.06)] xl:mt-[clamp(8px,0.75vw,12px)] xl:max-w-[clamp(1020px,76vw,1340px)] xl:rounded-[clamp(14px,1vw,18px)] xl:p-[clamp(14px,1.1vw,20px)]">
        {/* Row 1: Year Switcher Tabs + View Mode Switcher */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-[#eef2f6] pb-3">
          {/* Year Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12px] font-bold text-[#1e293b]">
              📅 ช่วงปี พ.ศ.:
            </span>
            {(
              [
                {
                  key: "all" as const,
                  label: "รวมปีงบประมาณ (ต.ค. – ก.ย.)",
                  count: allCourseRows.length + events.length,
                },
                { key: 2570 as const, label: "เฉพาะปี 2570", count: count2570 },
                { key: 2571 as const, label: "เฉพาะปี 2571", count: count2571 },
              ] as const
            ).map((tab) => {
              const active = selectedYear === tab.key;
              return (
                <button
                  key={String(tab.key)}
                  type="button"
                  onClick={() => setSelectedYear(tab.key)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold transition ${
                    active
                      ? "bg-[#16265E] text-white shadow-xs"
                      : "border border-[#cbd5e1] bg-[#f8fafc] text-[#334155] hover:bg-[#eef2f9] hover:text-[#16265E]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-[#e2e8f0] text-[#475569]"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle: Clean 12-Month Gantt vs Monthly Cards */}
          <div className="inline-flex items-center rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("gantt")}
              className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-bold transition ${
                viewMode === "gantt"
                  ? "bg-white text-[#16265E] shadow-xs"
                  : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <span>📊</span>
              <span>ตาราง 12 เดือน (Gantt)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-bold transition ${
                viewMode === "monthly"
                  ? "bg-white text-[#16265E] shadow-xs"
                  : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <span>🗓️</span>
              <span>การ์ดสรุปรายเดือน</span>
            </button>
          </div>
        </div>

        {/* Row 2: Display Options & Admin Actions */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle: Sports Events */}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] transition hover:bg-[#f1f5f9]">
              <input
                type="checkbox"
                checked={showSportsEvents}
                onChange={(e) => setShowSportsEvents(e.target.checked)}
                className="h-3.5 w-3.5 rounded text-[#7c3aed] focus:ring-[#7c3aed]"
              />
              <span className="flex items-center gap-1">
                <span>🏆</span>
                <span>แสดงปฏิทินแข่งขันกีฬา</span>
                <span className="rounded-full bg-[#f3e8ff] px-1.5 text-[10px] font-bold text-[#7c3aed]">
                  {filteredEvents.length}
                </span>
              </span>
            </label>

            {viewMode === "gantt" && (
              <>
                {/* Toggle: Sub-phases (Open / Review / Result) */}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] transition hover:bg-[#f1f5f9]">
                  <input
                    type="checkbox"
                    checked={showSubPhases}
                    onChange={(e) => setShowSubPhases(e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-[#1869bc] focus:ring-[#1869bc]"
                  />
                  <span>แสดงวันรับสมัคร/ประกาศผล</span>
                </label>

                {/* Toggle: Free Slots Highlight */}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] transition hover:bg-[#f1f5f9]">
                  <input
                    type="checkbox"
                    checked={highlightFreeSlots}
                    onChange={(e) => setHighlightFreeSlots(e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-[#10b981] focus:ring-[#10b981]"
                  />
                  <span>✨ ไฮไลต์ช่วงเวลาว่าง</span>
                </label>
              </>
            )}

            {viewMode === "monthly" && (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] transition hover:bg-[#f1f5f9]">
                <input
                  type="checkbox"
                  checked={onlyActiveMonths}
                  onChange={(e) => setOnlyActiveMonths(e.target.checked)}
                  className="h-3.5 w-3.5 rounded text-[#16265E] focus:ring-[#16265E]"
                />
                <span>แสดงเฉพาะเดือนที่มีกิจกรรม</span>
              </label>
            )}
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#7c3aed] px-3 text-[11.5px] font-semibold text-white shadow-sm transition hover:bg-[#6d28d9] active:scale-[0.98]"
              >
                <span>
                  + เพิ่มรายการแข่งขัน{" "}
                  {selectedYear !== "all" ? `(ปี ${selectedYear})` : ""}
                </span>
              </button>
              <SyncDefaultsButton />
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "ต้องการคืนค่ารายการแข่งขันกีฬาเป็นค่ามาตรฐานหรือไม่?"
                    )
                  ) {
                    resetSportsEvents();
                  }
                }}
                title="คืนค่าเป็นปฏิทินมาตรฐาน กกท."
                className="h-8 rounded-lg border border-[#e2e8f0] bg-white px-2.5 text-[11px] font-medium text-[#64748b] transition hover:bg-[#f8fafc]"
              >
                คืนค่าเริ่มต้น
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/login?next=/timeline"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-medium text-[#64748b] transition hover:border-[#16265e] hover:bg-white hover:text-[#16265e]"
              >
                <span>🔒 เข้าสู่ระบบจัดการปฏิทิน (Admin)</span>
              </Link>
            </div>
          )}
        </div>

        <Legend
          showSportsEvents={showSportsEvents}
          showSubPhases={showSubPhases}
          highlightFreeSlots={highlightFreeSlots}
        />

        {/* ==================== VIEW MODE 1: CLEAN 12-MONTH GANTT ==================== */}
        {viewMode === "gantt" && (
          <div className="mt-3 overflow-x-auto pb-1">
            <table className="w-full min-w-[820px] table-fixed border-collapse text-[#1f2937]">
              <colgroup>
                <col className="w-[27%]" />
                {MONTH_HEADERS.map((m) => (
                  <col key={m} className="w-[6.083%]" />
                ))}
              </colgroup>
              <thead>
                {/* Quarter Header Row */}
                <tr className="bg-[#16265E] text-[11px] font-bold text-white">
                  <th
                    rowSpan={2}
                    scope="col"
                    className="border border-[#1e3a8a] px-3 py-2 text-left align-middle text-[12px]"
                  >
                    <div>หลักสูตร / รายการแข่งขัน</div>
                    <div className="mt-0.5 text-[10px] font-normal text-white/80">
                      กำลังแสดง: {activeYearLabel}
                    </div>
                  </th>
                  <th
                    colSpan={3}
                    scope="colgroup"
                    className="border border-[#27408b] py-1 text-center"
                  >
                    ไตรมาส 1 (ต.ค. – ธ.ค.)
                  </th>
                  <th
                    colSpan={3}
                    scope="colgroup"
                    className="border border-[#27408b] py-1 text-center"
                  >
                    ไตรมาส 2 (ม.ค. – มี.ค.)
                  </th>
                  <th
                    colSpan={3}
                    scope="colgroup"
                    className="border border-[#27408b] py-1 text-center"
                  >
                    ไตรมาส 3 (เม.ย. – มิ.ย.)
                  </th>
                  <th
                    colSpan={3}
                    scope="colgroup"
                    className="border border-[#27408b] py-1 text-center"
                  >
                    ไตรมาส 4 (ก.ค. – ก.ย.)
                  </th>
                </tr>

                {/* 12 Individual Month Header Row */}
                <tr className="bg-[#f1f5f9] text-[10.5px] font-bold text-[#334155]">
                  {MONTH_HEADERS.map((month, idx) => (
                    <th
                      key={month}
                      scope="col"
                      className={`h-[26px] border border-[#cbd5e1] px-0.5 text-center ${
                        idx % 3 === 2 ? "border-r-[#94a3b8]" : ""
                      }`}
                    >
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Courses Section Header */}
                <tr className="bg-[#f0fdf4] text-[11px] font-bold text-[#166534]">
                  <th
                    colSpan={13}
                    className="border border-x-0 border-[#bbf7d0] px-3 py-1.5 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>🎓</span>
                        <span>
                          แผนกำหนดการฝึกอบรม ({activeYearLabel} •{" "}
                          {filteredRows.length} หลักสูตร)
                        </span>
                      </span>
                      <span className="text-[10px] font-normal text-[#15803d]">
                        *ตัวเลขหลังแถบสีเขียว คือช่วงวันอบรมจริง
                      </span>
                    </div>
                  </th>
                </tr>

                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="border-b border-[#e2e8f0] py-6 text-center text-[12px] text-[#64748b]"
                    >
                      ยังไม่มีหลักสูตรอบรมใน {activeYearLabel} (สามารถเปลี่ยนปีของหลักสูตรได้ที่ปุ่มแก้ไขหลักสูตร หรือสลับดูปีอื่นด้านบน)
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIndex) => (
                    <tr
                      key={row.course.id}
                      className={`transition hover:bg-[#f8fafc] ${
                        rowIndex % 2 === 1 ? "bg-[#fcfdfe]" : "bg-white"
                      }`}
                    >
                      <th
                        scope="row"
                        className="border-b border-r border-[#cbd5e1] px-3 py-2 text-left align-middle text-[10.5px] leading-[1.3]"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center rounded bg-[#16265E] px-1.5 py-0.2 text-[9px] font-bold text-white">
                              หลักสูตรที่ {rowIndex + 1}
                            </span>
                            {row.shortBadge && (
                              <span className="inline-flex items-center rounded bg-[#eef2f9] px-1.5 py-0.2 text-[9px] font-bold text-[#16265E]">
                                {row.shortBadge}
                              </span>
                            )}
                            {selectedYear === "all" && (
                              <span className="inline-flex items-center rounded bg-[#dcfce7] px-1.5 py-0.2 text-[9px] font-bold text-[#166534]">
                                ปี {row.year}
                              </span>
                            )}
                            <span className="text-[9px] font-semibold text-[#059669]">
                              • {row.sessionSummary}
                            </span>
                          </div>

                          <span
                            className="mt-0.5 line-clamp-2 font-bold text-[#0f172a]"
                            title={row.title}
                          >
                            {row.title}
                          </span>

                          <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1">
                            <span className="text-[9.5px] font-medium text-[#475569]">
                              📅 {row.dateSummary}
                            </span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setEditingCourse(row.course)}
                                className="inline-flex items-center gap-0.5 rounded border border-[#cbd5e1] bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#16265E] transition hover:border-[#16265E] hover:bg-[#eef2f9]"
                              >
                                <span>✏️ แก้ไข</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </th>

                      {/* 12-Month Timeline Track */}
                      <td
                        colSpan={12}
                        className="relative border-b border-[#cbd5e1] p-0"
                      >
                        <div className="relative h-[50px] overflow-hidden">
                          {/* 12 Month Grid Columns Background */}
                          <div
                            className="pointer-events-none absolute inset-0 grid grid-cols-12"
                            aria-hidden="true"
                          >
                            {MONTH_HEADERS.map((m, idx) => (
                              <span
                                key={m}
                                className={`border-r ${
                                  idx % 3 === 2
                                    ? "border-r-[#cbd5e1]"
                                    : "border-r-[#eef2f6]"
                                } ${idx % 2 === 1 ? "bg-[#f8fafc]/45" : ""}`}
                              />
                            ))}
                          </div>

                          {/* Optional Free Slots Vertical Shading */}
                          {highlightFreeSlots && (
                            <div className="pointer-events-none absolute inset-0 z-0">
                              {FREE_SLOTS.map((slot) => (
                                <div
                                  key={slot.id}
                                  className="absolute top-0 bottom-0 border-x border-emerald-400/40 bg-emerald-500/[0.08]"
                                  style={{
                                    left: `${slot.left}%`,
                                    width: `${slot.width}%`,
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Clean Course Training Bar + Crisp Outside Label */}
                          <CourseTrainingTrack
                            row={row}
                            showSubPhases={showSubPhases}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {/* Sports Events Section */}
                {showSportsEvents && (
                  <>
                    <tr className="bg-gradient-to-r from-[#f5f3ff] to-[#faf5ff] text-[11px] font-bold text-[#6d28d9]">
                      <th
                        colSpan={13}
                        className="border border-x-0 border-[#ddd6fe] px-3 py-1.5 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span>🏆</span>
                            <span>
                              ปฏิทินการแข่งขันกีฬาสำคัญ ({activeYearLabel} •{" "}
                              {filteredEvents.length} รายการ)
                            </span>
                          </span>
                          <span className="text-[10px] font-normal text-[#7c3aed]">
                            {isAdmin
                              ? "*คลิกที่แถบสีหรือปุ่มแก้ไขเพื่อเปลี่ยนวันที่/ปี พ.ศ."
                              : "*เปรียบเทียบเพื่อหลีกเลี่ยงช่วงเวลาชนกับการอบรม"}
                          </span>
                        </div>
                      </th>
                    </tr>

                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={13}
                          className="border-b border-[#e2e8f0] bg-[#faf5ff]/30 py-6 text-center text-[12px] text-[#64748b]"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <span>
                              ยังไม่มีรายการแข่งขันกีฬาใน {activeYearLabel}
                            </span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#7c3aed] px-3 text-[11.5px] font-semibold text-white shadow-xs hover:bg-[#6d28d9]"
                              >
                                + เพิ่มรายการแข่งขันใน {activeYearLabel}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((event) => {
                        const evtYear = getEventYear(event);
                        return (
                          <tr
                            key={event.id}
                            className="bg-[#faf5ff]/30 transition hover:bg-[#f5f3ff]/60"
                          >
                            <th
                              scope="row"
                              className="border-b border-r border-[#cbd5e1] px-3 py-2 text-left align-middle text-[10.5px] leading-[1.25]"
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="rounded bg-[#ede9fe] px-1.5 py-0.2 text-[8.5px] font-bold text-[#6d28d9]">
                                    {event.categoryLabel}
                                  </span>
                                  <span className="rounded bg-[#f1f5f9] px-1.5 py-0.2 text-[8.5px] font-semibold text-[#475569]">
                                    ปี {evtYear}
                                  </span>
                                </div>
                                <span className="mt-0.5 font-bold text-[#1e1b4b]">
                                  {event.title}
                                </span>
                                <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1">
                                  <span className="text-[9.5px] font-medium text-[#64748b]">
                                    📅 {event.dateRange} • 📍 {event.location}
                                  </span>
                                  {isAdmin && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingEvent(event)}
                                        className="inline-flex items-center gap-0.5 rounded border border-[#ddd6fe] bg-[#f5f3ff] px-1.5 py-0.5 text-[9px] font-semibold text-[#6d28d9] hover:bg-[#ede9fe]"
                                      >
                                        <span>✏️ แก้ไข</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (
                                            confirm(
                                              `ต้องการลบรายการ "${event.title}" ออกจากปฏิทินหรือไม่?`
                                            )
                                          ) {
                                            deleteSportsEvent(event.id);
                                          }
                                        }}
                                        className="inline-flex items-center gap-0.5 rounded border border-[#fecaca] bg-[#fef2f2] px-1.5 py-0.5 text-[9px] font-semibold text-[#b91c1c] hover:bg-[#fee2e2]"
                                      >
                                        <span>🗑️ ลบ</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </th>

                            <td
                              colSpan={12}
                              className="relative border-b border-[#cbd5e1] p-0"
                            >
                              <div className="relative h-[48px] overflow-hidden">
                                {/* 12 Month Grid Columns Background */}
                                <div
                                  className="pointer-events-none absolute inset-0 grid grid-cols-12"
                                  aria-hidden="true"
                                >
                                  {MONTH_HEADERS.map((m, idx) => (
                                    <span
                                      key={m}
                                      className={`border-r ${
                                        idx % 3 === 2
                                          ? "border-r-[#cbd5e1]"
                                          : "border-r-[#eef2f6]"
                                      }`}
                                    />
                                  ))}
                                </div>

                                {highlightFreeSlots && (
                                  <div className="pointer-events-none absolute inset-0 z-0">
                                    {FREE_SLOTS.map((slot) => (
                                      <div
                                        key={slot.id}
                                        className="absolute top-0 bottom-0 border-x border-emerald-400/40 bg-emerald-500/[0.08]"
                                        style={{
                                          left: `${slot.left}%`,
                                          width: `${slot.width}%`,
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}

                                <SportsEventBarItem
                                  event={event}
                                  onHover={setHoveredEvent}
                                  onClickEdit={setEditingEvent}
                                  isAdmin={isAdmin}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ==================== VIEW MODE 2: MONTHLY CARDS VIEW ==================== */}
        {viewMode === "monthly" && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {FISCAL_MONTHS.map((fm, monthIdx) => {
                const monthNumber = fm.monthNumber;
                const monthName = fm.full;
                const monthCourses = filteredRows.filter((row) =>
                  row.sessions.some(
                    (s) =>
                      s.startMonth + 1 === monthNumber ||
                      s.endMonth + 1 === monthNumber ||
                      (s.startMonth + 1 <= monthNumber &&
                        s.endMonth + 1 >= monthNumber)
                  )
                );
                const monthEvents = showSportsEvents
                  ? filteredEvents.filter(
                      (evt) =>
                        evt.startMonth === monthNumber ||
                        evt.endMonth === monthNumber ||
                        (evt.startMonth <= monthNumber &&
                          evt.endMonth >= monthNumber)
                    )
                  : [];

                const hasActivity =
                  monthCourses.length > 0 || monthEvents.length > 0;
                if (onlyActiveMonths && !hasActivity) return null;

                const hasBoth =
                  monthCourses.length > 0 && monthEvents.length > 0;

                return (
                  <div
                    key={monthName}
                    className={`flex flex-col rounded-xl border p-3.5 transition ${
                      hasActivity
                        ? "border-[#cbd5e1] bg-white shadow-xs"
                        : "border-[#e2e8f0] bg-[#f8fafc]/60 opacity-75"
                    }`}
                  >
                    {/* Month Card Header */}
                    <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#16265E] text-[11px] font-bold text-white">
                          {fm.short}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-[13.5px] font-bold text-[#0f172a]">
                              {monthName}{" "}
                              {selectedYear !== "all" ? selectedYear : ""}
                            </h4>
                            <span className="rounded bg-[#eef2f9] px-1.5 py-0.2 text-[9.5px] font-bold text-[#16265E]">
                              ไตรมาส {fm.quarter}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {monthCourses.length > 0 && (
                          <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#166534]">
                            🎓 {monthCourses.length} หลักสูตร
                          </span>
                        )}
                        {monthEvents.length > 0 && (
                          <span className="rounded-full bg-[#f3e8ff] px-2 py-0.5 text-[10px] font-bold text-[#6d28d9]">
                            🏆 {monthEvents.length} แข่งขัน
                          </span>
                        )}
                        {!hasActivity && (
                          <span className="text-[10.5px] text-[#94a3b8]">
                            ว่างตลอดเดือน
                          </span>
                        )}
                      </div>
                    </div>

                    {hasBoth && (
                      <div className="mt-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-2.5 py-1 text-[10.5px] font-medium text-[#92400e]">
                        💡 เดือนนี้มีทั้งการอบรมและการแข่งขันกีฬา โปรดตรวจสอบวันเดินทาง
                      </div>
                    )}

                    {/* Month Content */}
                    <div className="mt-2.5 flex-1 space-y-2">
                      {monthCourses.map((row) => (
                        <div
                          key={`m-${monthIdx}-c-${row.course.id}`}
                          className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4]/70 p-2.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#166534]">
                              <span>🎓 อบรม</span>
                              {row.shortBadge && (
                                <span className="rounded bg-white px-1.5 py-0.2 text-[#16265E] border border-[#bbf7d0]">
                                  {row.shortBadge}
                                </span>
                              )}
                            </span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setEditingCourse(row.course)}
                                className="text-[10px] font-semibold text-[#16265E] hover:underline"
                              >
                                ✏️ แก้ไข
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-[11.5px] font-bold leading-snug text-[#0f172a]">
                            {row.title}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-[#15803d]">
                            📅 {row.dateSummary} ({row.sessionSummary})
                          </p>
                        </div>
                      ))}

                      {monthEvents.map((evt) => (
                        <div
                          key={`m-${monthIdx}-e-${evt.id}`}
                          className="rounded-lg border border-[#ddd6fe] bg-[#f5f3ff]/70 p-2.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="rounded bg-[#ede9fe] px-1.5 py-0.2 text-[9.5px] font-bold text-[#6d28d9]">
                              🏆 {evt.categoryLabel}
                            </span>
                            {isAdmin && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingEvent(evt)}
                                  className="text-[10px] font-semibold text-[#6d28d9] hover:underline"
                                >
                                  ✏️ แก้ไข
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `ต้องการลบรายการ "${evt.title}" หรือไม่?`
                                      )
                                    ) {
                                      deleteSportsEvent(evt.id);
                                    }
                                  }}
                                  className="text-[10px] font-semibold text-[#b91c1c] hover:underline"
                                >
                                  🗑️ ลบ
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-[11.5px] font-bold leading-snug text-[#1e1b4b]">
                            {evt.title}
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-[#5b21b6]">
                            📅 {evt.dateRange} • 📍 {evt.location}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hover Info Banner */}
        {hoveredEvent && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#ddd6fe] bg-[#f5f3ff] px-3 py-1.5 text-[11.5px] text-[#5b21b6]">
            <span className="font-semibold">
              🏆 {hoveredEvent.title} ({hoveredEvent.categoryLabel})
            </span>
            <span>
              📅 {hoveredEvent.dateRange} • 📍 {hoveredEvent.location}
            </span>
          </div>
        )}
      </section>

      {/* Executive Gap Analysis Card (Only shown when highlightFreeSlots is checked) */}
      {highlightFreeSlots && (
        <section className="mx-auto mt-3.5 w-full max-w-[920px] rounded-2xl border border-[#a7f3d0] bg-gradient-to-br from-[#f0fdf4] to-[#f8fafc] p-4 shadow-[0_2px_8px_rgba(16,185,129,0.08)] xl:max-w-[clamp(1020px,76vw,1340px)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#bbf7d0] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d1fae5] text-base">
                📊
              </span>
              <div>
                <h3 className="text-[14px] font-bold text-[#065f46]">
                  บทวิเคราะห์ช่วงเวลาว่างสำหรับผู้บริหาร (Executive Slot Analysis)
                </h3>
                <p className="text-[11px] text-[#047857]">
                  ระบุช่วงเวลาที่ไม่มีการอบรมและการแข่งขันชนกัน เพื่อใช้ในการพิจารณาเพิ่มหรือขยับตารางหลักสูตร
                </p>
              </div>
            </div>
            <span className="rounded-full bg-[#d1fae5] px-2.5 py-0.5 text-[11px] font-bold text-[#065f46]">
              พบ 3 ช่วงเวลาว่างหลัก
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2.5 text-[12px] sm:grid-cols-3">
            {FREE_SLOTS.map((slot, index) => (
              <div
                key={slot.id}
                className="rounded-xl border border-[#bbf7d0] bg-white p-3 shadow-xs transition hover:border-[#10b981]"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10.5px] font-bold text-[#15803d]">
                    ช่วงที่ {index + 1}: {slot.label}
                  </span>
                </div>
                <p className="mt-2 text-[13px] font-bold text-[#111827]">
                  📅 {slot.dateRange}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[#4b5563]">
                  {slot.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add Sports Event Modal */}
      <AddSportsEventDialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultYear={selectedYear === 2571 ? 2571 : 2570}
      />

      {/* Edit Sports Event Modal */}
      <EditSportsEventDialog
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
      />

      {/* Edit Course Modal directly from Timeline */}
      {editingCourse && (
        <CourseEditDialog
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={handleSaveCourse}
        />
      )}
    </>
  );
}
