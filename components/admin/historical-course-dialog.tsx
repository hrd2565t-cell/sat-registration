"use client";

import { useState, useEffect } from "react";
import { THAI_PROVINCES, THAI_REGIONS, detectProvinceFromLocation } from "@/lib/provinces";
import { type Course, balanceQuotasToCapacity, TARGET_GROUPS, type TargetGroupQuotas } from "@/lib/courses";
import { addCourse, updateCourse, deleteCourse } from "@/lib/courses-store";

interface HistoricalCourseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  courseToEdit?: Course | null;
  defaultFiscalYear?: string;
  onSuccess?: () => void;
}

export function HistoricalCourseDialog({
  isOpen,
  onClose,
  courseToEdit,
  defaultFiscalYear = "2569",
  onSuccess,
}: HistoricalCourseDialogProps) {
  const isEditing = Boolean(courseToEdit);

  const [fiscalYear, setFiscalYear] = useState(defaultFiscalYear);
  const [title, setTitle] = useState("");
  const [shortTitle, setShortTitle] = useState("");
  const [province, setProvince] = useState("กรุงเทพมหานคร");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState("40");
  const [historicalCompleted, setHistoricalCompleted] = useState("40");
  const [historicalApplicants, setHistoricalApplicants] = useState("50");
  const [budget, setBudget] = useState("");
  const [quotas, setQuotas] = useState<TargetGroupQuotas>({
    sat: 5,
    nationalAssoc: 15,
    provincialAssoc: 15,
    nsdf: 0,
    external: 5,
  });
  const [showQuotasDetail, setShowQuotasDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (courseToEdit) {
      setFiscalYear(courseToEdit.fiscalYear || "2569");
      setTitle(courseToEdit.title || "");
      setShortTitle(courseToEdit.shortTitle || "");
      setProvince(courseToEdit.province || detectProvinceFromLocation(courseToEdit.location || "") || "กรุงเทพมหานคร");
      setLocation(courseToEdit.location || "");
      setDate(courseToEdit.date || "");
      setCapacity(String(courseToEdit.capacity || 40));
      setHistoricalCompleted(String(courseToEdit.historicalCompleted ?? courseToEdit.capacity ?? 40));
      setHistoricalApplicants(String(courseToEdit.historicalApplicants ?? courseToEdit.capacity ?? 50));
      setBudget(courseToEdit.budget !== undefined ? String(courseToEdit.budget) : "");
      setQuotas(courseToEdit.targetQuotas || balanceQuotasToCapacity(courseToEdit.capacity || 40));
    } else {
      setFiscalYear(defaultFiscalYear || "2569");
      setTitle("");
      setShortTitle("");
      setProvince("กรุงเทพมหานคร");
      setLocation("");
      setDate("");
      setCapacity("40");
      setHistoricalCompleted("40");
      setHistoricalApplicants("50");
      setBudget("");
      setQuotas({ sat: 5, nationalAssoc: 15, provincialAssoc: 15, nsdf: 0, external: 5 });
    }
    setErrorMessage("");
    setShowQuotasDetail(false);
  }, [isOpen, courseToEdit, defaultFiscalYear]);

  if (!isOpen) return null;

  const handleDetectProvince = () => {
    if (!location.trim()) return;
    const detected = detectProvinceFromLocation(location);
    if (detected) {
      setProvince(detected);
    }
  };

  const handleCapacityChange = (newCapStr: string) => {
    setCapacity(newCapStr);
    const num = Number(newCapStr);
    if (num > 0) {
      setQuotas(balanceQuotasToCapacity(num));
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMessage("กรุณากรอกชื่อหลักสูตรการฝึกอบรม");
      return;
    }
    if (!fiscalYear.trim()) {
      setErrorMessage("กรุณาระบุปีงบประมาณ");
      return;
    }

    const numCapacity = Math.max(1, Number(capacity) || 40);
    const numCompleted = Math.max(0, Number(historicalCompleted) || 0);
    const numApplicants = Math.max(0, Number(historicalApplicants) || 0);
    const numBudget = Math.max(0, Number(budget) || 0);
    const finalLocation = location.trim() || (province ? `จังหวัด${province}` : "ต่างจังหวัด");
    const finalDate = date.trim() || `ปีงบประมาณ ${fiscalYear.trim()}`;

    if (isEditing && courseToEdit) {
      updateCourse(courseToEdit.id, {
        title: title.trim(),
        shortTitle: shortTitle.trim() || title.trim().slice(0, 24),
        fiscalYear: fiscalYear.trim(),
        isHistorical: true,
        province,
        location: finalLocation,
        date: finalDate,
        capacity: numCapacity,
        seats: `จำนวนที่นั่ง ${numCapacity} คน`,
        historicalCompleted: numCompleted,
        historicalApplicants: numApplicants,
        budget: numBudget,
        targetQuotas: quotas,
        status: "completed",
      });
    } else {
      addCourse({
        title: title.trim(),
        shortTitle: shortTitle.trim() || title.trim().slice(0, 24),
        fiscalYear: fiscalYear.trim(),
        isHistorical: true,
        province,
        location: finalLocation,
        date: finalDate,
        capacity: numCapacity,
        seats: `จำนวนที่นั่ง ${numCapacity} คน`,
        historicalCompleted: numCompleted,
        historicalApplicants: numApplicants,
        budget: numBudget,
        targetQuotas: quotas,
        status: "completed",
      });
    }

    onSuccess?.();
    onClose();
  };

  const handleDelete = () => {
    if (!courseToEdit) return;
    if (confirm(`คุณต้องการลบข้อมูลประวัติหลักสูตร "${courseToEdit.title}" ออกจากระบบใช่หรือไม่?`)) {
      deleteCourse(courseToEdit.id);
      onSuccess?.();
      onClose();
    }
  };

  // รวมโควตา 5 กลุ่ม
  const quotaSum = (quotas.sat || 0) + (quotas.nsdf || 0) + (quotas.nationalAssoc || 0) + (quotas.provincialAssoc || 0) + (quotas.external || 0);
  const numCap = Number(capacity) || 40;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#16265E] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl font-bold">
              📚
            </span>
            <div>
              <h3 className="text-base font-bold">
                {isEditing ? "แก้ไขข้อมูลประวัติหลักสูตรย้อนหลัง" : "บันทึกข้อมูลประวัติหลักสูตรย้อนหลัง"}
              </h3>
              <p className="text-xs text-white/70">
                สำหรับบันทึกผลการดำเนินงานและงบประมาณปีก่อนหน้า เพื่อเปรียบเทียบแนวโน้ม (Benchmarking)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              ⚠️ {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* ปีงบประมาณ */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ปีงบประมาณ <span className="text-red-500">*</span>
              </label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-none focus:ring-1 focus:ring-[#16265E]"
              >
                <option value="2569">ปีงบประมาณ 2569</option>
                <option value="2568">ปีงบประมาณ 2568</option>
                <option value="2567">ปีงบประมาณ 2567</option>
                <option value="2566">ปีงบประมาณ 2566</option>
                <option value="2565">ปีงบประมาณ 2565</option>
                <option value="2570">ปีงบประมาณ 2570</option>
              </select>
            </div>

            {/* จังหวัดที่จัด */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  จังหวัดหลักที่จัดอบรม <span className="text-red-500">*</span>
                </label>
                {location.trim() && (
                  <button
                    type="button"
                    onClick={handleDetectProvince}
                    className="text-[11px] text-[#16265E] hover:underline flex items-center gap-1 font-medium"
                  >
                    ↺ ตรวจจับจากสถานที่
                  </button>
                )}
              </div>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-none focus:ring-1 focus:ring-[#16265E]"
              >
                {Object.entries(THAI_REGIONS).map(([regKey, regInfo]) => (
                  <optgroup key={regKey} label={`ภาค${regInfo.nameTh}`}>
                    {THAI_PROVINCES.filter((p) => p.region === regKey).map((p) => (
                      <option key={p.nameTh} value={p.nameTh}>
                        {p.nameTh}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* ชื่อหลักสูตร */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ชื่อหลักสูตรการฝึกอบรม <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น หลักสูตร การบริหารจัดการการกีฬาสำหรับผู้บริหารระดับต้น"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-none focus:ring-1 focus:ring-[#16265E]"
            />
          </div>

          {/* สถานที่ และ ช่วงเวลา */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                สถานที่จัดอบรม
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น ศูนย์ฝึกกีฬาแห่งชาติ ภาค 5 จ.เชียงใหม่"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-none focus:ring-1 focus:ring-[#16265E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ช่วงเวลาที่จัดอบรม
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="เช่น 15-18 มี.ค. 2569"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-none focus:ring-1 focus:ring-[#16265E]"
              />
            </div>
          </div>

          {/* ตัวเลขผลการดำเนินงานและงบประมาณ */}
          <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4 space-y-3">
            <h4 className="text-xs font-bold text-[#16265E] flex items-center gap-1.5">
              <span>📊</span> ข้อมูลผลสัมฤทธิ์และงบประมาณที่ใช้จริง
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* งบประมาณจัดสรรจริง */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  งบประมาณที่ใช้จริง (บาท) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">฿</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="390000"
                    className="w-full rounded-xl border border-gray-300 pl-7 pr-3 py-1.5 text-sm font-semibold text-[#16265E] focus:border-[#16265E] focus:outline-none"
                  />
                </div>
              </div>

              {/* ผู้ผ่านการอบรมจริง (ตัวจริง) */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  ผู้ผ่านการอบรมจริง (คน) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={historicalCompleted}
                  onChange={(e) => setHistoricalCompleted(e.target.value)}
                  placeholder="40"
                  className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold text-green-700 focus:border-[#16265E] focus:outline-none"
                />
              </div>

              {/* จำนวนผู้สมัคร */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  จำนวนผู้สมัครทั้งหมด (คน)
                </label>
                <input
                  type="number"
                  value={historicalApplicants}
                  onChange={(e) => setHistoricalApplicants(e.target.value)}
                  placeholder="58"
                  className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-[#16265E] focus:outline-none"
                />
              </div>
            </div>

            {/* ต้นทุนต่อหัว คำนวณสด */}
            <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs">
              <span className="text-gray-600">ต้นทุนคำนวณต่อผู้ผ่านการอบรม:</span>
              <span className="font-bold text-[#16265E]">
                {Number(budget) > 0 && Number(historicalCompleted) > 0
                  ? `฿${Math.round(Number(budget) / Number(historicalCompleted)).toLocaleString()} / คน`
                  : "-"}
              </span>
            </div>
          </div>

          {/* สัดส่วนโควตา 5 กลุ่มเป้าหมาย (Accordion) */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowQuotasDetail(!showQuotasDetail)}
              className="w-full px-4 py-2.5 bg-gray-50 flex items-center justify-between text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
            >
              <span>🎯 สัดส่วนโควตา 5 กลุ่มเป้าหมาย กกท. (รวม {quotaSum}/{numCap} ที่นั่ง)</span>
              <span>{showQuotasDetail ? "▲ ย่อ" : "▼ ขยาย"}</span>
            </button>

            {showQuotasDetail && (
              <div className="p-4 bg-white space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>เป้าหมายจำนวนที่นั่งรวม (Capacity):</span>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => handleCapacityChange(e.target.value)}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-center font-bold text-gray-800"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TARGET_GROUPS.map((g) => (
                    <div key={g.key} className="rounded-lg border border-gray-200 p-2 bg-gray-50/50">
                      <label className="block text-[11px] font-medium text-gray-700 truncate" title={g.label}>
                        {g.label}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={quotas[g.key as keyof TargetGroupQuotas] || 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setQuotas((prev) => ({ ...prev, [g.key]: val }));
                        }}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-center text-xs font-bold text-[#16265E]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3.5 flex items-center justify-between">
          {isEditing ? (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
            >
              🗑️ ลบประวัติ
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-[#16265E] px-5 py-2 text-xs font-bold text-white hover:bg-[#121f4c] shadow transition"
            >
              {isEditing ? "บันทึกการแก้ไข" : "บันทึกหลักสูตรย้อนหลัง"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
