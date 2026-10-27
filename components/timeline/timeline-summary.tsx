"use client";

import Link from "next/link";
import { ArrowRightIcon, CalendarIcon } from "@/components/ui/icons";
import { useCourses } from "@/lib/courses-store";
import { parseCourseDateSessions } from "@/lib/courses";

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

  // Compute dynamic earliest & latest training dates across all courses
  let minMonth = 11;
  let minDay = 31;
  let maxMonth = 0;
  let maxDay = 1;

  for (const c of courses) {
    const sessions = parseCourseDateSessions(c.date);
    for (const s of sessions) {
      if (s.startMonth < minMonth || (s.startMonth === minMonth && s.startDay < minDay)) {
        minMonth = s.startMonth;
        minDay = s.startDay;
      }
      if (s.endMonth > maxMonth || (s.endMonth === maxMonth && s.endDay > maxDay)) {
        maxMonth = s.endMonth;
        maxDay = s.endDay;
      }
    }
  }

  const trainingRange =
    courses.length > 0
      ? `${minDay} ${THAI_MONTHS_SHORT[minMonth]} – ${maxDay} ${THAI_MONTHS_SHORT[maxMonth]} 2570`
      : "ม.ค. – ธ.ค. 2570";

  const phases = [
    {
      label: "เปิดรับสมัคร",
      range: "ล่วงหน้าก่อนอบรม",
      border: "border-l-[#1869bc]",
    },
    {
      label: "ตรวจคุณสมบัติ",
      range: "ก่อนเริ่มแต่ละรุ่น",
      border: "border-l-[#ef8507]",
    },
    {
      label: "ช่วงเวลาจัดอบรม",
      range: trainingRange,
      border: "border-l-[#198c32]",
    },
    {
      label: "ประกาศผล",
      range: "หลังจบการอบรม",
      border: "border-l-[#c4080f]",
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

      <ol className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {phases.map((phase) => (
          <li
            key={phase.label}
            className={`rounded-lg border border-l-[3px] border-[#e2e8f0] bg-white px-3 py-2.5 ${phase.border}`}
          >
            <p className="text-[11.5px] font-semibold leading-snug text-[#475569]">
              {phase.label}
            </p>
            <p className="mt-1 text-[12.5px] font-bold leading-snug text-[#16265E] sm:text-[13px]">
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
