"use client";

import { useState } from "react";
import { isValidThaiIdCard, formatThaiIdCard } from "@/lib/validation";
import { submitProfileClaim } from "@/lib/claims-store";

interface TargetTraineeClaimInfo {
  id: string;
  personnelId?: string;
  name: string;
  affiliation: string;
  affiliationGroup?: string;
  courseTitle: string;
  latestYearBE?: number;
  totalCoursesCount?: number;
}

interface ClaimProfileModalProps {
  trainee: TargetTraineeClaimInfo;
  onClose: () => void;
  onSuccess?: (claimId: string) => void;
}

export function ClaimProfileModal({
  trainee,
  onClose,
  onSuccess,
}: ClaimProfileModalProps) {
  const [idCardInput, setIdCardInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [newAffiliation, setNewAffiliation] = useState(trainee.affiliation || "");
  const [note, setNote] = useState("");
  const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
  const [pdpaConsent, setPdpaConsent] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedClaimId, setSubmittedClaimId] = useState<string | null>(null);

  const cleanId = idCardInput.replace(/\D/g, "");
  const isIdValid = cleanId.length === 13 && isValidThaiIdCard(cleanId);
  const cleanPhone = phoneInput.replace(/\D/g, "");
  const isPhoneValid = cleanPhone.length >= 9 && cleanPhone.length <= 10;

  // Format ID card on typing
  const handleIdChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 13);
    setIdCardInput(formatThaiIdCard(raw));
    if (errorMsg) setErrorMsg("");
  };

  // Format Phone on typing
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 10);
    if (raw.length <= 3) {
      setPhoneInput(raw);
    } else if (raw.length <= 6) {
      setPhoneInput(`${raw.slice(0, 3)}-${raw.slice(3)}`);
    } else {
      setPhoneInput(`${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`);
    }
    if (errorMsg) setErrorMsg("");
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setIdPhotoUrl(reader.result as string);
      if (errorMsg) setErrorMsg("");
    };
    reader.readAsDataURL(file);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isIdValid) {
      setErrorMsg("กรุณากรอกเลขประจำตัวประชาชน 13 หลักที่ถูกต้องตามทะเบียนราษฎร์");
      return;
    }
    if (!isPhoneValid) {
      setErrorMsg("กรุณากรอกหมายเลขโทรศัพท์มือถือ 9-10 หลัก");
      return;
    }
    if (!pdpaConsent) {
      setErrorMsg("กรุณาให้ความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const res = submitProfileClaim({
      traineeId: trainee.id,
      traineePersonnelId: trainee.personnelId || "",
      traineeName: trainee.name,
      currentAffiliation: trainee.affiliation,
      currentCourseTitle: trainee.courseTitle,
      latestYearBE: trainee.latestYearBE,
      totalCoursesCount: trainee.totalCoursesCount,
      claimantName: trainee.name,
      idCard: cleanId,
      phone: phoneInput.trim(),
      email: emailInput.trim() || undefined,
      newAffiliation: newAffiliation.trim() !== trainee.affiliation ? newAffiliation.trim() : undefined,
      note: note.trim() || undefined,
      idCardPhotoUrl: idPhotoUrl || undefined,
    });

    setIsSubmitting(false);

    if (res.success && res.claim) {
      setSubmittedClaimId(res.claim.id);
      if (onSuccess) onSuccess(res.claim.id);
    } else {
      setErrorMsg(res.error || "เกิดข้อผิดพลาดในการส่งคำขอ โปรดลองใหม่อีกครั้ง");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-blue-900/20 overflow-hidden my-6">
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-r from-[#0E2554] via-[#16265E] to-[#1e3a8a] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-xl shadow-md">
                🪪
              </span>
              <div>
                <h3 id="claim-modal-title" className="text-lg font-black tracking-tight text-white">
                  ยืนยันตัวตนเจ้าของประวัติ
                </h3>
                <p className="text-xs text-blue-200">
                  ระบบผูกเลขประจำตัวประชาชน 13 หลักเพื่อรับสิทธิ์เข้าถึงพาสปอร์ตดิจิทัล
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {submittedClaimId ? (
            /* SUCCESS STATE */
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl shadow-inner">
                ✓
              </div>

              <div className="space-y-1">
                <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold border border-emerald-200">
                  ส่งคำขอยืนยันตัวตนเรียบร้อยแล้ว
                </span>
                <h4 className="text-xl font-black text-gray-900 mt-2">
                  รหัสอ้างอิงคำขอ: <span className="text-[#16265E] font-mono">{submittedClaimId}</span>
                </h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  ระบบได้บันทึกคำขอยืนยันตัวตนของ <strong>{trainee.name}</strong> เข้าสู่คิวตรวจสอบของเจ้าหน้าที่ฝ่ายพัฒนาบุคลากรกีฬา กกท. เรียบร้อยแล้ว
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50/80 p-4 border border-blue-200 text-left text-xs text-blue-900 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#16265E]">ℹ️ ขั้นตอนต่อไป:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-blue-800">
                  <li>เจ้าหน้าที่ กกท. จะทำการตรวจสอบความถูกต้องของชื่อและหลักฐานภายใน 1-2 วันทำการ</li>
                  <li>เมื่ออนุมัติแล้ว ระบบจะเชื่อมโยงเลข 13 หลักเข้ากับประวัติเดิมทั้งหมดโดยอัตโนมัติ</li>
                  <li>ท่านจะสามารถใช้เลขบัตรประชาชน 13 หลักในการเข้าสู่ระบบบุคลากรเพื่อแก้ไขข้อมูลและส่งรายงานการปฏิบัติหน้าที่ได้ทันที</li>
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-[#16265E] px-5 py-3 text-sm font-bold text-white hover:bg-[#1e3a8a] transition-all shadow-md cursor-pointer"
                >
                  เสร็จสิ้น (กลับสู่หน้าเดิม)
                </button>
              </div>
            </div>
          ) : (
            /* SUBMISSION FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Existing Profile Summary Box */}
              <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-blue-50/40 p-4 border border-blue-100 shadow-2xs">
                <span className="text-[10px] font-bold text-[#16265E] uppercase tracking-wider block mb-1">
                  ประวัติที่ตรงกับชื่อในทำเนียบ กกท.
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-extrabold text-gray-900">{trainee.name}</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      📍 {trainee.affiliation} {trainee.affiliationGroup ? `(${trainee.affiliationGroup})` : ""}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      🎓 หลักสูตร {trainee.courseTitle} · ผ่านการอบรม {trainee.totalCoursesCount || 1} หลักสูตร
                      {trainee.latestYearBE ? ` (ปี พ.ศ. ${trainee.latestYearBE})` : ""}
                    </p>
                  </div>
                  {trainee.personnelId && (
                    <span className="rounded-lg bg-gray-200/80 px-2 py-1 text-[11px] font-mono font-semibold text-gray-700 shrink-0">
                      รหัสเดิม: {trainee.personnelId}
                    </span>
                  )}
                </div>
              </div>

              {/* ID Card & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 13-digit ID Card */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    เลขประจำตัวประชาชน (13 หลัก) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={idCardInput}
                    onChange={(e) => handleIdChange(e.target.value)}
                    placeholder="X-XXXX-XXXXX-XX-X"
                    maxLength={17}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold tracking-wider focus:outline-hidden transition-all ${
                      idCardInput.length === 0
                        ? "border-gray-300 focus:border-[#16265E]"
                        : isIdValid
                        ? "border-emerald-500 bg-emerald-50/40 text-emerald-900 focus:border-emerald-600"
                        : "border-red-400 bg-red-50/30 text-red-900 focus:border-red-500"
                    }`}
                  />
                  <div className="mt-1 flex items-center justify-between text-[10.5px]">
                    {idCardInput.length > 0 && (
                      <span
                        className={`font-semibold ${
                          isIdValid ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {isIdValid ? "✓ ตรวจสอบเลข 13 หลักถูกต้อง" : "⚠️ เลข 13 หลักไม่ถูกต้องตามหลักทะเบียนราษฎร์"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    เบอร์โทรศัพท์มือถือ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneInput}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    maxLength={12}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-mono font-semibold focus:outline-hidden transition-all ${
                      phoneInput.length === 0
                        ? "border-gray-300 focus:border-[#16265E]"
                        : isPhoneValid
                        ? "border-emerald-500 bg-emerald-50/40 text-emerald-900 focus:border-emerald-600"
                        : "border-gray-300 focus:border-[#16265E]"
                    }`}
                  />
                  <span className="text-[10px] text-gray-400 block mt-1">
                    ใช้สำหรับยืนยันตัวตนและติดต่อรับรหัสความปลอดภัย
                  </span>
                </div>
              </div>

              {/* Email & Affiliation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    อีเมล (Email) <span className="text-gray-400 font-normal">(แนะนำ)</span>
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm text-gray-800 focus:border-[#16265E] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    สมาคมกีฬา / สังกัดปัจจุบัน
                  </label>
                  <input
                    type="text"
                    value={newAffiliation}
                    onChange={(e) => setNewAffiliation(e.target.value)}
                    placeholder="เช่น สมาคมกีฬาฟุตบอลแห่งประเทศไทยฯ"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm text-gray-800 focus:border-[#16265E] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* ID Card Evidence Upload */}
              <div className="rounded-2xl border border-dashed border-gray-300 p-3.5 bg-gray-50/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-800 block">
                      📷 แนบภาพถ่ายบัตรประชาชน หรือบัตรประจำตัวเดิม (สำหรับให้เจ้าหน้าที่ตรวจสอบ)
                    </label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      สามารถขีดคร่อมข้อความ <em>&quot;ใช้สำหรับยืนยันตัวตนบุคลากรกีฬา กกท. เท่านั้น&quot;</em> เพื่อความปลอดภัย
                    </p>
                  </div>
                  <label className="shrink-0 cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#16265E] border border-gray-300 hover:bg-gray-50 transition-colors shadow-2xs">
                    เลือกรูปถ่าย
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {idPhotoUrl && (
                  <div className="mt-3 flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200">
                    <img
                      src={idPhotoUrl}
                      alt="ID Preview"
                      className="h-12 w-16 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-700">✓ แนบหลักฐานเรียบร้อยแล้ว</p>
                      <p className="text-[10px] text-gray-400">รูปถ่ายจะถูกเก็บรักษาอย่างปลอดภัยตามมาตรฐาน PDPA</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIdPhotoUrl(null)}
                      className="text-xs text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer"
                    >
                      ลบรูป
                    </button>
                  </div>
                )}
              </div>

              {/* Optional Note */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  คำชี้แจง / เหตุผลเพิ่มเติม <span className="text-gray-400 font-normal">(ถ้ามี)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ย้ายสังกัดใหม่, ขออัปเดตเบอร์ติดต่อใหม่ ฯลฯ"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
                />
              </div>

              {/* PDPA Consent Checkbox */}
              <label className="flex items-start gap-2.5 rounded-xl bg-amber-50/70 p-3 border border-amber-200 text-xs text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={pdpaConsent}
                  onChange={(e) => setPdpaConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-400 text-[#16265E] focus:ring-[#16265E]"
                />
                <span className="leading-relaxed">
                  <strong>การคุ้มครองข้อมูลส่วนบุคคล (PDPA):</strong> ข้าพเจ้าขอยืนยันว่าเป็นเจ้าของประวัติดังกล่าวจริง และยินยอมให้การกีฬาแห่งประเทศไทย (กกท.) เก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคลเพื่อการตรวจสอบคุณวุฒิ การจัดทำพาสปอร์ตบุคลากรกีฬาดิจิทัล และการบริการภาครัฐตามกฎหมาย
                </span>
              </label>

              {/* Error message */}
              {errorMsg && (
                <div className="rounded-xl bg-red-50 p-3 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!isIdValid || !isPhoneValid || !pdpaConsent || isSubmitting}
                  className="rounded-xl bg-[#16265E] px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>กำลังส่งคำขอ...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>ส่งคำขอยืนยันตัวตน</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
