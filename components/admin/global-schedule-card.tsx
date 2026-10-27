"use client";

import { useState } from "react";
import {
  formatCourseDateFields,
  getGlobalCourseSchedule,
  parseCourseDateFields,
  type CourseDateFields,
} from "@/lib/courses";
import {
  updateGlobalCourseSchedule,
  useCourses,
} from "@/lib/courses-store";
import { ThaiCalendarRangePicker } from "@/components/ui/thai-calendar-picker";

export function GlobalScheduleCard({
  onSaved,
}: {
  onSaved?: (message: string) => void;
}) {
  const { courses } = useCourses();
  const globalSched = getGlobalCourseSchedule(courses);
  const customCourses = courses.filter((c) => c.useCustomSchedule);
  const sharedCount = courses.length - customCourses.length;

  const [isEditing, setIsEditing] = useState(false);
  const [regFields, setRegFields] = useState<CourseDateFields>(() =>
    parseCourseDateFields(globalSched.registrationDate)
  );
  const [resultFields, setResultFields] = useState<CourseDateFields>(() =>
    parseCourseDateFields(globalSched.resultDate)
  );
  const [resetCustom, setResetCustom] = useState(true);
  const [savedBanner, setSavedBanner] = useState("");

  const handleOpenEdit = () => {
    const latest = getGlobalCourseSchedule(courses);
    setRegFields(parseCourseDateFields(latest.registrationDate));
    setResultFields(parseCourseDateFields(latest.resultDate));
    setSavedBanner("");
    setIsEditing(true);
  };

  const handleSaveGlobal = () => {
    const nextRegStr = formatCourseDateFields(regFields, true);
    const nextResStr = formatCourseDateFields(resultFields, true);
    const { updatedCount } = updateGlobalCourseSchedule(
      nextRegStr,
      nextResStr,
      resetCustom
    );
    const msg = `อัปเดตกำหนดการกลางเรียบร้อยแล้ว (เปิดรับสมัคร: ${nextRegStr} | ประกาศผล: ${nextResStr}) — มีผลกับ ${updatedCount} หลักสูตรทันที`;
    setSavedBanner(msg);
    setIsEditing(false);
    onSaved?.(msg);
  };

  return (
    <div className="rounded-xl border border-[#bfdbfe] bg-gradient-to-r from-[#eff6ff] via-[#f8fafc] to-[#fef2f2] p-3.5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#16265E] px-2.5 py-1 text-[11.5px] font-bold text-white shadow-2xs">
            <span>🌐</span>
            <span>กำหนดการกลาง (ใช้ร่วมกันทุกหลักสูตร)</span>
          </span>

          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#bfdbfe] bg-white px-2.5 py-1 font-semibold text-[#1e3a8a] shadow-2xs">
              <span className="text-[#1869bc]">📥 เปิดรับสมัคร:</span>
              <strong className="font-bold">
                {globalSched.registrationDate}
              </strong>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#fecaca] bg-white px-2.5 py-1 font-semibold text-[#991b1b] shadow-2xs">
              <span className="text-[#c4080f]">📣 วันประกาศผล:</span>
              <strong className="font-bold">{globalSched.resultDate}</strong>
            </span>
          </div>

          <span className="rounded-full border border-[#cbd5e1] bg-white px-2.5 py-0.5 text-[10.5px] font-semibold text-[#475569]">
            {customCourses.length === 0
              ? `✓ ใช้ร่วมกันครบทั้ง ${courses.length} หลักสูตร`
              : `ใช้ร่วมกัน ${sharedCount}/${courses.length} หลักสูตร (กำหนดแยก ${customCourses.length} หลักสูตร)`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => (isEditing ? setIsEditing(false) : handleOpenEdit())}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#1e3a8a] bg-white px-3 text-[11.5px] font-bold text-[#1e3a8a] shadow-2xs transition hover:bg-[#1e3a8a] hover:text-white"
        >
          <span>🗓️</span>
          <span>
            {isEditing
              ? "ปิดแผงตั้งค่ากำหนดการกลาง"
              : "ตั้งค่าวันรับสมัคร & วันประกาศผลกลาง (ทุกหลักสูตร)"}
          </span>
        </button>
      </div>

      {savedBanner && !isEditing && (
        <p className="mt-2 rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-1.5 text-[11px] font-semibold text-[#166534]">
          ✅ {savedBanner} (อย่าลืมกดปุ่ม &quot;บันทึกเป็นข้อมูลหลักถาวร&quot; ด้านบนเพื่อบันทึกลงไฟล์ระบบ)
        </p>
      )}

      {isEditing && (
        <div className="mt-3 space-y-3 rounded-xl border border-[#cbd5e1] bg-white p-3.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-2">
            <div>
              <h3 className="text-[12.5px] font-bold text-[#16265E]">
                🗓️ ตั้งค่าวันเปิด-ปิดรับสมัคร และวันประกาศผลกลาง (ตั้งค่าที่เดียว มีผลทุกหลักสูตร)
              </h3>
              <p className="text-[10.5px] text-[#64748b]">
                คลิกเลือกวันที่จากปฏิทินด้านล่าง เมื่อกดบันทึก ระบบจะอัปเดตให้ทุกหลักสูตรที่ใช้กำหนดการกลางทันที
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ThaiCalendarRangePicker
              value={regFields}
              onChange={setRegFields}
              tone="blue"
              badgeLabel="1. 📥 เปิดรับสมัครกลาง (ทุกหลักสูตร)"
              defaultOpen
              presets={[
                { days: 7, label: "7 วัน" },
                { days: 14, label: "14 วัน" },
                { days: 17, label: "17 วัน (มาตรฐาน)" },
                { days: 30, label: "30 วัน" },
              ]}
            />

            <ThaiCalendarRangePicker
              value={resultFields}
              onChange={setResultFields}
              tone="red"
              badgeLabel="2. 📣 วันประกาศผลกลาง (ทุกหลักสูตร)"
              defaultOpen
              presets={[
                { days: 1, label: "วันเดียว (1 วัน)" },
                { days: 2, label: "ช่วง 2 วัน" },
                { days: 3, label: "ช่วง 3 วัน" },
              ]}
            />
          </div>

          {customCourses.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[11px] font-medium text-[#92400e]">
              <input
                type="checkbox"
                checked={resetCustom}
                onChange={(e) => setResetCustom(e.target.checked)}
                className="h-3.5 w-3.5 rounded text-[#1e3a8a]"
              />
              <span>
                ปรับให้หลักสูตรที่เคยตั้งค่าแยกไว้ ({customCourses.map((c) => c.shortTitle || c.title).join(", ")}) กลับมาใช้วันรับสมัครและวันประกาศผลกลางนี้ด้วย
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#f1f5f9] pt-2.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="h-8 rounded-lg border border-[#cbd5e1] bg-white px-3 text-[11.5px] font-semibold text-[#475569] hover:bg-[#f8fafc]"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveGlobal}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#16265E] px-4 text-[11.5px] font-bold text-white shadow-xs transition hover:bg-[#1e3a8a]"
            >
              <span>💾 บันทึกกำหนดการกลาง (อัปเดตทุกหลักสูตร)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
