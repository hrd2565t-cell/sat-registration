import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { TimelineSchedule } from "@/components/timeline/timeline-schedule";
import { TimelineShareButton } from "@/components/timeline/timeline-share-button";
import { ArrowLeftIcon, CalendarIcon, DownloadIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Timeline แผนกำหนดการอบรม ประจำปี 2569",
  description:
    "ตรวจสอบช่วงเวลาการสมัคร การตรวจคุณสมบัติ และการจัดอบรมของทั้ง 5 หลักสูตร",
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
              href="/status"
              className={`${navLinkClass} border border-[#d1d5db] bg-white px-2.5 text-[11.5px] text-[#374151] hover:bg-[#f8fafc]`}
            >
              ตรวจสอบสถานะ
            </Link>
            <Link
              href="/admin"
              className={`${navLinkClass} bg-[#16265e] px-3 text-[12px] text-white hover:bg-[#0f1e4a]`}
            >
              เข้าสู่ระบบ (Admin)
            </Link>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-[864px] px-4 pb-[10px] pt-2 sm:px-0 xl:max-w-[clamp(1040px,78vw,1360px)] xl:pb-4 xl:pt-3">
        <Link
          href="/"
          className="inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[#e5e9ec] px-3 text-[11px] font-medium text-[#374151] transition-colors hover:bg-[#dbe0e4] xl:h-[clamp(32px,2.4vw,38px)] xl:gap-2 xl:rounded-md xl:px-[clamp(12px,1vw,18px)] xl:text-[clamp(12px,0.8vw,14px)]"
        >
          <ArrowLeftIcon className="h-[1.1em] w-[1.1em] shrink-0" />
          ย้อนกลับไปหน้าสมัครอบรม
        </Link>

        <div className="mt-2 text-center xl:mt-3">
          <div className="flex items-center justify-center gap-2 xl:gap-3">
            <CalendarIcon className="h-[clamp(22px,2vw,30px)] w-[clamp(22px,2vw,30px)] shrink-0" />
            <h1 className="text-balance text-[19px] font-bold leading-tight text-[#111827] sm:text-[20.5px] xl:text-[clamp(24px,2vw,30px)]">
              Timeline &amp; แผนกำหนดการอบรมแต่ละหลักสูตร (ประจำปี 2569)
            </h1>
          </div>
          <p className="mx-auto mt-1.5 max-w-[620px] text-[11px] leading-relaxed text-[#4b5563] sm:text-[11.5px] xl:mt-2 xl:max-w-[clamp(620px,45vw,820px)] xl:text-[clamp(12.5px,0.95vw,15px)]">
            ตรวจสอบช่วงเวลาการสมัคร การตรวจคุณสมบัติ และการจัดอบรมของทั้ง 5 หลักสูตร เพื่อวางแผนการเข้าร่วม
          </p>
        </div>

        <TimelineSchedule />

        <div className="mx-auto mt-2 grid w-full max-w-[670px] grid-cols-1 gap-3 md:grid-cols-[1fr_217px] xl:mt-[clamp(10px,0.8vw,14px)] xl:max-w-[clamp(820px,62vw,1080px)] xl:grid-cols-[minmax(0,1fr)_32.4%] xl:gap-[clamp(14px,1.2vw,20px)]">
          <section className="rounded-lg border border-[#e0e5e8] bg-white px-2.5 pb-2.5 pt-[7px] shadow-[0_1px_4px_rgba(16,24,40,0.05)] md:min-h-[109px] xl:min-h-[clamp(130px,9.7vw,150px)] xl:rounded-xl xl:px-[clamp(14px,1.1vw,18px)] xl:pb-[clamp(12px,0.9vw,16px)] xl:pt-[clamp(10px,0.8vw,14px)]">
            <h2 className="text-[12px] font-bold leading-snug text-[#111827] xl:text-[clamp(13px,0.9vw,15px)]">
              หลักสูตรที่กำลังเปิดรับสมัคร
            </h2>
            <ul className="mt-1 space-y-0 text-[10.5px] leading-[1.4] text-[#1f2937] xl:mt-1.5 xl:text-[clamp(11.5px,0.8vw,13px)] xl:leading-[1.45]">
              <li className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                เปิดรับสมัครถึงวันที่ 25 ตุลาคม 2569
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                ตรวจสอบคุณสมบัติวันที่ 6 และ 15 พฤศจิกายน 2569
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                ผู้ตัดสินกีฬาอาชีพ (Professional Referee)
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                ประกาศผลผ่านไฟล์ PNG
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-[#e0e5e8] bg-white px-2 py-1.5 text-center shadow-[0_1px_4px_rgba(16,24,40,0.05)] md:min-h-[109px] xl:min-h-[clamp(130px,9.7vw,150px)] xl:rounded-xl xl:px-[clamp(10px,0.8vw,14px)] xl:py-[clamp(8px,0.65vw,12px)]">
            <a
              href="/files/timeline-2569.pdf"
              download="timeline-2569.pdf"
              className="flex h-[25px] w-full items-center justify-center gap-1 rounded-[4px] bg-[#122b5c] text-[10px] font-semibold text-white transition-colors hover:bg-[#0d2149] xl:h-[clamp(30px,2.2vw,36px)] xl:gap-1.5 xl:text-[clamp(11.5px,0.8vw,13px)]"
            >
              <DownloadIcon className="h-[1.2em] w-[1.2em] shrink-0" />
              ดาวน์โหลดปฏิทินอบรมทั้งหมด (PDF)
            </a>
            <div className="mt-1 xl:mt-1.5">
              <TimelineShareButton />
            </div>
            <div className="mt-1.5 border-t border-[#e5e7eb] pt-1.5 text-[#374151] xl:mt-2 xl:pt-2">
              <p className="text-[9px] leading-snug xl:text-[clamp(10px,0.75vw,12px)]">สอบถามข้อมูลเพิ่มเติม</p>
              <p className="mt-0.5 text-[8px] leading-snug xl:text-[clamp(9px,0.65vw,11px)]">
                ฝ่ายพัฒนาบุคลากรกีฬา โทร. 02-123-4567
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
