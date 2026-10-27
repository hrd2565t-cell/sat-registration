"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useIsAdmin } from "@/lib/admin-auth";
import {
  formatCourseDateFields,
  parseCourseDateSessions,
  type Course,
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
  resetSportsEvents,
} from "@/lib/sports-events-store";
import { CourseEditDialog } from "@/components/admin/course-edit-dialog";
import { AddSportsEventDialog } from "@/components/timeline/add-sports-event-dialog";
import { EditSportsEventDialog } from "@/components/timeline/edit-sports-event-dialog";
import { SyncDefaultsButton } from "@/components/admin/sync-defaults-button";

type BarTone = "open" | "review" | "training" | "result";

interface TimelineBar {
  label: string;
  tooltip?: string;
  tone: BarTone;
  left: number;
  width: number;
}

interface TimelineRow {
  course: Course;
  title: string;
  shortBadge?: string;
  dateSummary: string;
  sessionSummary: string;
  bars: TimelineBar[];
}

const bars: Record<BarTone, string> = {
  open: "bg-[#1869bc]",
  review: "bg-[#ef8507]",
  training: "bg-[#198c32]",
  result: "bg-[#c4080f]",
};

function buildCourseTimelineRow(course: Course): TimelineRow {
  const sessions = parseCourseDateSessions(course.date);
  const totalDays = sessions.reduce((acc, s) => {
    const yearCE = s.yearBE - 543;
    const start = new Date(yearCE, s.startMonth, s.startDay);
    const end = new Date(yearCE, s.endMonth, s.endDay);
    const diff =
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return acc + Math.max(1, diff);
  }, 0);

  const first = sessions[0];
  const last = sessions[sessions.length - 1] ?? first;

  const trainStartPct = dateToTimelinePercent(
    first.startDay,
    first.startMonth + 1
  );
  const trainEndPct = dateToTimelinePercent(last.endDay, last.endMonth + 1);
  const trainWidth = Math.min(
    Math.max(13.5, Math.round((trainEndPct - trainStartPct) * 10) / 10),
    92 - trainStartPct
  );

  const cleanDateLabel = course.date.replace(/\s*25\d{2}$/, "").trim();
  const sessionDetails = sessions
    .map((s, idx) => `ช่วงที่ ${idx + 1}: ${formatCourseDateFields(s, false)}`)
    .join(" | ");

  const rowBars: TimelineBar[] = [];

  // 1. แถบเปิดรับสมัคร & ตรวจคุณสมบัติ (วางก่อนหน้าวันเริ่มอบรมอัตโนมัติ)
  if (trainStartPct >= 22) {
    const openLeft = Math.max(1, Math.round((trainStartPct - 20.5) * 10) / 10);
    const openWidth = 10.5;
    const reviewLeft = Math.round((openLeft + openWidth + 0.5) * 10) / 10;
    const reviewWidth = Math.max(
      6.5,
      Math.round((trainStartPct - reviewLeft - 0.5) * 10) / 10
    );
    rowBars.push({
      label: "เปิดรับสมัคร",
      tooltip: `เปิดรับสมัคร: ล่วงหน้าก่อนการอบรม (${course.title})`,
      tone: "open",
      left: openLeft,
      width: openWidth,
    });
    rowBars.push({
      label: "ตรวจคุณสมบัติ",
      tooltip: `ตรวจสอบคุณสมบัติและเอกสาร (${course.title})`,
      tone: "review",
      left: reviewLeft,
      width: reviewWidth,
    });
  } else if (trainStartPct >= 6) {
    const available = Math.max(4, trainStartPct - 1.2);
    const openWidth = Math.round(available * 0.54 * 10) / 10;
    const reviewWidth = Math.max(
      3.5,
      Math.round((available - openWidth - 0.3) * 10) / 10
    );
    rowBars.push({
      label: "รับสมัคร",
      tooltip: `เปิดรับสมัคร (${course.title})`,
      tone: "open",
      left: 0.8,
      width: openWidth,
    });
    rowBars.push({
      label: "ตรวจสิทธิ",
      tooltip: `ตรวจคุณสมบัติ (${course.title})`,
      tone: "review",
      left: Math.round((0.8 + openWidth + 0.3) * 10) / 10,
      width: reviewWidth,
    });
  }

  // 2. แถบจัดอบรมจริง (สีเขียว)
  rowBars.push({
    label: cleanDateLabel,
    tooltip:
      sessions.length > 1
        ? `จัดอบรม ${sessions.length} ช่วง (รวม ${totalDays} วัน): ${sessionDetails}`
        : `ช่วงวันจัดอบรม (${totalDays} วัน): ${course.date}`,
    tone: "training",
    left: Math.round(trainStartPct * 10) / 10,
    width: trainWidth,
  });

  // 3. แถบประกาศผล (สีแดง)
  const resultLeft = Math.min(
    93.5,
    Math.round((trainStartPct + trainWidth + 0.6) * 10) / 10
  );
  rowBars.push({
    label: "ประกาศผล",
    tooltip: `ประกาศผลผู้ผ่านการอบรม (${course.title})`,
    tone: "result",
    left: resultLeft,
    width: 5.8,
  });

  return {
    course,
    title: course.title,
    shortBadge: course.shortTitle,
    dateSummary: course.date,
    sessionSummary:
      sessions.length > 1
        ? `${sessions.length} ช่วง · รวม ${totalDays} วัน`
        : `รวม ${totalDays} วัน`,
    bars: rowBars,
  };
}

