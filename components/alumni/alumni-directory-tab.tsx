"use client";

import { useState, useMemo } from "react";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import { SPORTS_TYPES, PAST_YEARS_BE, STANDARD_COURSES } from "@/lib/alumni-store";
import * as XLSX from "xlsx";

interface AlumniDirectoryTabProps {
  trainees: HistoricalTrainee[];
  onOpenPassport: (idCard: string) => void;
  onOpenDutyRecord: (trainee: HistoricalTrainee) => void;
  onOpenImport: () => void;
  isAdmin?: boolean;
}

export function AlumniDirectoryTab({
  trainees,
  onOpenPassport,
  onOpenDutyRecord,
  onOpenImport,
  isAdmin = false,
}: AlumniDirectoryTabProps) {
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return trainees.filter((t) => {
      // Search text
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const cleanQuery = query.replace(/\D/g, "");
        const matchName = t.name.toLowerCase().includes(query);
        const matchCert = t.certNo?.toLowerCase().includes(query);
        const matchSport = t.sportsType?.toLowerCase().includes(query);
        const matchOrg = t.affiliation?.toLowerCase().includes(query);
        const matchId = cleanQuery && t.idCard.replace(/\D/g, "").includes(cleanQuery);
        if (!matchName && !matchCert && !matchSport && !matchOrg && !matchId) {
          return false;
        }
      }

      // Year filter
      if (selectedYear !== "all" && t.yearBE !== Number(selectedYear)) {
        return false;
      }

      // Sport filter
      if (selectedSport !== "all" && t.sportsType !== selectedSport) {
        return false;
      }

      // Course filter
      if (selectedCourse !== "all" && !t.courseTitle.includes(selectedCourse)) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && t.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [trainees, search, selectedYear, selectedSport, selectedCourse, selectedStatus]);

  const handleExportDirectoryExcel = () => {
    const dataToExport = filtered.map((t, idx) => ({
      ลำดับ: idx + 1,
      "ชื่อ-นามสกุล": t.name,
      "เลขประจำตัวประชาชน": t.idCard,
      เพศ: t.gender === "female" ? "หญิง" : "ชาย",
      เบอร์โทรศัพท์: t.phone || "-",
      อีเมล: t.email || "-",
      ชนิดกีฬา: t.sportsType,
      "สังกัด/หน่วยงาน": t.affiliation,
      "ปี พ.ศ. ที่อบรม": t.yearBE,
      หลักสูตรที่สำเร็จ: t.courseTitle,
      รุ่นที่: t.batch,
      เลขที่วุฒิบัตร: t.certNo,
      วันที่สำเร็จการอบรม: t.passedDate,
      "สถานะการปฏิบัติงาน":
        t.status === "active"
          ? "ปฏิบัติหน้าที่ต่อเนื่อง (Active)"
          : t.status === "pending_verification"
          ? "รอตรวจสอบรายงาน"
          : "ยังไม่มีประวัติในรอบปี (Inactive)",
      "จำนวนครั้งที่ปฏิบัติหน้าที่": t.duties.length,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ทำเนียบผู้ผ่านการอบรม");
    XLSX.writeFile(
      workbook,
      `SAT_Alumni_Directory_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ-สกุล, เลขบัตร ปชช., เลขที่วุฒิบัตร, ชนิดกีฬา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-gray-50/60 py-2.5 pl-10 pr-4 text-xs sm:text-sm transition-colors focus:border-[#16265E] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 hover:text-gray-600"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={onOpenImport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors"
                title="นำเข้าไฟล์ Excel ผู้ผ่านการอบรมย้อนหลัง"
              >
                <span>📥</span>
                <span>นำเข้า Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportDirectoryExcel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
              title="ส่งออกรายชื่อเป็นไฟล์ Excel"
            >
              <span>📊</span>
              <span>ส่งออก Excel</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100 text-xs">
          {/* Year Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              ปี พ.ศ. ที่อบรม
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
            >
              <option value="all">ทุกปี พ.ศ. (2565 - 2570)</option>
              {PAST_YEARS_BE.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {y}
                </option>
              ))}
            </select>
          </div>

          {/* Sport Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              ชนิดกีฬา
            </label>
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
            >
              <option value="all">ทุกชนิดกีฬา</option>
              {SPORTS_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              หลักสูตร
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
            >
              <option value="all">ทุกหลักสูตร</option>
              <option value="ผู้ฝึกสอน">ผู้ฝึกสอนกีฬา</option>
              <option value="ผู้ตัดสิน">ผู้ตัดสินกีฬา</option>
              <option value="วิทยาศาสตร์การกีฬา">วิทยาศาสตร์การกีฬา</option>
              <option value="บริหารจัดการ">การบริหารจัดการองค์กร</option>
              <option value="จิตวิทยา">จิตวิทยาการกีฬา</option>
              <option value="งบประมาณ">งบประมาณและพัสดุ</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              สถานะการปฏิบัติหน้าที่
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">🟢 ปฏิบัติหน้าที่ต่อเนื่อง (Active)</option>
              <option value="pending_verification">⏳ รอตรวจสอบ (Pending)</option>
              <option value="inactive">⚪ ยังไม่มีประวัติรอบปี (Inactive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
        <span>
          แสดงผล <strong className="text-[#16265E]">{filtered.length}</strong> จากทั้งหมด {trainees.length} รายการ
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Active: {filtered.filter((t) => t.status === "active").length}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Pending: {filtered.filter((t) => t.status === "pending_verification").length}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            <span>Inactive: {filtered.filter((t) => t.status === "inactive").length}</span>
          </span>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#16265E] text-white">
              <tr>
                <th className="py-3 px-3.5 font-bold">#</th>
                <th className="py-3 px-3.5 font-bold">บุคลากรกีฬา</th>
                <th className="py-3 px-3.5 font-bold">ชนิดกีฬา</th>
                <th className="py-3 px-3.5 font-bold">หลักสูตร / รุ่นที่</th>
                <th className="py-3 px-3.5 font-bold">ปี พ.ศ.</th>
                <th className="py-3 px-3.5 font-bold">เลขที่วุฒิบัตร</th>
                <th className="py-3 px-3.5 font-bold">สถานะการทำหน้าที่</th>
                <th className="py-3 px-3.5 font-bold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <span className="text-3xl">🔍</span>
                    <p className="mt-2 text-sm font-semibold">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>
                    <p className="text-xs text-gray-400 mt-0.5">ลองปรับคำค้นหา หรือรีเซ็ตตัวกรองด้านบน</p>
                  </td>
                </tr>
              ) : (
                filtered.map((t, index) => {
                  const cleanId = t.idCard.replace(/\D/g, "");
                  const maskedId =
                    cleanId.length === 13
                      ? `${cleanId.slice(0, 1)}-${cleanId.slice(1, 5)}-XXXXX-${cleanId.slice(12)}`
                      : t.idCard;

                  return (
                    <tr
                      key={t.id || index}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="py-3 px-3.5 text-gray-400 font-mono">{index + 1}</td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#16265E] to-[#2563eb] font-bold text-white text-[11px] shadow-xs">
                            {t.name.replace(/^(นาย|นางสาว|นาง|ดร\.|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.)\s*/, "").slice(0, 2)}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => onOpenPassport(t.idCard)}
                              className="font-bold text-[#16265E] hover:underline text-left cursor-pointer"
                            >
                              {t.name}
                            </button>
                            <p className="text-[11px] text-gray-500 font-mono">{maskedId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700 border border-blue-200">
                          {t.sportsType}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <p className="font-semibold text-gray-800 truncate max-w-xs">{t.courseTitle}</p>
                        <p className="text-[11px] text-gray-500">{t.batch}</p>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-[#16265E]">{t.yearBE}</span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-gray-600">
                        {t.certNo || "-"}
                      </td>
                      <td className="py-3 px-3.5">
                        {t.status === "active" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active ({t.duties.length})
                          </span>
                        ) : t.status === "pending_verification" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            รอตรวจสอบ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                            ยังไม่มีบันทึก
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenPassport(t.idCard)}
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#16265E] hover:bg-blue-100 transition-colors cursor-pointer"
                            title="ดูพาสปอร์ตประวัติบุคลากร"
                          >
                            🪪 พาสปอร์ต
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDutyRecord(t)}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                            title="บันทึกการปฏิบัติหน้าที่"
                          >
                            + บันทึกงาน
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
