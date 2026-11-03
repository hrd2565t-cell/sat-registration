"use client";

import { useState, useMemo } from "react";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import {
  addTrainee,
  findExistingTrainee,
  getNextPersonnelId,
  STANDARD_COURSES,
  AFFILIATION_GROUPS,
  PAST_YEARS_BE,
} from "@/lib/alumni-store";

interface AddTraineeModalProps {
  onClose: () => void;
  onSuccess: (newTrainee: HistoricalTrainee) => void;
  trainees: HistoricalTrainee[];
}

export function AddTraineeModal({ onClose, onSuccess, trainees }: AddTraineeModalProps) {
  const [prefix, setPrefix] = useState("นาย");
  const [customPrefix, setCustomPrefix] = useState("");
  const [name, setName] = useState("");
  const [affiliationGroup, setAffiliationGroup] = useState<string>("การกีฬาแห่งประเทศไทย");
  const [affiliation, setAffiliation] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("GGE");
  const [customCourse, setCustomCourse] = useState("");
  const [courseCategory, setCourseCategory] = useState<string>("ผู้บริหารกีฬา");
  const [yearBE, setYearBE] = useState<number>(2569);
  const [batch, setBatch] = useState("รุ่นปี พ.ศ. 2569");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [error, setError] = useState("");

  const nextAutoId = useMemo(() => getNextPersonnelId(trainees), [trainees]);

  // Real-time check if person already exists in system
  const matchedPerson = useMemo(() => {
    if (!name.trim()) return undefined;
    return findExistingTrainee(trainees, name);
  }, [name, trainees]);

  const finalPrefix = prefix === "อื่นๆ" ? customPrefix.trim() : prefix;
  const fullName = finalPrefix ? `${finalPrefix} ${name.trim()}` : name.trim();
  const finalCourse = selectedCourse === "__custom__" ? customCourse.trim() : selectedCourse;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    if (!affiliation.trim()) {
      setError("กรุณากรอกชื่อสมาคมหรือหน่วยงานสังกัด");
      return;
    }
    if (!finalCourse) {
      setError("กรุณาระบุชื่อหลักสูตรอบรม");
      return;
    }

    // Determine personnel ID: reuse existing ID if matched, or assign nextAutoId
    const assignedId: string = (matchedPerson && matchedPerson.personnelId) ? matchedPerson.personnelId : nextAutoId;

    const newRecord = addTrainee({
      personnelId: assignedId,
      idCard: assignedId,
      name: fullName,
      prefix: finalPrefix || undefined,
      affiliation: affiliation.trim(),
      affiliationGroup,
      sportsType: affiliation.trim(),
      courseTitle: finalCourse,
      courseCategory,
      yearBE,
      batch: batch.trim() || `รุ่นปี พ.ศ. ${yearBE}`,
      passedDate: `${yearBE - 543}-09-30`,
      status,
    });

    onSuccess(newRecord);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-6 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#16265E] p-5 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
              👤
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                เพิ่มข้อมูลบุคลากรและประวัติการอบรม
              </h3>
              <p className="text-xs text-blue-100/80">
                บันทึกประวัติการสำเร็จการอบรมรายบุคคลเข้าสู่ฐานข้อมูลทำเนียบ กกท.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Real-time Match Indicator */}
          {matchedPerson ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-start gap-2.5 shadow-2xs">
              <span className="text-base mt-0.5">🟢</span>
              <div className="flex-1">
                <p className="font-bold">
                  พบบัญชีเดิมในระบบแล้ว: {matchedPerson.name} ({matchedPerson.personnelId})
                </p>
                <p className="text-emerald-700 mt-0.5">
                  สังกัดเดิม: {matchedPerson.affiliation} · ระบบจะบันทึกหลักสูตรนี้เป็น <strong>วุฒิบัตรสะสม</strong> เพิ่มเติมให้ใน Digital Sports Passport ของท่านเดิมโดยไม่สร้างแถวบุคคลซ้ำ
                </p>
              </div>
            </div>
          ) : name.trim() ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <span>✨</span>
                <span>
                  บุคลากรใหม่: ระบบจะออกรหัสประจำตัวอัตโนมัติ <strong>{nextAutoId}</strong>
                </span>
              </div>
              <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                New Unique ID
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs text-gray-600 flex items-center gap-2">
              <span>💡</span>
              <span>
                รหัสถัดไปสำหรับบุคลากรใหม่: <strong className="text-[#16265E] font-mono">{nextAutoId}</strong> (หากมีชื่อเดิมอยู่แล้ว ระบบจะผูกรหัสเดิมให้อัตโนมัติ)
              </span>
            </div>
          )}

          {/* Row 1: Prefix & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                คำนำหน้าชื่อ
              </label>
              <select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
              >
                <option value="นาย">นาย</option>
                <option value="นาง">นาง</option>
                <option value="นางสาว">นางสาว</option>
                <option value="ดร.">ดร.</option>
                <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
              </select>
              {prefix === "อื่นๆ" && (
                <input
                  type="text"
                  placeholder="เช่น พลโท, ร.ต.อ."
                  value={customPrefix}
                  onChange={(e) => setCustomPrefix(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-2 text-xs"
                />
              )}
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ชื่อ-นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="กรอกชื่อและนามสกุล (ระบบจะสแกนหาชื่อซ้ำอัตโนมัติ)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Row 2: Organization Group & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                กลุ่มหน่วยงาน <span className="text-rose-500">*</span>
              </label>
              <select
                value={affiliationGroup}
                onChange={(e) => setAffiliationGroup(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
              >
                {AFFILIATION_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ชื่อสมาคม / หน่วยงานต้นสังกัด <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น สมาคมกีฬาฟุตบอลแห่งประเทศไทยฯ"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Row 3: Course & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                หลักสูตรที่สำเร็จการอบรม <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  if (e.target.value === "GGE" || e.target.value === "TSLP" || e.target.value === "ICSM") {
                    setCourseCategory("ผู้บริหารกีฬา");
                  } else if (e.target.value === "ICSC" || e.target.value === "SSCC") {
                    setCourseCategory("ผู้ฝึกสอนกีฬา");
                  }
                }}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
              >
                {STANDARD_COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__custom__">➕ ระบุชื่อหลักสูตรอื่นๆ...</option>
              </select>

              {selectedCourse === "__custom__" && (
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อหลักสูตร..."
                  value={customCourse}
                  onChange={(e) => setCustomCourse(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-purple-300 bg-purple-50/40 p-2 text-xs"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ประเภทหลักสูตร
              </label>
              <select
                value={courseCategory}
                onChange={(e) => setCourseCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
              >
                <option value="ผู้บริหารกีฬา">👔 ผู้บริหารกีฬา</option>
                <option value="ผู้ฝึกสอนกีฬา">🏅 ผู้ฝึกสอนกีฬา</option>
                <option value="อื่นๆ">📁 อื่นๆ</option>
              </select>
            </div>
          </div>

          {/* Row 4: Year, Batch, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ปี พ.ศ. ที่อบรม
              </label>
              <select
                value={yearBE}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setYearBE(y);
                  setBatch(`รุ่นปี พ.ศ. ${y}`);
                }}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
              >
                <option value={2570}>พ.ศ. 2570</option>
                <option value={2569}>พ.ศ. 2569</option>
                <option value={2568}>พ.ศ. 2568</option>
                <option value={2567}>พ.ศ. 2567</option>
                <option value={2566}>พ.ศ. 2566</option>
                {PAST_YEARS_BE.filter((y) => y <= 2565).map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                รุ่นที่
              </label>
              <input
                type="text"
                placeholder="เช่น รุ่นที่ 1/2569"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                สถานะการปฏิบัติงาน
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
              >
                <option value="active">🟢 Active (ปฏิบัติหน้าที่)</option>
                <option value="inactive">⚪ Inactive (ยังไม่มีประวัติรอบปี)</option>
              </select>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#16265E] hover:bg-[#111e4a] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-colors cursor-pointer"
            >
              บันทึกข้อมูลบุคลากร
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