const columns = [
  "หลักสูตร / รายการ",
  "ม.ค. – มี.ค. 2570",
  "เม.ย. – มิ.ย. 2570",
  "ก.ค. – ก.ย. 2570",
  "ต.ค. – ธ.ค. 2570",
];

/**
 * Free slots across the timeline without major conflicts
 */
const FREE_SLOTS = [
  {
    id: "slot-1",
    label: "ว่างช่วง มี.ค. – เม.ย.",
    dateRange: "5 มี.ค. – 30 เม.ย. 2570",
    left: dateToTimelinePercent(5, 3),
    width: 15.2,
    description: "หลังจบหลักสูตรผู้บริหาร (ก.พ.) และก่อนหลักสูตรผู้ตัดสิน (พ.ค.) เหมาะจัดอบรมเพิ่มเติม",
  },
  {
    id: "slot-2",
    label: "ว่างช่วง มิ.ย. – ก.ค. (แนะนำ)",
    dateRange: "1 มิ.ย. – 25 ก.ค. 2570",
    left: dateToTimelinePercent(1, 6),
    width: 15.0,
    description: "ช่วงกลางปีก่อนเริ่มหลักสูตรเดือน ส.ค. ไม่มีรายการแข่งขันกีฬาใหญ่ชน",
  },
  {
    id: "slot-3",
    label: "ว่างช่วง ก.ย.",
    dateRange: "1 – 30 ก.ย. 2570",
    left: dateToTimelinePercent(1, 9),
    width: 8.0,
    description: "หลังจบการอบรมเดือน ส.ค. และก่อนเข้าสู่ฤดูกาลแข่งขันกีฬาไตรมาส 4 (ต.ค.–ธ.ค.)",
  },
];

const EVENT_GRADIENTS: Record<SportsEvent["colorTone"], string> = {
  purple: "bg-gradient-to-r from-[#7c3aed] to-[#6d28d9]",
  indigo: "bg-gradient-to-r from-[#4f46e5] to-[#4338ca]",
  amber: "bg-gradient-to-r from-[#d97706] to-[#b45309]",
  teal: "bg-gradient-to-r from-[#0d9488] to-[#0f766e]",
};

