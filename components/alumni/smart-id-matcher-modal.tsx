"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  useAlumniStore,
  batchUpdateTraineeIdCards,
  normalizeNameForMatching,
  type HistoricalTrainee,
  type BatchIdCardMatch,
} from "@/lib/alumni-store";
import { isValidThaiIdCard, formatThaiIdCard } from "@/lib/validation";

interface SmartIdMatcherModalProps {
  onClose: () => void;
  onSuccess?: (matchedCount: number, updatedRecords: number) => void;
}

interface MatchCandidate {
  rawName: string;
  cleanIdCard: string;
  phone?: string;
  status: "matched" | "already_has_id" | "not_found" | "invalid_id";
  matchedTraineeName?: string;
  matchedPersonnelId?: string;
  affectedCoursesCount?: number;
}

export function SmartIdMatcherModal({
  onClose,
  onSuccess,
}: SmartIdMatcherModalProps) {
  const { trainees } = useAlumniStore();
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<MatchCandidate[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    matchedCount: number;
    updatedRecordsCount: number;
  } | null>(null);

  // Group trainees by normalized name for fast O(1) matching
  const traineeMap = useMemo(() => {
    const map = new Map<string, HistoricalTrainee[]>();
    for (const t of trainees) {
      const norm = normalizeNameForMatching(t.name);
      if (!map.has(norm)) {
        map.set(norm, []);
      }
      map.get(norm)!.push(t);
    }
    return map;
  }, [trainees]);

  // Process rows into candidates
  const processRows = (rows: { name: string; idCard: string; phone?: string }[]) => {
    const result: MatchCandidate[] = [];

    for (const row of rows) {
      const rawName = (row.name || "").trim();
      const rawId = (row.idCard || "").replace(/\D/g, "");
      const phone = (row.phone || "").trim();

      if (!rawName) continue;

      if (!rawId || rawId.length !== 13 || !isValidThaiIdCard(rawId)) {
        result.push({
          rawName,
          cleanIdCard: rawId,
          phone,
          status: "invalid_id",
        });
        continue;
      }

      const normName = normalizeNameForMatching(rawName);
      const matches = traineeMap.get(normName);

      if (!matches || matches.length === 0) {
        result.push({
          rawName,
          cleanIdCard: rawId,
          phone,
          status: "not_found",
        });
        continue;
      }

      const firstMatch = matches[0];
      const hasRealId =
        firstMatch.idCard &&
        firstMatch.idCard.replace(/\D/g, "").length === 13 &&
        !firstMatch.idCard.startsWith("USR-");

      if (hasRealId && firstMatch.idCard.replace(/\D/g, "") === rawId) {
        result.push({
          rawName,
          cleanIdCard: rawId,
          phone,
          status: "already_has_id",
          matchedTraineeName: firstMatch.name,
          matchedPersonnelId: firstMatch.personnelId,
          affectedCoursesCount: matches.length,
        });
      } else {
        result.push({
          rawName,
          cleanIdCard: rawId,
          phone,
          status: "matched",
          matchedTraineeName: firstMatch.name,
          matchedPersonnelId: firstMatch.personnelId,
          affectedCoursesCount: matches.length,
        });
      }
    }

    setCandidates(result);
  };

  // Handle Excel/CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.SheetNames[0];
        const rows: unknown[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
          defval: "",
        });

        // Scan columns heuristically
        const mappedRows: { name: string; idCard: string; phone?: string }[] = [];

        for (const r of rows) {
          const rowObj = r as Record<string, unknown>;
          const keys = Object.keys(rowObj);

          let name = "";
          let idCard = "";
          let phone = "";

          for (const k of keys) {
            const kl = k.toLowerCase();
            const val = String(rowObj[k] || "").trim();

            if (
              kl.includes("ชื่อ") ||
              kl.includes("name") ||
              kl.includes("fullname") ||
              kl.includes("บุคลากร")
            ) {
              name = val;
            } else if (
              kl.includes("บัตร") ||
              kl.includes("ปชช") ||
              kl.includes("citizen") ||
              kl.includes("idcard") ||
              kl.includes("เลขประจำตัว")
            ) {
              idCard = val;
            } else if (
              kl.includes("โทร") ||
              kl.includes("phone") ||
              kl.includes("tel") ||
              kl.includes("mobile")
            ) {
              phone = val;
            }
          }

          // Fallback if columns weren't named with headers (check index 0, 1, 2)
          if (!name && keys.length >= 2) {
            name = String(rowObj[keys[0]] || "");
            idCard = String(rowObj[keys[1]] || "");
            if (keys.length >= 3) phone = String(rowObj[keys[2]] || "");
          }

          if (name) {
            mappedRows.push({ name, idCard, phone });
          }
        }

        processRows(mappedRows);
      } catch (err) {
        console.error("Excel parse error:", err);
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel โปรดตรวจสอบรูปแบบไฟล์");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle Paste parsing
  const handleParsePaste = () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);

    const lines = pastedText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const mappedRows: { name: string; idCard: string; phone?: string }[] = [];

    for (const line of lines) {
      // Split by tab or comma or semicolon
      const parts = line.split(/[\t,;]/).map((p) => p.trim());
      if (parts.length >= 2) {
        mappedRows.push({
          name: parts[0],
          idCard: parts[1],
          phone: parts[2] || undefined,
        });
      }
    }

    processRows(mappedRows);
    setIsProcessing(false);
  };

  // Stats on candidates
  const candidateStats = useMemo(() => {
    if (!candidates) return { matched: 0, already: 0, notFound: 0, invalid: 0, totalCourses: 0 };
    const matched = candidates.filter((c) => c.status === "matched").length;
    const already = candidates.filter((c) => c.status === "already_has_id").length;
    const notFound = candidates.filter((c) => c.status === "not_found").length;
    const invalid = candidates.filter((c) => c.status === "invalid_id").length;
    const totalCourses = candidates
      .filter((c) => c.status === "matched")
      .reduce((sum, c) => sum + (c.affectedCoursesCount || 1), 0);

    return { matched, already, notFound, invalid, totalCourses };
  }, [candidates]);

  // Apply batch updates
  const handleApplyUpdates = () => {
    if (!candidates) return;
    const toUpdate: BatchIdCardMatch[] = candidates
      .filter((c) => c.status === "matched")
      .map((c) => ({
        name: c.matchedTraineeName || c.rawName,
        idCard: c.cleanIdCard,
        phone: c.phone,
      }));

    if (toUpdate.length === 0) {
      alert("ไม่มีรายการที่พร้อมอัปเดต");
      return;
    }

    if (
      !confirm(
        `ยืนยันการนำเลขประจำตัวประชาชน 13 หลัก เข้าสู่ระบบ?\n\n• จำนวนบุคลากร: ${toUpdate.length} ท่าน\n• จำนวนหลักสูตรที่ได้รับผล: ${candidateStats.totalCourses} รายการ`
      )
    ) {
      return;
    }

    const result = batchUpdateTraineeIdCards(toUpdate);
    setApplyResult(result);
    if (onSuccess) onSuccess(result.matchedCount, result.updatedRecordsCount);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-blue-900/20 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0E2554] via-[#16265E] to-[#1e3a8a] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-2xl shadow-md">
                📑
              </span>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>จับคู่เลขบัตรประชาชน 13 หลักอัตโนมัติ (Smart ID Matcher)</span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-200">
                    Admin Tool
                  </span>
                </h3>
                <p className="text-xs text-blue-200">
                  นำเข้าไฟล์รายชื่อของสมาคม/รุ่นอบรม เพื่อเทียบชื่อและอัปเดตเลข 13 หลักให้บุคลากรในทำเนียบ กกท. 2,811 รายการ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {applyResult ? (
            /* SUCCESS STATE */
            <div className="text-center py-8 space-y-4 animate-in zoom-in-95">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl shadow-inner">
                ✓
              </div>
              <div className="space-y-1">
                <span className="rounded-full bg-emerald-50 text-emerald-700 px-3.5 py-1 text-xs font-bold border border-emerald-200">
                  อัปเดตข้อมูลเสร็จสมบูรณ์
                </span>
                <h4 className="text-xl font-black text-gray-900 mt-2">
                  เชื่อมโยงเลข 13 หลักสำเร็จ {applyResult.matchedCount} ท่าน
                </h4>
                <p className="text-xs text-gray-500">
                  ครอบคลุมประวัติการผ่านการอบรมในทำเนียบ กกท. ทั้งสิ้น{" "}
                  <strong className="text-[#16265E]">{applyResult.updatedRecordsCount}</strong> รายการหลักสูตร
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-[#16265E] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#1e3a8a] shadow-md cursor-pointer"
                >
                  เสร็จสิ้น (กลับสู่หน้าทำเนียบ)
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Input Source Tabs */}
              {!candidates && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setInputMode("file")}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                        inputMode === "file"
                          ? "bg-[#16265E] text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      📁 นำเข้าไฟล์ Excel / CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("paste")}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                        inputMode === "paste"
                          ? "bg-[#16265E] text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      📋 คัดลอกและวางข้อความ (Paste)
                    </button>
                  </div>

                  {inputMode === "file" ? (
                    <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-8 text-center space-y-3">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm text-2xl text-[#16265E]">
                        📥
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-gray-800">
                          เลือกไฟล์ Excel (.xlsx, .xls) หรือ CSV
                        </h4>
                        <p className="text-xs text-gray-500 max-w-md mx-auto">
                          ไฟล์ควรมีคอลัมน์ที่มี <strong>ชื่อ-นามสกุล</strong> และ{" "}
                          <strong>เลขประจำตัวประชาชน 13 หลัก</strong> (ระบบจะตรวจจับคอลัมน์ให้อัตโนมัติ)
                        </p>
                      </div>

                      <div className="pt-2">
                        <label className="inline-flex items-center gap-2 rounded-xl bg-[#16265E] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#1e3a8a] transition-all cursor-pointer">
                          <span>เลือกไฟล์จากเครื่อง</span>
                          <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">
                          วางข้อความในรูปแบบ: ชื่อ-นามสกุล [เว้นวรรค/Tab/จุลภาค] เลขบัตร ปชช. 13 หลัก
                        </label>
                        <textarea
                          rows={6}
                          value={pastedText}
                          onChange={(e) => setPastedText(e.target.value)}
                          placeholder={"นาย สมศักดิ์ มีชัย\t1100401234567\t0814567890\nนางสาว วรรณา ศรีสุข\t3100200876543\t0899876543"}
                          className="w-full rounded-2xl border border-gray-300 p-3 font-mono text-xs focus:border-[#16265E] focus:outline-hidden"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleParsePaste}
                          disabled={!pastedText.trim() || isProcessing}
                          className="rounded-xl bg-[#16265E] px-5 py-2 text-xs font-bold text-white hover:bg-[#1e3a8a] disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          เริ่มประมวลผลจับคู่
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CANDIDATES PREVIEW SCREEN */}
              {candidates && (
                <div className="space-y-4">
                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                        ✓ พบชื่อตรงกัน (พร้อมอัปเดต)
                      </span>
                      <p className="text-lg font-black text-emerald-950 mt-1">
                        {candidateStats.matched} <span className="text-xs font-normal">ท่าน</span>
                      </p>
                      <p className="text-[10.5px] text-emerald-700 mt-0.5">
                        กระทบ {candidateStats.totalCourses} รายการหลักสูตร
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-3 border border-blue-200">
                      <span className="text-[10px] font-bold text-blue-800 uppercase block">
                        ℹ️ มีเลข 13 หลักอยู่แล้ว
                      </span>
                      <p className="text-lg font-black text-blue-950 mt-1">
                        {candidateStats.already} <span className="text-xs font-normal">ท่าน</span>
                      </p>
                      <p className="text-[10.5px] text-blue-700 mt-0.5">ข้อมูลถูกต้องแล้ว</p>
                    </div>

                    <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
                      <span className="text-[10px] font-bold text-amber-800 uppercase block">
                        ❓ ไม่พบในทำเนียบ
                      </span>
                      <p className="text-lg font-black text-amber-950 mt-1">
                        {candidateStats.notFound} <span className="text-xs font-normal">คน</span>
                      </p>
                      <p className="text-[10.5px] text-amber-700 mt-0.5">อาจสะกดชื่อไม่ตรง</p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-3 border border-red-200">
                      <span className="text-[10px] font-bold text-red-800 uppercase block">
                        ⚠️ เลขบัตรไม่ถูกต้อง
                      </span>
                      <p className="text-lg font-black text-red-950 mt-1">
                        {candidateStats.invalid} <span className="text-xs font-normal">รายการ</span>
                      </p>
                      <p className="text-[10.5px] text-red-700 mt-0.5">ไม่ผ่านสูตรทะเบียนราษฎร์</p>
                    </div>
                  </div>

                  {/* Matching Table Preview */}
                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 sticky top-0">
                          <tr>
                            <th className="p-2.5 font-bold">ชื่อในไฟล์</th>
                            <th className="p-2.5 font-bold">ชื่อที่ตรงในทำเนียบ กกท.</th>
                            <th className="p-2.5 font-bold">เลข 13 หลักที่จะผูก</th>
                            <th className="p-2.5 font-bold text-center">หลักสูตร</th>
                            <th className="p-2.5 font-bold text-right">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {candidates.map((c, idx) => (
                            <tr
                              key={idx}
                              className={
                                c.status === "matched"
                                  ? "bg-emerald-50/20"
                                  : c.status === "already_has_id"
                                  ? "bg-blue-50/10"
                                  : "bg-gray-50/30"
                              }
                            >
                              <td className="p-2.5 font-semibold text-gray-800">{c.rawName}</td>
                              <td className="p-2.5 text-gray-700">
                                {c.matchedTraineeName ? (
                                  <div>
                                    <span className="font-bold text-[#16265E]">
                                      {c.matchedTraineeName}
                                    </span>
                                    {c.matchedPersonnelId && (
                                      <span className="ml-1.5 font-mono text-[10px] text-gray-400">
                                        ({c.matchedPersonnelId})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">–</span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono font-bold text-gray-900">
                                {c.cleanIdCard ? formatThaiIdCard(c.cleanIdCard) : "–"}
                              </td>
                              <td className="p-2.5 text-center font-bold text-gray-700">
                                {c.affectedCoursesCount ? `${c.affectedCoursesCount} หลักสูตร` : "–"}
                              </td>
                              <td className="p-2.5 text-right">
                                {c.status === "matched" && (
                                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                                    ✓ พร้อมผูกสิทธิ์
                                  </span>
                                )}
                                {c.status === "already_has_id" && (
                                  <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold">
                                    มีเลขแล้ว
                                  </span>
                                )}
                                {c.status === "not_found" && (
                                  <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                                    ไม่พบชื่อ
                                  </span>
                                )}
                                {c.status === "invalid_id" && (
                                  <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-[10px] font-bold">
                                    เลขไม่ถูกต้อง
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setCandidates(null)}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                      ← เลือกไฟล์ใหม่
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyUpdates}
                        disabled={candidateStats.matched === 0}
                        className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>✓</span>
                        <span>ยืนยันการนำเข้าเลข 13 หลัก ({candidateStats.matched} ท่าน)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
