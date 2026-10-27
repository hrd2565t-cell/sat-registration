import Link from "next/link";
import { ArrowRightIcon, CalendarIcon } from "@/components/ui/icons";

const phases = [
  {
    label: "เปิดรับสมัคร",
    range: "10 ต.ค. – 15 พ.ย. 2569",
    border: "border-l-[#1869bc]",
  },
  {
    label: "ตรวจคุณสมบัติ",
    range: "21 ต.ค. – 20 พ.ย. 2569",
    border: "border-l-[#ef8507]",
  },
  {
    label: "ช่วงเวลาจัดอบรม",
    range: "1 พ.ย. – 18 ธ.ค. 2569",
    border: "border-l-[#198c32]",
  },
  {
    label: "ประกาศผล",
    range: "10 พ.ย. – 24 ธ.ค. 2569",
    border: "border-l-[#c4080f]",
  },
];

export function TimelineSummary() {
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
              Timeline การอบรม ปี 2569
            </h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#6b7280] sm:text-[12.5px]">
              ดูช่วงเวลาสำคัญของทั้ง 5 หลักสูตร พร้อมเทียบปฏิทินแข่งขันกีฬา กกท. และช่วงเวลาว่าง
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
        * ช่วงวันที่เป็นภาพรวมของทั้ง 5 หลักสูตร แต่ละหลักสูตรมีกำหนดแตกต่างกัน
      </p>
    </section>
  );
}
