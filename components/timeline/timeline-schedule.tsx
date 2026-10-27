"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useIsAdmin } from "@/lib/admin-auth";
import defaultTimelineSettings from "@/data/timeline-settings.json";
import {
  formatCourseDateFields,
  getCourseScheduleDates,
  getGlobalCourseSchedule,
  parseCourseDateFields,
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
  TIMELINE_SLOTS,
  dateToTimelinePercent,
  getEventYear,
  yearMonthToSlotIndex,
  resetSportsEvents,
} from "@/lib/sports-events-store";
import { CourseEditDialog } from "@/components/admin/course-edit-dialog";
import { GlobalScheduleCard } from "@/components/admin/global-schedule-card";
import { AddSportsEventDialog } from "@/components/timeline/add-sports-event-dialog";
import { EditSportsEventDialog } from "@/components/timeline/edit-sports-event-dialog";
import { SyncDefaultsButton } from "@/components/admin/sync-defaults-button";

type BarTone = "open" | "review" | "training" | "result";
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
  subCount: number;
}

interface TimelineRow {
  course: Course;
  year: number;
  quarterLabel: string;
  title: string;
  shortBadge?: string;
  location: string;
  compactSeats: string;
  isCustomSchedule: boolean;
  registrationDate: string;
  resultDate: string;
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

function getCourseYear(course: Course): number {
  const sessions = parseCourseDateSessions(course.date);
  const yr = sessions[0]?.yearBE;
  if (yr && yr >= 2568 && yr <= 2580) return yr;
  const match = course.date.match(/(25\d{2})/);
  return match ? parseInt(match[1], 10) : 2570;
}

function buildScheduleBars(
  registrationDate: string,
  resultDate: string,
  contextTitle: string
): TimelineBar[] {
  const subPhaseBars: TimelineBar[] = [];
  const regF = parseCourseDateFields(registrationDate);
  const regStartYear =
    regF.startMonth > regF.endMonth ? regF.yearBE - 1 : regF.yearBE;
  const regLeft = dateToTimelinePercent(
    regF.startDay,
    regF.startMonth + 1,
    regStartYear
  );
  const regRight = dateToTimelinePercent(
    regF.endDay + 1,
    regF.endMonth + 1,
    regF.yearBE
  );
  const regWidth = Math.max(2.0, Math.round((regRight - regLeft) * 10) / 10);
  subPhaseBars.push({
    label: registrationDate,
    tooltip: `📥 เปิดรับสมัคร: ${registrationDate} (${contextTitle})`,
    tone: "open",
    left: Math.round(regLeft * 10) / 10,
    width: regWidth,
  });

  const resF = parseCourseDateFields(resultDate);
  const resStartYear =
    resF.startMonth > resF.endMonth ? resF.yearBE - 1 : resF.yearBE;
  const resLeft = dateToTimelinePercent(
    resF.startDay,
    resF.startMonth + 1,
    resStartYear
  );
  const resRight = dateToTimelinePercent(
    resF.endDay + 1,
    resF.endMonth + 1,
    resF.yearBE
  );
  const resWidth = Math.max(1.4, Math.round((resRight - resLeft) * 10) / 10);
  subPhaseBars.push({
    label: resultDate,
    tooltip: `📣 วันประกาศผล: ${resultDate} (${contextTitle})`,
    tone: "result",
    left: Math.round(resLeft * 10) / 10,
    width: resWidth,
  });

  return subPhaseBars;
}

function buildCourseTimelineRow(
  course: Course,
  allCourses: Course[]
): TimelineRow {
  const sessions = parseCourseDateSessions(course.date);
  const year = getCourseYear(course);

  const firstSession = sessions[0];
  const firstSlotIdx = firstSession
    ? yearMonthToSlotIndex(firstSession.startMonth + 1, firstSession.yearBE)
    : 4;
  const quarterLabel =
    TIMELINE_SLOTS[firstSlotIdx]?.quarterLabel ?? "ไตรมาส 2";

  const totalDays = sessions.reduce((acc, s) => {
    const yearCE = s.yearBE - 543;
    const start = new Date(yearCE, s.startMonth, s.startDay);
    const end = new Date(yearCE, s.endMonth, s.endDay);
    const diff =
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return acc + Math.max(1, diff);
  }, 0);

  const rawSegments: SessionSegment[] = sessions.map((s) => {
    const sLeft = dateToTimelinePercent(s.startDay, s.startMonth + 1, s.yearBE);
    const sRight = dateToTimelinePercent(
      s.endDay + 1,
      s.endMonth + 1,
      s.yearBE
    );
    const sWidth = Math.max(1.4, Math.round((sRight - sLeft) * 10) / 10);
    return {
      left: Math.round(sLeft * 10) / 10,
      width: sWidth,
      label: formatCourseDateFields(s, false),
      subCount: 1,
    };
  });

  // Merge adjacent segments that are very close (e.g. within the same month) so they don't overlap as tiny blobs
  const sessionSegments: SessionSegment[] = [];
  for (const seg of rawSegments) {
    const prev = sessionSegments[sessionSegments.length - 1];
    if (prev && seg.left - (prev.left + prev.width) <= 2.4) {
      const mergedRight = Math.max(
        prev.left + prev.width,
        seg.left + seg.width
      );
      prev.width = Math.max(
        2.2,
        Math.round((mergedRight - prev.left) * 10) / 10
      );
      prev.label = `${prev.label}, ${seg.label}`;
      prev.subCount += 1;
    } else {
      sessionSegments.push({ ...seg });
    }
  }

  const firstSeg = sessionSegments[0] ?? {
    left: 25,
    width: 4,
    label: course.date,
    subCount: 1,
  };
  const lastSeg = sessionSegments[sessionSegments.length - 1] ?? firstSeg;

  const spanLeft = firstSeg.left;
  const spanRight = lastSeg.left + lastSeg.width;
  const spanWidth = Math.max(2.0, Math.round((spanRight - spanLeft) * 10) / 10);

  const compactDateLabel = course.date.replace(/\s*25\d{2}$/, "").trim();
  const sched = getCourseScheduleDates(course, allCourses);
  const subPhaseBars = buildScheduleBars(
    sched.registrationDate,
    sched.resultDate,
    course.title
  );

  const normalizedShortBadge =
    course.shortTitle === "วิทยาศาสตร์การกีฬา" &&
    course.title.includes("งบประมาณ")
      ? "งบประมาณและพัสดุ"
      : course.shortTitle;

  const compactSeats =
    course.seats.replace(/^จำนวนที่นั่ง\s*/, "").trim() || course.seats;

  return {
    course,
    year,
    quarterLabel,
    title: course.title,
    shortBadge: normalizedShortBadge,
    location: course.location,
    compactSeats,
    isCustomSchedule: sched.isCustom,
    registrationDate: sched.registrationDate,
    resultDate: sched.resultDate,
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
 * Free slots across the Fiscal Year 2570 (Oct 2569 – Sep 2570)
 */
const FREE_SLOTS = [
  {
    id: "slot-1",
    label: "ว่างไตรมาส 1 (ต.ค. – ธ.ค. 69)",
    dateRange: "1 ต.ค. – 25 ธ.ค. 2569",
    left: dateToTimelinePercent(1, 10, 2569),
    width: 17.5,
    description:
      "ช่วงต้นปีงบประมาณ 2570 ก่อนเริ่มหลักสูตรผู้บริหารในเดือน ก.พ. 2570",
  },
  {
    id: "slot-2",
    label: "ว่างช่วง มี.ค. – เม.ย. 70",
    dateRange: "5 มี.ค. – 30 เม.ย. 2570",
    left: dateToTimelinePercent(5, 3, 2570),
    width: 11.4,
    description:
      "หลังจบหลักสูตรผู้บริหาร (ก.พ. 70) และก่อนเริ่มช่วงเดือน พ.ค. 70",
  },
  {
    id: "slot-3",
    label: "ว่างช่วง มิ.ย. – ก.ค. 70 (แนะนำ)",
    dateRange: "1 มิ.ย. – 25 ก.ค. 2570",
    left: dateToTimelinePercent(1, 6, 2570),
    width: 11.2,
    description:
      "ช่วงกลางปีงบประมาณ ไม่มีรายการแข่งขันกีฬาใหญ่ชน เหมาะจัดอบรมเพิ่มเติม",
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
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-[11px] text-[#374151]">
      <span className="inline-flex items-center gap-1.5 font-semibold text-[#166534]">
        <span className="h-3 w-5 rounded-full bg-[#16803c] shadow-xs" />
        ช่วงวันจัดอบรมจริง (ปีงบฯ 2570)
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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-2.5 py-0.5 font-semibold text-[#6d28d9]">
          <span>🏆</span>
          รายการแข่งขันกีฬา กกท.
        </span>
      )}

      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e8f0] bg-white px-2.5 py-0.5 text-[10.5px] font-medium text-[#4c1d95]">
        <span className="h-2 w-2 rounded-full bg-[#6d28d9]" />
        คอลัมน์ขวาสุด (ต.ค. 70 – ม.ค. 71) = ช่วงต่อเนื่องหลังสิ้นสุดปีงบฯ 2570
      </span>

      {highlightFreeSlots && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-0.5 font-semibold text-[#059669]">
          <span>✨</span>
          ช่วงเวลาว่าง (Free Slot)
        </span>
      )}
    </div>
  );
}

function GlobalScheduleTrack({
  registrationDate,
  resultDate,
}: {
  registrationDate: string;
  resultDate: string;
}) {
  const scheduleBars = buildScheduleBars(
    registrationDate,
    resultDate,
    "กำหนดการกลางทุกหลักสูตร"
  );
  const regBar = scheduleBars[0];
  const resBar = scheduleBars[1];

  const regPlaceLeft = regBar ? regBar.left + regBar.width > 64 : false;
  const resPlaceLeft = resBar ? resBar.left + resBar.width > 64 : false;

  return (
    <>
      {/* Lane 1 (Top): Registration Period */}
      {regBar && (
        <>
          <div
            title={regBar.tooltip}
            className="absolute top-[7px] z-20 flex h-[20px] items-center justify-center rounded-full bg-gradient-to-r from-[#1869bc] to-[#1d4ed8] px-2 text-[9px] font-bold text-white shadow-[0_2px_5px_rgba(24,105,188,0.28)] ring-1 ring-white"
            style={{ left: `${regBar.left}%`, width: `${regBar.width}%` }}
          >
            {regBar.width >= 4.2 ? (
              <span className="truncate">📥 รับสมัคร</span>
            ) : (
              <span className="text-[9px]">📥</span>
            )}
          </div>
          <div
            className="pointer-events-none absolute top-[7px] z-30 flex h-[20px] items-center whitespace-nowrap"
            style={
              regPlaceLeft
                ? { right: `${100 - regBar.left + 0.6}%` }
                : { left: `${regBar.left + regBar.width + 0.6}%` }
            }
          >
            <span className="inline-flex items-center gap-1 rounded-md border border-[#bfdbfe] bg-[#eff6ff]/95 px-2 py-0.5 text-[9.5px] font-bold text-[#1e40af] shadow-2xs">
              <span>เปิดรับสมัคร: {registrationDate}</span>
            </span>
          </div>
        </>
      )}

      {/* Lane 2 (Bottom): Result Announcement Date */}
      {resBar && (
        <>
          <div
            title={resBar.tooltip}
            className="absolute bottom-[7px] z-20 flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-[#dc2626] to-[#b91c1c] px-1.5 text-[9px] font-bold text-white shadow-[0_2px_5px_rgba(220,38,38,0.3)] ring-1 ring-white"
            style={{
              left: `${resBar.left}%`,
              width: `${Math.max(1.8, resBar.width)}%`,
            }}
          >
            <span className="text-[9.5px] leading-none">📣</span>
          </div>
          <div
            className="pointer-events-none absolute bottom-[7px] z-30 flex h-[20px] items-center whitespace-nowrap"
            style={
              resPlaceLeft
                ? { right: `${100 - resBar.left + 0.6}%` }
                : {
                    left: `${
                      resBar.left + Math.max(1.8, resBar.width) + 0.6
                    }%`,
                  }
            }
          >
            <span className="inline-flex items-center gap-1 rounded-md border border-[#fecaca] bg-[#fef2f2]/95 px-2 py-0.5 text-[9.5px] font-bold text-[#991b1b] shadow-2xs">
              <span>ประกาศผล: {resultDate}</span>
            </span>
          </div>
        </>
      )}
    </>
  );
}

function CourseTrainingTrack({
  row,
  showSubPhases,
}: {
  row: TimelineRow;
  showSubPhases: boolean;
}) {
  const placeLabelOnLeft = row.spanLeft + row.spanWidth > 62;
  const sessionDetails = row.sessions
    .map((s, idx) => `ช่วงที่ ${idx + 1}: ${formatCourseDateFields(s, false)}`)
    .join(" | ");

  const fullTooltip =
    row.sessions.length > 1
      ? `${row.title} — จัดอบรม ${row.sessions.length} ช่วง (รวม ${row.totalDays} วัน): ${sessionDetails}`
      : `${row.title} — จัดอบรม (${row.totalDays} วัน): ${row.dateSummary}`;

  const showCustomPhase = showSubPhases && row.isCustomSchedule;
  const regBar = row.subPhaseBars[0];
  const resBar = row.subPhaseBars[1];

  return (
    <>
      {/* Optional custom registration/result lane ONLY for courses that override the global schedule */}
      {showCustomPhase && (
        <>
          {regBar && (
            <div
              title={regBar.tooltip}
              className="absolute top-[5px] z-10 flex h-[16px] items-center justify-center rounded-full bg-[#1869bc] px-1.5 text-[8px] font-bold text-white shadow-2xs"
              style={{ left: `${regBar.left}%`, width: `${regBar.width}%` }}
            >
              <span className="truncate">📥 รับสมัคร</span>
            </div>
          )}
          {resBar && (
            <div
              title={resBar.tooltip}
              className="absolute top-[5px] z-15 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#c4080f] px-1 text-[8px] font-bold text-white shadow-2xs"
              style={{
                left: `${resBar.left}%`,
                width: `${Math.max(1.5, resBar.width)}%`,
              }}
            >
              <span>📣</span>
            </div>
          )}
        </>
      )}

      {row.sessionSegments.length > 1 && (
        <div
          title={fullTooltip}
          className={`absolute z-10 h-[10px] rounded-full border border-[#16803c]/40 bg-[#dcfce7] ${
            showCustomPhase ? "bottom-[11px]" : "top-1/2 -translate-y-1/2"
          }`}
          style={{ left: `${row.spanLeft}%`, width: `${row.spanWidth}%` }}
        />
      )}

      {row.sessionSegments.map((seg, idx) => (
        <div
          key={`${row.course.id}-seg-${idx}`}
          title={`${seg.label} (${row.title})`}
          className={`group absolute z-20 flex h-[22px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-[#16a34a] to-[#15803d] px-1.5 text-[9px] font-bold text-white shadow-[0_2px_5px_rgba(22,163,74,0.3)] ring-1 ring-white transition-transform hover:scale-105 ${
            showCustomPhase ? "bottom-[5px]" : "top-1/2 -translate-y-1/2"
          }`}
          style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
        >
          {seg.subCount > 1 && (
            <div
              className="pointer-events-none absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${seg.subCount}, minmax(0, 1fr))`,
              }}
              aria-hidden="true"
            >
              {Array.from({ length: seg.subCount }).map((_, subIdx) => (
                <span
                  key={subIdx}
                  className={
                    subIdx < seg.subCount - 1
                      ? "border-r border-dashed border-white/55"
                      : ""
                  }
                />
              ))}
            </div>
          )}
          {seg.width >= 9.5 ? (
            <span className="relative z-10 truncate">{seg.label}</span>
          ) : (
            <span className="relative z-10 text-[9.5px] leading-none">🎓</span>
          )}
        </div>
      ))}

      {/* Always show crisp external date & day-count label so it is never hidden or truncated */}
      <div
        title={fullTooltip}
        className={`pointer-events-none absolute z-30 whitespace-nowrap ${
          showCustomPhase
            ? "bottom-[5px] flex h-[22px] items-center"
            : "top-1/2 -translate-y-1/2"
        }`}
        style={
          placeLabelOnLeft
            ? { right: `${100 - row.spanLeft + 0.7}%` }
            : { left: `${row.spanLeft + row.spanWidth + 0.7}%` }
        }
      >
        <span className="inline-flex items-center gap-1 rounded-md border border-[#bbf7d0] bg-[#f0fdf4]/95 px-2 py-0.5 text-[10px] font-bold text-[#166534] shadow-2xs">
          <span>{row.compactDateLabel}</span>
          <span className="font-normal text-[#15803d]">
            ({row.sessionSummary})
          </span>
        </span>
      </div>
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
  const badgeStyle =
    EVENT_TEXT_COLORS[event.colorTone] || EVENT_TEXT_COLORS.purple;
  const placeLabelOnLeft = event.left + event.width > 64;

  return (
    <>
      <div
        onMouseEnter={() => onHover(event)}
        onMouseLeave={() => onHover(null)}
        onClick={() => isAdmin && onClickEdit?.(event)}
        className={`group absolute top-1/2 z-20 flex h-[22px] -translate-y-1/2 items-center justify-center rounded-full px-1.5 text-[9px] font-bold leading-none text-white shadow-[0_2px_6px_rgba(109,40,217,0.3)] ring-1 ring-white transition-all hover:z-30 hover:scale-105 ${
          isAdmin ? "cursor-pointer" : "cursor-default"
        } ${gradient}`}
        style={{ left: `${event.left}%`, width: `${event.width}%` }}
        title={`${event.title} (${event.dateRange}) ณ ${event.location}`}
      >
        <span className="text-[10px]">🏆</span>
      </div>

      <div
        onMouseEnter={() => onHover(event)}
        onMouseLeave={() => onHover(null)}
        onClick={() => isAdmin && onClickEdit?.(event)}
        className={`absolute top-1/2 z-25 -translate-y-1/2 whitespace-nowrap ${
          isAdmin ? "cursor-pointer" : "cursor-default"
        }`}
        style={
          placeLabelOnLeft
            ? { right: `${100 - event.left + 0.7}%` }
            : { left: `${event.left + event.width + 0.7}%` }
        }
      >
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-2xs transition hover:brightness-95 ${badgeStyle}`}
        >
          <span>{event.dateRange}</span>
          <span className="font-normal opacity-80">• {event.location}</span>
        </span>
      </div>
    </>
  );
}

const TIMELINE_SETTINGS_KEY = "sat-timeline-display-settings-v1";

export function TimelineSchedule() {
  const isAdmin = useIsAdmin();
  const { courses } = useCourses();
  const { events, deleteSportsEvent } = useSportsEvents();

  const [viewMode, setViewMode] = useState<ViewMode>("gantt");
  const [showSportsEvents, setShowSportsEvents] = useState<boolean>(
    defaultTimelineSettings.showSportsEvents ?? true
  );
  const [showSubPhases, setShowSubPhases] = useState<boolean>(
    defaultTimelineSettings.showSubPhases ?? true
  );
  const [highlightFreeSlots, setHighlightFreeSlots] = useState(false);
  const [onlyActiveMonths, setOnlyActiveMonths] = useState<boolean>(
    defaultTimelineSettings.onlyActiveMonths ?? true
  );
  const [previewAsApplicant, setPreviewAsApplicant] = useState(false);

  const canEdit = isAdmin && !previewAsApplicant;
  const effectiveHighlightFreeSlots = canEdit && highlightFreeSlots;
  const globalSchedule = getGlobalCourseSchedule(courses);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TIMELINE_SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        showSportsEvents?: boolean;
        showSubPhases?: boolean;
        onlyActiveMonths?: boolean;
      };
      if (typeof parsed.showSportsEvents === "boolean") {
        setShowSportsEvents(parsed.showSportsEvents);
      }
      if (typeof parsed.showSubPhases === "boolean") {
        setShowSubPhases(parsed.showSubPhases);
      }
      if (typeof parsed.onlyActiveMonths === "boolean") {
        setOnlyActiveMonths(parsed.onlyActiveMonths);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const updateDisplaySetting = (
    patch: Partial<{
      showSportsEvents: boolean;
      showSubPhases: boolean;
      onlyActiveMonths: boolean;
    }>
  ) => {
    const next = {
      showSportsEvents: patch.showSportsEvents ?? showSportsEvents,
      showSubPhases: patch.showSubPhases ?? showSubPhases,
      onlyActiveMonths: patch.onlyActiveMonths ?? onlyActiveMonths,
    };
    if (typeof patch.showSportsEvents === "boolean") {
      setShowSportsEvents(patch.showSportsEvents);
    }
    if (typeof patch.showSubPhases === "boolean") {
      setShowSubPhases(patch.showSubPhases);
    }
    if (typeof patch.onlyActiveMonths === "boolean") {
      setOnlyActiveMonths(patch.onlyActiveMonths);
    }
    try {
      window.localStorage.setItem(TIMELINE_SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    void fetch("/api/admin/save-defaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timelineSettings: next }),
    }).catch(() => {});
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SportsEvent | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<SportsEvent | null>(null);
  const [toastNotice, setToastNotice] = useState("");

  const showToast = (msg: string) => {
    setToastNotice(msg);
    window.setTimeout(() => {
      setToastNotice((prev) => (prev === msg ? "" : prev));
    }, 4500);
  };

  const courseRows = courses
    .map((c) => buildCourseTimelineRow(c, courses))
    .sort((a, b) => a.spanLeft - b.spanLeft);
  const sortedEvents = [...events].sort((a, b) => a.left - b.left);

  function handleSaveCourse(patch: CourseUpdate): boolean {
    if (!editingCourse) return false;
    const result = updateCourse(editingCourse.id, patch);
    if (!result) return false;
    const modeText = patch.useCustomSchedule
      ? "(กำหนดวันแยกเฉพาะหลักสูตรนี้)"
      : "(ซิงก์กำหนดการกลางครบทุกหลักสูตร)";
    showToast(
      `บันทึกการแก้ไข "${result.course.title}" เรียบร้อยแล้ว ${modeText}`
    );
    setEditingCourse(null);
    return true;
  }

  return (
    <>
      {toastNotice && (
        <div
          role="status"
          className="fixed top-4 left-1/2 z-[90] flex w-[92vw] max-w-[620px] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-[#16a34a] bg-[#15803d] px-4 py-3 text-[12.5px] font-semibold text-white shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <span>{toastNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice("")}
            className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-white/25"
          >
            ปิด ✕
          </button>
        </div>
      )}
      <section className="mx-auto mt-[7px] w-full max-w-[960px] rounded-2xl border border-[#e0e5e8] bg-white p-3.5 shadow-[0_2px_10px_rgba(16,24,40,0.06)] xl:mt-[clamp(8px,0.75vw,12px)] xl:max-w-[clamp(1060px,80vw,1400px)] xl:rounded-[clamp(14px,1vw,18px)] xl:p-[clamp(14px,1.1vw,20px)]">
        {/* Top Row: Fiscal Year Title Badge + View Mode Switcher */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-[#eef2f6] pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#16265E] px-3 py-1.5 text-[12px] font-bold text-white shadow-xs">
              <span>📅</span>
              <span>ปีงบประมาณ พ.ศ. 2570 (ต.ค. 2569 – ก.ย. 2570)</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#ddd6fe] bg-[#f5f3ff] px-2.5 py-1 text-[11.5px] font-semibold text-[#5b21b6]">
              <span>➕</span>
              <span>รวมช่วงต่อเนื่อง ต.ค. 2570 – ม.ค. 2571</span>
            </span>
          </div>

          {/* View Mode Toggle */}
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
              <span>ตาราง Timeline ต่อเนื่อง</span>
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

        {/* Admin Mode Switcher Banner (Visible ONLY to authenticated Admins) */}
        {isAdmin && (
          <div
            className={`mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2 text-[11.5px] transition ${
              previewAsApplicant
                ? "border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1]"
                : "border-[#c7d2fe] bg-[#eef2ff] text-[#1e3a8a]"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-white ${
                  previewAsApplicant ? "bg-[#0284c7]" : "bg-[#16265E]"
                }`}
              >
                {previewAsApplicant
                  ? "👁️ มุมมองผู้สมัครทั่วไป"
                  : "🛡️ โหมดผู้ดูแลระบบ (Admin)"}
              </span>
              <span className="font-medium">
                {previewAsApplicant
                  ? "กำลังจำลองหน้าจอที่ผู้สมัครทั่วไปมองเห็น (ซ่อนปุ่มแก้ไขและตั้งค่าทั้งหมด)"
                  : "คุณกำลังอยู่ในโหมดผู้ดูแลระบบ (ผู้สมัครทั่วไปจะไม่เห็นแถบนี้และปุ่มแก้ไขทั้งหมด)"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewAsApplicant((prev) => !prev)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold shadow-2xs transition ${
                  previewAsApplicant
                    ? "border-[#16265E] bg-[#16265E] text-white hover:bg-[#1e3a8a]"
                    : "border-[#cbd5e1] bg-white text-[#16265E] hover:bg-[#f8fafc]"
                }`}
              >
                {previewAsApplicant ? (
                  <>
                    <span>🔧</span>
                    <span>กลับสู่โหมดแก้ไข (Admin)</span>
                  </>
                ) : (
                  <>
                    <span>👁️</span>
                    <span>สลับดูมุมมองผู้สมัครทั่วไป</span>
                  </>
                )}
              </button>
              <Link
                href="/admin/courses"
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-2.5 text-[11px] font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
              >
                <span>⚙️ จัดการหลักสูตร</span>
              </Link>
            </div>
          </div>
        )}

        {/* Row 2: Display Options & Admin Actions (Visible ONLY to Admin in Edit Mode) */}
        {canEdit && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc]/70 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-[#1e3a8a]">
                ⚙️ ตั้งค่าการแสดงผลตาราง (บันทึกเป็นค่าเริ่มต้นให้ผู้สมัครเห็น):
              </span>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] shadow-2xs transition hover:bg-[#f1f5f9]">
                <input
                  type="checkbox"
                  checked={showSportsEvents}
                  onChange={(e) =>
                    updateDisplaySetting({ showSportsEvents: e.target.checked })
                  }
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

              {viewMode === "gantt" && (
                <>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] shadow-2xs transition hover:bg-[#f1f5f9]">
                    <input
                      type="checkbox"
                      checked={showSubPhases}
                      onChange={(e) =>
                        updateDisplaySetting({ showSubPhases: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded text-[#1869bc] focus:ring-[#1869bc]"
                    />
                    <span>แสดงวันรับสมัคร/ประกาศผล</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] shadow-2xs transition hover:bg-[#f1f5f9]">
                    <input
                      type="checkbox"
                      checked={highlightFreeSlots}
                      onChange={(e) => setHighlightFreeSlots(e.target.checked)}
                      className="h-3.5 w-3.5 rounded text-[#10b981] focus:ring-[#10b981]"
                    />
                    <span>✨ ไฮไลต์ช่วงเวลาว่าง (เฉพาะ Admin)</span>
                  </label>
                </>
              )}

              {viewMode === "monthly" && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#334155] shadow-2xs transition hover:bg-[#f1f5f9]">
                  <input
                    type="checkbox"
                    checked={onlyActiveMonths}
                    onChange={(e) =>
                      updateDisplaySetting({
                        onlyActiveMonths: e.target.checked,
                      })
                    }
                    className="h-3.5 w-3.5 rounded text-[#16265E] focus:ring-[#16265E]"
                  />
                  <span>แสดงเฉพาะเดือนที่มีกิจกรรม</span>
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
          </div>
        )}

        {canEdit && (
          <div className="mb-3">
            <GlobalScheduleCard onSaved={showToast} />
          </div>
        )}

        <Legend
          showSportsEvents={showSportsEvents}
          showSubPhases={showSubPhases}
          highlightFreeSlots={effectiveHighlightFreeSlots}
        />

        {/* ==================== VIEW MODE 1: 16-MONTH CONTINUOUS GANTT ==================== */}
        {viewMode === "gantt" && (
          <div className="mt-3 overflow-x-auto pb-1">
            <table className="w-full min-w-[920px] table-fixed border-collapse text-[#1f2937]">
              <colgroup>
                <col className="w-[24%]" />
                {TIMELINE_SLOTS.map((slot) => (
                  <col key={slot.index} className="w-[4.75%]" />
                ))}
              </colgroup>
              <thead>
                {/* Quarter Header Row */}
                <tr className="bg-[#16265E] text-[10.5px] font-bold text-white">
                  <th
                    rowSpan={2}
                    scope="col"
                    className="border border-[#1e3a8a] px-3 py-2 text-left align-middle text-[12px]"
                  >
                    <div>หลักสูตร / รายการแข่งขัน</div>
                    <div className="mt-0.5 text-[10px] font-normal text-white/80">
                      ปีงบฯ 2570 (ต.ค. 69 – ก.ย. 70) + ต่อเนื่อง
                    </div>
                  </th>
                  <th
                    colSpan={3}
                    scope="colgroup"
                    className="border border-[#27408b] py-1 text-center"
                  >
                    ไตรมาส 1 (ต.ค. – ธ.ค. 69)
                  </th>
                  <th
                    colSpan={3}
                    scope="colgroup"
                    className="border border-[#27408b] py-1 text-center"
                  >
                    ไตรมาส 2 (ม.ค. – มี.ค. 70)
                  </th>
                  <th
                    colSpan={3}
                    scope="colgroup"
                    className="border border-[#27408b] py-1 text-center"
                  >
                    ไตรมาส 3 (เม.ย. – มิ.ย. 70)
                  </th>
                  <th
                    colSpan={3}
                    scope="colgroup"
                    className="border border-[#27408b] border-r-2 border-r-[#f59e0b] py-1 text-center"
                  >
                    ไตรมาส 4 (ก.ค. – ก.ย. 70)
                  </th>
                  <th
                    colSpan={4}
                    scope="colgroup"
                    className="border border-[#5b21b6] bg-[#4c1d95] py-1 text-center text-[#f3e8ff]"
                  >
                    หลังปีงบฯ (ต.ค. 70 – ม.ค. 71)
                  </th>
                </tr>

                {/* 16 Individual Month Header Row */}
                <tr className="bg-[#f1f5f9] text-[9.5px] font-bold text-[#334155]">
                  {TIMELINE_SLOTS.map((slot) => (
                    <th
                      key={slot.index}
                      scope="col"
                      className={`h-[26px] border border-[#cbd5e1] px-0.5 text-center ${
                        slot.index === 11
                          ? "border-r-2 border-r-[#f59e0b]"
                          : slot.index % 3 === 2 && slot.index < 11
                          ? "border-r-[#94a3b8]"
                          : ""
                      } ${
                        slot.isPostFiscal
                          ? "bg-[#f5f3ff] text-[#5b21b6]"
                          : ""
                      }`}
                    >
                      {slot.shortLabel}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Dedicated Global Registration & Result Schedule Summary Row */}
                {showSubPhases && (
                  <tr className="bg-gradient-to-r from-[#eff6ff]/70 to-[#fef2f2]/40">
                    <th
                      scope="row"
                      className="border-b-2 border-r border-[#93c5fd] px-3 py-2 text-left align-middle text-[10.5px] leading-[1.35]"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center gap-1 rounded bg-[#1869bc] px-1.5 py-0.5 text-[9px] font-bold text-white">
                            🌐 กำหนดการกลางทุกหลักสูตร
                          </span>
                        </div>
                        <span className="mt-0.5 font-bold text-[#1e3a8a]">
                          ช่วงเปิดรับสมัคร &amp; วันประกาศผลรายชื่อ
                        </span>
                        <div className="mt-0.5 flex flex-col gap-0.5 text-[9.5px]">
                          <span className="font-semibold text-[#1869bc]">
                            📥 เปิดรับสมัคร: {globalSchedule.registrationDate}
                          </span>
                          <span className="font-semibold text-[#c4080f]">
                            📣 วันประกาศผล: {globalSchedule.resultDate}
                          </span>
                        </div>
                      </div>
                    </th>

                    <td
                      colSpan={16}
                      className="relative border-b-2 border-[#93c5fd] p-0"
                    >
                      <div className="relative h-[58px] overflow-hidden">
                        {/* 16 Month Grid Columns Background */}
                        <div
                          className="pointer-events-none absolute inset-0 grid"
                          style={{
                            gridTemplateColumns: "repeat(16, minmax(0, 1fr))",
                          }}
                          aria-hidden="true"
                        >
                          {TIMELINE_SLOTS.map((slot) => (
                            <span
                              key={slot.index}
                              className={`border-r ${
                                slot.index === 11
                                  ? "border-r-2 border-r-[#f59e0b]/70"
                                  : slot.index % 3 === 2 && slot.index < 11
                                  ? "border-r-[#cbd5e1]"
                                  : "border-r-[#eef2f6]"
                              } ${
                                slot.isPostFiscal
                                  ? "bg-[#faf5ff]/45"
                                  : slot.index % 2 === 1
                                  ? "bg-[#f8fafc]/40"
                                  : ""
                              }`}
                            />
                          ))}
                        </div>

                        <GlobalScheduleTrack
                          registrationDate={globalSchedule.registrationDate}
                          resultDate={globalSchedule.resultDate}
                        />
                      </div>
                    </td>
                  </tr>
                )}

                {/* Courses Section Header */}
                <tr className="bg-[#f0fdf4] text-[11px] font-bold text-[#166534]">
                  <th
                    colSpan={17}
                    className="border border-x-0 border-[#bbf7d0] px-3 py-1.5 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>🎓</span>
                        <span>
                          แผนกำหนดการฝึกอบรม ปีงบประมาณ 2570 (
                          {courseRows.length} หลักสูตร)
                        </span>
                      </span>
                      <span className="text-[10px] font-normal text-[#15803d]">
                        *เส้นสีส้มหลัง ก.ย. 70 คือจุดสิ้นสุดปีงบประมาณ 2570
                      </span>
                    </div>
                  </th>
                </tr>

                {courseRows.map((row, rowIndex) => (
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
                          <span className="inline-flex items-center rounded bg-[#dcfce7] px-1.5 py-0.2 text-[9px] font-bold text-[#166534]">
                            {row.quarterLabel}
                          </span>
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

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px]">
                          <span className="font-semibold text-[#1869bc]">
                            📥 รับสมัคร: {row.registrationDate}
                          </span>
                          <span className="font-semibold text-[#c4080f]">
                            📣 ประกาศผล: {row.resultDate}
                          </span>
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-[#475569]">
                          <span className="font-medium">
                            📍 {row.location}
                          </span>
                          <span className="font-semibold text-[#1e3a8a]">
                            • 👥 {row.compactSeats}
                          </span>
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1">
                          <span className="text-[9.5px] font-semibold text-[#166534]">
                            🎓 อบรม: {row.dateSummary}
                          </span>
                          {canEdit && (
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

                    {/* 16-Month Timeline Track */}
                    <td
                      colSpan={16}
                      className="relative border-b border-[#cbd5e1] p-0"
                    >
                      <div className="relative h-[50px] overflow-hidden">
                        {/* 16 Month Grid Columns Background */}
                        <div
                          className="pointer-events-none absolute inset-0 grid"
                          style={{
                            gridTemplateColumns: "repeat(16, minmax(0, 1fr))",
                          }}
                          aria-hidden="true"
                        >
                          {TIMELINE_SLOTS.map((slot) => (
                            <span
                              key={slot.index}
                              className={`border-r ${
                                slot.index === 11
                                  ? "border-r-2 border-r-[#f59e0b]/70"
                                  : slot.index % 3 === 2 && slot.index < 11
                                  ? "border-r-[#cbd5e1]"
                                  : "border-r-[#eef2f6]"
                              } ${
                                slot.isPostFiscal
                                  ? "bg-[#faf5ff]/45"
                                  : slot.index % 2 === 1
                                  ? "bg-[#f8fafc]/40"
                                  : ""
                              }`}
                            />
                          ))}
                        </div>

                        {effectiveHighlightFreeSlots && (
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

                        <CourseTrainingTrack
                          row={row}
                          showSubPhases={showSubPhases}
                        />
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Sports Events Section */}
                {showSportsEvents && (
                  <>
                    <tr className="bg-gradient-to-r from-[#f5f3ff] to-[#faf5ff] text-[11px] font-bold text-[#6d28d9]">
                      <th
                        colSpan={17}
                        className="border border-x-0 border-[#ddd6fe] px-3 py-1.5 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span>🏆</span>
                            <span>
                              ปฏิทินการแข่งขันกีฬาสำคัญ ({events.length} รายการ)
                            </span>
                          </span>
                          <span className="text-[10px] font-normal text-[#7c3aed]">
                            {canEdit
                              ? "*คลิกที่แถบสีหรือปุ่มแก้ไขเพื่อเปลี่ยนวันที่/ปี พ.ศ."
                              : "*วางตำแหน่งตามเดือนและปี พ.ศ. จริงของรายการแข่งขัน"}
                          </span>
                        </div>
                      </th>
                    </tr>

                    {sortedEvents.map((event) => {
                      const evtYear = getEventYear(event);
                      const slotIdx = yearMonthToSlotIndex(
                        event.startMonth,
                        evtYear
                      );
                      const slotInfo = TIMELINE_SLOTS[slotIdx];
                      return (
                        <tr
                          key={event.id}
                          className="bg-[#faf5ff]/25 transition hover:bg-[#f5f3ff]/60"
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
                                  {slotInfo?.quarterLabel ?? `ปี ${evtYear}`}
                                </span>
                              </div>
                              <span className="mt-0.5 font-bold text-[#1e1b4b]">
                                {event.title}
                              </span>
                              <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1">
                                <span className="text-[9.5px] font-medium text-[#64748b]">
                                  📅 {event.dateRange} • 📍 {event.location}
                                </span>
                                {canEdit && (
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
                            colSpan={16}
                            className="relative border-b border-[#cbd5e1] p-0"
                          >
                            <div className="relative h-[48px] overflow-hidden">
                              <div
                                className="pointer-events-none absolute inset-0 grid"
                                style={{
                                  gridTemplateColumns:
                                    "repeat(16, minmax(0, 1fr))",
                                }}
                                aria-hidden="true"
                              >
                                {TIMELINE_SLOTS.map((slot) => (
                                  <span
                                    key={slot.index}
                                    className={`border-r ${
                                      slot.index === 11
                                        ? "border-r-2 border-r-[#f59e0b]/70"
                                        : slot.index % 3 === 2 &&
                                          slot.index < 11
                                        ? "border-r-[#cbd5e1]"
                                        : "border-r-[#eef2f6]"
                                    } ${
                                      slot.isPostFiscal
                                        ? "bg-[#faf5ff]/55"
                                        : ""
                                    }`}
                                  />
                                ))}
                              </div>

                              {effectiveHighlightFreeSlots && (
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
                                isAdmin={canEdit}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
              {TIMELINE_SLOTS.map((slot) => {
                const monthCourses = courseRows.filter((row) =>
                  row.sessions.some((s) => {
                    const startSlot = yearMonthToSlotIndex(
                      s.startMonth + 1,
                      s.yearBE
                    );
                    const endSlot = yearMonthToSlotIndex(
                      s.endMonth + 1,
                      s.yearBE
                    );
                    return slot.index >= startSlot && slot.index <= endSlot;
                  })
                );

                const monthEvents = showSportsEvents
                  ? events.filter((evt) => {
                      const yr = getEventYear(evt);
                      const endYr = evt.endYear ?? yr;
                      const startSlot = yearMonthToSlotIndex(
                        evt.startMonth,
                        yr
                      );
                      const endSlot = yearMonthToSlotIndex(
                        evt.endMonth,
                        endYr
                      );
                      return slot.index >= startSlot && slot.index <= endSlot;
                    })
                  : [];

                const hasActivity =
                  monthCourses.length > 0 || monthEvents.length > 0;
                if (onlyActiveMonths && !hasActivity) return null;

                const hasBoth =
                  monthCourses.length > 0 && monthEvents.length > 0;

                return (
                  <div
                    key={slot.index}
                    className={`flex flex-col rounded-xl border p-3.5 transition ${
                      hasActivity
                        ? "border-[#cbd5e1] bg-white shadow-xs"
                        : "border-[#e2e8f0] bg-[#f8fafc]/60 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 px-2 items-center justify-center rounded-lg text-[10.5px] font-bold text-white ${
                            slot.isPostFiscal ? "bg-[#4c1d95]" : "bg-[#16265E]"
                          }`}
                        >
                          {slot.shortLabel}
                        </span>
                        <div>
                          <h4 className="text-[13px] font-bold text-[#0f172a]">
                            {slot.fullLabel}
                          </h4>
                          <span className="text-[10px] font-semibold text-[#64748b]">
                            {slot.quarterLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {monthCourses.length > 0 && (
                          <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#166534]">
                            🎓 {monthCourses.length}
                          </span>
                        )}
                        {monthEvents.length > 0 && (
                          <span className="rounded-full bg-[#f3e8ff] px-2 py-0.5 text-[10px] font-bold text-[#6d28d9]">
                            🏆 {monthEvents.length}
                          </span>
                        )}
                        {!hasActivity && (
                          <span className="text-[10.5px] text-[#94a3b8]">
                            ว่าง
                          </span>
                        )}
                      </div>
                    </div>

                    {hasBoth && (
                      <div className="mt-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-2.5 py-1 text-[10.5px] font-medium text-[#92400e]">
                        💡 เดือนนี้มีทั้งการอบรมและการแข่งขันกีฬา
                      </div>
                    )}

                    <div className="mt-2.5 flex-1 space-y-2">
                      {monthCourses.map((row) => (
                        <div
                          key={`m-${slot.index}-c-${row.course.id}`}
                          className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4]/70 p-2.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#166534]">
                              <span>🎓 อบรม</span>
                              {row.shortBadge && (
                                <span className="rounded border border-[#bbf7d0] bg-white px-1.5 py-0.2 text-[#16265E]">
                                  {row.shortBadge}
                                </span>
                              )}
                            </span>
                            {canEdit && (
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
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                            <span className="font-semibold text-[#1869bc]">
                              📥 รับสมัคร: {row.registrationDate}
                            </span>
                            <span className="font-semibold text-[#c4080f]">
                              📣 ประกาศผล: {row.resultDate}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] font-semibold text-[#15803d]">
                            🎓 อบรม: {row.dateSummary} ({row.sessionSummary})
                          </p>
                          <p className="mt-0.5 text-[10.5px] font-medium text-[#475569]">
                            📍 {row.location} • 👥 {row.compactSeats}
                          </p>
                        </div>
                      ))}

                      {monthEvents.map((evt) => (
                        <div
                          key={`m-${slot.index}-e-${evt.id}`}
                          className="rounded-lg border border-[#ddd6fe] bg-[#f5f3ff]/70 p-2.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="rounded bg-[#ede9fe] px-1.5 py-0.2 text-[9.5px] font-bold text-[#6d28d9]">
                              🏆 {evt.categoryLabel}
                            </span>
                            {canEdit && (
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

      {/* Executive Gap Analysis Card */}
      {effectiveHighlightFreeSlots && (
        <section className="mx-auto mt-3.5 w-full max-w-[960px] rounded-2xl border border-[#a7f3d0] bg-gradient-to-br from-[#f0fdf4] to-[#f8fafc] p-4 shadow-[0_2px_8px_rgba(16,185,129,0.08)] xl:max-w-[clamp(1060px,80vw,1400px)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#bbf7d0] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d1fae5] text-base">
                📊
              </span>
              <div>
                <h3 className="text-[14px] font-bold text-[#065f46]">
                  บทวิเคราะห์ช่วงเวลาว่างสำหรับผู้บริหาร (ปีงบประมาณ 2570: ต.ค. 69 – ก.ย. 70)
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
