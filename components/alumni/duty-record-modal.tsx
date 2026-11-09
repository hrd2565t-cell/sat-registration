"use client";

import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
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

const ROLE_SUGGESTIONS = [
  "ผู้ฝึกสอนกีฬา",
  "ผู้ตัดสิน / ผู้ชี้ขาด",
  "ผู้จัดการทีม",
  "ผู้บริหารสมาคม / สโมสร",
  "ฝ่ายเทคนิค / จัดการแข่งขัน",
  "วิทยาศาสตร์การกีฬา",
];

const STARTER_PROMPTS = [
  {
    label: "🏛️ บริหารองค์กรสู่ความเป็นเลิศ",
    text: "นำองค์ความรู้การบริหารจัดการองค์กรกีฬาเพื่อความเป็นเลิศมาปรับปรุงโครงสร้างการทำงาน การประสานงานระหว่างฝ่าย และการกำกับติดตามเป้าหมายขององค์กร/สมาคมกีฬาให้มีประสิทธิภาพสูงขึ้น",
  },
  {
    label: "⚖️ ธรรมาภิบาลโอลิมปิก & จริยธรรม",
    text: "นำหลักธรรมาภิบาลตามแนวทางโอลิมปิกสากลและความซื่อสัตย์สุจริตมาใช้กำกับดูแลทีมงานและนักกีฬา ปลูกฝังค่านิยมเคารพกติกา Fair Play และป้องกันผลประโยชน์ทับซ้อน",
  },
  {
    label: "💰 งบประมาณ & จัดซื้อจัดจ้างภาครัฐ",
    text: "นำระเบียบการบริหารงบประมาณและการจัดซื้อจัดจ้างภาครัฐมาวางแผนเบิกจ่ายงบประมาณโครงการฝึกซ้อมและจัดแข่งขันอย่างถูกต้อง รัดกุม โปร่งใส ตรวจสอบได้ตามระเบียบราชการ",
  },
  {
    label: "🌐 บริหารจัดการกีฬานานาชาติ",
    text: "นำมาตรฐานการบริหารจัดการกีฬาระดับนานาชาติ การประสานงานสหพันธ์กีฬา และขั้นตอน Protocol การจัดอีเวนต์มาใช้ในการจัดแข่งขันได้อย่างราบรื่นตามมาตรฐานสากล",
  },
  {
    label: "🎯 วางแผนพัฒนาศักยภาพนักกีฬา",
    text: "นำหลักการวางแผนพัฒนาสมรรถภาพนักกีฬาสู่ความเป็นเลิศ การวิเคราะห์จุดแข็งจุดอ่อน และการประเมินผลเชิงสถิติมาใช้ในการฝึกซ้อมจริงจนบรรลุเป้าหมายการแข่งขัน",
  },
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  5: "⭐ ระดับมากที่สุด (มีผลต่อความสำเร็จสูงมาก)",
  4: "⭐ ระดับมาก (ช่วยแก้ปัญหาและพัฒนานักกีฬาได้ชัดเจน)",
  3: "⭐ ระดับปานกลาง (นำมาประยุกต์ใช้ได้ตามมาตรฐาน)",
  2: "⭐ ระดับน้อย (นำมาใช้บางสถานการณ์)",
  1: "⭐ ระดับน้อยที่สุด",
};

/**
 * บีบอัดรูปถ่ายภาพในเครื่องของผู้ใช้ (Client-Side) ก่อนบันทึก เพื่อความรวดเร็วบนมือถือและประหยัดพื้นที่
 */
