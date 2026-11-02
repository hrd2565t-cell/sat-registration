"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { useIsAdmin } from "@/lib/admin-auth";
import { useAlumniStore, type HistoricalTrainee } from "@/lib/alumni-store";
import { AlumniDirectoryTab } from "@/components/alumni/alumni-directory-tab";
import { DutyTrackingTab } from "@/components/alumni/duty-tracking-tab";
import { ProjectEvaluationTab } from "@/components/alumni/project-evaluation-tab";
import { PersonnelPassportModal } from "@/components/alumni/personnel-passport-modal";
import { DigitalPassModal } from "@/components/alumni/digital-pass-modal";
import { DutyRecordModal } from "@/components/alumni/duty-record-modal";
import { BulkImportModal } from "@/components/alumni/bulk-import-modal";

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
    importTrainees,
    resetAlumniData,
  } = useAlumniStore();

  const [activeTab, setActiveTab] = useState<"directory" | "duty" | "evaluation">("directory");
  const [passportIdCard, setPassportIdCard] = useState<string | null>(null);
  const [digitalPassIdCard, setDigitalPassIdCard] = useState<string | null>(null);
  const [dutyTargetTrainee, setDutyTargetTrainee] = useState<HistoricalTrainee | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Quick ID card verification search
  const [quickVerifyId, setQuickVerifyId] = useState("");
  const [quickVerifyError, setQuickVerifyError] = useState("");

  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickVerifyId.replace(/\D/g, "");
    if (clean.length !== 13) {
      setQuickVerifyError("กรุณากรอกเลขประจำตัวประชาชน 13 หลักให้ถูกต้อง");
      return;
    }
    const found = trainees.some((t) => t.idCard.replace(/\D/g, "") === clean);
    if (!found) {
      setQuickVerifyError("ไม่พบข้อมูลผู้ผ่านการอบรมที่ตรงกับเลขบัตรประชาชนนี้ในระบบ");
      return;
    }
    setQuickVerifyError("");
    setPassportIdCard(clean);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top Header */}
      <Header
        rightSlot={
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              หน้าหลัก
            </Link>
            <Link
              href="/verify"
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5"
              title="เปิดกล้องสแกน QR Code ตรวจสอบคุณวุฒิและบัตรบุคลากรหน้างาน"
            >
              <span>📷</span>
              <span>สแกนหน้างาน</span>
            </Link>
            <Link
              href="/status"
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ตรวจสอบสถานะ
            </Link>
            <Link
              href="/admin"
              className="rounded-lg bg-[#16265E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3a8a] transition-colors"
            >
              {isAdmin ? "⚙️ ระบบหลังบ้าน (Admin)" : "เข้าสู่ระบบ (Admin)"}
            </Link>
          </div>
        }
      />

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
                  maxLength={17}
                  placeholder="กรอกเลขบัตรประชาชน 13 หลัก..."
                  value={quickVerifyId}
                  onChange={(e) => {
                    setQuickVerifyId(e.target.value);
                    if (quickVerifyError) setQuickVerifyError("");
                  }}
                  className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-[#f59e0b] px-4 py-2 text-xs sm:text-sm font-bold text-[#1e1b4b] hover:bg-[#fbbf24] transition-colors shadow-xs"
                >
                  ค้นหาพาสปอร์ต
                </button>
              </div>
              {quickVerifyError && (
                <p className="text-xs text-amber-200 pl-1 font-medium">⚠️ {quickVerifyError}</p>
              )}
            </form>
          </div>
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

          <button
            type="button"
            onClick={() => setActiveTab("duty")}
            className={`flex items-center gap-2 border-b-2 py-3 px-5 text-sm font-bold transition-all ${
              activeTab === "duty"
                ? "border-[#16265E] text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="text-base">🏃</span>
            <span>การติดตามการปฏิบัติหน้าที่</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
              {trainees.reduce((sum, t) => sum + t.duties.length, 0)} ครั้ง
            </span>
          </button>

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
        </div>

        {/* Tab Content Display */}
        {activeTab === "directory" && (
          <AlumniDirectoryTab
            trainees={trainees}
            onOpenPassport={(idCard) => setPassportIdCard(idCard)}
            onOpenDutyRecord={(t) => setDutyTargetTrainee(t)}
            onOpenDigitalPass={(idCard) => setDigitalPassIdCard(idCard)}
            onOpenImport={() => setIsImportOpen(true)}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === "duty" && (
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
          <ProjectEvaluationTab trainees={trainees} />
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
        />
      )}
    </div>
  );
}
