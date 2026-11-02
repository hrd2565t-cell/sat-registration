"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import type { HistoricalTrainee, DutyRecord } from "@/lib/alumni-store";

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
  const [verified, setVerified] = useState(isAdmin);
  const [attachmentName, setAttachmentName] = useState("");
  const [error, setError] = useState("");

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

    onSave({
      idCard: trainee.idCard,
      eventName: eventName.trim(),
      role: role.trim(),
      startDate,
      endDate: endDate || startDate,
      organization: organization.trim() || trainee.affiliation,
      location: location.trim() || undefined,
      achievement: achievement.trim() || undefined,
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
              บุคลากร: <span className="font-semibold text-gray-700">{trainee.name}</span> ({trainee.sportsType})
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