function compressImage(file: File): Promise<{ dataUrl: string; sizeStr: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const rawUrl = (e.target?.result as string) || "";
          resolve({
            dataUrl: rawUrl,
            sizeStr: `${Math.round(file.size / 1024)} KB`,
          });
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressedUrl = canvas.toDataURL("image/jpeg", 0.82);
        const bytes = Math.round((compressedUrl.length * 3) / 4);
        const sizeStr =
          bytes >= 1024 * 1024
            ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(bytes / 1024)} KB`;
        resolve({ dataUrl: compressedUrl, sizeStr });
      };
      img.onerror = () => {
        const rawUrl = (e.target?.result as string) || "";
        resolve({
          dataUrl: rawUrl,
          sizeStr: `${Math.round(file.size / 1024)} KB`,
        });
      };
      img.src = (e.target?.result as string) || "";
    };
    reader.readAsDataURL(file);
  });
}

export function DutyRecordModal({
  trainee,
  onClose,
  onSave,
  isAdmin = false,
}: DutyRecordModalProps) {
  const [eventName, setEventName] = useState("");
  const [role, setRole] = useState("ผู้ฝึกสอนกีฬา");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState("");
  const [isSingleDay, setIsSingleDay] = useState(true);
  const [organization, setOrganization] = useState(trainee.affiliation || "");
  const [location, setLocation] = useState("");
  const [achievement, setAchievement] = useState("");
  const [knowledgeApplied, setKnowledgeApplied] = useState("");
  const [knowledgeDimensions, setKnowledgeDimensions] = useState<string[]>(["governance"]);
  const [customDimension, setCustomDimension] = useState("");
  const [impactRating, setImpactRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [verified, setVerified] = useState(isAdmin);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);
  const [attachmentSize, setAttachmentSize] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleDimension = (key: string) => {
    setKnowledgeDimensions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (isSingleDay) {
      setEndDate(val);
    } else if (endDate && val > endDate) {
      setEndDate(val);
    }
  };

  const handleToggleSingleDay = (checked: boolean) => {
    setIsSingleDay(checked);
    if (checked) {
      setEndDate(startDate);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("ไฟล์ต้นฉบับต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    setError("");
    setAttachmentName(file.name);

    if (file.type.startsWith("image/")) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        setAttachmentUrl(compressed.dataUrl);
        setAttachmentSize(compressed.sizeStr);
      } catch {
        setAttachmentUrl(undefined);
      } finally {
        setIsCompressing(false);
      }
    } else {
      // PDF or documents
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentUrl(reader.result as string);
        const sizeStr =
          file.size >= 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`;
        setAttachmentSize(sizeStr);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentName("");
    setAttachmentUrl(undefined);
    setAttachmentSize("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInsertStarter = (text: string) => {
    if (!knowledgeApplied.trim()) {
      setKnowledgeApplied(text);
    } else {
      setKnowledgeApplied((prev) => `${prev.trim()}\n${text}`);
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
      setError(
        "กรุณาระบุว่าท่านได้นำเอาความรู้ที่ได้จากการอบรมไปใช้ในการปฏิบัติหน้าที่อย่างไร เพื่อนำข้อมูลไปประเมินโครงการ"
      );
      return;
    }

    const effectiveEnd = isSingleDay || !endDate ? startDate : endDate;

    const effectiveDimensions = knowledgeDimensions.map((k) =>
      k === "other" && customDimension.trim() ? `other:${customDimension.trim()}` : k
    );

    onSave({
      idCard: trainee.idCard,
      eventName: eventName.trim(),
      role: role.trim(),
      startDate,
      endDate: effectiveEnd,
      organization: organization.trim() || trainee.affiliation,
      location: location.trim() || undefined,
      achievement: achievement.trim() || undefined,
      knowledgeApplied: knowledgeApplied.trim(),
      knowledgeDimensions: effectiveDimensions.length > 0 ? effectiveDimensions : undefined,
      impactRating,
      attachmentName: attachmentName || undefined,
      attachmentUrl: attachmentUrl || undefined,
      verified,
    });
    onClose();
  };

  const activeRating = hoverRating ?? impactRating;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duty-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[94vh] sm:max-h-[88vh] w-full max-w-xl flex-col rounded-2xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        {/* ================= Sticky Header ================= */}
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 bg-gradient-to-r from-[#0E2554] via-[#16265E] to-[#1e3a8a] px-4 py-3.5 sm:px-6 sm:py-4 text-white">
          <div className="min-w-0 pr-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                📋 แบบรายงานการปฏิบัติหน้าที่
              </span>
              <span className="rounded-md bg-amber-400/25 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                บุคลากรกีฬา กกท.
              </span>
            </div>
            <h3 id="duty-modal-title" className="mt-1 text-base sm:text-lg font-black leading-snug truncate">
              บันทึกการปฏิบัติหน้าที่ในวงการกีฬา
            </h3>
            <p className="text-[11.5px] text-blue-100/90 truncate mt-0.5">
              บุคลากร: <span className="font-bold text-white">{trainee.name}</span>{" "}
              <span className="opacity-80">({trainee.affiliation})</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
            aria-label="ปิดหน้าต่าง"
          >
            ✕
          </button>
        </div>

        {/* ================= Scrollable Form Body ================= */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {/* Error Message Banner */}
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 shadow-xs animate-in fade-in"
            >
              <span className="text-base shrink-0">⚠️</span>
              <div className="min-w-0 flex-1 font-medium">{error}</div>
            </div>
          )}

          <form id="duty-record-form" onSubmit={handleSubmit} className="space-y-4">
            {/* 1. ชื่อการแข่งขัน / กิจกรรม */}
            <div>
              <label className="block text-xs font-bold text-gray-800">
                ชื่อการแข่งขัน / ทัวร์นาเมนต์ / กิจกรรม <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น การแข่งขันกีฬาแห่งชาติ, ไทยแลนด์ลีก, การแข่งขันชิงชนะเลิศแห่งประเทศไทย"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-[#16265E] focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/20"
              />
            </div>

            {/* 2. บทบาทหน้าที่ + ปุ่มลัดเลือกด่วน */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-800">
                  บทบาทหน้าที่ <span className="text-red-500">*</span>
                </label>
                <span className="text-[10.5px] text-gray-500">แตะปุ่มลัดหรือพิมพ์ระบุเอง</span>
              </div>

              {/* Quick Role Chips */}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ROLE_SUGGESTIONS.map((item) => {
                  const isSelected = role.trim() === item;
                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setRole(item)}
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#16265E] text-white shadow-xs"
                          : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                required
                placeholder="เช่น ผู้ฝึกสอนกีฬา, ผู้ตัดสินชี้ขาด, เจ้าหน้าที่จัดการแข่งขัน"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-2 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-900 focus:border-[#16265E] focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/20"
              />
            </div>

            {/* 3. หน่วยงาน / สโมสร / จังหวัด ที่มอบหมาย */}
            <div>
              <label className="block text-xs font-bold text-gray-800">
                หน่วยงาน / สโมสร / จังหวัด ที่มอบหมาย
              </label>
              <input
                type="text"
                placeholder="เช่น สมาคมกีฬาแห่งจังหวัดเชียงใหม่, สมาคมกีฬาว่ายน้ำฯ, สโมสรกีฬา..."
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-900 focus:border-[#16265E] focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/20"
              />
            </div>

            {/* 4. วันที่ปฏิบัติหน้าที่ & Toggle กิจกรรมวันเดียว */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">
                  ช่วงเวลาการปฏิบัติหน้าที่ <span className="text-red-500">*</span>
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-[#16265E]">
                  <input
                    type="checkbox"
                    checked={isSingleDay}
                    onChange={(e) => handleToggleSingleDay(e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-[#16265E] focus:ring-[#16265E]"
                  />
                  <span>กิจกรรมวันเดียว (จบในวัน)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    วันที่เริ่มปฏิบัติหน้าที่
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 focus:border-[#16265E] focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/20"
                  />
                </div>

                {!isSingleDay && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      วันที่สิ้นสุด
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-800 focus:border-[#16265E] focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/20"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 5. สถานที่จัดการแข่งขัน / ปฏิบัติงาน */}
            <div>
              <label className="block text-xs font-bold text-gray-800">
                สถานที่จัดการแข่งขัน / ปฏิบัติงาน
              </label>
              <input
                type="text"
                placeholder="เช่น สนามกีฬาสมโภช 700 ปี จ.เชียงใหม่, อินดอร์สเตเดียม หัวหมาก"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-[13px] text-gray-900 focus:border-[#16265E] focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/20"
              />
            </div>

            {/* 6. ผลสัมฤทธิ์ / ผลงานที่โดดเด่น */}
            <div>
              <label className="block text-xs font-bold text-gray-800">
                ผลสัมฤทธิ์ / ผลงานที่โดดเด่น (ถ้ามี)
              </label>
              <textarea
                rows={2}
                placeholder="เช่น นำทีมคว้าเหรียญทอง, ปฏิบัติหน้าที่ในรอบชิงชนะเลิศตามมาตรฐานสากล, นักกีฬาพัฒนาสถิติขึ้น 15%"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[12.5px] text-gray-900 focus:border-[#16265E] focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/20"
              />
            </div>

            {/* ================= Kirkpatrick Level 3 & 4 (การนำความรู้ไปใช้จริง) ================= */}
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-[#f0f9ff]/90 via-[#f8fafc] to-white p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-start gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#16265E] text-white text-sm shadow-xs">
                  💡
                </span>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-[13px] font-bold text-[#16265E]">
                    การนำความรู้จากการอบรมไปใช้จริง (สำหรับประเมินผลโครงการ กกท.)
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    ระบบจะรวบรวมข้อมูลส่วนนี้ไปสังเคราะห์ในรายงานผลสัมฤทธิ์โครงการของ กกท.
                  </p>
                </div>
              </div>

              {/* มิติความรู้ที่นำไปประยุกต์ใช้ (Mobile-friendly large tap targets) */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
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
                        className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer ${
                          checked
                            ? "border-[#16265E] bg-white font-bold text-[#16265E] shadow-xs ring-2 ring-[#16265E]/15"
                            : "border-gray-200 bg-white/80 font-medium text-gray-700 hover:bg-white hover:border-gray-300"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[11px] font-bold transition-colors ${
                            checked ? "bg-[#16265E] text-white" : "border border-gray-300 bg-white"
                          }`}
                        >
                          {checked ? "✓" : ""}
                        </span>
                        <span className="min-w-0 leading-tight">
                          <span className="mr-1 text-sm">{dim.icon}</span>
                          {dim.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ระบุเพิ่มเติมเมื่อเลือก "อื่นๆ" */}
                {knowledgeDimensions.includes("other") && (
                  <div className="mt-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <label className="block text-[11px] font-bold text-[#16265E] mb-1">
                      ระบุความรู้/ทักษะอื่นๆ เพิ่มเติม (ไม่บังคับ):
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น การเจรจาสิทธิประโยชน์ทางการกีฬา, วิทยาศาสตร์การกีฬา, เวชศาสตร์การกีฬา"
                      value={customDimension}
                      onChange={(e) => setCustomDimension(e.target.value)}
                      className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-[#16265E] focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/20"
                    />
                  </div>
                )}
              </div>

              {/* ข้อความการนำความรู้ไปใช้จริง พร้อมปุ่มลัด Starter Prompts */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="block text-xs font-bold text-gray-800">
                    ท่านได้นำเอาความรู้ที่ได้จากการอบรม ไปใช้ในการปฏิบัติหน้าที่อย่างไร <span className="text-red-500">*</span>
                  </label>
                </div>
                <p className="text-[11px] text-gray-500 mb-2">
                  แตะเลือกตัวอย่างเพื่อนำไปปรับใช้ หรือพิมพ์ระบุเหตุการณ์จริง:
                </p>

                {/* Quick Starter Chips */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {STARTER_PROMPTS.map((starter) => (
                    <button
                      type="button"
                      key={starter.label}
                      onClick={() => handleInsertStarter(starter.text)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 py-1 text-[11px] font-semibold text-[#1e40af] shadow-2xs transition hover:bg-blue-50 active:scale-95"
                      title="แตะเพื่อใส่ข้อความตัวอย่างนี้"
                    >
                      <span>+ {starter.label}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  required
                  placeholder="เช่น นำระเบียบการจัดซื้อจัดจ้างภาครัฐและการบริหารงบประมาณมาใช้จัดซื้ออุปกรณ์ฝึกซ้อมได้อย่างถูกต้อง รวดเร็ว ตรวจสอบได้ตามระเบียบ / นำหลักธรรมาภิบาลโอลิมปิกมาใช้กำกับวินัยทีมงาน..."
                  value={knowledgeApplied}
                  onChange={(e) => setKnowledgeApplied(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-xs leading-relaxed text-gray-900 focus:border-[#16265E] focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/20"
                />
              </div>

              {/* Interactive 5-Star Rating (Touch-Friendly) */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  ระดับประสิทธิผลที่ความรู้จากหลักสูตรช่วยเพิ่มประสิทธิภาพการทำงาน
                </label>
                <div className="flex flex-col gap-1.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isGold = activeRating >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => setImpactRating(star)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-2xl shadow-2xs transition-transform hover:scale-110 active:scale-95 cursor-pointer border border-amber-100"
                          aria-label={`ให้ ${star} ดาว`}
                        >
                          <span className={isGold ? "text-amber-500 drop-shadow-xs" : "text-gray-300"}>
                            ★
                          </span>
                        </button>
                      );
                    })}
                    <span className="ml-1 text-sm font-black text-amber-900">
                      {impactRating} / 5
                    </span>
                  </div>

                  <p className="text-xs font-bold text-amber-900">
                    {RATING_DESCRIPTIONS[impactRating] || ""}
                  </p>
                </div>
              </div>
            </div>

            {/* 7. แนบภาพถ่ายขณะปฏิบัติหน้าที่ (กล้องมือถือ / คลังภาพ + พรีวิว + Auto Compress) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-800">
                  แนบภาพถ่ายขณะปฏิบัติหน้าที่ หรือเอกสารคำสั่งแต่งตั้ง
                </label>
                <span className="text-[10.5px] text-gray-500">JPG, PNG, PDF (ไม่เกิน 10MB)</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                id="duty-file-upload-input"
              />

              {!attachmentName ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[70px] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 p-3 text-center transition hover:border-[#16265E] hover:bg-blue-50/40 cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[#16265E]">
                    <span className="text-lg">📸</span>
                    <span>แตะเพื่อถ่ายภาพจากกล้อง หรือเลือกไฟล์รูป/PDF</span>
                  </div>
                  <p className="text-[10.5px] text-gray-500">
                    ระบบจะบีบอัดขนาดไฟล์รูปให้อัตโนมัติ เพื่อการส่งข้อมูลที่รวดเร็ว
                  </p>
                </button>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {attachmentUrl && attachmentUrl.startsWith("data:image/") ? (
                      <img
                        src={attachmentUrl}
                        alt="พรีวิวหลักฐาน"
                        className="h-12 w-12 shrink-0 rounded-lg object-cover border border-emerald-300 shadow-2xs"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white text-lg font-bold">
                        📄
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-950 truncate max-w-[200px] sm:max-w-xs">
                        {attachmentName}
                      </p>
                      <p className="text-[10.5px] text-emerald-700">
                        {isCompressing ? "กำลังบีบอัดภาพ..." : `ขนาดไฟล์: ${attachmentSize || "พร้อมใช้งาน"}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      เปลี่ยน
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-xs font-bold text-red-600 hover:bg-red-200"
                      title="ลบไฟล์"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 8. Admin Verification Checkbox */}
            {isAdmin && (
              <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200">
                <label className="flex items-center gap-2.5 text-xs font-bold text-emerald-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>อนุมัติรับรองการปฏิบัติหน้าที่นี้ทันที (Verified by Admin)</span>
                </label>
              </div>
            )}
          </form>
        </div>

        {/* ================= Sticky Bottom Action Bar ================= */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-gray-100 bg-[#f8fafc] px-4 py-3 sm:px-6 sm:py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-xs font-bold text-gray-700 shadow-2xs transition hover:bg-gray-50 active:scale-95"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="duty-record-form"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#16265E] px-6 text-xs font-bold text-white shadow-md transition-all hover:bg-[#1e3a8a] active:scale-95"
          >
            <span>✓</span>
            <span>บันทึกการปฏิบัติหน้าที่</span>
          </button>
        </div>
      </div>
    </div>
  );
}
