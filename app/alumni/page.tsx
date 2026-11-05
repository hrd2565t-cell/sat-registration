"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { AppHeaderNav } from "@/components/layout/app-header-nav";
import { useIsAdmin } from "@/lib/admin-auth";
import { useAlumniStore, searchTrainees, type HistoricalTrainee, type TraineeSearchResult } from "@/lib/alumni-store";
import { AlumniDirectoryTab } from "@/components/alumni/alumni-directory-tab";
import { DutyTrackingTab } from "@/components/alumni/duty-tracking-tab";
import { ProjectEvaluationTab } from "@/components/alumni/project-evaluation-tab";
import { CourseTimelineTab } from "@/components/alumni/course-timeline-tab";
import { FutureCurriculumTab } from "@/components/alumni/future-curriculum-tab";
import { PersonnelPassportModal } from "@/components/alumni/personnel-passport-modal";
import { DigitalPassModal } from "@/components/alumni/digital-pass-modal";
import { DutyRecordModal } from "@/components/alumni/duty-record-modal";
import { BulkImportModal } from "@/components/alumni/bulk-import-modal";
import { AddTraineeModal } from "@/components/alumni/add-trainee-modal";

export default function AlumniPage() {
  return (
    <Suspense fallback={null}>
      <AlumniContent />
    </Suspense>
  );
}

