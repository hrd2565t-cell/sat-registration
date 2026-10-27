"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useIsAdmin } from "@/lib/admin-auth";
import {
  useSportsEvents,
  type SportsEvent,
  resetSportsEvents,
} from "@/lib/sports-events-store";
import { AddSportsEventDialog } from "@/components/timeline/add-sports-event-dialog";

type BarTone = "open" | "review" | "training" | "result";

interface TimelineBar {
  label: string;
  tone: BarTone;
  left: number;
  width: number;
}

interface TimelineRow {
  title: string;
  english: string;
  bars: TimelineBar[];
}

const bars: Record<BarTone, string> = {
  open: "bg-[#1869bc]",
  review: "bg-[#ef8507]",
  training: "bg-[#198c32]",
  result: "bg-[#c4080f]",
};

const rows: TimelineRow[] = [
  {
    title: "ผู้ฝึกสอนกีฬาระดับชาติ",
    english: "(National Coach)",
    bars: [
      { label: "15 ต.ค. - 5 พ.ย.", tone: "open", left: 17.8, width: 22.3 },
      { label: "6 พ.ย. - 10 พ.ย.", tone: "review", left: 40.4, width: 12.3 },
      { label: "15 พ.ย. - 20 พ.ย.", tone: "training", left: 56.1, width: 15.2 },
      { label: "25 พ.ย.", tone: "result", left: 74.5, width: 6.5 },
    ],
  },
  {
    title: "ผู้ตัดสินกีฬาอาชีพ",
    english: "(Professional Referee)",
    bars: [
      { label: "15 ต.ค. - 10 พ.ย.", tone: "open", left: 17.8, width: 28.7 },
      { label: "11 พ.ย. - 15 พ.ย.", tone: "review", left: 46.9, width: 13.5 },
      { label: "20 พ.ย. - 25 พ.ย.", tone: "training", left: 60.9, width: 15.4 },
      { label: "30 พ.ย.", tone: "result", left: 79.7, width: 6.5 },
    ],
  },
  {
    title: "วิทยาศาสตร์การกีฬาขั้นพื้นฐาน",
    english: "(Basic Sports Science)",
    bars: [
      { label: "10 ต.ค. - 20 ต.ค.", tone: "open", left: 5.5, width: 18.2 },
      { label: "21 ต.ค. - 25 ต.ค.", tone: "review", left: 24, width: 13.1 },
      { label: "1 พ.ย. - 5 พ.ย.", tone: "training", left: 72.9, width: 13.7 },
      { label: "10 พ.ย.", tone: "result", left: 92, width: 6.5 },
    ],
  },
  {
    title: "การบริหารจัดการองค์การกีฬา",
    english: "(Sports Management)",
    bars: [
      { label: "1 พ.ย. - 15 พ.ย.", tone: "open", left: 37.1, width: 14.8 },
      { label: "16 พ.ย. - 20 พ.ย.", tone: "review", left: 52.3, width: 13.7 },
      { label: "8 ธ.ค. - 12 ธ.ค.", tone: "training", left: 77.1, width: 13.9 },
      { label: "18 ธ.ค.", tone: "result", left: 92.8, width: 6.4 },
    ],
  },
  {
    title: "จิตวิทยาการกีฬาสำหรับผู้ฝึกสอน",
    english: "(Sports Psychology)",
    bars: [
      { label: "15 ต.ค. - 15 พ.ย.", tone: "open", left: 17.8, width: 34.2 },
      { label: "16 พ.ย. - 20 พ.ย.", tone: "review", left: 52.3, width: 13.7 },
      { label: "14 ธ.ค. - 18 ธ.ค.", tone: "training", left: 74.6, width: 14.5 },
      { label: "24 ธ.ค.", tone: "result", left: 92.8, width: 6.4 },
    ],
  },
];

const columns = ["หลักสูตร / รายการ", "ตุลาคม 2570", "6 พ.ย. 2570", "15 พ.ย. 2570", "ธันวาคม 2570"];

/**
 * Free slots across the timeline without major conflicts
 */
