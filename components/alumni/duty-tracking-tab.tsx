"use client";

import { useState, useMemo } from "react";
import { type HistoricalTrainee, type DutyRecord, KNOWLEDGE_DIMENSIONS } from "@/lib/alumni-store";

interface DutyTrackingTabProps {
  trainees: HistoricalTrainee[];
  onOpenPassport: (idCard: string) => void;
  onOpenDutyRecord: (trainee: HistoricalTrainee) => void;
  onVerifyDuty: (dutyId: string) => void;
  onDeleteDuty: (dutyId: string) => void;
  isAdmin?: boolean;
}

export function DutyTrackingTab({
  trainees,
  onOpenPassport,
  onOpenDutyRecord,
  onVerifyDuty,
  onDeleteDuty,
  isAdmin = false,
}: DutyTrackingTabProps) {
  const [filterMode, setFilterMode] = useState<"all" | "pending" | "verified">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("all");

  // Flatten all duties with their corresponding trainee info
  const allDutyItems = useMemo(() => {
    const list: { duty: DutyRecord; trainee: HistoricalTrainee }[] = [];
    for (const t of trainees) {
      for (const d of t.duties) {
        list.push({ duty: d, trainee: t });
      }
    }
    // Sort from newest to oldest
    return list.sort(
      (a, b) =>
        Date.parse(b.duty.startDate || b.duty.createdAt) -
        Date.parse(a.duty.startDate || a.duty.createdAt)
    );
  }, [trainees]);

  const filteredDuties = useMemo(() => {
    return allDutyItems.filter(({ duty, trainee }) => {
      // Status filter
      if (filterMode === "pending" && duty.verified) return false;
      if (filterMode === "verified" && !duty.verified) return false;

      // Sport filter
      if (selectedSport !== "all" && trainee.sportsType !== selectedSport) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchEvent = duty.eventName.toLowerCase().includes(q);
        const matchRole = duty.role.toLowerCase().includes(q);
        const matchName = trainee.name.toLowerCase().includes(q);
        const matchOrg = duty.organization.toLowerCase().includes(q);
        if (!matchEvent && !matchRole && !matchName && !matchOrg) return false;
      }

      return true;
    });
  }, [allDutyItems, filterMode, selectedSport, searchQuery]);

  const pendingCount = allDutyItems.filter((i) => !i.duty.verified).length;
  const verifiedCount = allDutyItems.filter((i) => i.duty.verified).length;

  return (
    <div className="space-y-5">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-900">การปฏิบัติหน้าที่ทั้งหมด</span>
            <span className="text-xl">🏃</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#16265E]">{allDutyItems.length}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">ครั้งที่มีการบันทึกในระบบ</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900">รับรองโดย กกท. แล้ว</span>
            <span className="text-xl">✅</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{verifiedCount}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">ผ่านการตรวจสอบหลักฐานครบถ้วน</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">รอเจ้าหน้าที่ตรวจสอบ</span>
            <span className="text-xl">⏳</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">รายการที่ผู้ผ่านการอบรมรายงานเข้ามา</p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-900">อัตราการรับรอง (Verified)</span>
            <span className="text-xl">📊</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-purple-700">
            {allDutyItems.length > 0 ? Math.round((verifiedCount / allDutyItems.length) * 100) : 0}%
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">ของรายการปฏิบัติหน้าที่ทั้งหมด</p>
        </div>
      </div>

      {/* Filter and Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        {/* Status Toggle Pills */}
        <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filterMode === "all"
                ? "bg-white text-[#16265E] shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            ทั้งหมด ({allDutyItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("pending")}
            className={`rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1 ${
              filterMode === "pending"
                ? "bg-white text-amber-800 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>รอตรวจสอบ</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("verified")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filterMode === "verified"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            รับรองแล้ว ({verifiedCount})
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="ค้นหาชื่องาน, บทบาท, ชื่อโค้ช/ผู้ตัดสิน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden w-full sm:w-64"
          />

          {trainees.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenDutyRecord(trainees[0])}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#16265E] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors cursor-pointer"
            >
              <span>➕</span>
              <span>รายงานหน้าที่ใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Duty Deployment Cards List */}
      <div className="space-y-3">
        {filteredDuties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <span className="text-4xl">🏅</span>
            <p className="mt-3 text-sm font-bold text-gray-700">ไม่พบรายการปฏิบัติหน้าที่ที่ตรงกับเงื่อนไข</p>
            <p className="mt-1 text-xs text-gray-500">
              {filterMode === "pending"
                ? "ไม่มีรายการที่รอการตรวจสอบในขณะนี้ เจ้าหน้าที่ตรวจสอบครบถ้วนแล้ว"
                : "ลองปรับคำค้นหา หรือกดปุ่ม 'รายงานหน้าที่ใหม่' ด้านบน"}
            </p>
          </div>
        ) : (
          filteredDuties.map(({ duty, trainee }, idx) => (
            <div
              key={duty.id || idx}
              className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                duty.verified
                  ? "border-gray-200 bg-white hover:border-blue-300"
                  : "border-amber-300 bg-amber-50/30 hover:border-amber-400"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Event info */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-[#16265E]">
                      {trainee.sportsType}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">
                      📅 {duty.startDate} {duty.endDate && duty.endDate !== duty.startDate ? `ถึง ${duty.endDate}` : ""}
                    </span>
                    {duty.location && (
                      <>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">📍 {duty.location}</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-gray-900 leading-snug">
                    {duty.eventName}
                  </h3>

                  <p className="text-xs font-semibold text-[#16265E]">
                    บทบาท: <span className="font-bold text-[#1e3a8a]">{duty.role}</span>
                    <span className="text-gray-400 font-normal"> · สังกัด/หน่วยงาน: {duty.organization}</span>
                  </p>
                </div>

                {/* Status & Actions Badge */}
                <div className="flex flex-wrap sm:flex-col items-end gap-2">
                  {duty.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      ✓ กกท. รับรองแล้ว
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-300 animate-pulse">
                      ⏳ รอการตรวจสอบหลักฐาน
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 mt-1">
                    {isAdmin && !duty.verified && (
                      <button
                        type="button"
                        onClick={() => onVerifyDuty(duty.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                      >
                        ✓ กดยืนยันอนุมัติ
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenPassport(trainee.idCard)}
                      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#16265E] hover:bg-gray-50 transition-colors"
                    >
                      ดูพาสปอร์ต
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`ต้องการลบรายการปฏิบัติหน้าที่นี้ใช่หรือไม่?\n${duty.eventName}`)) {
                            onDeleteDuty(duty.id);
                          }
                        }}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                        title="ลบรายการนี้"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Trainee profile preview strip */}
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50/80 px-3 py-2 border border-gray-100 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#16265E] text-[10px] font-bold text-white">
                    {trainee.name.slice(0, 1)}
                  </div>
                  <span className="font-semibold text-gray-800">{trainee.name}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-500">{trainee.courseTitle} ({trainee.yearBE})</span>
                </div>

                {duty.attachmentName && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    📎 เอกสาร/ภาพถ่าย: {duty.attachmentName}
                  </span>
                )}
              </div>

              {duty.achievement && (
                <div className="mt-2.5 rounded-xl bg-emerald-50/70 p-2.5 border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
                  <span className="font-bold">🎯 ผลสัมฤทธิ์ / ผลงาน: </span>
                  {duty.achievement}
                </div>
              )}

              {duty.knowledgeApplied && (
                <div className="mt-2.5 rounded-xl bg-blue-50/60 p-3 border border-blue-200/80 text-xs shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                    <span className="font-bold text-[#16265E] flex items-center gap-1.5">
                      <span>💡</span>
                      <span>การนำความรู้จากการอบรมไปใช้จริง (Kirkpatrick Level 3):</span>
                    </span>
                    {duty.impactRating && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                        ⭐ ระดับประสิทธิผล {duty.impactRating}/5
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 italic leading-relaxed pl-5 border-l-2 border-[#16265E]/30">
                    "{duty.knowledgeApplied}"
                  </p>
                  {duty.knowledgeDimensions && duty.knowledgeDimensions.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-blue-100 pl-5">
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
          ))
        )}
      </div>
    </div>
  );
}