function Legend({
  showSportsEvents,
  highlightFreeSlots,
}: {
  showSportsEvents: boolean;
  highlightFreeSlots: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 text-[10px] text-[#374151] xl:gap-x-5 xl:text-[clamp(10.5px,0.8vw,12px)]">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#1869bc] xl:h-2.5 xl:w-2.5" />
        เปิดรับสมัคร
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[13px] font-bold leading-none text-[#ef8507] xl:text-[clamp(13px,1vw,16px)]" aria-hidden="true">
          ➜
        </span>
        ตรวจคุณสมบัติ
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[13px] font-bold leading-none text-[#198c32] xl:text-[clamp(13px,1vw,16px)]" aria-hidden="true">
          ➜
        </span>
        ช่วงเวลาจัดอบรม
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#c4080f] xl:h-2.5 xl:w-2.5" />
        ประกาศผล
      </span>

      {showSportsEvents && (
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#6d28d9] bg-[#f5f3ff] px-2 py-0.5 rounded-full border border-[#ddd6fe]">
          <span>🏆</span>
          การแข่งขันกีฬา กกท.
        </span>
      )}

      {highlightFreeSlots && (
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded-full border border-[#a7f3d0]">
          <span>✨</span>
          ช่วงเวลาว่าง (Free Slot)
        </span>
      )}
    </div>
  );
}

function TimelineBarItem({ bar }: { bar: TimelineBar }) {
  const compact = bar.tone === "result";

  return (
    <div
      title={bar.tooltip || bar.label}
      className={`group absolute top-1/2 z-10 flex h-[18px] -translate-y-1/2 items-center justify-center rounded-full font-semibold leading-none text-white shadow-sm transition-transform hover:scale-[1.02] hover:z-30 xl:h-[clamp(21px,1.6vw,28px)] ${
        compact
          ? "px-0.5 text-[6px] xl:px-1 xl:text-[clamp(6.5px,0.5vw,8px)]"
          : "px-1 text-[7.5px] xl:px-1.5 xl:text-[clamp(8px,0.6vw,10.5px)]"
      } ${bars[bar.tone]}`}
      style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
    >
      <span className="truncate">{bar.label}</span>
      {bar.tone === "training" && (
        <span className="absolute right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/65 xl:right-2 xl:h-2 xl:w-2" />
      )}
    </div>
  );
}

function SportsEventBarItem({
  event,
  onHover,
}: {
  event: SportsEvent;
  onHover: (event: SportsEvent | null) => void;
}) {
  const gradient = EVENT_GRADIENTS[event.colorTone] || EVENT_GRADIENTS.purple;

  return (
    <div
      onMouseEnter={() => onHover(event)}
      onMouseLeave={() => onHover(null)}
      className={`group absolute top-1/2 z-20 flex h-[20px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full px-1.5 text-[8px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(109,40,217,0.35)] transition-all hover:scale-[1.03] hover:z-30 xl:h-[clamp(22px,1.7vw,28px)] xl:px-2 xl:text-[clamp(8.5px,0.65vw,11px)] ${gradient}`}
      style={{ left: `${event.left}%`, width: `${event.width}%` }}
      title={`${event.title} (${event.dateRange}) ณ ${event.location}`}
    >
      <span className="mr-1 shrink-0 text-[10px]">🏆</span>
      <span className="truncate">{event.dateRange}</span>

      {/* Tooltip on hover */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0f172a] px-2.5 py-1.5 text-[11px] font-normal text-white shadow-xl group-hover:block">
        <p className="font-bold text-[#c4b5fd]">{event.title}</p>
        <p className="text-[10px] text-[#cbd5e1]">
          📅 {event.dateRange} • 📍 {event.location}
        </p>
        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#0f172a]" />
      </div>
    </div>
  );
}

export function TimelineSchedule() {
  const isAdmin = useIsAdmin();
  const { courses } = useCourses();
  const { events, deleteSportsEvent } = useSportsEvents();
  const [showSportsEvents, setShowSportsEvents] = useState(true);
  const [highlightFreeSlots, setHighlightFreeSlots] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SportsEvent | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<SportsEvent | null>(null);

  const rows = courses.map(buildCourseTimelineRow);

  function handleSaveCourse(patch: CourseUpdate): boolean {
    if (!editingCourse) return false;
    updateCourse(editingCourse.id, patch);
    return true;
  }

  return (
    <>
      <section className="mx-auto mt-[7px] w-full max-w-[880px] rounded-2xl border border-[#e0e5e8] bg-white p-3 shadow-[0_2px_8px_rgba(16,24,40,0.06)] xl:mt-[clamp(8px,0.75vw,12px)] xl:max-w-[clamp(980px,72vw,1280px)] xl:rounded-[clamp(14px,1vw,18px)] xl:p-[clamp(12px,1vw,18px)]">
        {/* Top Control Bar: Toggles & Add Button */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-[#eef2f6] pb-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                  {events.length}
                </span>
              </span>
            </label>

            {/* Toggle: Free Slots Highlight */}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] transition hover:bg-[#f1f5f9]">
              <input
                type="checkbox"
                checked={highlightFreeSlots}
                onChange={(e) => setHighlightFreeSlots(e.target.checked)}
                className="h-3.5 w-3.5 rounded text-[#10b981] focus:ring-[#10b981]"
              />
              <span className="flex items-center gap-1">
                <span>✨</span>
                <span>ไฮไลต์ช่วงเวลาว่าง (Free Slots)</span>
              </span>
            </label>
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#f3e8ff] px-2.5 py-0.5 text-[10px] font-semibold text-[#6d28d9] border border-[#ddd6fe]">
                🔐 สิทธิ์ Admin: แก้ไขปฏิทินได้
              </span>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#7c3aed] px-3 text-[11.5px] font-semibold text-white shadow-sm transition hover:bg-[#6d28d9] active:scale-[0.98]"
              >
                <span>+ เพิ่มรายการแข่งขัน</span>
              </button>
              <SyncDefaultsButton />
              <button
                type="button"
                onClick={() => {
                  if (confirm("ต้องการคืนค่ารายการแข่งขันกีฬาเป็นค่ามาตรฐานหรือไม่?")) {
                    resetSportsEvents();
                  }
                }}
                title="คืนค่าเป็นปฏิทินมาตรฐาน กกท."
                className="h-8 rounded-lg border border-[#e2e8f0] bg-white px-2 text-[11px] font-medium text-[#64748b] transition hover:bg-[#f8fafc]"
              >
                คืนค่าเริ่มต้น
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/login?next=/timeline"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-medium text-[#64748b] transition hover:border-[#16265e] hover:bg-white hover:text-[#16265e]"
                title="เข้าสู่ระบบผู้ดูแลเพื่อจัดการหรือเพิ่มปฏิทินแข่งขันกีฬา"
              >
                <span>🔒 เข้าสู่ระบบจัดการปฏิทิน (Admin)</span>
              </Link>
            </div>
          )}
        </div>

        <Legend
          showSportsEvents={showSportsEvents}
          highlightFreeSlots={highlightFreeSlots}
        />

        {/* Timeline Table */}
        <div className="mt-3 overflow-x-auto pb-0.5 xl:mt-[clamp(10px,0.8vw,14px)]">
          <table className="w-full min-w-[700px] table-fixed border-collapse text-[#1f2937]">
            <colgroup>
              <col className="w-[24%]" />
              <col />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr className="bg-[#f2f4f6] text-[10px] font-semibold text-[#28303b] xl:text-[clamp(10.5px,0.8vw,13px)]">
                {columns.map((column, index) => (
                  <th
                    key={column}
                    scope="col"
                    className={`h-[26px] border border-[#d8dee4] px-1 text-center font-semibold xl:h-[clamp(28px,2vw,36px)] xl:px-2 ${
                      index === 0 ? "border-l-0" : ""
                    }`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Training Courses Rows */}
              {rows.map((row) => (
                <tr
                  key={row.course.id}
                  className="min-h-[44px] transition hover:bg-[#f8fafc] xl:h-[clamp(48px,3.4vw,64px)]"
                >
                  <th
                    scope="row"
                    className="border border-t-0 border-l-0 border-[#d8dee4] px-2 py-1.5 text-left align-middle text-[9.5px] font-semibold leading-[1.25] xl:px-3 xl:text-[clamp(10.5px,0.8vw,12.5px)]"
                  >
                    <div className="flex flex-col gap-0.5">
                      {row.shortBadge && (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center rounded bg-[#eef2f9] px-1.5 py-0.2 text-[8px] font-bold text-[#16265E]">
                            {row.shortBadge}
                          </span>
                          <span className="text-[8px] font-semibold text-[#059669]">
                            ({row.sessionSummary})
                          </span>
                        </div>
                      )}
                      <span className="line-clamp-2 font-bold text-[#111827]" title={row.title}>
                        {row.title}
                      </span>
                      <span className="mt-0.5 block text-[8.5px] font-normal leading-[1.15] text-[#4b5563] xl:text-[clamp(9px,0.65vw,10.5px)]">
                        📅 {row.dateSummary}
                      </span>
                      {isAdmin && (
                        <div className="mt-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingCourse(row.course)}
                            className="inline-flex items-center gap-0.5 rounded border border-[#cbd5e1] bg-white px-1.5 py-0.5 text-[8.5px] font-semibold text-[#16265E] transition hover:border-[#16265E] hover:bg-[#eef2f9] active:scale-[0.98]"
                          >
                            <span>✏️ แก้ไขหลักสูตร</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                  <td colSpan={4} className="relative border border-t-0 border-r-0 border-[#d8dee4] p-0">
                    <div className="relative h-[46px] overflow-hidden xl:h-[clamp(48px,3.4vw,64px)]">
                      {/* Grid background 4 columns */}
                      <div className="pointer-events-none absolute inset-0 grid grid-cols-4" aria-hidden="true">
                        <span className="border-r border-[#edf0f2]" />
                        <span className="border-r border-[#edf0f2]" />
                        <span className="border-r border-[#edf0f2]" />
                        <span />
                      </div>

                      {/* Free Slots Vertical Shading */}
                      {highlightFreeSlots && (
                        <div className="pointer-events-none absolute inset-0 z-0">
                          {FREE_SLOTS.map((slot) => (
                            <div
                              key={slot.id}
                              className="absolute top-0 bottom-0 bg-emerald-500/[0.09] border-x border-emerald-400/30"
                              style={{ left: `${slot.left}%`, width: `${slot.width}%` }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Course Bars */}
                      {row.bars.map((bar, idx) => (
                        <TimelineBarItem key={`${row.course.id}-${bar.tone}-${idx}`} bar={bar} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}

              {/* Sports Events Section Header */}
              {showSportsEvents && (
                <>
                  <tr className="bg-gradient-to-r from-[#f5f3ff] to-[#faf5ff] text-[10.5px] font-bold text-[#6d28d9]">
                    <th
                      colSpan={5}
                      className="border border-x-0 border-[#ddd6fe] px-3 py-1.5 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>🏆</span>
                          <span>ปฏิทินการแข่งขันกีฬาสำคัญ ประจำปี 2570 (กกท.)</span>
                          <span className="rounded-full bg-[#ede9fe] px-2 py-0.5 text-[9.5px] font-medium text-[#7c3aed]">
                            เปรียบเทียบตารางว่าง ({events.length} รายการ)
                          </span>
                        </span>
                        <span className="text-[10px] font-normal text-[#7c3aed]">
                          *สามารถเปิด/ปิดได้จากปุ่มควบคุมด้านบน
                        </span>
                      </div>
                    </th>
                  </tr>

                  {/* Sports Events Rows */}
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="h-[37px] bg-[#faf5ff]/40 transition hover:bg-[#f5f3ff]/60 xl:h-[clamp(43px,3.1vw,58px)]"
                    >
                      <th
                        scope="row"
                        className="border border-t-0 border-l-0 border-[#d8dee4] px-2 py-1.5 text-left align-middle text-[9.5px] font-semibold leading-[1.2] xl:px-3 xl:text-[clamp(10.5px,0.8vw,12.5px)]"
                      >
                        <div className="flex flex-col justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="rounded bg-[#ede9fe] px-1 py-0.2 text-[8px] font-bold text-[#7c3aed]">
                                {event.categoryLabel}
                              </span>
                            </div>
                            <span className="mt-0.5 block font-bold text-[#1e1b4b]">
                              {event.title}
                            </span>
                            <span className="mt-0.5 block text-[8px] font-normal text-[#64748b]">
                              📍 {event.location}
                            </span>
                          </div>

                          {isAdmin && (
                            <div className="mt-1 flex items-center gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setEditingEvent(event)}
                                title="แก้ไขข้อมูลรายการแข่งขันนี้"
                                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8.5px] font-semibold text-[#6d28d9] bg-[#f5f3ff] border border-[#ddd6fe] hover:bg-[#ede9fe] transition active:scale-[0.98]"
                              >
                                <span>✏️ แก้ไข</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`ต้องการลบรายการ "${event.title}" ออกจากปฏิทินหรือไม่?`)) {
                                    deleteSportsEvent(event.id);
                                  }
                                }}
                                title="ลบรายการแข่งขันนี้"
                                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8.5px] font-semibold text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca] hover:bg-[#fee2e2] transition active:scale-[0.98]"
                              >
                                <span>🗑️ ลบ</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </th>

                      <td colSpan={4} className="relative border border-t-0 border-r-0 border-[#d8dee4] p-0">
                        <div className="relative h-[48px] overflow-hidden xl:h-[clamp(50px,3.4vw,62px)]">
                          {/* Grid background 4 columns */}
                          <div className="pointer-events-none absolute inset-0 grid grid-cols-4" aria-hidden="true">
                            <span className="border-r border-[#edf0f2]" />
                            <span className="border-r border-[#edf0f2]" />
                            <span className="border-r border-[#edf0f2]" />
                            <span />
                          </div>

                          {/* Free Slots Vertical Shading */}
                          {highlightFreeSlots && (
                            <div className="pointer-events-none absolute inset-0 z-0">
                              {FREE_SLOTS.map((slot) => (
                                <div
                                  key={slot.id}
                                  className="absolute top-0 bottom-0 bg-emerald-500/[0.09] border-x border-emerald-400/30"
                                  style={{ left: `${slot.left}%`, width: `${slot.width}%` }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Sports Event Bar */}
                          <SportsEventBarItem
                            event={event}
                            onHover={setHoveredEvent}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Hover Info Banner */}
        {hoveredEvent && (
          <div className="mt-2.5 flex items-center justify-between rounded-lg border border-[#ddd6fe] bg-[#f5f3ff] px-3 py-1.5 text-[11.5px] text-[#5b21b6] animate-in fade-in duration-150">
            <span className="font-semibold">
              🏆 {hoveredEvent.title} ({hoveredEvent.categoryLabel})
            </span>
            <span>
              📅 {hoveredEvent.dateRange} • 📍 {hoveredEvent.location}
            </span>
          </div>
        )}
      </section>

      {/* Executive Gap Analysis Card */}
      {highlightFreeSlots && (
        <section className="mx-auto mt-3.5 w-full max-w-[880px] rounded-2xl border border-[#a7f3d0] bg-gradient-to-br from-[#f0fdf4] to-[#f8fafc] p-4 shadow-[0_2px_8px_rgba(16,185,129,0.08)] xl:max-w-[clamp(980px,72vw,1280px)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#bbf7d0] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d1fae5] text-base">
                📊
              </span>
              <div>
                <h3 className="text-[14px] font-bold text-[#065f46]">
                  บทวิเคราะห์ช่วงเวลาว่างสำหรับผู้บริหาร (Executive Slot &amp; Opportunity Analysis)
                </h3>
                <p className="text-[11px] text-[#047857]">
                  ระบุช่วงเวลาที่ไม่มีการอบรมและการแข่งขันชนกัน เพื่อใช้ในการพิจารณาเพิ่มหรือขยับตารางหลักสูตร
                </p>
              </div>
            </div>
            <span className="rounded-full bg-[#d1fae5] px-2.5 py-0.5 text-[11px] font-bold text-[#065f46]">
              พบ 3 ช่วงเวลาว่าง
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[12px]">
            {FREE_SLOTS.map((slot, index) => (
              <div
                key={slot.id}
                className="rounded-xl border border-[#bbf7d0] bg-white p-3 shadow-sm hover:border-[#10b981] transition"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10.5px] font-bold text-[#15803d]">
                    ช่วงที่ {index + 1}: {slot.label}
                  </span>
                  <span className="text-[10px] font-medium text-[#6b7280]">
                    2570
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

          {/* Tournament Clash Watch */}
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] p-2.5 text-[11.5px] text-[#065f46]">
            <span className="text-base shrink-0">✅</span>
            <div>
              <span className="font-bold">สรุปภาพรวมตารางปี 2570 ({courses.length} หลักสูตร): </span>
              แผนการจัดอบรมทั้ง {courses.length} หลักสูตร ถูกวางกระจายในช่วงไตรมาส 1 – ไตรมาส 3 (ก.พ. – ส.ค. 2570) ทำให้{" "}
              <span className="font-semibold underline">ไม่ชนกับช่วงมหกรรมกีฬาใหญ่ในไตรมาส 4 (ต.ค. – ธ.ค. 2570)</span>{" "}
              บุคลากรและผู้ฝึกสอนสามารถเข้าร่วมอบรมได้เต็มเวลาโดยไม่กระทบภารกิจการแข่งขัน
            </div>
          </div>
        </section>
      )}

      {/* Add Sports Event Modal */}
      <AddSportsEventDialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
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
