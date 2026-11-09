import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { AdminNavButton } from "@/components/layout/admin-nav-button";
import { TimelineSchedule } from "@/components/timeline/timeline-schedule";
import { TimelineShareButton } from "@/components/timeline/timeline-share-button";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Timeline แผนกำหนดการอบรม (พ.ศ. 2570 – 2571)",
  description:
    "ตรวจสอบช่วงเวลาการสมัคร การตรวจคุณสมบัติ และการจัดอบรม พร้อมเปรียบเทียบปฏิทินการแข่งขันกีฬา กกท.",
};

const navLinkClass =
  "inline-flex h-7 items-center whitespace-nowrap rounded-[4px] font-medium transition-colors";

export default function TimelinePage() {
  return (
    <div className="min-h-screen bg-[#f1f5f6]">
      <Header
        compact
        rightSlot={
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              กลับสู่หน้าแรก
            </Link>
            <AdminNavButton compact />
          </div>
        }
      />

      <main className="mx-auto w-full max-w-[864px] px-4 pb-[10px] pt-2 sm:px-0 xl:max-w-[clamp(1040px,78vw,1360px)] xl:pb-4 xl:pt-3">
        <Link
          href="/courses"
          className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[#e5e9ec] px-3 text-[11px] font-medium text-[#374151] transition-colors hover:bg-[#dbe0e4] xl:h-[clamp(32px,2.4vw,38px)] xl:gap-2 xl:rounded-md xl:px-[clamp(12px,1vw,18px)] xl:text-[clamp(12px,0.8vw,14px)]"
        >
          <ArrowLeftIcon className="h-[1.1em] w-[1.1em] shrink-0" />
          ย้อนกลับไปหน้าสมัครอบรม
        </Link>

        <div className="mt-2 text-center xl:mt-3">
          <div className="flex items-center justify-center gap-2 xl:gap-3">
            <CalendarIcon className="h-[clamp(22px,2vw,30px)] w-[clamp(22px,2vw,30px)] shrink-0" />
            <h1 className="text-balance text-[19px] font-bold leading-tight text-[#111827] sm:text-[20.5px] xl:text-[clamp(24px,2vw,30px)]">
              Timeline &amp; แผนกำหนดการอบรม (ประจำปี พ.ศ. 2570 – 2571)
            </h1>
          </div>
          <p className="mx-auto mt-1.5 max-w-[660px] text-[11px] leading-relaxed text-[#4b5563] sm:text-[11.5px] xl:mt-2 xl:max-w-[clamp(660px,48vw,860px)] xl:text-[clamp(12.5px,0.95vw,15px)]">
            เปรียบเทียบช่วงเวลาจัดอบรมแต่ละหลักสูตรกับปฏิทินการแข่งขันกีฬา กกท. รองรับทั้งมุมมองตาราง 12 เดือน และการ์ดสรุปรายเดือน
          </p>
        </div>

        <TimelineSchedule />

        {/* CTA to proceed to Course Selection */}
        <div className="mx-auto mt-3 w-full max-w-[960px] xl:max-w-[clamp(1060px,80vw,1400px)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 px-4 py-3 shadow-[0_1px_4px_rgba(16,24,40,0.05)]">
            <div className="flex items-center gap-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#16265E] text-base text-white shadow-xs">
                🎓
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-[#16265E]">
                  พร้อมสมัครเข้ารับการอบรมแล้วหรือยัง?
                </p>
                <p className="text-[11px] text-[#4b5563]">
                  ตรวจสอบคุณสมบัติและเลือกหลักสูตรที่ต้องการ เพื่อเริ่มต้นขั้นตอนการสมัครอบรม
                </p>
              </div>
            </div>
            <Link
              href="/courses"
              className="inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-lg bg-[#16265E] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1e3a8a] active:scale-[0.98]"
            >
              <span>ไปที่หน้าเลือกหลักสูตร</span>
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-2.5 grid w-full max-w-[920px] grid-cols-1 gap-3 md:grid-cols-[1fr_240px] xl:mt-[clamp(10px,0.8vw,14px)] xl:max-w-[clamp(1020px,76vw,1340px)] xl:grid-cols-[minmax(0,1fr)_30%] xl:gap-[clamp(14px,1.2vw,20px)]">
          <section className="rounded-lg border border-[#e0e5e8] bg-white px-3 pb-2.5 pt-2 shadow-[0_1px_4px_rgba(16,24,40,0.05)] xl:rounded-xl xl:px-4 xl:py-3">
            <h2 className="text-[12px] font-bold leading-snug text-[#111827] xl:text-[clamp(13px,0.9vw,15px)]">
              คำแนะนำการใช้งานตาราง Timeline
            </h2>
            <ul className="mt-1.5 space-y-1 text-[10.5px] leading-[1.45] text-[#374151] xl:text-[clamp(11.5px,0.8vw,13px)]">
              <li className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                แสดงแผนกำหนดการฝึกอบรมตลอด <strong>ปีงบประมาณ พ.ศ. 2570 (ต.ค. 2569 – ก.ย. 2570)</strong> ต่อเนื่องถึงเดือน <strong>ม.ค. 2571</strong>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                สามารถสลับมุมมองระหว่าง <strong>📊 ตาราง Timeline ต่อเนื่อง</strong> และ <strong>🗓️ การ์ดสรุปรายเดือน</strong> ได้จากปุ่มด้านบนตาราง
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                สามารถดาวน์โหลดตารางแผนกำหนดการอบรมเป็นไฟล์ <strong>PDF</strong> หรือรูปภาพ <strong>PNG</strong> ได้จากปุ่มด้านขวา
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-[#e0e5e8] bg-white px-2.5 py-2 text-center shadow-[0_1px_4px_rgba(16,24,40,0.05)] xl:rounded-xl xl:px-[clamp(10px,0.8vw,14px)] xl:py-[clamp(10px,0.8vw,14px)]">
            <TimelineShareButton />
            <div className="mt-1.5 border-t border-[#e5e7eb] pt-1.5 text-[#374151] xl:mt-2 xl:pt-2">
              <p className="text-[9px] leading-snug xl:text-[clamp(10px,0.75vw,12px)]">สอบถามข้อมูลเพิ่มเติม</p>
              <p className="mt-0.5 text-[8px] leading-snug xl:text-[clamp(9px,0.65vw,11px)]">
                กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ โทร. 02-186-7111 ต่อ 8151
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
