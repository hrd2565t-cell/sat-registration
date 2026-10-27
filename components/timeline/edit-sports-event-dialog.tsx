"use client";

import { useEffect, useState } from "react";
import {
  type EventCategory,
  type SportsEvent,
  CATEGORY_LABELS,
  getEventYear,
  updateSportsEvent,
} from "@/lib/sports-events-store";

const SHORT_MONTH_NAMES: Record<number, string> = {
  1: "ม.ค.",
  2: "ก.พ.",
  3: "มี.ค.",
  4: "เม.ย.",
  5: "พ.ค.",
  6: "มิ.ย.",
  7: "ก.ค.",
  8: "ส.ค.",
  9: "ก.ย.",
  10: "ต.ค.",
  11: "พ.ย.",
  12: "ธ.ค.",
};

const FULL_MONTH_NAMES: Record<number, string> = {
  1: "มกราคม",
  2: "กุมภาพันธ์",
  3: "มีนาคม",
  4: "เมษายน",
  5: "พฤษภาคม",
  6: "มิถุนายน",
  7: "กรกฎาคม",
  8: "สิงหาคม",
  9: "กันยายน",
  10: "ตุลาคม",
  11: "พฤศจิกายน",
  12: "ธันวาคม",
};

const SUPPORTED_YEARS = [2570, 2571] as const;

interface EditSportsEventDialogProps {
  event: SportsEvent | null;
  onClose: () => void;
}