function AlumniContent() {
  const isAdmin = useIsAdmin();
  const {
    trainees,
    addDutyRecord,
    verifyDutyRecord,
    deleteDutyRecord,
    deleteTrainee,
    importTrainees,
    resetAlumniData,
  } = useAlumniStore();

  const [activeTab, setActiveTab] = useState<"directory" | "duty" | "evaluation" | "timeline" | "future">("directory");

  // Protect duty tab: If non-admin user lands on or switches to duty tab, smoothly redirect to directory
  useEffect(() => {
    if (!isAdmin && activeTab === "duty") {
      setActiveTab("directory");
    }
  }, [isAdmin, activeTab]);
  const [passportIdCard, setPassportIdCard] = useState<string | null>(null);
  const [digitalPassIdCard, setDigitalPassIdCard] = useState<string | null>(null);
  const [dutyTargetTrainee, setDutyTargetTrainee] = useState<HistoricalTrainee | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddTraineeOpen, setIsAddTraineeOpen] = useState(false);

  // Smart unified search (Name, ID Card, or Cert No)
  const [quickVerifyId, setQuickVerifyId] = useState("");
  const [quickVerifyError, setQuickVerifyError] = useState("");
  const [searchResults, setSearchResults] = useState<TraineeSearchResult[] | null>(null);

  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickVerifyId.trim();
    if (!query) {
      setQuickVerifyError("กรุณากรอกชื่อ-นามสกุล หรือเลขประจำตัวประชาชน");
      setSearchResults(null);
      return;
    }

    const matches = searchTrainees(query, trainees);
    if (matches.length === 0) {
      setQuickVerifyError(`ไม่พบข้อมูลบุคลากรที่ตรงกับ "${query}" (กรุณาตรวจสอบการสะกดชื่อ หรือเลขประจำตัวประชาชน)`);
      setSearchResults(null);
      return;
    }

    setQuickVerifyError("");
    if (matches.length === 1) {
      // Exactly 1 person found -> open passport directly!
      setPassportIdCard(matches[0].idCard || matches[0].uniqueKey);
      setSearchResults(null);
    } else {
      // Multiple matches -> show candidates list
      setSearchResults(matches);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top Header */}
      <Header rightSlot={<AppHeaderNav page="alumni" />} />

      {/* Main Container */}
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="hover:text-[#16265E] transition-colors">
              หน้าแรก
            </Link>
            <span>/</span>
            <span className="font-bold text-[#16265E]">
              ทำเนียบบุคลากรกีฬาและประเมินผลโครงการ
            </span>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (confirm("ต้องการรีเซ็ตข้อมูลทำเนียบกลับเป็นข้อมูลตัวอย่างเริ่มต้นใช่หรือไม่?")) {
                  resetAlumniData();
                }
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              title="รีเซ็ตข้อมูลจำลองสำหรับทดสอบ"
            >
              🔄 รีเซ็ตข้อมูลทดสอบ
            </button>
          )}
        </div>

        {/* Public Citizen Verification Card */}
        <div className="rounded-2xl bg-gradient-to-r from-[#16265E] via-[#1e3a8a] to-[#2563eb] p-6 text-white shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="rounded-md bg-[#f59e0b] px-2 py-0.5 text-xs font-bold text-[#1e1b4b]">
                ตรวจสอบวุฒิบัตรและการรับรอง กกท.
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                ระบบค้นหาทำเนียบและพาสปอร์ตบุคลากรกีฬา
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/85">
                สมาคมกีฬา สโมสร หรือผู้ผ่านการอบรม สามารถตรวจสอบประวัติวุฒิบัตรและรายงานการปฏิบัติหน้าที่ได้ทันที
              </p>
            </div>

            {/* Quick verify form */}
            <form onSubmit={handleQuickVerify} className="w-full lg:max-w-md space-y-1.5">
              <div className="flex items-center gap-2 rounded-xl bg-white/10 p-1.5 backdrop-blur-xs border border-white/20">
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อ-นามสกุล หรือเลขประจำตัวประชาชน..."
                  value={quickVerifyId}
                  onChange={(e) => {
                    setQuickVerifyId(e.target.value);
                    if (quickVerifyError) setQuickVerifyError("");
                  }}
                  className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-[#f59e0b] px-4 py-2 text-xs sm:text-sm font-bold text-[#1e1b4b] hover:bg-[#fbbf24] transition-colors shadow-xs cursor-pointer"
                >
                  ค้นหาพาสปอร์ต
                </button>
              </div>
              {quickVerifyError && (
                <p className="text-xs text-amber-200 pl-1 font-medium">⚠️ {quickVerifyError}</p>
              )}
            </form>
          </div>

          {/* Multiple Candidates Selection Dropdown / Drawer */}
          {searchResults && searchResults.length > 1 && (
            <div className="mt-5 rounded-2xl bg-white p-4 text-gray-900 shadow-xl border border-blue-200 animate-in fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16265E] text-[10px] font-bold text-white">
                    {searchResults.length}
                  </span>
                  <h4 className="text-xs font-bold text-[#16265E]">
                    พบข้อมูลบุคลากร {searchResults.length} ท่านที่ตรงกับคำค้นหา (โปรดเลือกบุคลากรที่ต้องการดู)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchResults(null)}
                  className="rounded-lg p-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  ✕ ปิด
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto">
                {searchResults.map((person) => (
                  <div
                    key={person.uniqueKey}
                    className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 hover:bg-blue-50/50 hover:border-blue-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{person.name}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {person.affiliationGroup ? `[${person.affiliationGroup}] ` : ""}{person.affiliation}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {person.personnelId ? `รหัส ${person.personnelId} · ` : ""}{person.records.length} หลักสูตรรับรอง (ปีล่าสุด พ.ศ. {person.latestYearBE})
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setPassportIdCard(person.idCard || person.uniqueKey);
                          setSearchResults(null);
                        }}
                        className="rounded-lg bg-[#16265E] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#1e3a8a] transition-colors cursor-pointer"
                      >
                        🪪 พาสปอร์ต
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDigitalPassIdCard(person.idCard || person.uniqueKey);
                          setSearchResults(null);
                        }}
                        className="rounded-lg bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                      >
                        📱 บัตรดิจิทัล
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Tab Controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-bold transition-all ${
              activeTab === "directory"
                ? "border-[#16265E] text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="text-base">📜</span>
            <span>ทำเนียบผู้ผ่านการอบรมย้อนหลัง</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-[#16265E]">
              {trainees.length}
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("duty")}
              className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-bold transition-all ${
                activeTab === "duty"
                  ? "border-[#16265E] text-[#16265E]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <span className="text-base">🛡️</span>
              <span>การติดตามการปฏิบัติหน้าที่ (Admin)</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 font-bold">
                {trainees.reduce((sum, t) => sum + t.duties.length, 0)} ครั้ง
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("evaluation")}
            className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-bold transition-all ${
              activeTab === "evaluation"
                ? "border-[#16265E] text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="text-base">📊</span>
            <span>แดชบอร์ดประเมินโครงการ (KPIs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-bold transition-all ${
              activeTab === "timeline"
                ? "border-[#16265E] text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="text-base">📈</span>
            <span>Timeline ความต่อเนื่องหลักสูตร</span>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-900 font-extrabold">
              17 หลักสูตร
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("future")}
            className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-bold transition-all ${
              activeTab === "future"
                ? "border-[#16265E] text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="text-base">💡</span>
            <span>ทิศทางพัฒนาหลักสูตรอนาคต</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 font-extrabold">
              5 พิมพ์เขียว
            </span>
          </button>
        </div>

        {/* Tab Content Display */}
        {activeTab === "directory" && (
          <AlumniDirectoryTab
            trainees={trainees}
            onOpenPassport={(idCard) => setPassportIdCard(idCard)}
            onOpenDutyRecord={(t) => setDutyTargetTrainee(t)}
            onOpenDigitalPass={(idCard) => setDigitalPassIdCard(idCard)}
            onOpenImport={() => setIsImportOpen(true)}
            onOpenAddTrainee={() => setIsAddTraineeOpen(true)}
            onDeleteTrainee={(id) => deleteTrainee(id)}
            isAdmin={isAdmin}
          />
        )}

        {isAdmin && activeTab === "duty" && (
          <DutyTrackingTab
            trainees={trainees}
            onOpenPassport={(idCard) => setPassportIdCard(idCard)}
            onOpenDutyRecord={(t) => setDutyTargetTrainee(t)}
            onVerifyDuty={(dutyId) => verifyDutyRecord(dutyId)}
            onDeleteDuty={(dutyId) => deleteDutyRecord(dutyId)}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === "evaluation" && (
          <ProjectEvaluationTab trainees={trainees} isAdmin={isAdmin} />
        )}

        {activeTab === "timeline" && (
          <CourseTimelineTab
            trainees={trainees}
            onOpenPassport={(idCard) => setPassportIdCard(idCard)}
          />
        )}

        {activeTab === "future" && (
          <FutureCurriculumTab trainees={trainees} />
        )}
      </main>

      {/* Pop-up Windows (Modals) */}

      {/* 1. Personnel Passport Modal */}
      {passportIdCard && (
        <PersonnelPassportModal
          idCard={passportIdCard}
          allTrainees={trainees}
          onClose={() => setPassportIdCard(null)}
          onAddDuty={(t) => {
            setPassportIdCard(null);
            setDutyTargetTrainee(t);
          }}
          onVerifyDuty={(dutyId) => verifyDutyRecord(dutyId)}
          onOpenDigitalPass={(idCard) => setDigitalPassIdCard(idCard)}
          onDeleteTrainee={(id) => deleteTrainee(id)}
          isAdmin={isAdmin}
        />
      )}

      {/* 2. Digital Pass (E-Badge) Modal */}
      {digitalPassIdCard && (
        <DigitalPassModal
          idCard={digitalPassIdCard}
          allTrainees={trainees}
          onClose={() => setDigitalPassIdCard(null)}
        />
      )}

      {/* 2. Duty Record Modal */}
      {dutyTargetTrainee && (
        <DutyRecordModal
          trainee={dutyTargetTrainee}
          onClose={() => setDutyTargetTrainee(null)}
          onSave={(dutyData) => {
            addDutyRecord(dutyTargetTrainee.id, dutyData);
          }}
          isAdmin={isAdmin}
        />
      )}

      {/* 3. Bulk Import Modal */}
      {isImportOpen && (
        <BulkImportModal
          onClose={() => setIsImportOpen(false)}
          onImport={(items) => {
            importTrainees(items);
          }}
          trainees={trainees}
        />
      )}

      {/* 4. Add Single Trainee Modal */}
      {isAddTraineeOpen && (
        <AddTraineeModal
          onClose={() => setIsAddTraineeOpen(false)}
          onSuccess={(newTrainee) => {
            setPassportIdCard(newTrainee.idCard);
          }}
          trainees={trainees}
        />
      )}
    </div>
  );
}
