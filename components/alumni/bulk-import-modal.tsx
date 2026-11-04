"use client";

import { useState, useMemo, type ChangeEvent, type DragEvent } from "react";
import * as XLSX from "xlsx";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import {
  generateNextPersonnelIds,
  AFFILIATION_GROUPS,
  inferAffiliationGroup,
} from "@/lib/alumni-store";
import {
  parseThaiFullName,
  evaluateNameMatch,
  type NameMatchConfidence,
} from "@/lib/smart-name-engine";

export interface ParsedImportRow extends Omit<
  HistoricalTrainee,
  "id" | "createdAt" | "updatedAt" | "duties"
> {
  isExisting: boolean;
  matchedPersonnelId?: string;
  matchedName?: string;
  matchConfidence?: NameMatchConfidence;
  matchReason?: string;
}

interface BulkImportModalProps {
  onClose: () => void;
  onImport: (
    items: Omit<HistoricalTrainee, "id" | "createdAt" | "updatedAt" | "duties">[]
  ) => void;
  trainees: HistoricalTrainee[];
}

export function BulkImportModal({ onClose, onImport, trainees }: BulkImportModalProps) {
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<"all" | "new" | "existing" | "diffPrefix">("all");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Generate & download clean official Excel template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "รหัสประจำตัว (เว้นว่างได้ ระบบจะออกรหัสให้อัตโนมัติ)": "",
        "คำนำหน้าชื่อ": "นาย",
        "ชื่อ-นามสกุล": "สมศักดิ์ พัฒนากีฬา",
        "กลุ่มหน่วยงาน": "สมาคมกีฬาแห่งประเทศไทย",
        "ชื่อสมาคม/หน่วยงาน": "สมาคมกีฬาฟุตบอลแห่งประเทศไทย ในพระบรมราชูปถัมภ์",
        "ชื่อหลักสูตร": "GGE",
        "ประเภทหลักสูตร": "ผู้บริหารกีฬา",
        "ปี พ.ศ. ที่อบรม": 2569,
        "รุ่นที่": "รุ่นปี พ.ศ. 2569",
        "สถานะ": "active",
      },
      {
        "รหัสประจำตัว (เว้นว่างได้ ระบบจะออกรหัสให้อัตโนมัติ)": "",
        "คำนำหน้าชื่อ": "นางสาว",
        "ชื่อ-นามสกุล": "กฤตจุฑา ปิติคำพร",
        "กลุ่มหน่วยงาน": "สมาคมกีฬาแห่งประเทศไทย",
        "ชื่อสมาคม/หน่วยงาน": "สมาคมกีฬาขี่ม้าโปโลแห่งประเทศไทย",
        "ชื่อหลักสูตร": "TSLP",
        "ประเภทหลักสูตร": "ผู้บริหารกีฬา",
        "ปี พ.ศ. ที่อบรม": 2569,
        "รุ่นที่": "รุ่นปี พ.ศ. 2569",
        "สถานะ": "active",
      },
      {
        "รหัสประจำตัว (เว้นว่างได้ ระบบจะออกรหัสให้อัตโนมัติ)": "",
        "คำนำหน้าชื่อ": "นาง",
        "ชื่อ-นามสกุล": "กรรณิกา จรมาศ",
        "กลุ่มหน่วยงาน": "กองทุนพัฒนาการกีฬาแห่งชาติ",
        "ชื่อสมาคม/หน่วยงาน": "ฝ่ายการคลังกองทุน",
        "ชื่อหลักสูตร": "Olympic",
        "ประเภทหลักสูตร": "อื่นๆ",
        "ปี พ.ศ. ที่อบรม": 2569,
        "รุ่นที่": "รุ่นปี พ.ศ. 2569",
        "สถานะ": "active",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "รายชื่อผู้ผ่านการอบรม");
    XLSX.writeFile(workbook, "SAT_Alumni_Template_2569.xlsx");
  };

  const processFile = (file: File) => {
    setError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        if (rawJson.length === 0) {
          setError("ไม่พบข้อมูลในไฟล์ Excel ที่เลือก");
          return;
        }

        // 1. Initial parse of rows using Smart Thai Name Engine
        const initialParsed = rawJson.map((row) => {
          const rawId = String(
            row["รหัสประจำตัว (เว้นว่างได้ ระบบจะออกรหัสให้อัตโนมัติ)"] ??
              row["รหัสประจำตัว"] ??
              row["รหัส"] ??
              row["personnelId"] ??
              ""
          ).trim();

          const prefix = String(row["คำนำหน้าชื่อ"] ?? row["คำนำหน้า"] ?? "").trim();
          const rawName = String(
            row["ชื่อ-นามสกุล"] ?? row["ชื่อ"] ?? row["name"] ?? "ไม่ระบุชื่อ"
          ).trim();

          const parsedName = parseThaiFullName(rawName, prefix);

          const rawGroup = String(
            row["กลุ่มหน่วยงาน"] ?? row["กลุ่ม"] ?? row["affiliationGroup"] ?? ""
          ).trim();

          const org = String(
            row["ชื่อสมาคม/หน่วยงาน"] ??
              row["สังกัด/หน่วยงาน"] ??
              row["สังกัด"] ??
              row["หน่วยงาน"] ??
              row["affiliation"] ??
              rawGroup
          ).trim();

          const group = rawGroup && AFFILIATION_GROUPS.includes(rawGroup as any)
            ? rawGroup
            : inferAffiliationGroup(rawGroup || org);

          const course = String(
            row["ชื่อหลักสูตร"] ?? row["หลักสูตร"] ?? row["courseTitle"] ?? "หลักสูตรพัฒนาบุคลากรกีฬา"
          ).trim();

          const category = String(
            row["ประเภทหลักสูตร"] ?? row["หมวดหลักสูตร"] ?? row["courseCategory"] ?? "อื่นๆ"
          ).trim();

          const yearRaw = Number(
            row["ปี พ.ศ. ที่อบรม"] ?? row["ปี พ.ศ."] ?? row["ปี"] ?? row["yearBE"]
          );
          const yearBE = Number.isFinite(yearRaw) && yearRaw >= 2540 ? yearRaw : 2569;

          const batch = String(row["รุ่นที่"] ?? row["รุ่น"] ?? row["batch"] ?? `รุ่นปี พ.ศ. ${yearBE}`).trim();
          const statusRaw = String(row["สถานะ"] ?? row["status"] ?? "active").toLowerCase();
          const status: "active" | "inactive" =
            statusRaw.includes("inactive") || statusRaw.includes("ไม่") ? "inactive" : "active";

          return {
            rawId,
            prefix: parsedName.prefix || prefix || undefined,
            firstName: parsedName.firstName,
            lastName: parsedName.lastName,
            name: parsedName.cleanFullName,
            affiliation: org,
            affiliationGroup: group,
            sportsType: org,
            courseTitle: course,
            courseCategory: category,
            yearBE,
            batch,
            status,
          };
        });

        // 2. Evaluate matches with existing trainees
        let newCount = 0;
        const mappedWithExistingCheck = initialParsed.map((item) => {
          // If explicit USR-2026 ID was provided in file
          if (item.rawId && item.rawId.startsWith("USR-2026-")) {
            const matchById = trainees.find((t) => t.personnelId === item.rawId);
            if (matchById) {
              return {
                ...item,
                isExisting: true,
                matchedPersonnelId: matchById.personnelId,
                matchedName: matchById.name,
                matchConfidence: "EXACT_MATCH" as const,
                matchReason: `ตรงกับรหัสเดิมในระบบ ${matchById.personnelId}`,
                affiliationGroup: item.affiliationGroup || matchById.affiliationGroup,
                affiliation: item.affiliation || matchById.affiliation || "หน่วยงานภายนอก",
              };
            }
          }

          // Evaluate by Smart Thai Name Engine
          const matchResult = evaluateNameMatch(item.name, item.prefix, trainees);
          if (matchResult.confidence === "EXACT_MATCH" || matchResult.confidence === "SAME_PERSON_DIFF_PREFIX") {
            const matched = matchResult.matchedTrainee;
            return {
              ...item,
              isExisting: true,
              matchedPersonnelId: matched?.personnelId,
              matchedName: matched?.name,
              matchConfidence: matchResult.confidence,
              matchReason: matchResult.reason,
              affiliationGroup: item.affiliationGroup || matched?.affiliationGroup,
              affiliation: item.affiliation || matched?.affiliation || "หน่วยงานภายนอก",
            };
          } else {
            newCount++;
            return {
              ...item,
              affiliation: item.affiliation || "หน่วยงานภายนอก",
              isExisting: false,
              matchConfidence: "NEW_PERSON" as const,
              matchReason: "บุคลากรใหม่ในระบบ",
              matchedPersonnelId: undefined as string | undefined,
              matchedName: undefined as string | undefined,
            };
          }
        });

        // 3. Generate sequential running IDs for all new personnel
        const newIds = generateNextPersonnelIds(trainees, newCount);
        let newIdx = 0;

        const finalMapped: ParsedImportRow[] = mappedWithExistingCheck.map((item) => {
          const finalAffiliation = item.affiliation || "หน่วยงานภายนอก";
          if (item.isExisting) {
            const finalPId = item.matchedPersonnelId!;
            return {
              idCard: finalPId,
              personnelId: finalPId,
              name: item.name,
              prefix: item.prefix,
              firstName: item.firstName,
              lastName: item.lastName,
              affiliation: finalAffiliation,
              affiliationGroup: item.affiliationGroup,
              sportsType: item.sportsType || finalAffiliation,
              courseTitle: item.courseTitle,
              courseCategory: item.courseCategory,
              yearBE: item.yearBE,
              batch: item.batch,
              passedDate: `${item.yearBE - 543}-09-30`,
              status: item.status,
              isExisting: true,
              matchedPersonnelId: item.matchedPersonnelId,
              matchedName: item.matchedName,
              matchConfidence: item.matchConfidence,
              matchReason: item.matchReason,
            };
          } else {
            const assignedPId = item.rawId && item.rawId.startsWith("USR-2026-")
              ? item.rawId
              : newIds[newIdx++];
            return {
              idCard: assignedPId,
              personnelId: assignedPId,
              name: item.name,
              prefix: item.prefix,
              firstName: item.firstName,
              lastName: item.lastName,
              affiliation: finalAffiliation,
              affiliationGroup: item.affiliationGroup,
              sportsType: item.sportsType || finalAffiliation,
              courseTitle: item.courseTitle,
              courseCategory: item.courseCategory,
              yearBE: item.yearBE,
              batch: item.batch,
              passedDate: `${item.yearBE - 543}-09-30`,
              status: item.status,
              isExisting: false,
              matchConfidence: "NEW_PERSON",
              matchReason: "บุคลากรใหม่ในระบบ",
            };
          }
        });

        setParsedRows(finalMapped);
      } catch (err) {
        setError(
          err instanceof Error
            ? `ไม่สามารถอ่านไฟล์ได้: ${err.message}`
            : "เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel"
        );
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirm = () => {
    if (parsedRows.length === 0) return;
    onImport(
      parsedRows.map((r) => ({
        personnelId: r.personnelId,
        idCard: r.idCard,
        name: r.name,
        prefix: r.prefix,
        firstName: r.firstName,
        lastName: r.lastName,
        affiliation: r.affiliation,
        affiliationGroup: r.affiliationGroup,
        sportsType: r.sportsType,
        courseTitle: r.courseTitle,
        courseCategory: r.courseCategory,
        yearBE: r.yearBE,
        batch: r.batch,
        passedDate: r.passedDate,
        status: r.status,
      }))
    );
    onClose();
  };

  const exactCount = useMemo(
    () => parsedRows.filter((r) => r.matchConfidence === "EXACT_MATCH").length,
    [parsedRows]
  );
  const diffPrefixCount = useMemo(
    () => parsedRows.filter((r) => r.matchConfidence === "SAME_PERSON_DIFF_PREFIX").length,
    [parsedRows]
  );
  const existingCount = exactCount + diffPrefixCount;
  const newCount = useMemo(() => parsedRows.filter((r) => !r.isExisting).length, [parsedRows]);

  const filteredPreview = useMemo(() => {
    if (previewFilter === "existing") return parsedRows.filter((r) => r.matchConfidence === "EXACT_MATCH");
    if (previewFilter === "diffPrefix") return parsedRows.filter((r) => r.matchConfidence === "SAME_PERSON_DIFF_PREFIX");
    if (previewFilter === "new") return parsedRows.filter((r) => !r.isExisting);
    return parsedRows;
  }, [parsedRows, previewFilter]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-6 w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#16265E] p-5 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
              📥
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                นำเข้าข้อมูลผู้ผ่านการอบรมย้อนหลัง (Bulk Excel Import)
              </h3>
              <p className="text-xs text-blue-100/80">
                ขับเคลื่อนโดย Smart Thai Name Engine • ตรวจสอบความซ้ำซ้อนและแยกชื่อ-นามสกุลอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Instructions and Download Template */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-[#16265E]">
                📄 ใช้ไฟล์ Excel ตามแบบฟอร์มมาตรฐานของ กกท. (SAT Template)
              </p>
              <p className="text-gray-600">
                ระบบจะตรวจสอบชื่อ-นามสกุล และคำนำหน้า 80+ รูปแบบ หากตรงกับคนเดิมจะผูกรหัส USR-2026 เดิมให้อัตโนมัติ
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#16265E] bg-white px-3.5 py-2 font-bold text-[#16265E] shadow-2xs hover:bg-blue-50 transition-colors shrink-0 cursor-pointer"
            >
              <span>📥</span>
              <span>ดาวน์โหลดเทมเพลต Excel (.xlsx)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging
                ? "border-emerald-500 bg-emerald-50/50"
                : "border-gray-300 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-400"
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs border border-gray-200 text-2xl mb-3">
              📊
            </div>
            <p className="text-sm font-bold text-gray-800">
              ลากและวางไฟล์ Excel หรือ <span className="text-[#16265E] underline">คลิกเพื่อเลือกไฟล์</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              รองรับไฟล์ .xlsx, .xls และ .csv (แนะนำไฟล์ .xlsx จากเทมเพลตมาตรฐาน)
            </p>
            {fileName && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <span>✓ ไฟล์ที่เลือก:</span>
                <span className="font-mono">{fileName}</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Smart Preview Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              {/* Summary Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#16265E]">สรุปผลการวิเคราะห์ไฟล์:</span>
                  <span className="rounded-md bg-white px-2 py-0.5 font-bold text-gray-700 border border-gray-200">
                    ทั้งหมด {parsedRows.length} รายการ
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 border border-emerald-200">
                    🟢 บุคลากรเดิม (ตรง 100%): {exactCount} ท่าน
                  </span>
                  {diffPrefixCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-900 border border-amber-300">
                      🟡 คำนำหน้าเปลี่ยน: {diffPrefixCount} ท่าน
                    </span>
                  )}
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-bold text-blue-800 border border-blue-200">
                    ✨ บุคลากรใหม่: {newCount} ท่าน
                  </span>
                </div>
              </div>

              {/* Filter Tabs in Preview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("all")}
                    className={`rounded-md px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                      previewFilter === "all" ? "bg-white text-[#16265E] shadow-2xs" : "text-gray-600"
                    }`}
                  >
                    ทั้งหมด ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("existing")}
                    className={`rounded-md px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                      previewFilter === "existing" ? "bg-white text-emerald-800 shadow-2xs" : "text-gray-600"
                    }`}
                  >
                    🟢 บุคลากรเดิม ({exactCount})
                  </button>
                  {diffPrefixCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter("diffPrefix")}
                      className={`rounded-md px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                        previewFilter === "diffPrefix" ? "bg-white text-amber-900 shadow-2xs" : "text-gray-600"
                      }`}
                    >
                      🟡 คำนำหน้าเปลี่ยน ({diffPrefixCount})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("new")}
                    className={`rounded-md px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                      previewFilter === "new" ? "bg-white text-blue-800 shadow-2xs" : "text-gray-600"
                    }`}
                  >
                    ✨ บุคลากรใหม่ ({newCount})
                  </button>
                </div>

                <span className="text-[11px] text-gray-500">
                  ระบบ Smart Name Matching ตรวจสอบรหัสประจำตัวอัตโนมัติก่อนนำเข้า
                </span>
              </div>

              {/* Preview Table */}
              <div className="max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#16265E] text-white sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">สถานะตรวจสอบ Smart Matching</th>
                      <th className="py-2.5 px-3 font-mono">รหัสประจำตัว (Unique ID)</th>
                      <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                      <th className="py-2.5 px-3">กลุ่มสังกัด</th>
                      <th className="py-2.5 px-3">ชื่อสมาคม/หน่วยงาน</th>
                      <th className="py-2.5 px-3">หลักสูตร</th>
                      <th className="py-2.5 px-3 text-center">ปี พ.ศ.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPreview.map((r, i) => (
                      <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-2 px-3 text-gray-400 font-mono">{i + 1}</td>
                        <td className="py-2 px-3">
                          {r.matchConfidence === "EXACT_MATCH" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              <span>🟢</span>
                              <span>พบบัญชีเดิม (ผูกวุฒิบัตรสะสม)</span>
                            </span>
                          ) : r.matchConfidence === "SAME_PERSON_DIFF_PREFIX" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300" title={r.matchReason}>
                              <span>🟡</span>
                              <span>คำนำหน้าเปลี่ยน (ผูกรหัสเดิม)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                              <span>✨</span>
                              <span>บุคลากรใหม่ (สร้างรหัสใหม่)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#16265E]">
                          {r.personnelId}
                        </td>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-gray-900">{r.name}</p>
                          {r.firstName && r.lastName && (
                            <p className="text-[10px] text-gray-400 font-mono">
                              {r.firstName} | {r.lastName}
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-600">{r.affiliationGroup || "-"}</td>
                        <td className="py-2 px-3 text-gray-600 max-w-[150px] truncate" title={r.affiliation}>{r.affiliation}</td>
                        <td className="py-2 px-3 font-bold text-[#16265E]">{r.courseTitle}</td>
                        <td className="py-2 px-3 text-center font-bold text-gray-700">{r.yearBE}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="text-xs text-gray-500">
            {parsedRows.length > 0 ? (
              <span>
                พร้อมนำเข้า <strong>{parsedRows.length}</strong> รายการ (บุคลากรเดิม {existingCount} ท่าน • บุคลากรใหม่ {newCount} ท่าน)
              </span>
            ) : (
              <span>กรุณาเลือกไฟล์ Excel เพื่อแสดงตารางพรีวิวก่อนนำเข้า</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0}
              onClick={handleConfirm}
              className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors ${
                parsedRows.length > 0
                  ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              ยืนยันการนำเข้า {parsedRows.length > 0 ? `(${parsedRows.length} รายการ)` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
