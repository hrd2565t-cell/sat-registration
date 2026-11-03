"use client";

import { useState, useMemo, type ChangeEvent, type DragEvent } from "react";
import * as XLSX from "xlsx";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import {
  findExistingTrainee,
  generateNextPersonnelIds,
  getNextPersonnelId,
} from "@/lib/alumni-store";

export interface ParsedImportRow extends Omit<
  HistoricalTrainee,
  "id" | "createdAt" | "updatedAt" | "duties"
> {
  isExisting: boolean;
  matchedPersonnelId?: string;
  matchedName?: string;
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
  const [previewFilter, setPreviewFilter] = useState<"all" | "new" | "existing">("all");
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
        "คำนำหน้าชื่อ": "นาย",
        "ชื่อ-นามสกุล": "บุคลากรใหม่ ทดสอบระบบ",
        "กลุ่มหน่วยงาน": "การกีฬาแห่งประเทศไทย",
        "ชื่อสมาคม/หน่วยงาน": "การกีฬาแห่งประเทศไทย",
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

        // 1. Initial parse of rows
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

          const fullName = prefix && !rawName.startsWith(prefix) ? `${prefix} ${rawName}` : rawName;

          const group = String(
            row["กลุ่มหน่วยงาน"] ?? row["กลุ่ม"] ?? row["affiliationGroup"] ?? "หน่วยงานภายนอก"
          ).trim();

          const org = String(
            row["ชื่อสมาคม/หน่วยงาน"] ??
              row["สังกัด/หน่วยงาน"] ??
              row["สังกัด"] ??
              row["หน่วยงาน"] ??
              row["affiliation"] ??
              group
          ).trim();

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
            prefix: prefix || undefined,
            name: fullName,
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

        // 2. Count new people vs existing people
        let newCount = 0;
        const mappedWithExistingCheck = initialParsed.map((item) => {
          const match = findExistingTrainee(trainees, item.name, item.rawId);
          if (match) {
            return {
              ...item,
              isExisting: true,
              matchedPersonnelId: match.personnelId,
              matchedName: match.name,
              // Inherit group or affiliation if blank
              affiliationGroup: item.affiliationGroup || match.affiliationGroup,
              affiliation: item.affiliation || match.affiliation,
            };
          } else {
            newCount++;
            return {
              ...item,
              isExisting: false,
              matchedPersonnelId: undefined as string | undefined,
              matchedName: undefined as string | undefined,
            };
          }
        });

        // 3. Generate sequential running IDs for all new personnel
        const newIds = generateNextPersonnelIds(trainees, newCount);
        let newIdx = 0;

        const finalMapped: ParsedImportRow[] = mappedWithExistingCheck.map((item) => {
          if (item.isExisting) {
            const finalPId = item.matchedPersonnelId!;
            return {
              idCard: finalPId,
              personnelId: finalPId,
              name: item.name,
              prefix: item.prefix,
              affiliation: item.affiliation,
              affiliationGroup: item.affiliationGroup,
              sportsType: item.sportsType,
              courseTitle: item.courseTitle,
              courseCategory: item.courseCategory,
              yearBE: item.yearBE,
              batch: item.batch,
              passedDate: `${item.yearBE - 543}-09-30`,
              status: item.status,
              isExisting: true,
              matchedPersonnelId: item.matchedPersonnelId,
              matchedName: item.matchedName,
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
              affiliation: item.affiliation,
              affiliationGroup: item.affiliationGroup,
              sportsType: item.sportsType,
              courseTitle: item.courseTitle,
              courseCategory: item.courseCategory,
              yearBE: item.yearBE,
              batch: item.batch,
              passedDate: `${item.yearBE - 543}-09-30`,
              status: item.status,
              isExisting: false,
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
    onImport(parsedRows);
    onClose();
  };

  const existingCount = useMemo(() => parsedRows.filter((r) => r.isExisting).length, [parsedRows]);
  const newCount = useMemo(() => parsedRows.filter((r) => !r.isExisting).length, [parsedRows]);

  const filteredPreview = useMemo(() => {
    if (previewFilter === "existing") return parsedRows.filter((r) => r.isExisting);
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
      <div className="relative my-6 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#16265E] p-5 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg">
              📊
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                นำเข้าข้อมูลผู้ผ่านการอบรมจากไฟล์ Excel (Smart Import & Preview)
              </h3>
              <p className="text-xs text-blue-100/80">
                ระบบจะตรวจสอบความซ้ำซ้อนกับฐานข้อมูลเดิม และสร้างรหัส Unique ID ให้อัตโนมัติ
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
        <div className="p-6 space-y-4">
          {/* Template Download Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4">
            <div>
              <h4 className="text-xs font-bold text-[#16265E]">
                📄 ดาวน์โหลดไฟล์เทมเพลตตัวอย่าง (Template)
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                มีคอลัมน์มาตรฐาน: ชื่อ-นามสกุล, กลุ่มหน่วยงาน, ชื่อสมาคม/หน่วยงาน, ชื่อหลักสูตร, ปี พ.ศ. (รหัสประจำตัวเว้นว่างได้)
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#16265E] bg-white px-3.5 py-2 text-xs font-semibold text-[#16265E] shadow-xs hover:bg-[#16265E] hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <span>⬇️</span>
              <span>ดาวน์โหลด Template (.xlsx)</span>
            </button>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
              isDragging
                ? "border-[#16265E] bg-blue-50/60 scale-[0.99]"
                : "border-gray-300 bg-gray-50/50 hover:bg-gray-50"
            }`}
          >
            <span className="text-4xl">📁</span>
            <p className="mt-2 text-sm font-semibold text-gray-700">
              ลากไฟล์ Excel (.xlsx, .csv) มาวางที่นี่
            </p>
            <p className="text-xs text-gray-500 mt-1">หรือคลิกปุ่มเพื่อเลือกไฟล์จากเครื่องคอมพิวเตอร์</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#16265E] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#111e4a] transition-colors">
              <span>เลือกไฟล์จากเครื่อง</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {fileName && (
              <span className="mt-3 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                📄 ไฟล์ที่เลือก: {fileName} (พบ {parsedRows.length} รายการ)
              </span>
            )}
          </div>

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
                    🟢 บุคลากรเดิม: {existingCount} ท่าน
                  </span>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-bold text-blue-800 border border-blue-200">
                    ✨ บุคลากรใหม่: {newCount} ท่าน
                  </span>
                </div>
              </div>

              {/* Filter Tabs in Preview */}
              <div className="flex items-center justify-between">
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
                    🟢 บุคลากรเดิม ({existingCount})
                  </button>
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
                  ตรวจสอบรหัสประจำตัวและสถานะก่อนกดยืนยัน
                </span>
              </div>

              {/* Preview Table */}
              <div className="max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#16265E] text-white sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">สถานะตรวจสอบ</th>
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
                          {r.isExisting ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              <span>🟢</span>
                              <span>พบบัญชีเดิม (ผูกวุฒิบัตรสะสม)</span>
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
                        <td className="py-2 px-3 font-semibold text-gray-900">{r.name}</td>
                        <td className="py-2 px-3 text-gray-600">{r.affiliationGroup || "-"}</td>
                        <td className="py-2 px-3 text-gray-600 max-w-[150px] truncate">{r.affiliation}</td>
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