const FREE_SLOTS = [
  {
    id: "slot-1",
    label: "ว่าง 6 วัน",
    dateRange: "1 - 6 พ.ย. 2570",
    left: 25.0,
    width: 15.4,
    description: "ก่อนเริ่มกีฬาคนพิการแห่งชาติ เหมาะสำหรับจัดอบรม/สัมมนาสั้น",
  },
  {
    id: "slot-2",
    label: "ว่าง 7 วัน (แนะนำ)",
    dateRange: "1 - 7 ธ.ค. 2570",
    left: 75.0,
    width: 6.0,
    description: "หลังจบชิงแชมป์ประเทศไทย และก่อนเริ่มกีฬาแห่งชาติ — เหมาะจัดอบรม 3-5 วัน",
  },
  {
    id: "slot-3",
    label: "ว่าง 12 วัน",
    dateRange: "20 - 31 ธ.ค. 2570",
    left: 93.0,
    width: 7.0,
    description: "หลังจบกีฬาแห่งชาติ ครั้งที่ 49 และหลังการอบรมทุกหลักสูตรสิ้นสุดลง",
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
      className={`absolute top-1/2 z-10 flex h-[18px] -translate-y-1/2 items-center justify-center rounded-full font-semibold leading-none text-white shadow-sm xl:h-[clamp(21px,1.6vw,28px)] ${
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
  const { events, deleteSportsEvent } = useSportsEvents();
  const [showSportsEvents, setShowSportsEvents] = useState(true);
  const [highlightFreeSlots, setHighlightFreeSlots] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<SportsEvent | null>(null);

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
            <div className="flex items-center gap-2">
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
                <tr key={row.title} className="h-[37px] xl:h-[clamp(43px,3.1vw,58px)]">
                  <th
                    scope="row"
                    className="border border-t-0 border-l-0 border-[#d8dee4] px-2 py-0.5 text-left align-middle text-[9.5px] font-semibold leading-[1.2] xl:px-3 xl:text-[clamp(10.5px,0.8vw,12.5px)]"
                  >
                    {row.title}
                    <span className="mt-0.5 block text-[8.5px] font-normal leading-[1.1] text-[#4b5563] xl:text-[clamp(9px,0.65vw,11px)]">
                      {row.english}
                    </span>
                  </th>
                  <td colSpan={4} className="relative border border-t-0 border-r-0 border-[#d8dee4] p-0">
                    <div className="relative h-[37px] overflow-hidden xl:h-[clamp(43px,3.1vw,58px)]">
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
                      {row.bars.map((bar) => (
                        <TimelineBarItem key={`${row.title}-${bar.tone}`} bar={bar} />
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
                        className="border border-t-0 border-l-0 border-[#d8dee4] px-2 py-0.5 text-left align-middle text-[9.5px] font-semibold leading-[1.2] xl:px-3 xl:text-[clamp(10.5px,0.8vw,12.5px)]"
                      >
                        <div className="flex items-start justify-between gap-1">
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

                          {isAdmin && event.id.startsWith("evt-custom-") && (
                            <button
                              type="button"
                              onClick={() => deleteSportsEvent(event.id)}
                              title="ลบรายการนี้"
                              className="text-[#94a3b8] hover:text-[#dc2626] text-[11px] p-0.5"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </th>

                      <td colSpan={4} className="relative border border-t-0 border-r-0 border-[#d8dee4] p-0">
                        <div className="relative h-[37px] overflow-hidden xl:h-[clamp(43px,3.1vw,58px)]">
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
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#fed7aa] bg-[#fffbeb] p-2.5 text-[11.5px] text-[#9a3412]">
            <span className="text-base shrink-0">⚠️</span>
            <div>
              <span className="font-bold">ข้อสังเกตสำหรับผู้บริหาร: </span>
              ช่วงวันที่ <span className="font-semibold underline">9 - 19 ธันวาคม 2570</span> เป็นช่วงจัดแข่งขัน{" "}
              <span className="font-semibold">มหกรรมกีฬาแห่งชาติ ครั้งที่ 49 (จ.จันทบุรี)</span> ซึ่งคาบเกี่ยวกับหลักสูตร{" "}
              <span className="font-semibold">จิตวิทยาการกีฬาสำหรับผู้ฝึกสอน (14 - 18 ธ.ค.)</span> ควรประสานงานสมาคมกีฬาเพื่อคัดเลือกผู้ฝึกสอนที่ไม่ได้ติดภารกิจคุมทีมแข่งขันในรายการดังกล่าว
            </div>
          </div>
        </section>
      )}

      {/* Add Sports Event Modal */}
      <AddSportsEventDialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </>
  );
}
