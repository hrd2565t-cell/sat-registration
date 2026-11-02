"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import * as XLSX from "xlsx";
import type { HistoricalTrainee } from "@/lib/alumni-store";

interface BulkImportModalProps {
  onClose: () => void;
  onImport: (
    items: Omit<HistoricalTrainee, "id" | "createdAt" | "updatedAt" | "duties">[]
  ) => void;
}

export function BulkImportModal({ onClose, onImport }: BulkImportModalProps) {
  const [parsedRows, setParsedRows] = useState<
    Omit<HistoricalTrainee, "id" | "createdAt" | "updatedAt" | "duties">[]
  >([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Generate & download real sample excel template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "เลขประจำตัวประชาชน (13 หลัก)": "1100500998877",
        "ชื่อ-นามสกุล": "นาย ธนกร สมบูรณ์สุข",
        เพศ: "ชาย",
        เบอร์โทรศัพท์: "081-999-8877",
        อีเมล: "thanakorn.s@example.com",
        "สังกัด/หน่วยงาน": "สมาคมกีฬาแห่งประเทศไทย",
        ชนิดกีฬา: "ฟุตบอล",
        "ปี พ.ศ. ที่อบรม": 2568,
        ชื่อหลักสูตร: "หลักสูตร ผู้ฝึกสอนกีฬาระดับชาติ",
        รุ่นที่: "รุ่นที่ 1/2568",
        เลขที่วุฒิบัตร: "กกท.-ผฝ.68/099",
        วันที่สำเร็จการอบรม: "2025-03-20",
        สถานะ: "active",
      },
      {
        "เลขประจำตัวประชาชน (13 หลัก)": "3101700887766",
        "ชื่อ-นามสกุล": "นางสาว รุ่งทิพย์ เจริญจิต",
        เพศ: "หญิง",
        เบอร์โทรศัพท์: "089-111-2233",
        อีเมล: "rungthip.c@example.com",
        "สังกัด/หน่วยงาน": "สมาคมกีฬาแห่งจังหวัด",
        ชนิดกีฬา: "วอลเลย์บอล",
        "ปี พ.ศ. ที่อบรม": 2568,
        ชื่อหลักสูตร: "หลักสูตร ผู้ตัดสินกีฬาอาชีพ",
        รุ่นที่: "รุ่นที่ 1/2568",
        เลขที่วุฒิบัตร: "กกท.-ผต.68/055",
        วันที่สำเร็จการอบรม: "2025-04-15",
        สถานะ: "active",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "รายชื่อผู้ผ่านการอบรม");
    XLSX.writeFile(workbook, "SAT_Alumni_Template.xlsx");
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

        const mapped: Omit<
          HistoricalTrainee,
          "id" | "createdAt" | "updatedAt" | "duties"
        >[] = rawJson.map((row) => {
          // Flexible key mapping to support various column names
          const idCardRaw = String(
            row["เลขประจำตัวประชาชน (13 หลัก)"] ??
              row["เลขประจำตัวประชาชน"] ??
              row["เลขบัตรประชาชน"] ??
              row["idCard"] ??
              ""
          ).trim();

          const name = String(
            row["ชื่อ-นามสกุล"] ?? row["ชื่อ"] ?? row["name"] ?? "ไม่ระบุชื่อ"
          ).trim();

          const genderRaw = String(row["เพศ"] ?? row["gender"] ?? "");
          const gender: "male" | "female" | undefined =
            genderRaw.includes("หญิง") || genderRaw.toLowerCase() === "female"
              ? "female"
              : genderRaw.includes("ชาย") || genderRaw.toLowerCase() === "male"
              ? "male"
              : undefined;

          const phone = String(row["เบอร์โทรศัพท์"] ?? row["เบอร์โทร"] ?? row["phone"] ?? "").trim();
          const email = String(row["อีเมล"] ?? row["email"] ?? "").trim();

          const affiliation = String(
            row["สังกัด/หน่วยงาน"] ??
              row["สังกัด"] ??
              row["หน่วยงาน"] ??
              row["affiliation"] ??
              "การกีฬาแห่งประเทศไทย"
          ).trim();

          const sportsType = String(
            row["ชนิดกีฬา"] ?? row["กีฬา"] ?? row["sportsType"] ?? "กีฬาอื่นๆ"
          ).trim();

          const yearRaw = Number(row["ปี พ.ศ. ที่อบรม"] ?? row["ปี พ.ศ."] ?? row["ปี"] ?? row["yearBE"]);
          const yearBE = Number.isFinite(yearRaw) && yearRaw >= 2550 ? yearRaw : 2568;

          const courseTitle = String(
            row["ชื่อหลักสูตร"] ??
              row["หลักสูตร"] ??
              row["courseTitle"] ??
              "หลักสูตรพัฒนาบุคลากรกีฬา"
          ).trim();

          const batch = String(row["รุ่นที่"] ?? row["รุ่น"] ?? row["batch"] ?? "รุ่นที่ 1").trim();
          const certNo = String(row["เลขที่วุฒิบัตร"] ?? row["วุฒิบัตร"] ?? row["certNo"] ?? "").trim();
          const passedDate = String(
            row["วันที่สำเร็จการอบรม"] ?? row["วันที่จบ"] ?? row["passedDate"] ?? ""
          ).trim();

          const statusRaw = String(row["สถานะ"] ?? row["status"] ?? "").toLowerCase();
          const status: "active" | "inactive" | "pending_verification" =
            statusRaw === "inactive" || statusRaw === "ไม่ปฏิบัติหน้าที่"
              ? "inactive"
              : statusRaw === "pending" || statusRaw === "รอตรวจสอบ"
              ? "pending_verification"
              : "active";

          return {
            idCard: idCardRaw.replace(/\D/g, "") || "1100000000000",
            name,
            gender,
            phone,
            email,
            affiliation,
            sportsType,
            yearBE,
            courseTitle,
            batch,
            certNo,
            passedDate,
            status,
          };
        });

        setParsedRows(mapped);
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
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-base">
              📊
            </span>
            <div>
              <h3 className="text-base font-bold text-white">
                นำเข้าข้อมูลผู้ผ่านการอบรมย้อนหลังจากไฟล์ Excel (Bulk Import)
              </h3>
              <p className="text-xs text-blue-100/80">
                รองรับไฟล์ .xlsx และ .csv สำหรับนำเข้าประวัติย้อนหลังปี 2565-2570
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
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
                📄 ดาวน์โหลดไฟล์เทมเพลตตัวอย่าง
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                ใช้เทมเพลตนี้เพื่อจัดเตรียมคอลัมน์ให้ตรงตามมาตรฐานของระบบ กกท. ก่อนนำเข้า
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-[#16265E] shadow-xs border border-blue-300 hover:bg-blue-100/60 transition-colors"
            >
              <span>⬇️</span>
              <span>ดาวน์โหลดเทมเพลต (.xlsx)</span>
            </button>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? "border-[#16265E] bg-blue-50/50"
                : "border-gray-300 bg-gray-50/50 hover:bg-gray-50"
            }`}
          >
            <span className="text-4xl">📁</span>
            <p className="mt-2 text-sm font-semibold text-gray-700">
              ลากไฟล์ Excel / CSV มาวางที่นี่
            </p>
            <p className="text-xs text-gray-500 mt-1">หรือเลือกไฟล์จากเครื่องคอมพิวเตอร์ของคุณ</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#16265E] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors">
              <span>เลือกไฟล์จากเครื่อง</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {fileName && (
              <span className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                📄 ไฟล์ที่เลือก: {fileName} ({parsedRows.length} รายการ)
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              ⚠️ {error}
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                <span>ตารางพรีวิวข้อมูลที่จะนำเข้า ({parsedRows.length} รายการ)</span>
                <span className="text-emerald-700 font-bold">ตรวจสอบความถูกต้องก่อนบันทึก</span>
              </div>
              <div className="max-h-56 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                      <th className="py-2 px-3">เลขบัตร ปชช.</th>
                      <th className="py-2 px-3">ชนิดกีฬา</th>
                      <th className="py-2 px-3">ปี พ.ศ.</th>
                      <th className="py-2 px-3">หลักสูตร</th>
                      <th className="py-2 px-3">เลขที่วุฒิบัตร</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-blue-50/50">
                        <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                        <td className="py-2 px-3 font-semibold text-gray-900">{r.name}</td>
                        <td className="py-2 px-3 text-gray-600 font-mono">{r.idCard}</td>
                        <td className="py-2 px-3 text-gray-600">{r.sportsType}</td>
                        <td className="py-2 px-3 font-bold text-[#16265E]">{r.yearBE}</td>
                        <td className="py-2 px-3 text-gray-700 max-w-xs truncate">{r.courseTitle}</td>
                        <td className="py-2 px-3 text-gray-600">{r.certNo || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <p className="text-[11px] text-gray-500 italic">
                  *แสดงตัวอย่าง 50 รายการแรกจากทั้งหมด {parsedRows.length} รายการ
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="text-xs text-gray-500">
            ระบบจะสร้างรายการประวัติเข้าสู่คลังทำเนียบบุคลากรอัตโนมัติ
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0}
              onClick={handleConfirm}
              className={`rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors ${
                parsedRows.length > 0
                  ? "bg-[#10b981] hover:bg-[#059669] cursor-pointer"
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