export function EditSportsEventDialog({
  event,
  onClose,
}: EditSportsEventDialogProps) {
  const [title, setTitle] = useState("");
  const [english, setEnglish] = useState("");
  const [category, setCategory] = useState<EventCategory>("national");
  const [startDay, setStartDay] = useState(1);
  const [startMonth, setStartMonth] = useState(11);
  const [startYear, setStartYear] = useState(2570);
  const [endDay, setEndDay] = useState(5);
  const [endMonth, setEndMonth] = useState(11);
  const [endYear, setEndYear] = useState(2570);
  const [location, setLocation] = useState("");
  const [colorTone, setColorTone] = useState<"purple" | "indigo" | "amber" | "teal">("purple");
  const [error, setError] = useState("");

  useEffect(() => {
    if (event) {
      const yr = getEventYear(event);
      setTitle(event.title);
      setEnglish(event.english ? event.english.replace(/^\(|\)$/g, "") : "");
      setCategory(event.category);
      setStartDay(event.startDay);
      setStartMonth(event.startMonth);
      setStartYear(yr);
      setEndDay(event.endDay);
      setEndMonth(event.endMonth);
      setEndYear(event.endYear ?? yr);
      setLocation(event.location);
      setColorTone(event.colorTone);
      setError("");
    }
  }, [event]);

  useEffect(() => {
    if (!event) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [event, onClose]);

  if (!event) return null;

  const handleQuickYearSelect = (yr: number) => {
    setStartYear(yr);
    setEndYear(yr);
    setError("");
  };

  const handleStartYearMonthChange = (encoded: number) => {
    const yr = Math.floor(encoded / 100);
    const mo = encoded % 100;
    setStartYear(yr);
    setStartMonth(mo);
    if (yr * 100 + mo > endYear * 100 + endMonth) {
      setEndYear(yr);
      setEndMonth(mo);
    }
  };

  const handleEndYearMonthChange = (encoded: number) => {
    const yr = Math.floor(encoded / 100);
    const mo = encoded % 100;
    setEndYear(yr);
    setEndMonth(mo);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("กรุณากรอกชื่อรายการแข่งขัน");
      return;
    }

    // Date range validation
    const startVal = startYear * 10000 + startMonth * 100 + startDay;
    const endVal = endYear * 10000 + endMonth * 100 + endDay;
    if (startVal > endVal) {
      setError("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }

    let dateRange: string;
    if (startYear !== endYear) {
      dateRange = `${startDay} ${SHORT_MONTH_NAMES[startMonth]} ${startYear} - ${endDay} ${SHORT_MONTH_NAMES[endMonth]} ${endYear}`;
    } else if (startMonth === endMonth) {
      dateRange = `${startDay} - ${endDay} ${SHORT_MONTH_NAMES[startMonth]} ${startYear}`;
    } else {
      dateRange = `${startDay} ${SHORT_MONTH_NAMES[startMonth]} - ${endDay} ${SHORT_MONTH_NAMES[endMonth]} ${startYear}`;
    }

    updateSportsEvent(event.id, {
      title: trimmedTitle,
      english: english.trim() ? `(${english.trim()})` : "",
      dateRange,
      startDay,
      startMonth,
      endDay,
      endMonth,
      year: startYear,
      endYear,
      location: location.trim() || "สนามกีฬา กกท.",
      category,
      categoryLabel: CATEGORY_LABELS[category],
      colorTone,
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-event-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        onClick={onClose}
        className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-[2px] transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative flex max-h-[90dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="border-b border-[#e2e8f0] bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg backdrop-blur-sm">
                ✏️
              </span>
              <div>
                <h3 id="edit-event-title" className="text-[16px] font-bold text-white">
                  แก้ไขข้อมูลรายการแข่งขันกีฬา
                </h3>
                <p className="mt-0.5 text-[11.5px] text-white/80">
                  ปรับเปลี่ยนชื่อ วันที่แข่งขัน หรือสถานที่จัด เพื่ออัปเดตตาราง Timeline
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-[#1f2937]">
          {/* ชื่อรายการแข่งขัน */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151]">
              ชื่อรายการแข่งขันกีฬา <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น การแข่งขันกีฬาแห่งชาติ ครั้งที่ 49"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[12.5px] outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </div>

          {/* ชื่อภาษาอังกฤษ */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151]">
              ชื่อภาษาอังกฤษ / คำอธิบายย่อ (ไม่บังคับ)
            </label>
            <input
              type="text"
              placeholder="เช่น 49th Thailand National Games"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[12.5px] outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </div>

          {/* หมวดหมู่รายการแข่งขัน */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151]">
              ประเภทการแข่งขัน
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
              className="mt-1 h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[12.5px] outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
            >
              <option value="national">มหกรรมกีฬาแห่งชาติ</option>
              <option value="youth">กีฬาเยาวชนแห่งชาติ</option>
              <option value="para">กีฬาคนพิการแห่งชาติ</option>
              <option value="championship">กีฬาชิงชนะเลิศแห่งประเทศไทย</option>
              <option value="international">กีฬานานาชาติ / ซีเกมส์</option>
            </select>
          </div>

          {/* ช่วงวันที่จัดแข่งขัน */}
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-[#1e293b]">
                📅 ช่วงวันและเดือนที่แข่งขัน (พ.ศ. 2570 – 2571)
              </span>
              <div className="inline-flex items-center rounded-lg border border-[#cbd5e1] bg-white p-0.5 text-[11px]">
                {SUPPORTED_YEARS.map((yr) => {
                  const active = startYear === yr && endYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleQuickYearSelect(yr)}
                      className={`rounded-md px-2.5 py-0.5 font-bold transition ${
                        active
                          ? "bg-[#7c3aed] text-white shadow-sm"
                          : "text-[#475569] hover:bg-[#f1f5f9]"
                      }`}
                    >
                      ปี {yr}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              <div>
                <label className="block text-[11px] font-medium text-[#64748b]">
                  วันเริ่มต้น
                </label>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={startDay}
                    onChange={(e) => setStartDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="h-8 w-16 rounded border border-[#cbd5e1] bg-white text-center font-bold text-[#1e293b]"
                  />
                  <select
                    value={startYear * 100 + startMonth}
                    onChange={(e) => handleStartYearMonthChange(parseInt(e.target.value, 10))}
                    className="h-8 flex-1 rounded border border-[#cbd5e1] bg-white px-2 text-[11.5px]"
                  >
                    {SUPPORTED_YEARS.map((yr) => (
                      <optgroup key={yr} label={`📅 ปี พ.ศ. ${yr}`}>
                        {Object.entries(FULL_MONTH_NAMES).map(([m, name]) => (
                          <option key={`${yr}-${m}`} value={yr * 100 + Number(m)}>
                            {name} {yr}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748b]">
                  วันสิ้นสุด
                </label>
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={endDay}
                    onChange={(e) => setEndDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="h-8 w-16 rounded border border-[#cbd5e1] bg-white text-center font-bold text-[#1e293b]"
                  />
                  <select
                    value={endYear * 100 + endMonth}
                    onChange={(e) => handleEndYearMonthChange(parseInt(e.target.value, 10))}
                    className="h-8 flex-1 rounded border border-[#cbd5e1] bg-white px-2 text-[11.5px]"
                  >
                    {SUPPORTED_YEARS.map((yr) => (
                      <optgroup key={yr} label={`📅 ปี พ.ศ. ${yr}`}>
                        {Object.entries(FULL_MONTH_NAMES).map(([m, name]) => (
                          <option key={`${yr}-${m}`} value={yr * 100 + Number(m)}>
                            {name} {yr}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* สถานที่จัดแข่งขัน */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151]">
              สถานที่จัดแข่งขัน / จังหวัดเจ้าภาพ
            </label>
            <input
              type="text"
              placeholder="เช่น จ.จันทบุรี, ศูนย์กีฬาหัวหมาก กทม."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[12.5px] outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </div>

          {/* โทนสีของแถบ */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151]">
              โทนสีแถบใน Timeline
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              {[
                { key: "purple", label: "ม่วงพรีเมียม", bg: "bg-[#7c3aed]" },
                { key: "indigo", label: "ครามเข้ม", bg: "bg-[#4f46e5]" },
                { key: "amber", label: "ทองอำพัน", bg: "bg-[#d97706]" },
                { key: "teal", label: "เขียวน้ำทะเล", bg: "bg-[#0d9488]" },
              ].map((tone) => (
                <label
                  key={tone.key}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] transition ${
                    colorTone === tone.key
                      ? "border-[#7c3aed] bg-[#f5f3ff] font-bold text-[#6d28d9]"
                      : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]"
                  }`}
                >
                  <input
                    type="radio"
                    name="colorToneEdit"
                    value={tone.key}
                    checked={colorTone === tone.key}
                    onChange={() => setColorTone(tone.key as any)}
                    className="sr-only"
                  />
                  <span className={`h-3 w-3 rounded-full ${tone.bg}`} />
                  <span>{tone.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-2 text-[11.5px] font-medium text-red-600">
              ⚠️ {error}
            </p>
          )}

          {/* Buttons */}
          <div className="mt-5 flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-[#cbd5e1] bg-white px-4 text-[12.5px] font-semibold text-[#475569] hover:bg-[#f1f5f9]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#7c3aed] px-5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-[#6d28d9]"
            >
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
