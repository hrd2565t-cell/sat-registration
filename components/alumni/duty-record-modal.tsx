"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { type HistoricalTrainee, type DutyRecord, KNOWLEDGE_DIMENSIONS } from "@/lib/alumni-store";

interface DutyRecordModalProps {
  trainee: HistoricalTrainee;
  onClose: () => void;
  onSave: (
    dutyData: Omit<DutyRecord, "id" | "traineeId" | "createdAt" | "verified"> & {
      verified?: boolean;
    }
  ) => void;
  isAdmin?: boolean;
}

export function DutyRecordModal({
  trainee,
  onClose,
  onSave,
  isAdmin = false,
}: DutyRecordModalProps) {
  const [eventName, setEventName] = useState("");
  const [role, setRole] = useState("ผู้ฝึกสอน");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState("");
  const [organization, setOrganization] = useState(trainee.affiliation || "");
  const [location, setLocation] = useState("");
  const [achievement, setAchievement] = useState("");
  const [knowledgeApplied, setKnowledgeApplied] = useState("");
  const [knowledgeDimensions, setKnowledgeDimensions] = useState<string[]>(["planning"]);
  const [impactRating, setImpactRating] = useState<number>(5);
  const [verified, setVerified] = useState(isAdmin);
  const [attachmentName, setAttachmentName] = useState("");
  const [error, setError] = useState("");

  const toggleDimension = (key: string) => {
    setKnowledgeDimensions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("ไฟล์ต้องมีขนาดไม่เกิน 5 MB");
        return;
      }
      setAttachmentName(file.name);
      setError("");
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      setError("กรุณากรอกชื่อการแข่งขันหรือกิจกรรม");
      return;
    }
    if (!role.trim()) {
      setError("กรุณาระบุบทบาทหน้าที่");
      return;
    }
    if (!startDate) {
      setError("กรุณาระบุวันที่เริ่มต้น");
      return;
    }
    if (!knowledgeApplied.trim()) {
      setError("กรุณาระบุว่าท่านได้นำเอาความรู้ที่ได้จากการอบรมไปใช้ในการปฏิบัติหน้าที่อย่างไร เพื่อนำข้อมูลไปประเมินโครงการ");
      return;
    }

    onSave({
      idCard: trainee.idCard,
      eventName: eventName.trim(),
      role: role.trim(),
      startDate,
      endDate: endDate || startDate,
      organization: organization.trim() || trainee.affiliation,
      location: location.trim() || undefined,
      achievement: achievement.trim() || undefined,
      knowledgeApplied: knowledgeApplied.trim(),
      knowledgeDimensions: knowledgeDimensions.length > 0 ? knowledgeDimensions : undefined,
      impactRating,
      attachmentName: attachmentName || undefined,
      verified,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-6 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-[#16265E]">
              แบบรายงานการปฏิบัติหน้าที่
            </span>
            <h3 className="mt-1 text-lg font-bold text-[#16265E]">
              บันทึกการปฏิบัติหน้าที่ในวงการกีฬา
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              บุคลากร: <span className="font-semibold text-gray-700">{trainee.name}</span> ({trainee.affiliation})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700">
              ชื่อการแข่งขัน / ทัวร์นาเมนต์ / กิจกรรม <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น การแข่งขันกีฬาแห่งชาติ, ไทยแลนด์ลีก, การแข่งขันชิงชนะเลิศฯ"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">
                บทบาทหน้าที่ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น หัวหน้าผู้ฝึกสอน, ผู้ตัดสินชี้ขาด"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">
                หน่วยงาน / สโมสร / จังหวัด ที่มอบหมาย
              </label>
              <input
                type="text"
                placeholder="เช่น สมาคมกีฬาแห่งประเทศไทย, สมาคมกีฬา จ.เชียงใหม่"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">
                วันที่เริ่มปฏิบัติหน้าที่ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">
                วันที่สิ้นสุด
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">
              สถานที่จัดการแข่งขัน / ปฏิบัติงาน
            </label>
            <input
              type="text"
              placeholder="เช่น สนามกีฬาสมโภช 700 ปี จ.เชียงใหม่"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">
              ผลสัมฤทธิ์ / ผลงานที่โดดเด่น (ถ้ามี)
            </label>
            <textarea
              rows={2}
              placeholder="เช่น นำทีมคว้าเหรียญทอง, ปฏิบัติหน้าที่ในรอบชิงชนะเลิศตามมาตรฐานสากล"
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#16265E] focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
            />
          </div>

          {/* Kirkpatrick Level 3 & 4: การนำความรู้ไปใช้จริงและการประเมินโครงการ */}
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#16265E] text-white text-xs">
                💡
              </span>
              <div>
                <h4 className="text-xs font-bold text-[#16265E]">
                  การนำความรู้จากการอบรมไปใช้จริง (สำหรับประเมินโครงการ กกท.)
                </h4>
                <p className="text-[11px] text-gray-500">
                  ระบบจะรวบรวมข้อมูลส่วนนี้ไปสังเคราะห์ในรายงานผลสัมฤทธิ์โครงการ
                </p>
              </div>
            </div>

            {/* มิติความรู้ที่นำไปประยุกต์ใช้ */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                มิติความรู้ที่นำไปประยุกต์ใช้ในการปฏิบัติหน้าที่ (เลือกได้มากกว่า 1 ข้อ)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {KNOWLEDGE_DIMENSIONS.map((dim) => {
                  const checked = knowledgeDimensions.includes(dim.key);
                  return (
                    <button
                      type="button"
                      key={dim.key}
                      onClick={() => toggleDimension(dim.key)}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-left text-xs transition-all ${
                        checked
                          ? "border-[#16265E] bg-white text-[#16265E] font-medium shadow-xs ring-1 ring-[#16265E]/20"
                          : "border-gray-200 bg-white/70 text-gray-600 hover:bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}} // handled by button onClick
                        className="mt-0.5 rounded text-[#16265E] focus:ring-[#16265E] pointer-events-none"
                      />
                      <span>
                        <span className="mr-1">{dim.icon}</span>
                        {dim.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ข้อคำถามหลัก: ท่านได้นำเอาความรู้ที่ได้จากการอบรม ไปใช้ในการปฏิบัติหน้าที่อย่างไร */}
            <div>
              <label className="block text-xs font-semibold text-gray-800">
                ท่านได้นำเอาความรู้ที่ได้จากการอบรม ไปใช้ในการปฏิบัติหน้าที่อย่างไร <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-gray-500 mt-0.5 mb-1.5">
                โปรดระบุตัวอย่างจริง เช่น การวางโปรแกรมฝึกซ้อม Periodization, การใช้กฎกติกาการตัดสิน, การจัดการอาการบาดเจ็บ, หรือการบริหารทีม
              </p>
              <textarea
                rows={3}
                required
                placeholder="เช่น นำหลักการ Periodization มาวางตารางฝึกซ้อม 8 สัปดาห์ และนำวิทยาศาสตร์การกีฬามาวิเคราะห์สมรรถภาพนักกีฬา ทำให้สามารถลดอาการบาดเจ็บและเพิ่มความอึดของนักกีฬาได้ในรอบชิง..."
                value={knowledgeApplied}
                onChange={(e) => setKnowledgeApplied(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-[#16265E] focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
              />
            </div>

            {/* ระดับประสิทธิผล (1-5 ดาว) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                ระดับประสิทธิผลที่ความรู้จากหลักสูตรช่วยเพิ่มประสิทธิภาพการทำงาน
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setImpactRating(star)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      impactRating >= star
                        ? "bg-amber-100 text-amber-800 border border-amber-300 shadow-xs"
                        : "bg-white text-gray-400 border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span>⭐</span>
                    <span>{star} ดาว</span>
                  </button>
                ))}
                <span className="text-xs font-semibold text-emerald-800 ml-1">
                  {impactRating === 5 && "⭐ ระดับมากที่สุด (มีผลต่อความสำเร็จสูง)"}
                  {impactRating === 4 && "⭐ ระดับมาก (ช่วยแก้ปัญหาได้ชัดเจน)"}
                  {impactRating === 3 && "⭐ ระดับปานกลาง (นำมาปรับใช้ได้ตามมาตรฐาน)"}
                  {impactRating === 2 && "⭐ ระดับน้อย (นำมาใช้บางส่วน)"}
                  {impactRating === 1 && "⭐ ระดับน้อยที่สุด"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">
              แนบภาพถ่ายขณะปฏิบัติหน้าที่ หรือเอกสารคำสั่งแต่งตั้ง (JPG/PNG/PDF)
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="text-xs text-gray-500 file:mr-2 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#16265E] hover:file:bg-blue-100 cursor-pointer"
              />
              {attachmentName && (
                <span className="text-xs text-emerald-600 font-medium truncate max-w-xs">
                  ✓ {attachmentName}
                </span>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
              <label className="flex items-center gap-2 text-xs font-semibold text-emerald-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>อนุมัติรับรองการปฏิบัติหน้าที่นี้ทันที (Verified by Admin)</span>
              </label>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#16265E] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors"
            >
              บันทึกการปฏิบัติหน้าที่
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
