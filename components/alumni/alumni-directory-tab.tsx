"use client";

import { useState, useMemo } from "react";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import {
  AFFILIATION_GROUPS,
  PAST_YEARS_BE,
  STANDARD_COURSES,
  groupTraineesByPerson,
  updatePersonAffiliation,
  isCloudConfigured,
  getCloudSyncStatus,
  type UniquePersonTrainee,
} from "@/lib/alumni-store";
import { loginAdmin } from "@/lib/admin-auth";
import * as XLSX from "xlsx";
import { DataCleansingModal } from "./data-cleansing-modal";
import { TopTraineesModal } from "./top-trainees-modal";

interface AlumniDirectoryTabProps {
  trainees: HistoricalTrainee[];
  onOpenPassport: (idCard: string) => void;
  onOpenDutyRecord: (trainee: HistoricalTrainee) => void;
  onOpenDigitalPass?: (idCard: string) => void;
  onOpenImport: () => void;
  onOpenAddTrainee?: () => void;
  onDeleteTrainee?: (id: string) => void;
  isAdmin?: boolean;
}

export function AlumniDirectoryTab({
  trainees,
  onOpenPassport,
  onOpenDutyRecord,
  onOpenDigitalPass,
  onOpenImport,
  onOpenAddTrainee,
  onDeleteTrainee,
  isAdmin = false,
}: AlumniDirectoryTabProps) {
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"person" | "record">("person");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortBy, setSortBy] = useState<"default" | "most_courses" | "least_courses" | "name_asc" | "latest_year">("default");
  const [isTopTraineesModalOpen, setIsTopTraineesModalOpen] = useState<boolean>(false);

  // Inline Quick Edit Group State
  const [editingGroupPersonId, setEditingGroupPersonId] = useState<string | null>(null);
  const [editingGroupValue, setEditingGroupValue] = useState<string>("การกีฬาแห่งประเทศไทย");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data Cleansing Modal State
  const [showCleansingModal, setShowCleansingModal] = useState<boolean>(false);

  // Admin PIN Unlock Dialog State
  const [showPinPrompt, setShowPinPrompt] = useState<boolean>(false);
  const [pinAction, setPinAction] = useState<"editGroup" | "cleansing">("editGroup");
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [pendingEditPerson, setPendingEditPerson] = useState<{
    id: string;
    name: string;
    currentGroup: string;
  } | null>(null);

  const handleOpenCleansing = () => {
    if (isAdmin) {
      setShowCleansingModal(true);
    } else {
      setPinAction("cleansing");
      setShowPinPrompt(true);
      setPinInput("");
      setPinError("");
    }
  };

  const handleStartEditGroup = (id: string, name: string, currentGroup: string) => {
    if (!isAdmin) {
      setPinAction("editGroup");
      setPendingEditPerson({ id, name, currentGroup });
      setShowPinPrompt(true);
      setPinInput("");
      setPinError("");
      return;
    }

    setEditingGroupPersonId(id);
    setEditingGroupValue(currentGroup || "หน่วยงานภายนอก");
  };

  const handleSaveGroup = (personId: string, personName: string) => {
    const count = updatePersonAffiliation(personId, editingGroupValue);
    setEditingGroupPersonId(null);
    setToastMessage(`✅ ปรับกลุ่มหน่วยงานของ "${personName}" เป็น "${editingGroupValue}" เรียบร้อยแล้ว (อัปเดต ${count} รายการ)`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCancelEditGroup = () => {
    setEditingGroupPersonId(null);
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(pinInput.trim())) {
      setShowPinPrompt(false);
      setPinError("");
      if (pinAction === "cleansing") {
        setShowCleansingModal(true);
      } else if (pendingEditPerson) {
        setEditingGroupPersonId(pendingEditPerson.id);
        setEditingGroupValue(pendingEditPerson.currentGroup || "หน่วยงานภายนอก");
        setPendingEditPerson(null);
      }
    } else {
      setPinError("รหัส PIN ไม่ถูกต้อง (รหัสเริ่มต้น: 336699)");
    }
  };

  // Group into clean unique personnel (deduplicated profiles)
  const uniquePersons = useMemo(() => groupTraineesByPerson(trainees), [trainees]);

  // Statistics per year BE (course count and trainee count)
  const yearStatsMap = useMemo(() => {
    const map = new Map<number, { courseCount: number; traineeCount: number }>();
    for (const y of PAST_YEARS_BE) {
      const list = trainees.filter((t) => t.yearBE === y);
      const uniqueCourses = new Set(list.map((t) => t.courseTitle));
      map.set(y, {
        courseCount: uniqueCourses.size,
        traineeCount: list.length,
      });
    }
    return map;
  }, [trainees]);

  // Dynamic courses list based on selectedYear (Cascading Course Filter)
  const availableCourses = useMemo(() => {
    const source = selectedYear === "all"
      ? trainees
      : trainees.filter((t) => t.yearBE === Number(selectedYear));

    const countMap = new Map<string, number>();
    for (const t of source) {
      countMap.set(t.courseTitle, (countMap.get(t.courseTitle) || 0) + 1);
    }

    if (selectedYear === "all") {
      STANDARD_COURSES.forEach((c) => {
        if (!countMap.has(c)) {
          countMap.set(c, 0);
        }
      });
    }

    return Array.from(countMap.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.title.localeCompare(b.title, "th");
      });
  }, [trainees, selectedYear]);

  // Total trainees in currently selected year
  const totalInSelectedYear = useMemo(() => {
    if (selectedYear === "all") return trainees.length;
    return trainees.filter((t) => t.yearBE === Number(selectedYear)).length;
  }, [trainees, selectedYear]);

  // Handle year change with auto-reset for course filter
  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    setCurrentPage(1);

    if (newYear !== "all" && selectedCourse !== "all") {
      const exists = trainees.some(
        (t) => t.yearBE === Number(newYear) && t.courseTitle === selectedCourse
      );
      if (!exists) {
        setSelectedCourse("all");
      }
    }
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedYear !== "all" ||
    selectedCourse !== "all" ||
    selectedGroup !== "all" ||
    selectedStatus !== "all" ||
    sortBy !== "default";

  const handleResetFilters = () => {
    setSearch("");
    setSelectedYear("all");
    setSelectedCourse("all");
    setSelectedGroup("all");
    setSelectedStatus("all");
    setSortBy("default");
    setCurrentPage(1);
  };

  // 1. Filtered for Person View (1 row per unique individual)
  const filteredPersons = useMemo(() => {
    const list = uniquePersons.filter((p) => {
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchOrg = p.affiliation?.toLowerCase().includes(query);
        const matchGroup = p.affiliationGroup?.toLowerCase().includes(query);
        const matchId = p.personnelId?.toLowerCase().includes(query);
        const matchCourses = p.courses.some((c) => c.courseTitle.toLowerCase().includes(query));

        if (!matchName && !matchOrg && !matchGroup && !matchId && !matchCourses) {
          return false;
        }
      }

      if (selectedYear !== "all" && selectedCourse !== "all") {
        const yNum = Number(selectedYear);
        if (!p.courses.some((c) => c.yearBE === yNum && c.courseTitle === selectedCourse)) {
          return false;
        }
      } else {
        if (selectedYear !== "all") {
          const yNum = Number(selectedYear);
          if (!p.courses.some((c) => c.yearBE === yNum)) return false;
        }

        if (selectedCourse !== "all") {
          if (!p.courses.some((c) => c.courseTitle === selectedCourse)) return false;
        }
      }

      if (selectedGroup !== "all" && p.affiliationGroup !== selectedGroup) {
        return false;
      }

      if (selectedStatus !== "all" && p.status !== selectedStatus) {
        return false;
      }

      return true;
    });

    // Apply Sorting
    if (sortBy === "most_courses") {
      list.sort((a, b) => {
        if (b.totalCourses !== a.totalCourses) return b.totalCourses - a.totalCourses;
        return b.latestYearBE - a.latestYearBE;
      });
    } else if (sortBy === "least_courses") {
      list.sort((a, b) => {
        if (a.totalCourses !== b.totalCourses) return a.totalCourses - b.totalCourses;
        return a.firstYearBE - b.firstYearBE;
      });
    } else if (sortBy === "name_asc") {
      list.sort((a, b) => a.name.localeCompare(b.name, "th"));
    } else if (sortBy === "latest_year") {
      list.sort((a, b) => b.latestYearBE - a.latestYearBE);
    }

    return list;
  }, [uniquePersons, search, selectedYear, selectedGroup, selectedCourse, selectedStatus, sortBy]);

  // 2. Filtered for Certification Record View (all training certification rows)
  const filteredRecords = useMemo(() => {
    const list = trainees.filter((t) => {
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const cleanQuery = query.replace(/\D/g, "");
        const matchName = t.name.toLowerCase().includes(query);
        const matchOrg = t.affiliation?.toLowerCase().includes(query);
        const matchGroup = t.affiliationGroup?.toLowerCase().includes(query);
        const matchPersonnelId = t.personnelId?.toLowerCase().includes(query);
        const matchCourse = t.courseTitle?.toLowerCase().includes(query);
        const matchId = cleanQuery && t.idCard && t.idCard.replace(/\D/g, "").includes(cleanQuery);

        if (!matchName && !matchOrg && !matchGroup && !matchPersonnelId && !matchCourse && !matchId) {
          return false;
        }
      }

      if (selectedYear !== "all" && t.yearBE !== Number(selectedYear)) {
        return false;
      }

      if (selectedGroup !== "all" && t.affiliationGroup !== selectedGroup) {
        return false;
      }

      if (selectedCourse !== "all" && t.courseTitle !== selectedCourse) {
        return false;
      }

      if (selectedStatus !== "all" && t.status !== selectedStatus) {
        return false;
      }

      return true;
    });

    // Apply Sorting for records
    if (sortBy === "name_asc") {
      list.sort((a, b) => a.name.localeCompare(b.name, "th"));
    } else if (sortBy === "latest_year") {
      list.sort((a, b) => b.yearBE - a.yearBE);
    }

    return list;
  }, [trainees, search, selectedYear, selectedGroup, selectedCourse, selectedStatus, sortBy]);

  // Active items based on current view mode
  const activeItemsCount = viewMode === "person" ? filteredPersons.length : filteredRecords.length;
  const totalPages = Math.ceil(activeItemsCount / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;

  const pagedPersons = filteredPersons.slice(startIndex, startIndex + pageSize);
  const pagedRecords = filteredRecords.slice(startIndex, startIndex + pageSize);

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (viewMode === "person") {
      const dataToExport = filteredPersons.map((p, idx) => ({
        ลำดับ: idx + 1,
        รหัสประจำตัว: p.personnelId,
        คำนำหน้า: p.prefix || "-",
        "ชื่อ-นามสกุล": p.name,
        กลุ่มหน่วยงาน: p.affiliationGroup || "-",
        "ชื่อสมาคม/หน่วยงาน": p.affiliation,
        จำนวนหลักสูตรที่สำเร็จ: p.totalCourses,
        "หลักสูตรทั้งหมดที่สำเร็จ (ปีที่จบ)": p.courses
          .map((c) => `${c.courseTitle} (${c.yearBE})`)
          .join(", "),
        ช่วงปีที่อบรม: p.firstYearBE === p.latestYearBE ? `${p.latestYearBE}` : `${p.firstYearBE} - ${p.latestYearBE}`,
        สถานะการปฏิบัติงาน:
          p.status === "active"
            ? "ปฏิบัติหน้าที่ต่อเนื่อง (Active)"
            : p.status === "pending_verification"
            ? "รอตรวจสอบรายงาน"
            : "ยังไม่มีประวัติในรอบปี (Inactive)",
        จำนวนครั้งที่ปฏิบัติหน้าที่: p.totalDuties,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(workbook, ws, "ทำเนียบบุคลากรเดี่ยว");
    } else {
      const dataToExport = filteredRecords.map((t, idx) => ({
        ลำดับ: idx + 1,
        รหัสประจำตัว: t.personnelId || t.idCard,
        คำนำหน้า: t.prefix || "-",
        "ชื่อ-นามสกุล": t.name,
        กลุ่มหน่วยงาน: t.affiliationGroup || "-",
        "ชื่อสมาคม/หน่วยงาน": t.affiliation,
        หลักสูตรที่สำเร็จ: t.courseTitle,
        ประเภทหลักสูตร: t.courseCategory || "-",
        "ปี พ.ศ. ที่อบรม": t.yearBE,
        รุ่นที่: t.batch,
        วันที่สำเร็จการอบรม: t.passedDate || "-",
        สถานะ: t.status === "active" ? "Active" : "Inactive",
        จำนวนครั้งที่ปฏิบัติหน้าที่: t.duties.length,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      XLSX.utils.book_append_sheet(workbook, ws, "ประวัติวุฒิบัตรรายแถว");
    }

    XLSX.writeFile(
      workbook,
      `SAT_Alumni_${viewMode === "person" ? "Personnel" : "Certificates"}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

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
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search, Action & View Switcher Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ-สกุล, รหัสบุคลากร, ชื่อสมาคม/หน่วยงาน, หลักสูตร..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-gray-300 bg-gray-50/60 py-2.5 pl-10 pr-4 text-xs sm:text-sm transition-colors focus:border-[#16265E] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* View Mode Toggle & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
            {/* Cloud Database Status Indicator */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${
                isCloudConfigured()
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                  : "border-amber-200 bg-amber-50/80 text-amber-800"
              }`}
              title={
                isCloudConfigured()
                  ? "☁️ เชื่อมต่อฐานข้อมูลกลาง Supabase Cloud - ข้อมูลอัปเดตตรงกันทุกเครื่องแบบ Real-time"
                  : "💻 ข้อมูลถูกจัดเก็บในแคชของเบราว์เซอร์เครื่องนี้"
              }
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isCloudConfigured() ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span className="hidden sm:inline">
                {isCloudConfigured() ? "Supabase Cloud" : "Local Cache"}
              </span>
            </div>

            {/* View Mode Switcher Pills */}
            <div className="flex rounded-xl bg-gray-100 p-0.5 text-xs font-semibold border border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setViewMode("person");
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "person"
                    ? "bg-white text-[#16265E] shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title={`จัดกลุ่มรายชื่อ 1 คนต่อ 1 แถว รวมหลักสูตรทั้งหมดไว้ด้วยกัน (${uniquePersons.length.toLocaleString()} บุคลากร)`}
              >
                <span>👤</span>
                <span>มุมมองรายบุคคล ({uniquePersons.length.toLocaleString()})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("record");
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "record"
                    ? "bg-white text-[#16265E] shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title={`แสดงผลแบบแยกแถวตามใบวุฒิบัตรทุกรายการ (${trainees.length.toLocaleString()} รายการ)`}
              >
                <span>📜</span>
                <span>รายประวัติวุฒิบัตร ({trainees.length.toLocaleString()})</span>
              </button>
            </div>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={onOpenAddTrainee}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#16265E] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a] transition-colors cursor-pointer"
                  title="เพิ่มข้อมูลบุคลากรและประวัติการอบรมรายบุคคล"
                >
                  <span>➕</span>
                  <span>เพิ่มบุคลากร</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenImport}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors cursor-pointer"
                  title="นำเข้าไฟล์ Excel ผู้ผ่านการอบรมย้อนหลัง (พร้อมระบบ Smart Preview ตรวจสอบความซ้ำซ้อน)"
                >
                  <span>📥</span>
                  <span>นำเข้า Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCleansing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-800 shadow-xs hover:bg-purple-100 transition-colors cursor-pointer"
                  title="เครื่องมือจัดระเบียบและตรวจสอบข้อมูล (Data Cleansing Tool)"
                >
                  <span>🧹</span>
                  <span>จัดระเบียบข้อมูล</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
              title="ส่งออกรายชื่อเป็นไฟล์ Excel"
            >
              <span>📊</span>
              <span>ส่งออก Excel</span>
            </button>

            {/* Executive Top Trainees Ranking (Hall of Fame) Button */}
            <button
              type="button"
              onClick={() => setIsTopTraineesModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/90 px-3.5 py-2 text-xs font-bold text-amber-950 shadow-2xs hover:from-amber-100 hover:to-amber-200 transition-all cursor-pointer"
              title="เปิดทำเนียบผู้ผ่านการอบรมสะสมสูงสุด (Executive Hall of Fame สำหรับรายงานผู้บริหาร)"
            >
              <span>🏆</span>
              <span>ทำเนียบอบรมสูงสุด</span>
            </button>
          </div>
        </div>

        {/* Filters Header & Reset */}
        <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
              <span>🎯</span>
              <span>ตัวกรองการค้นหา</span>
              {selectedYear !== "all" && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#16265E]">
                  พ.ศ. {selectedYear} ({availableCourses.length} หลักสูตร • {totalInSelectedYear} คน)
                </span>
              )}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                title="ล้างการตั้งค่าตัวกรองทั้งหมด"
              >
                <span>✕</span>
                <span>ล้างตัวกรองทั้งหมด</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            {/* 1. Year Filter (First column, drives Course filter) */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                ปี พ.ศ. ที่อบรม
              </label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
              >
                <option value="all">ทุกปี พ.ศ. (2547 - 2569 • 17 หลักสูตร)</option>
                {PAST_YEARS_BE.map((y) => {
                  const stat = yearStatsMap.get(y);
                  const info = stat && stat.traineeCount > 0
                    ? ` (${stat.courseCount} หลักสูตร • ${stat.traineeCount} คน)`
                    : " (ไม่มีการจัดอบรม)";
                  return (
                    <option key={y} value={y}>
                      พ.ศ. {y}{info}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Course Filter (Cascading based on selectedYear) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-gray-600">
                  หลักสูตรอบรม
                </label>
                <span className="text-[10px] text-gray-500 font-medium">
                  {selectedYear !== "all" ? `${availableCourses.length} หลักสูตร` : "17 หลักสูตร"}
                </span>
              </div>
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
              >
                <option value="all">
                  {selectedYear !== "all"
                    ? `ทุกหลักสูตรในปี ${selectedYear} (${availableCourses.length} หลักสูตร • ${totalInSelectedYear} คน)`
                    : "ทุกหลักสูตร (17 หลักสูตร)"}
                </option>
                {availableCourses.map((c) => (
                  <option key={c.title} value={c.title}>
                    {c.title} ({c.count} คน)
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Affiliation Group Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                กลุ่มหน่วยงาน
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
              >
                <option value="all">ทุกกลุ่มหน่วยงาน (5 กลุ่ม)</option>
                {AFFILIATION_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Duty Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                สถานะการปฏิบัติหน้าที่
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="active">🟢 ปฏิบัติหน้าที่ต่อเนื่อง (Active)</option>
                <option value="pending_verification">⏳ รอตรวจสอบ (Pending)</option>
                <option value="inactive">⚪ ยังไม่มีประวัติรอบปี (Inactive)</option>
              </select>
            </div>

            {/* 5. Sort By Filter */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                การจัดเรียงลำดับ
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-lg border p-2 text-xs focus:border-[#16265E] focus:outline-hidden font-semibold transition-colors ${
                  sortBy === "most_courses"
                    ? "border-amber-400 bg-amber-50/80 text-amber-950 font-bold ring-1 ring-amber-300"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                <option value="default">ค่าเริ่มต้น (รหัสบุคลากร / ปีล่าสุด)</option>
                <option value="most_courses">🏆 อบรมสูงสุด (มาก ➔ น้อย)</option>
                <option value="least_courses">อบรมน้อยสุด (น้อย ➔ มาก)</option>
                <option value="latest_year">ปีที่อบรมล่าสุด (ใหม่ ➔ เก่า)</option>
                <option value="name_asc">ชื่อ - สกุล (ก ➔ ฮ)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header Info Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-600 px-1">
        <span>
          {viewMode === "person" ? (
            <>
              แสดงผล <strong className="text-[#16265E]">{startIndex + 1} - {Math.min(startIndex + pageSize, filteredPersons.length)}</strong> จากบุคลากรเดี่ยวแท้จริง <strong className="text-[#16265E]">{filteredPersons.length}</strong> ท่าน (ยุบรวมประวัติซ้ำซ้อนแล้ว ไม่แสดงแถวซ้ำ)
            </>
          ) : (
            <>
              แสดงผล <strong className="text-[#16265E]">{startIndex + 1} - {Math.min(startIndex + pageSize, filteredRecords.length)}</strong> จากประวัติวุฒิบัตร <strong className="text-[#16265E]">{filteredRecords.length}</strong> รายการ
            </>
          )}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              Active:{" "}
              {viewMode === "person"
                ? filteredPersons.filter((p) => p.status === "active").length
                : filteredRecords.filter((t) => t.status === "active").length}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>
              Pending:{" "}
              {viewMode === "person"
                ? filteredPersons.filter((p) => p.status === "pending_verification").length
                : filteredRecords.filter((t) => t.status === "pending_verification").length}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            <span>
              Inactive:{" "}
              {viewMode === "person"
                ? filteredPersons.filter((p) => p.status === "inactive").length
                : filteredRecords.filter((t) => t.status === "inactive").length}
            </span>
          </span>
        </div>
      </div>

      {/* Success Toast Notification */}
      {toastMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>🎉</span>
            <span>{toastMessage}</span>
          </span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer ml-3 font-normal"
          >
            ✕
          </button>
        </div>
      )}

      {/* Directory Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          {viewMode === "person" ? (
            /* ================= MODE 1: 1 PERSON PER ROW ================= */
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs">
              <thead className="bg-[#16265E] text-white">
                <tr>
                  <th className="py-3 px-3.5 font-bold">#</th>
                  <th className="py-3 px-3.5 font-bold">บุคลากรกีฬา</th>
                  <th className="py-3 px-3.5 font-bold">
                    <div className="flex items-center gap-1.5">
                      <span>กลุ่มหน่วยงาน</span>
                      {isAdmin && (
                        <span className="text-[10px] font-normal text-blue-200 bg-blue-900/60 px-1.5 py-0.2 rounded border border-blue-400/40">
                          แก้ไขได้ ✎
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3.5 font-bold">สังกัด / สมาคม / หน่วยงาน</th>
                  <th className="py-3 px-3.5 font-bold">หลักสูตรที่สำเร็จทั้งหมด</th>
                  <th className="py-3 px-3.5 font-bold text-center">ปีที่สำเร็จ</th>
                  <th className="py-3 px-3.5 font-bold">สถานะการทำหน้าที่</th>
                  <th className="py-3 px-3.5 font-bold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedPersons.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      <span className="text-3xl">🔍</span>
                      <p className="mt-2 text-sm font-semibold">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>
                      <p className="text-xs text-gray-400 mt-0.5">ลองปรับคำค้นหา หรือรีเซ็ตตัวกรองด้านบน</p>
                    </td>
                  </tr>
                ) : (
                  pagedPersons.map((p, index) => {
                    const globalIndex = startIndex + index + 1;

                    return (
                      <tr
                        key={p.personnelId || globalIndex}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        <td className="py-3 px-3.5 text-gray-400 font-mono">{globalIndex}</td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#16265E] to-[#2563eb] font-bold text-white text-[11px] shadow-xs">
                              {p.name.replace(/^(นาย|นางสาว|นาง|ดร\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.)\s*/, "").slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onOpenPassport(p.personnelId)}
                                  className="font-bold text-[#16265E] hover:underline text-left cursor-pointer"
                                >
                                  {p.name}
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenPassport(p.personnelId)}
                                    className="text-gray-400 hover:text-[#16265E] text-xs p-0.5 rounded cursor-pointer transition-colors"
                                    title="แก้ไขข้อมูลบุคลากร (Admin)"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 font-mono">
                                รหัส {p.personnelId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 min-w-[190px]">
                          {editingGroupPersonId === p.personnelId ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in-50 duration-150">
                              <select
                                value={editingGroupValue}
                                onChange={(e) => setEditingGroupValue(e.target.value)}
                                className="rounded-lg border border-[#16265E] bg-white px-2 py-1 text-xs font-semibold text-gray-800 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/30"
                                autoFocus
                              >
                                {AFFILIATION_GROUPS.map((grp) => (
                                  <option key={grp} value={grp}>
                                    {grp}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSaveGroup(p.personnelId, p.name)}
                                className="h-7 w-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                                title="บันทึกการแก้ไข (Enter)"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditGroup}
                                className="h-7 w-7 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                                title="ยกเลิก"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/grp">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${getGroupBadgeClass(
                                  p.affiliationGroup
                                )}`}
                              >
                                {p.affiliationGroup || "หน่วยงานภายนอก"}
                              </span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditGroup(p.personnelId, p.name, p.affiliationGroup || "หน่วยงานภายนอก")}
                                  className="rounded p-1 text-gray-400 hover:text-[#16265E] hover:bg-blue-50 transition-all cursor-pointer text-xs"
                                  title="แก้ไขกลุ่มหน่วยงาน (Admin)"
                                >
                                  ✎
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          <p className="font-semibold text-gray-800 max-w-xs line-clamp-2" title={p.affiliation}>
                            {p.affiliation}
                          </p>
                        </td>

                        {/* Accumulated Course Badges */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                                p.totalCourses >= 6
                                  ? "bg-amber-400 text-amber-950 border-amber-500 shadow-2xs font-black"
                                  : p.totalCourses >= 4
                                  ? "bg-blue-100 text-blue-900 border-blue-300 font-bold"
                                  : "bg-gray-100 text-gray-700 border-gray-200 font-semibold"
                              }`}
                            >
                              {p.totalCourses >= 6 ? "🏆 " : ""}
                              {p.totalCourses} หลักสูตร
                            </span>
                            {p.courses.map((c, cIdx) => (
                              <span
                                key={c.recordId || cIdx}
                                className="inline-flex items-center rounded-md bg-gray-100 hover:bg-blue-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-gray-700 hover:text-blue-900 border border-gray-200 transition-colors"
                                title={`${c.courseTitle} (รุ่นปี พ.ศ. ${c.yearBE})`}
                              >
                                {c.courseTitle}
                                <span className="text-[9px] text-gray-400 font-mono ml-0.5">
                                  '{String(c.yearBE).slice(2)}
                                </span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Years Active */}
                        <td className="py-3 px-3.5 text-center">
                          <span className="font-bold text-[#16265E]">
                            {p.firstYearBE === p.latestYearBE ? p.latestYearBE : `${p.firstYearBE} – ${p.latestYearBE}`}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5">
                          {p.status === "active" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active ({p.totalDuties})
                            </span>
                          ) : p.status === "pending_verification" ? (
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

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {onOpenDigitalPass && (
                              <button
                                type="button"
                                onClick={() => onOpenDigitalPass(p.personnelId)}
                                className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                title="เปิดบัตรประจำตัวบุคลากรกีฬาดิจิทัล"
                              >
                                📱 บัตรดิจิทัล
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenPassport(p.personnelId)}
                              className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#16265E] hover:bg-blue-100 transition-colors cursor-pointer"
                              title="ดูพาสปอร์ตประวัติบุคลากร"
                            >
                              🪪 พาสปอร์ต
                            </button>
                            {isAdmin && p.records[0] && (
                              <button
                                type="button"
                                onClick={() => onOpenDutyRecord(p.records[0])}
                                className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="บันทึกการปฏิบัติหน้าที่ (Admin)"
                              >
                                + บันทึกงาน
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View Cards (Optimized for Phones) */}
          <div className="block md:hidden divide-y divide-gray-100">
            {pagedPersons.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <span className="text-3xl">🔍</span>
                <p className="mt-2 text-sm font-semibold">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>
                <p className="text-xs text-gray-400 mt-0.5">ลองปรับคำค้นหา หรือรีเซ็ตตัวกรองด้านบน</p>
              </div>
            ) : (
              pagedPersons.map((p, index) => {
                const globalIndex = startIndex + index + 1;
                return (
                  <div key={p.personnelId || globalIndex} className="p-4 bg-white hover:bg-blue-50/20 transition-colors space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#16265E] to-[#2563eb] font-bold text-white text-xs shadow-xs">
                          {p.name.replace(/^(นาย|นางสาว|นาง|ดร\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.)\s*/, "").slice(0, 2)}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => onOpenPassport(p.personnelId)}
                            className="text-left font-bold text-[#16265E] hover:underline text-sm leading-snug cursor-pointer"
                          >
                            {p.name}
                          </button>
                          <p className="text-[11px] text-gray-500 font-mono">
                            #{globalIndex} · รหัส {p.personnelId} · {p.firstYearBE === p.latestYearBE ? p.latestYearBE : `${p.firstYearBE} – ${p.latestYearBE}`}
                          </p>
                        </div>
                      </div>
                      {p.status === "active" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active ({p.totalDuties})
                        </span>
                      ) : p.status === "pending_verification" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          รอตรวจ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 shrink-0">
                          ไม่มีบันทึก
                        </span>
                      )}
                    </div>

                    {/* Affiliation & Group */}
                    <div className="rounded-xl bg-gray-50/80 p-2.5 text-xs text-gray-700 space-y-1 border border-gray-100">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] text-gray-500">สังกัด / กลุ่มหน่วยงาน:</span>
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-semibold border ${getGroupBadgeClass(p.affiliationGroup)}`}>
                          {p.affiliationGroup || "หน่วยงานภายนอก"}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-800 line-clamp-2">
                        🏛️ {p.affiliation}
                      </p>
                    </div>

                    {/* Courses */}
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-500 font-medium">หลักสูตรที่สำเร็จ ({p.records.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {p.records.map((r) => (
                          <span key={r.id} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#16265E] border border-blue-200">
                            <span>🏅</span>
                            <span>{r.courseTitle}</span>
                            <span className="text-gray-400 font-normal">({r.yearBE})</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      {onOpenDigitalPass && (
                        <button
                          type="button"
                          onClick={() => onOpenDigitalPass(p.personnelId)}
                          className="flex-1 rounded-lg bg-amber-50 py-1.5 text-xs font-bold text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors text-center cursor-pointer shadow-2xs"
                        >
                          📱 บัตรดิจิทัล
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenPassport(p.personnelId)}
                        className="flex-1 rounded-lg bg-[#16265E] py-1.5 text-xs font-semibold text-white hover:bg-[#1e3a8a] transition-colors text-center cursor-pointer shadow-2xs"
                      >
                        🪪 ดูพาสปอร์ต
                      </button>
                      {isAdmin && p.records[0] && (
                        <button
                          type="button"
                          onClick={() => onOpenDutyRecord(p.records[0])}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="บันทึกการปฏิบัติหน้าที่ (Admin)"
                        >
                          + บันทึกงาน
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* ================= MODE 2: CERTIFICATION RECORDS VIEW ================= */
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#16265E] text-white">
                <tr>
                  <th className="py-3 px-3.5 font-bold">#</th>
                  <th className="py-3 px-3.5 font-bold">บุคลากรกีฬา</th>
                  <th className="py-3 px-3.5 font-bold">
                    <div className="flex items-center gap-1.5">
                      <span>กลุ่มหน่วยงาน</span>
                      {isAdmin && (
                        <span className="text-[10px] font-normal text-blue-200 bg-blue-900/60 px-1.5 py-0.2 rounded border border-blue-400/40">
                          แก้ไขได้ ✎
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3.5 font-bold">ชื่อสมาคม / หน่วยงาน</th>
                  <th className="py-3 px-3.5 font-bold">หลักสูตรที่สำเร็จ</th>
                  <th className="py-3 px-3.5 font-bold">ปี พ.ศ.</th>
                  <th className="py-3 px-3.5 font-bold">สถานะการทำหน้าที่</th>
                  <th className="py-3 px-3.5 font-bold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      <span className="text-3xl">🔍</span>
                      <p className="mt-2 text-sm font-semibold">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>
                      <p className="text-xs text-gray-400 mt-0.5">ลองปรับคำค้นหา หรือรีเซ็ตตัวกรองด้านบน</p>
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((t, index) => {
                    const globalIndex = startIndex + index + 1;
                    const identifier = t.personnelId || t.idCard;

                    return (
                      <tr
                        key={t.id || globalIndex}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        <td className="py-3 px-3.5 text-gray-400 font-mono">{globalIndex}</td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#16265E] to-[#2563eb] font-bold text-white text-[11px] shadow-xs">
                              {t.name.replace(/^(นาย|นางสาว|นาง|ดร\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.)\s*/, "").slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onOpenPassport(identifier)}
                                  className="font-bold text-[#16265E] hover:underline text-left cursor-pointer"
                                >
                                  {t.name}
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenPassport(identifier)}
                                    className="text-gray-400 hover:text-[#16265E] text-xs p-0.5 rounded cursor-pointer transition-colors"
                                    title="แก้ไขข้อมูลบุคลากร (Admin)"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 font-mono">
                                {t.personnelId ? `รหัส ${t.personnelId}` : identifier}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 min-w-[190px]">
                          {editingGroupPersonId === t.id ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in-50 duration-150">
                              <select
                                value={editingGroupValue}
                                onChange={(e) => setEditingGroupValue(e.target.value)}
                                className="rounded-lg border border-[#16265E] bg-white px-2 py-1 text-xs font-semibold text-gray-800 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#16265E]/30"
                                autoFocus
                              >
                                {AFFILIATION_GROUPS.map((grp) => (
                                  <option key={grp} value={grp}>
                                    {grp}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSaveGroup(t.personnelId || t.id, t.name)}
                                className="h-7 w-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                                title="บันทึกการแก้ไข (Enter)"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditGroup}
                                className="h-7 w-7 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                                title="ยกเลิก"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/grp">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${getGroupBadgeClass(
                                  t.affiliationGroup
                                )}`}
                              >
                                {t.affiliationGroup || "หน่วยงานภายนอก"}
                              </span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditGroup(t.id, t.name, t.affiliationGroup || "หน่วยงานภายนอก")}
                                  className="rounded p-1 text-gray-400 hover:text-[#16265E] hover:bg-blue-50 transition-all cursor-pointer text-xs"
                                  title="แก้ไขกลุ่มหน่วยงาน (Admin)"
                                >
                                  ✎
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          <p className="font-semibold text-gray-800 max-w-xs line-clamp-2" title={t.affiliation}>
                            {t.affiliation}
                          </p>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#16265E] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              {t.courseTitle}
                            </span>
                            {t.courseCategory && (
                              <span className="text-[10px] text-gray-500">
                                ({t.courseCategory})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">{t.batch}</p>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-bold text-[#16265E]">{t.yearBE}</span>
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
                            {onOpenDigitalPass && (
                              <button
                                type="button"
                                onClick={() => onOpenDigitalPass(identifier)}
                                className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                title="เปิดบัตรประจำตัวบุคลากรกีฬาดิจิทัล"
                              >
                                📱 บัตรดิจิทัล
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenPassport(identifier)}
                              className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#16265E] hover:bg-blue-100 transition-colors cursor-pointer"
                              title="ดูพาสปอร์ตประวัติบุคลากร"
                            >
                              🪪 พาสปอร์ต
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => onOpenDutyRecord(t)}
                                className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="บันทึกการปฏิบัติหน้าที่ (Admin)"
                              >
                                + บันทึกงาน
                              </button>
                            )}
                            {isAdmin && onDeleteTrainee && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `ต้องการลบรายการของ "${t.name}" หลักสูตร "${t.courseTitle}" (รหัส ${t.id}) ออกจากระบบใช่หรือไม่?\n\n* ข้อมูลจะถูกลบออกจากฐานข้อมูลทันที`
                                    )
                                  ) {
                                    onDeleteTrainee(t.id);
                                    setToastMessage(`ลบรายการของ "${t.name}" (${t.courseTitle}) เรียบร้อยแล้ว`);
                                  }
                                }}
                                className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                                title="ลบรายการวุฒิบัตรนี้ (Admin)"
                              >
                                🗑️ ลบ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View Cards Mode 2 (Optimized for Phones) */}
          <div className="block md:hidden divide-y divide-gray-100">
            {pagedRecords.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <span className="text-3xl">🔍</span>
                <p className="mt-2 text-sm font-semibold">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>
                <p className="text-xs text-gray-400 mt-0.5">ลองปรับคำค้นหา หรือรีเซ็ตตัวกรองด้านบน</p>
              </div>
            ) : (
              pagedRecords.map((t, index) => {
                const globalIndex = startIndex + index + 1;
                const identifier = t.personnelId || t.idCard || t.id;
                return (
                  <div key={t.id} className="p-4 bg-white hover:bg-blue-50/20 transition-colors space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#16265E] to-[#2563eb] font-bold text-white text-xs shadow-xs">
                          {t.name.slice(0, 2)}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => onOpenPassport(identifier)}
                            className="text-left font-bold text-[#16265E] hover:underline text-sm leading-snug cursor-pointer"
                          >
                            {t.name}
                          </button>
                          <p className="text-[11px] text-gray-500 font-mono">
                            #{globalIndex} · {t.personnelId ? `รหัส ${t.personnelId}` : identifier}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-[#16265E] shrink-0">
                        พ.ศ. {t.yearBE}
                      </span>
                    </div>

                    {/* Course Info */}
                    <div className="rounded-xl bg-blue-50/70 p-2.5 text-xs text-blue-900 border border-blue-100 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold">{t.courseTitle}</span>
                        {t.courseCategory && (
                          <span className="text-[10px] text-gray-500">
                            ({t.courseCategory})
                          </span>
                        )}
                      </div>
                      {t.certNo && (
                        <p className="text-[11px] text-gray-500 font-mono">
                          วุฒิบัตร: {t.certNo}
                        </p>
                      )}
                    </div>

                    {/* Affiliation */}
                    <div className="text-xs text-gray-600 flex items-center justify-between gap-2">
                      <span className="truncate">🏛️ {t.affiliation}</span>
                      <span className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-semibold border ${getGroupBadgeClass(t.affiliationGroup)}`}>
                        {t.affiliationGroup || "หน่วยงานภายนอก"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      {onOpenDigitalPass && (
                        <button
                          type="button"
                          onClick={() => onOpenDigitalPass(identifier)}
                          className="flex-1 rounded-lg bg-amber-50 py-1.5 text-xs font-bold text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors text-center cursor-pointer shadow-2xs"
                        >
                          📱 บัตรดิจิทัล
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenPassport(identifier)}
                        className="flex-1 rounded-lg bg-[#16265E] py-1.5 text-xs font-semibold text-white hover:bg-[#1e3a8a] transition-colors text-center cursor-pointer shadow-2xs"
                      >
                        🪪 ดูพาสปอร์ต
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onOpenDutyRecord(t)}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="บันทึกการปฏิบัติหน้าที่ (Admin)"
                        >
                          + บันทึกงาน
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
        </div>

        {/* Pagination Bar */}
        {(activeItemsCount > pageSize || activeItemsCount > 10) && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 bg-gray-50/70 text-xs">
            <div className="flex items-center gap-2 text-gray-600">
              <span>แสดงแถวต่อหน้า:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 font-semibold"
              >
                <option value={10}>10 รายชื่อ</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
              <span>(หน้า {safePage} จาก {totalPages})</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                « หน้าแรก
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ‹ ก่อนหน้า
              </button>
              <span className="px-2 font-bold text-[#16265E]">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ถัดไป ›
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                หน้าสุดท้าย »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin PIN Unlock Modal */}
      {showPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                🔒
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">ยืนยันสิทธิ์ผู้ดูแลระบบ (Admin)</h4>
                <p className="text-xs text-gray-500">
                  {pinAction === "cleansing"
                    ? "กรอกรหัส PIN เพื่อเปิดเครื่องมือจัดระเบียบข้อมูล"
                    : "กรอกรหัส PIN เพื่อปลดล็อกสิทธิ์ปรับแก้กลุ่มหน่วยงาน"}
                </p>
              </div>
            </div>
            <form onSubmit={handleUnlockPin} className="mt-4 space-y-3">
              <div>
                <input
                  type="password"
                  placeholder="รหัส PIN 6 หลัก (มาตรฐาน: 336699)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-center text-sm font-mono tracking-widest focus:border-[#16265E] focus:outline-hidden"
                  autoFocus
                />
                {pinError && <p className="mt-1 text-xs text-rose-600 font-semibold text-center">{pinError}</p>}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinPrompt(false);
                    setPendingEditPerson(null);
                  }}
                  className="rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#16265E] px-4 py-2 text-xs font-bold text-white hover:bg-[#111e4a] cursor-pointer"
                >
                  ปลดล็อกและเริ่มแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data Cleansing Modal */}
      {showCleansingModal && (
        <DataCleansingModal
          trainees={trainees}
          onClose={() => setShowCleansingModal(false)}
        />
      )}

      {/* Executive Top Trainees Ranking (Hall of Fame) Modal */}
      {isTopTraineesModalOpen && (
        <TopTraineesModal
          onClose={() => setIsTopTraineesModalOpen(false)}
          uniquePersons={uniquePersons}
          onOpenPassport={onOpenPassport}
          onOpenDigitalPass={onOpenDigitalPass || (() => {})}
        />
      )}
    </div>
  );
}
