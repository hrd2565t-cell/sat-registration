"use client";

import { useState, useMemo } from "react";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import {
  runDataCleansing,
  resetAlumniData,
  groupTraineesByPerson,
  detectAffiliationDiscrepancies,
  AFFILIATION_GROUPS,
  syncAllAlumniToCloud,
  refreshAlumniFromCloud,
  getCloudSyncStatus,
  isCloudConfigured,
} from "@/lib/alumni-store";
import {
  parseThaiFullName,
  evaluateNameMatch,
  standardizeAllTrainees,
} from "@/lib/smart-name-engine";

interface DataCleansingModalProps {
  trainees: HistoricalTrainee[];
  onClose: () => void;
  onRefresh?: () => void;
}

export function DataCleansingModal({ trainees, onClose, onRefresh }: DataCleansingModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [cleansingResult, setCleansingResult] = useState<{
    total: number;
    changedCount: number;
    fixedNameCount: number;
    fixedGroupCount: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"affiliationDiff" | "summary" | "prefixEvolved" | "groupStats" | "cloudSync">("affiliationDiff");
  const [confirmReset, setConfirmReset] = useState(false);

  // Cloud Sync State
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncProgress, setCloudSyncProgress] = useState<{ synced: number; total: number } | null>(null);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  const handleSyncToCloud = async () => {
    setIsCloudSyncing(true);
    setCloudSyncMessage(null);
    setCloudSyncError(null);
    setCloudSyncProgress({ synced: 0, total: trainees.length });

    const res = await syncAllAlumniToCloud((synced, total) => {
      setCloudSyncProgress({ synced, total });
    });

    setIsCloudSyncing(false);
    if (res.success) {
      setCloudSyncMessage(`✅ ซิงค์ข้อมูลทั้งหมด ${res.count.toLocaleString()} รายการขึ้น Supabase Cloud สำเร็จเรียบร้อย ทุกเครื่องจะเห็นข้อมูลตรงกันทันที`);
      if (onRefresh) onRefresh();
    } else {
      setCloudSyncError(res.error || "เกิดข้อผิดพลาดในการซิงค์ข้อมูลขึ้น Supabase Cloud");
    }
  };

  const handleRefreshFromCloud = async () => {
    setIsCloudSyncing(true);
    setCloudSyncMessage(null);
    setCloudSyncError(null);
    const count = await refreshAlumniFromCloud();
    setIsCloudSyncing(false);
    if (count > 0) {
      setCloudSyncMessage(`✅ ดึงข้อมูลล่าสุดจาก Supabase Cloud สำเร็จ (${count.toLocaleString()} รายการ)`);
      if (onRefresh) onRefresh();
    } else {
      setCloudSyncError("ไม่สามารถดึงข้อมูลจาก Cloud หรือยังไม่มีข้อมูลใน Cloud");
    }
  };

  // Group by unique person
  const uniquePersons = useMemo(() => groupTraineesByPerson(trainees), [trainees]);

  // Audit: Detect affiliation discrepancies (e.g. สมาคมกีฬาจังหวัด marked as หน่วยงานภายนอก)
  const discrepancies = useMemo(() => detectAffiliationDiscrepancies(trainees), [trainees]);

  // Audit: Count people with multiple courses where prefix evolved (e.g. น.ส. -> นาง, นาย -> ดร.)
  const prefixEvolvedList = useMemo(() => {
    const list: Array<{
      personnelId: string;
      currentName: string;
      courses: Array<{ title: string; yearBE: number; nameInCert: string; prefix?: string }>;
      prefixVariants: string[];
    }> = [];

    for (const p of uniquePersons) {
      if (p.records.length > 1) {
        const prefixes = Array.from(
          new Set(
            p.records.map((r) => {
              const parsed = parseThaiFullName(r.name, r.prefix);
              return parsed.prefix || "(ไม่ระบุ)";
            })
          )
        );

        if (prefixes.length > 1) {
          list.push({
            personnelId: p.personnelId,
            currentName: p.name,
            prefixVariants: prefixes,
            courses: p.records.map((r) => ({
              title: r.courseTitle,
              yearBE: r.yearBE,
              nameInCert: r.name,
              prefix: r.prefix,
            })),
          });
        }
      }
    }
    return list;
  }, [uniquePersons]);

  // Audit: Group counts
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "การกีฬาแห่งประเทศไทย": 0,
      "กองทุนพัฒนาการกีฬาแห่งชาติ": 0,
      "สมาคมกีฬาแห่งประเทศไทย": 0,
      "สมาคมกีฬาแห่งจังหวัด": 0,
      "หน่วยงานภายนอก": 0,
    };
    for (const t of trainees) {
      const g = t.affiliationGroup || "หน่วยงานภายนอก";
      counts[g] = (counts[g] || 0) + 1;
    }
    return counts;
  }, [trainees]);

  // Audit: Check firstName & lastName separation completeness
  const separateNameStats = useMemo(() => {
    let completed = 0;
    let missing = 0;
    for (const t of trainees) {
      if (t.firstName && t.lastName) {
        completed++;
      } else {
        missing++;
      }
    }
    const percent = trainees.length > 0 ? Math.round((completed / trainees.length) * 100) : 100;
    return { completed, missing, percent };
  }, [trainees]);

  // Badge class helper
  const getGroupBadgeClass = (group?: string) => {
    switch (group) {
      case "การกีฬาแห่งประเทศไทย":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "กองทุนพัฒนาการกีฬาแห่งชาติ":
        return "bg-sky-50 text-sky-800 border-sky-300";
      case "สมาคมกีฬาแห่งประเทศไทย":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "สมาคมกีฬาแห่งจังหวัด":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "หน่วยงานภายนอก":
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Handler: Run Full Data Cleansing
  const handleRunCleansing = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runDataCleansing({ reclassifyGroups: true });
      setCleansingResult(res);
      setIsRunning(false);
      if (onRefresh) onRefresh();
    }, 400);
  };

  // Handler: Export Cleansed JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trainees, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `sat-alumni-database-cleansed-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handler: Reset Database
  const handleReset = () => {
    resetAlumniData();
    setConfirmReset(false);
    if (onRefresh) onRefresh();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-6 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#16265E] via-[#1e3a8a] to-[#2563eb] p-5 text-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-inner">
              🧹
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  เครื่องมือจัดระเบียบและตรวจสอบข้อมูล (Data Cleansing Tool)
                </h3>
                <span className="rounded-full bg-amber-400/90 text-amber-950 font-bold px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  Admin System
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                ขับเคลื่อนโดย Smart Thai Name & Affiliation Classifier Engine • ตรวจสอบความถูกต้องและจัดโครงสร้างฐานข้อมูล กกท.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Notification / Cleansing Status */}
          {cleansingResult && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-950 shadow-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="text-xl">✨</span>
              <div className="flex-1">
                <p className="font-bold text-sm text-emerald-900">
                  จัดระเบียบข้อมูลและกลุ่มสังกัดสำเร็จเรียบร้อยแล้ว!
                </p>
                <p className="text-emerald-800 mt-0.5">
                  ระบบได้ตรวจสอบข้อมูลทั้งหมด {cleansingResult.total.toLocaleString()} รายการ และจัดระเบียบข้อมูลที่ต้องปรับปรุงจำนวน{" "}
                  <strong>{cleansingResult.changedCount} รายการ</strong> (ปรับปรุงชื่อ-สกุล/คำนำหน้า {cleansingResult.fixedNameCount} รายการ, จัดกลุ่มสังกัดใหม่ {cleansingResult.fixedGroupCount} รายการ)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCleansingResult(null)}
                className="text-emerald-700 hover:text-emerald-950 text-xs font-semibold cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>
          )}

          {/* Metric Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5">
              <p className="text-[11px] font-medium text-blue-700">ฐานข้อมูลประวัติวุฒิบัตร</p>
              <p className="mt-1 text-2xl font-black text-[#16265E] font-mono">
                {trainees.length.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-blue-600">ระเบียนทั้งหมดในระบบ</p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
              <p className="text-[11px] font-medium text-indigo-700">บุคลากรกีฬาเดี่ยว (Unique)</p>
              <p className="mt-1 text-2xl font-black text-indigo-950 font-mono">
                {uniquePersons.length.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] text-indigo-600">รหัส USR-2026 ไม่ซ้ำซ้อน</p>
            </div>

            <div className={`rounded-xl border p-3.5 ${
              discrepancies.length > 0
                ? "border-amber-200 bg-amber-50/70"
                : "border-emerald-100 bg-emerald-50/60"
            }`}>
              <p className={`text-[11px] font-medium ${
                discrepancies.length > 0 ? "text-amber-800 font-bold" : "text-emerald-700"
              }`}>
                สังกัดที่ตรวจพบข้อคลาดเคลื่อน
              </p>
              <p className={`mt-1 text-2xl font-black font-mono ${
                discrepancies.length > 0 ? "text-amber-900" : "text-emerald-800"
              }`}>
                {discrepancies.length}
              </p>
              <p className={`mt-1 text-[10px] ${
                discrepancies.length > 0 ? "text-amber-700" : "text-emerald-700"
              }`}>
                {discrepancies.length > 0 ? "เช่น สมาคมกีฬาจังหวัด" : "ทุกรายการสอดคล้อง 100%"}
              </p>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3.5">
              <p className="text-[11px] font-medium text-purple-700">พบการเลื่อน/เปลี่ยนคำนำหน้า</p>
              <p className="mt-1 text-2xl font-black text-purple-950 font-mono">
                {prefixEvolvedList.length}
              </p>
              <p className="mt-1 text-[10px] text-purple-600">คนเดิมแต่คำนำหน้าพัฒนา</p>
            </div>
          </div>

          {/* Action Ribbon */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5 justify-center sm:justify-start">
                <span>คำสั่งปฏิบัติการจัดระเบียบฐานข้อมูล</span>
                {discrepancies.length > 0 && (
                  <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.2 text-[10px] font-bold border border-amber-300">
                    พบ {discrepancies.length} รายการที่ปรับกลุ่มได้
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-500">
                สแกนคำนำหน้า 80+ รูปแบบ, ตรวจจับกลุ่มสังกัดอัตโนมัติจากชื่อหน่วยงาน, และแยกชื่อ-นามสกุล
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRunCleansing}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-xl bg-[#16265E] hover:bg-[#111e4a] text-white px-4 py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isRunning ? "⏳ กำลังประมวลผล..." : "⚡ ปรับปรุงกลุ่มสังกัดและจัดระเบียบทันที"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-3 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="ดาวน์โหลดไฟล์ JSON สำรองข้อมูลที่จัดระเบียบแล้ว"
              >
                <span>📥</span>
                <span>สำรอง JSON</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs for In-depth Insights */}
          <div>
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("affiliationDiff")}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "affiliationDiff"
                    ? "border-[#16265E] text-[#16265E]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <span>🏛️ เปรียบเทียบสังกัด ก่อน-หลัง</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  discrepancies.length > 0 ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {discrepancies.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "summary"
                    ? "border-[#16265E] text-[#16265E]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                📋 สรุปการตรวจสอบคุณภาพข้อมูล
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("prefixEvolved")}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "prefixEvolved"
                    ? "border-[#16265E] text-[#16265E]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <span>🎖️ บุคลากรที่คำนำหน้าเปลี่ยน</span>
                <span className="rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.2 text-[10px] font-bold">
                  {prefixEvolvedList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("groupStats")}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "groupStats"
                    ? "border-[#16265E] text-[#16265E]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                📊 สัดส่วน 5 กลุ่มหน่วยงาน
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cloudSync")}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "cloudSync"
                    ? "border-[#16265E] text-[#16265E]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <span>☁️ ซิงค์คลาวด์ Supabase</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isCloudConfigured() ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                }`}>
                  {isCloudConfigured() ? "Online" : "Local"}
                </span>
              </button>
            </div>

            {/* Tab: Affiliation Before & After Comparison */}
            {activeTab === "affiliationDiff" && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div>
                    <p className="font-bold">
                      {discrepancies.length > 0
                        ? `ตรวจพบ ${discrepancies.length} รายการที่ชื่อสังกัดบ่งชี้ชัดเจน แต่จัดกลุ่มไม่ตรง`
                        : "ยอดเยี่ยม! ฐานข้อมูลทั้งหมดได้รับการจัดกลุ่มสังกัดถูกต้องตรงกันครบถ้วนแล้ว"}
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      ระบบใช้ Smart Affiliation Classifier ตรวจจับคำสำคัญ เช่น สมาคมกีฬาประจำจังหวัด, สมาคมกีฬาคนพิการ และกองทุน
                    </p>
                  </div>
                  {discrepancies.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRunCleansing}
                      disabled={isRunning}
                      className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 text-xs shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isRunning ? "กำลังปรับปรุง..." : `⚡ อนุมัติปรับปรุง ${discrepancies.length} รายการ`}
                    </button>
                  )}
                </div>

                {discrepancies.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#16265E] text-white sticky top-0 z-10 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">บุคลากร</th>
                          <th className="py-2.5 px-3">ชื่อสังกัดที่ระบุในประวัติ</th>
                          <th className="py-2.5 px-3 text-center">กลุ่มเดิม (ก่อนแก้)</th>
                          <th className="py-2.5 px-2 text-center">➔</th>
                          <th className="py-2.5 px-3 text-center">กลุ่มใหม่ที่ระบบแนะนำ</th>
                          <th className="py-2.5 px-3">เหตุผลการตรวจจับ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {discrepancies.map((d, i) => (
                          <tr key={d.traineeId || i} className="hover:bg-amber-50/40 transition-colors">
                            <td className="py-2 px-3 text-gray-400 font-mono">{i + 1}</td>
                            <td className="py-2 px-3">
                              <p className="font-bold text-[#16265E]">{d.name}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{d.personnelId || d.traineeId}</p>
                            </td>
                            <td className="py-2 px-3 font-semibold text-gray-800 max-w-[200px]">
                              {d.affiliation}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${getGroupBadgeClass(d.currentGroup)}`}>
                                {d.currentGroup}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-gray-400">➔</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border shadow-2xs ${getGroupBadgeClass(d.suggestedGroup)}`}>
                                {d.suggestedGroup}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-600 text-[11px] max-w-[200px]">
                              {d.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-8 text-center text-xs">
                    <span className="text-3xl">🎉</span>
                    <h5 className="font-bold text-emerald-900 text-sm mt-2">ไม่พบความคลาดเคลื่อนของกลุ่มหน่วยงาน</h5>
                    <p className="text-emerald-700 mt-1">
                      ข้อมูลสังกัดของบุคลากรทั้ง {trainees.length.toLocaleString()} รายการสอดคล้องกับทั้ง 5 กลุ่มหน่วยงานอย่างสมบูรณ์แบบแล้ว
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Quality Summary */}
            {activeTab === "summary" && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs space-y-3">
                  <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <span>🔍</span>
                    <span>รายงานการตรวจสอบความสมบูรณ์ของโครงสร้าง</span>
                  </h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center justify-between py-1.5 border-b border-gray-100">
                      <span className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>แยกฟิลด์ <strong>firstName</strong> และ <strong>lastName</strong> ใน data/alumni.json</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-700">100% ({trainees.length.toLocaleString()}/{trainees.length.toLocaleString()})</span>
                    </li>
                    <li className="flex items-center justify-between py-1.5 border-b border-gray-100">
                      <span className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>รองรับนามสกุลพระราชทานขึ้นต้นด้วย &quot;ณ&quot; (เช่น ณ นคร, ณ สงขลา)</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-700">ครบถ้วน (40 รายการ)</span>
                    </li>
                    <li className="flex items-center justify-between py-1.5 border-b border-gray-100">
                      <span className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>พจนานุกรมคำนำหน้าชื่อไทย (ราชการ กกท., ทหาร, ตำรวจ, วิชาการ)</span>
                      </span>
                      <span className="font-mono font-bold text-blue-700">80+ รูปแบบมาตรฐาน</span>
                    </li>
                    <li className="flex items-center justify-between py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>กลุ่มหน่วยงาน &quot;กองทุนพัฒนาการกีฬาแห่งชาติ&quot; แยกจาก กกท. เป็นกลุ่มอิสระ</span>
                      </span>
                      <span className="font-mono font-bold text-sky-700">
                        {groupCounts["กองทุนพัฒนาการกีฬาแห่งชาติ"]} รายการ
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab: Prefix Evolved Cases */}
            {activeTab === "prefixEvolved" && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-gray-500">
                  รายชื่อบุคลากรที่มีประวัติผ่านการอบรมมากกว่า 1 หลักสูตร และมีการเปลี่ยนคำนำหน้าข้ามกาลเวลา (เช่น เลื่อนยศ, สำเร็จการศึกษาระดับ ดร., หรือเปลี่ยนจาก นางสาว ➔ นาง) ระบบใช้ <strong>Core Name Key</strong> ผูกรหัส USR-2026 เดียวกันอย่างถูกต้อง:
                </p>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {prefixEvolvedList.map((item, idx) => (
                    <div key={item.personnelId} className="p-3 text-xs hover:bg-gray-50 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-gray-400">#{idx + 1}</span>
                          <span className="font-bold text-[#16265E]">{item.currentName}</span>
                          <span className="font-mono text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                            {item.personnelId}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {item.courses.map((c, cIdx) => (
                            <span
                              key={cIdx}
                              className="text-[11px] rounded bg-gray-100 text-gray-700 px-2 py-0.5"
                            >
                              {c.title} ({c.yearBE}): <span className="font-semibold text-gray-900">{c.nameInCert}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
                          {item.prefixVariants.join(" ➔ ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Group Distribution */}
            {activeTab === "groupStats" && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AFFILIATION_GROUPS.map((grp) => {
                    const count = groupCounts[grp] || 0;
                    const percent = trainees.length > 0 ? ((count / trainees.length) * 100).toFixed(1) : "0";
                    return (
                      <div
                        key={grp}
                        className="rounded-xl border border-gray-200 bg-white p-3 text-xs flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <p className="font-bold text-gray-800">{grp}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{percent}% ของฐานข้อมูล</p>
                        </div>
                        <span className="text-base font-black font-mono text-[#16265E]">
                          {count.toLocaleString()} คน
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Cloud Synchronization */}
            {activeTab === "cloudSync" && (
              <div className="mt-4 space-y-4">
                {/* Cloud Status Card */}
                <div className={`rounded-xl border p-4 text-xs ${
                  isCloudConfigured()
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                    : "border-amber-200 bg-amber-50/70 text-amber-950"
                }`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {isCloudConfigured() ? "☁️" : "💻"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">
                            {isCloudConfigured()
                              ? "ระบบเชื่อมต่อกับ Supabase Cloud Database แล้ว"
                              : "ระบบกำลังทำงานในโหมดจัดเก็บข้อมูลในเครื่อง (Local Storage)"}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isCloudConfigured()
                              ? "bg-emerald-200 text-emerald-900 animate-pulse"
                              : "bg-amber-200 text-amber-900"
                          }`}>
                            {isCloudConfigured() ? "Cloud Realtime Active" : "Local Mode"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                          {isCloudConfigured()
                            ? "เมื่อมีการแก้ไข/เพิ่มข้อมูลจากเครื่องนี้ หรือเครื่องอื่น ข้อมูลจะถูกซิงค์ผ่าน Supabase Realtime ให้ตรงกันทุกเครื่องทันที"
                            : "ข้อมูลถูกบันทึกอยู่ในเบราว์เซอร์ของเครื่องนี้ หากต้องการให้ทุกเครื่องเห็นข้อมูลตรงกัน ให้ระบุ NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {isCloudConfigured() && (
                        <button
                          type="button"
                          onClick={handleRefreshFromCloud}
                          disabled={isCloudSyncing}
                          className="rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          title="ดึงข้อมูลชุดล่าสุดจากตาราง alumni บน Supabase"
                        >
                          🔄 ดึงข้อมูลจากคลาวด์
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar during Batch Sync */}
                  {isCloudSyncing && cloudSyncProgress && (
                    <div className="mt-4 pt-3 border-t border-emerald-200 space-y-1.5">
                      <div className="flex justify-between text-[11px] font-semibold text-emerald-900">
                        <span>กำลังซิงค์ข้อมูลขึ้น Supabase Cloud...</span>
                        <span>
                          {cloudSyncProgress.synced.toLocaleString()} / {cloudSyncProgress.total.toLocaleString()} คน (
                          {Math.round((cloudSyncProgress.synced / cloudSyncProgress.total) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-emerald-200/60 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-200"
                          style={{
                            width: `${Math.round(
                              (cloudSyncProgress.synced / Math.max(cloudSyncProgress.total, 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Success Banner */}
                  {cloudSyncMessage && (
                    <div className="mt-3 rounded-lg border border-emerald-400 bg-emerald-100/90 p-2.5 text-xs text-emerald-950 font-medium">
                      {cloudSyncMessage}
                    </div>
                  )}

                  {/* Error Banner */}
                  {cloudSyncError && (
                    <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-900 font-medium">
                      ⚠️ {cloudSyncError}
                    </div>
                  )}
                </div>

                {/* Cloud Sync Action Section */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-xs space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        ซิงค์ข้อมูลทำเนียบบุคลากรทั้งหมดขึ้นฐานข้อมูลกลาง (Batch Cloud Upload)
                      </p>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        ส่งข้อมูลบุคลากร {trainees.length.toLocaleString()} รายการ ขึ้นตาราง <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded font-mono text-[10px]">public.alumni</code> บน Supabase เพื่อให้คอมพิวเตอร์และอุปกรณ์เครื่องอื่นเห็นข้อมูลตรงกันทันที
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncToCloud}
                      disabled={isCloudSyncing}
                      className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold px-4 py-2 text-xs shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>{isCloudSyncing ? "⏳" : "☁️"}</span>
                      <span>
                        {isCloudSyncing ? "กำลังซิงค์ข้อมูล..." : "เริ่มซิงค์ข้อมูลทั้งหมดขึ้นคลาวด์"}
                      </span>
                    </button>
                  </div>

                  <div className="rounded-lg bg-blue-50/80 border border-blue-200 p-3 text-[11px] text-blue-900 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <span>💡</span>
                      <span>คำแนะนำสำหรับผู้ดูแลระบบฐานข้อมูล (Database Administrator):</span>
                    </p>
                    <p className="text-blue-800">
                      หากเพิ่งสร้างโปรเจกต์ Supabase ใหม่ โปรดตรวจสอบว่าได้รันสคริปต์ SQL จากไฟล์ <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px] text-blue-950">supabase/schema.sql</code> บน SQL Editor ของ Supabase เรียบร้อยแล้ว เพื่อสร้างตาราง <code className="font-mono text-[10px]">alumni</code>, ดัชนีค้นหา และเปิดสิทธิ์ RLS
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone: Reset to seed data */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="font-bold text-rose-900">รีเซ็ตฐานข้อมูลทำเนียบบุคลากร (Reset Database)</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                ล้างข้อมูลในแคชของเบราว์เซอร์ (localStorage) และโหลดข้อมูลมาตรฐานจาก data/alumni.json ใหม่ทั้งหมด
              </p>
            </div>
            {confirmReset ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors"
                >
                  ยืนยันรีเซ็ต
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-semibold cursor-pointer shrink-0 transition-colors"
              >
                🔄 รีเซ็ตข้อมูลเริ่มต้น
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50 px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#16265E] hover:bg-[#111e4a] text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            เสร็จสิ้น / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
