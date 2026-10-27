"use client";

import Link from "next/link";
import { ArrowRightIcon, CalendarIcon } from "@/components/ui/icons";
import { useCourses } from "@/lib/courses-store";
import {
  getGlobalCourseSchedule,
  parseCourseDateSessions,
  type CourseDateFields,
} from "@/lib/courses";

const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export function TimelineSummary() {
  const { courses } = useCourses();
  const globalSchedule = getGlobalCourseSchedule(courses);

  // Compute dynamic earliest & latest training dates across all courses (including yearBE)
  let earliest: CourseDateFields | null = null;
  let earliestTime = Infinity;
  let latest: CourseDateFields | null = null;
  let latestTime = -Infinity;

  for (const c of courses) {
    const sessions = parseCourseDateSessions(c.date);
    for (const s of sessions) {
      const startTime = new Date(
        s.yearBE - 543,
        s.startMonth,
        s.startDay
      ).getTime();
      const endTime = new Date(
        s.yearBE - 543,
        s.endMonth,
        s.endDay
      ).getTime();
      if (startTime < earliestTime) {
        earliestTime = startTime;
        earliest = s;
      }
      if (endTime > latestTime) {
        latestTime = endTime;
        latest = s;
      }
    }
  }

  const trainingRange =
    earliest && latest
      ? earliest.yearBE === latest.yearBE
        ? `${earliest.startDay} ${THAI_MONTHS_SHORT[earliest.startMonth]} – ${latest.endDay} ${THAI_MONTHS_SHORT[latest.endMonth]} ${latest.yearBE}`
        : `${earliest.startDay} ${THAI_MONTHS_SHORT[earliest.startMonth]} ${earliest.yearBE} – ${latest.endDay} ${THAI_MONTHS_SHORT[latest.endMonth]} ${latest.yearBE}`
      : "ต.ค. 2569 – ก.ย. 2570";

  const phases = [
    {
      label: "1. เปิดรับสมัคร",
      range: globalSchedule.registrationDate,
      border: "border-l-[#1869bc]",
      textColor: "text-[#1e3a8a]",
    },
    {
      label: "2. วันประกาศผล",
      range: globalSchedule.resultDate,
      border: "border-l-[#c4080f]",
      textColor: "text-[#991b1b]",
    },
    {
      label: "3. ช่วงเวลาจัดอบรม",
      range: trainingRange,
      border: "border-l-[#198c32]",
      textColor: "text-[#166534]",
    },
  ];

  return (
    <section
      aria-labelledby="timeline-summary-title"
      className="mt-7 rounded-xl border border-[#dbe3ea] bg-[#f8fafc] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8eef8]">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div>
            <h3
              id="timeline-summary-title"
              className="text-[16px] font-bold leading-snug text-[#16265E] sm:text-[18px]"
            >
              Timeline การอบรม ปี 2570
            </h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#6b7280] sm:text-[12.5px]">
              ดูช่วงเวลาสำคัญของทั้ง {courses.length} หลักสูตร พร้อมเทียบปฏิทินแข่งขันกีฬา กกท. และช่วงเวลาว่างตลอดปี
            </p>
          </div>
        </div>

        <Link
          href="/timeline"
          className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-md border border-[#16265E] bg-white px-4 text-[12.5px] font-semibold text-[#16265E] transition-colors hover:bg-[#eef2f9] sm:w-auto"
        >
          ดู Timeline ทั้งหมด
          <ArrowRightIcon />
        </Link>
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {phases.map((phase) => (
          <li
            key={phase.label}
            className={`rounded-lg border border-l-[3px] border-[#e2e8f0] bg-white px-3.5 py-2.5 ${phase.border}`}
          >
            <p className="text-[11.5px] font-semibold leading-snug text-[#475569]">
              {phase.label}
            </p>
            <p
              className={`mt-1 text-[13px] font-bold leading-snug sm:text-[13.5px] ${phase.textColor}`}
            >
              {phase.range}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[11px] leading-relaxed text-[#6b7280]">
        * ช่วงวันที่อัปเดตอัตโนมัติตามข้อมูลจริงของทั้ง {courses.length} หลักสูตร
      </p>
    </section>
  );
}
