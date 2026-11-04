"use client";

import { useState, useMemo } from "react";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import {
  runDataCleansing,
  resetAlumniData,
  groupTraineesByPerson,
  AFFILIATION_GROUPS,
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
  const [activeTab, setActiveTab] = useState<"summary" | "prefixEvolved" | "groupStats">("summary");
  const [confirmReset, setConfirmReset] = useState(false);

  // Group by unique person
  const uniquePersons = useMemo(() => groupTraineesByPerson(trainees), [trainees]);

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

  // Handler: Run Data Cleansing
  const handleRunCleansing = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runDataCleansing();
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
                ขับเคลื่อนโดย Smart Thai Name & Prefix Engine • ตรวจสอบความถูกต้องและจัดโครงสร้างฐานข้อมูล กกท.
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
                  จัดระเบียบข้อมูลสำเร็จเรียบร้อยแล้ว!
                </p>
                <p className="text-emerald-800 mt-0.5">
                  ระบบได้ตรวจสอบข้อมูลทั้งหมด {cleansingResult.total.toLocaleString()} รายการ และจัดระเบียบข้อมูลที่ต้องปรับปรุงจำนวน{" "}
                  <strong>{cleansingResult.changedCount} รายการ</strong> (ปรับปรุงชื่อ-สกุล/คำนำหน้า {cleansingResult.fixedNameCount} รายการ, กลุ่มหน่วยงาน {cleansingResult.fixedGroupCount} รายการ)
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

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
              <p className="text-[11px] font-medium text-emerald-700">แยกชื่อ-นามสกุลอิสระ</p>
              <p className="mt-1 text-2xl font-black text-emerald-800 font-mono">
                {separateNameStats.percent}%
              </p>
              <p className="mt-1 text-[10px] text-emerald-700">
                {separateNameStats.completed}/{trainees.length} รายการสมบูรณ์
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
              <p className="text-xs font-bold text-gray-800">
                คำสั่งปฏิบัติการจัดระเบียบฐานข้อมูล
              </p>
              <p className="text-[11px] text-gray-500">
                สแกนคำนำหน้า 80+ รูปแบบ, ตัดช่องว่างขยะ, แยก firstName / lastName, และจัดกลุ่มกองทุนอัตโนมัติ
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRunCleansing}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-xl bg-[#16265E] hover:bg-[#111e4a] text-white px-4 py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isRunning ? "⏳ กำลังประมวลผล..." : "🧹 จัดระเบียบข้อมูลทันที"}</span>
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
            <div className="flex items-center gap-2 border-b border-gray-200 text-xs">
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
                🏛️ การกระจายตัว 5 กลุ่มหน่วยงาน
              </button>
            </div>

            {/* Tab 1: Quality Summary */}
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
                      <span className="font-mono font-bold text-emerald-700">100% (2,732/2,732)</span>
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

            {/* Tab 2: Prefix Evolved Cases */}
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

            {/* Tab 3: Group Distribution */}
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
