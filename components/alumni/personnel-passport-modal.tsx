"use client";

import { useState } from "react";
import { type HistoricalTrainee, type DutyRecord, getTraineePassport, KNOWLEDGE_DIMENSIONS } from "@/lib/alumni-store";

interface PersonnelPassportModalProps {
  idCard: string;
  allTrainees: HistoricalTrainee[];
  onClose: () => void;
  onAddDuty: (trainee: HistoricalTrainee) => void;
  onVerifyDuty?: (dutyId: string) => void;
  isAdmin?: boolean;
}

export function PersonnelPassportModal({
  idCard,
  allTrainees,
  onClose,
  onAddDuty,
  onVerifyDuty,
  isAdmin = false,
}: PersonnelPassportModalProps) {
  const passport = getTraineePassport(idCard, allTrainees);
  const [activeTab, setActiveTab] = useState<"certs" | "duties">("certs");

  if (!passport) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
          <p className="text-gray-600">ไม่พบข้อมูลประวัติบุคลากร</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg bg-[#16265E] px-4 py-2 text-sm text-white"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  const { primary, records, allDuties, isActive } = passport;

  // Format masked ID card (e.g., 1-1005-XXXXX-56)
  const cleanId = primary.idCard.replace(/\D/g, "");
  const maskedId =
    cleanId.length === 13
      ? `${cleanId.slice(0, 1)}-${cleanId.slice(1, 5)}-XXXXX-${cleanId.slice(10, 12)}-${cleanId.slice(12)}`
      : primary.idCard;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/65 p-3 sm:p-5 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-6 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Passport Header Banner */}
        <div className="relative bg-gradient-to-r from-[#0d1b3e] via-[#16265E] to-[#1e3a8a] p-5 sm:p-6 text-white">
          {/* Subtle watermark / decorative */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute right-24 bottom-0 h-20 w-20 rounded-full bg-[#f59e0b]/10 blur-xl" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            title="ปิดหน้าต่าง (Esc)"
          >
            ✕
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Avatar / Photo */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-white/20 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-2xl font-bold text-white shadow-md">
              {primary.name.replace(/^(นาย|นางสาว|นาง|ดร\.|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.)\s*/, "").slice(0, 2)}
              <span
                className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#16265E] text-xs ${
                  isActive ? "bg-[#10b981] text-white" : "bg-[#94a3b8] text-white"
                }`}
                title={isActive ? "สถานะ: มีการปฏิบัติหน้าที่ต่อเนื่อง (Active)" : "สถานะ: ยังไม่มีประวัติปฏิบัติหน้าที่ในรอบปี"}
              >
                {isActive ? "✓" : "–"}
              </span>
            </div>

            {/* Title & Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#f59e0b] px-2 py-0.5 text-[11px] font-bold text-[#1e1b4b] shadow-xs">
                  พาสปอร์ตบุคลากรกีฬา กกท.
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    isActive
                      ? "bg-[#10b981]/25 text-[#6ee7b7] border border-[#10b981]/40"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  {isActive ? "🟢 ปฏิบัติหน้าที่ต่อเนื่อง (Active)" : "⚪ รอรายงานผลงาน (Inactive)"}
                </span>
              </div>

              <h2 className="mt-1.5 text-xl font-bold text-white tracking-tight truncate">
                {primary.name}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-100/85">
                <span>🪪 {maskedId}</span>
                <span>🏅 กีฬา{primary.sportsType}</span>
                <span>🏛️ {primary.affiliation}</span>
                {primary.phone && <span>📞 {primary.phone}</span>}
              </div>
            </div>
          </div>

          {/* Quick Summary Strip */}
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-black/25 p-2.5 text-center text-xs backdrop-blur-xs">
            <div>
              <p className="text-white/60 text-[11px]">หลักสูตรที่สำเร็จ</p>
              <p className="text-base font-bold text-[#facc15]">{records.length} หลักสูตร</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-white/60 text-[11px]">ประวัติการปฏิบัติหน้าที่</p>
              <p className="text-base font-bold text-white">{allDuties.length} รายการ</p>
            </div>
            <div>
              <p className="text-white/60 text-[11px]">สถานะการรับรอง</p>
              <p className="text-base font-bold text-[#34d399]">
                {allDuties.filter((d) => d.verified).length} / {allDuties.length} ผ่าน
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-5 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("certs")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
              activeTab === "certs"
                ? "border-[#16265E] font-bold text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>📜</span>
            <span>วุฒิบัตรและหลักสูตรที่สำเร็จ ({records.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("duties")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
              activeTab === "duties"
                ? "border-[#16265E] font-bold text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>🏃</span>
            <span>ประวัติการปฏิบัติหน้าที่ ({allDuties.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="max-h-[50vh] overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeTab === "certs" && (
            <div className="space-y-3">
              {records.map((cert, idx) => (
                <div
                  key={cert.id || idx}
                  className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-xs hover:border-blue-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e0e7ff] text-[#4338ca] font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-[#16265E] text-sm sm:text-base">
                          {cert.courseTitle}
                        </h4>
                        <p className="text-xs text-gray-500">{cert.batch} · ประจำปี พ.ศ. {cert.yearBE}</p>
                      </div>
                    </div>
                    <span className="inline-flex self-start sm:self-auto items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      ✓ ผ่านการอบรม
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">เลขที่วุฒิบัตร:</span>
                      <span className="font-semibold text-gray-800">{cert.certNo || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">วันที่สำเร็จการอบรม:</span>
                      <span className="font-medium text-gray-800">{cert.passedDate || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">สังกัดที่ลงทะเบียน:</span>
                      <span className="font-medium text-gray-800">{cert.affiliation}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">ชนิดกีฬา:</span>
                      <span className="font-medium text-gray-800">{cert.sportsType}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "duties" && (
            <div className="space-y-3">
              {allDuties.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                  <span className="text-3xl">📋</span>
                  <p className="mt-2 text-sm font-semibold text-gray-700">
                    ยังไม่มีข้อมูลประวัติการปฏิบัติหน้าที่
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    สามารถกดปุ่ม "บันทึกการปฏิบัติหน้าที่ใหม่" ด้านล่าง เพื่อเพิ่มรายการทัวร์นาเมนต์หรือกิจกรรมที่ไปทำหน้าที่
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddDuty(primary)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#16265E] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1e3a8a]"
                  >
                    + บันทึกการปฏิบัติหน้าที่รายการแรก
                  </button>
                </div>
              ) : (
                allDuties.map((duty, idx) => (
                  <div
                    key={duty.id || idx}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-colors hover:border-blue-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-gray-900 text-sm">
                            {duty.eventName}
                          </h4>
                        </div>
                        <p className="text-xs font-semibold text-[#16265E] mt-1 pl-7">
                          บทบาท: {duty.role}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pl-7 sm:pl-0">
                        {duty.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            ✓ กกท. รับรองแล้ว
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                              ⏳ รอเจ้าหน้าที่ตรวจสอบ
                            </span>
                            {isAdmin && onVerifyDuty && (
                              <button
                                type="button"
                                onClick={() => onVerifyDuty(duty.id)}
                                className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                              >
                                กดอนุมัติ
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 pl-7 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-600">
                      <div>
                        <span className="text-gray-400">ช่วงเวลา: </span>
                        <span>{duty.startDate} {duty.endDate ? `ถึง ${duty.endDate}` : ""}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">หน่วยงานที่มอบหมาย: </span>
                        <span>{duty.organization}</span>
                      </div>
                      {duty.location && (
                        <div>
                          <span className="text-gray-400">สถานที่: </span>
                          <span>{duty.location}</span>
                        </div>
                      )}
                      {duty.achievement && (
                        <div className="sm:col-span-2 text-emerald-800 font-medium bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                          🎯 ผลสัมฤทธิ์/ผลงาน: {duty.achievement}
                        </div>
                      )}
                      {duty.knowledgeApplied && (
                        <div className="sm:col-span-2 rounded-xl bg-blue-50/70 p-3 border border-blue-200 text-xs">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-[#16265E] flex items-center gap-1.5">
                              <span>💡</span>
                              <span>การนำความรู้จากการอบรมไปใช้จริง:</span>
                            </span>
                            {duty.impactRating && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                                ⭐ {duty.impactRating}/5 ประสิทธิผล
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700 italic leading-relaxed">
                            "{duty.knowledgeApplied}"
                          </p>
                          {duty.knowledgeDimensions && duty.knowledgeDimensions.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1 border-t border-blue-100">
                              {duty.knowledgeDimensions.map((dimKey) => {
                                const dimInfo = KNOWLEDGE_DIMENSIONS.find((k) => k.key === dimKey);
                                return (
                                  <span
                                    key={dimKey}
                                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-900 border border-blue-200 shadow-2xs"
                                  >
                                    <span>{dimInfo?.icon || "🏷️"}</span>
                                    <span>{dimInfo?.label.split(" (")[0] || dimKey}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3.5 sm:px-6">
          <div className="text-xs text-gray-500">
            กองพัฒนาบุคลากรกีฬา · การกีฬาแห่งประเทศไทย
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddDuty(primary)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16265E] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors"
            >
              <span>➕</span>
              <span>รายงานการปฏิบัติหน้าที่</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span>🖨️</span>
              <span>พิมพ์</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
