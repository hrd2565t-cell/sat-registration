"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { PAST_YEARS_BE, type HistoricalTrainee } from "@/lib/alumni-store";
import {
  useNationalAssociationsStore,
  type NationalAssociationMasterItem,
} from "@/lib/associations-store";
import {
  computeNationalAssociationCoverage,
  computeProvincialAssociationCoverage,
  type PDPAProtectedTraineeItem,
} from "@/lib/association-coverage";
import type { ThaiRegionKey } from "@/lib/provinces";
import { AssociationCoveragePrintModal } from "./association-coverage-print-modal";

interface AssociationCoverageSectionProps {
  id?: string;
  trainees: HistoricalTrainee[];
  isAdmin?: boolean;
}

type CoverageView = "national" | "provincial";
type StatusFilter = "all" | "none" | "low" | "regular";
type SortMode = "order" | "desc" | "asc";

export function AssociationCoverageSection({
  id,
  trainees,
  isAdmin = false,
}: AssociationCoverageSectionProps) {
  const {
    associations: masterAssociations,
    addNationalAssociation,
    updateNationalAssociation,
    deleteNationalAssociation,
    resetNationalAssociationsToDefault,
  } = useNationalAssociationsStore();

  const [activeView, setActiveView] = useState<CoverageView>("national");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [regionFilter, setRegionFilter] = useState<ThaiRegionKey | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("order");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAllRows, setShowAllRows] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const PAGE_SIZE = 20;

  // PDPA-safe Trainee Drilldown Modal
  const [traineeModal, setTraineeModal] = useState<{
    title: string;
    subtitle?: string;
    trainees: PDPAProtectedTraineeItem[];
  } | null>(null);

  // Print Modal
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

  // Admin Master List Manager Modal
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [newAssocName, setNewAssocName] = useState<string>("");
  const [newAssocAliases, setNewAssocAliases] = useState<string>("");
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);
  const [editMasterName, setEditMasterName] = useState<string>("");
  const [editMasterAliases, setEditMasterAliases] = useState<string>("");
  const [masterSearchQuery, setMasterSearchQuery] = useState<string>("");
  const mutatingLockRef = useRef<boolean>(false);

  const parsedYear: number | "all" = yearFilter === "all" ? "all" : Number(yearFilter);

  const nationalResult = useMemo(
    () => computeNationalAssociationCoverage(trainees, masterAssociations, parsedYear),
    [trainees, masterAssociations, parsedYear]
  );

  const provincialResult = useMemo(
    () => computeProvincialAssociationCoverage(trainees, parsedYear),
    [trainees, parsedYear]
  );

  const filteredNationalItems = useMemo(() => {
    let list = nationalResult.items;
    if (statusFilter !== "all") {
      list = list.filter((i) => i.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.officialName.toLowerCase().includes(q) ||
          i.aliases.some((a) => a.toLowerCase().includes(q)) ||
          i.courses.some((c) => c.toLowerCase().includes(q))
      );
    }
    const sorted = [...list];
    if (sortMode === "desc") {
      sorted.sort((a, b) => b.recordCount - a.recordCount || a.orderNo - b.orderNo);
    } else if (sortMode === "asc") {
      sorted.sort((a, b) => a.recordCount - b.recordCount || a.orderNo - b.orderNo);
    } else {
      sorted.sort((a, b) => a.orderNo - b.orderNo);
    }
    return sorted;
  }, [nationalResult.items, statusFilter, searchQuery, sortMode]);

  const filteredProvincialItems = useMemo(() => {
    let list = provincialResult.items;
    if (regionFilter !== "all") {
      list = list.filter((i) => i.region === regionFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((i) => i.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.officialName.toLowerCase().includes(q) ||
          i.provinceName.toLowerCase().includes(q) ||
          i.regionNameTh.toLowerCase().includes(q) ||
          i.courses.some((c) => c.toLowerCase().includes(q))
      );
    }
    const sorted = [...list];
    if (sortMode === "desc") {
      sorted.sort(
        (a, b) => b.recordCount - a.recordCount || a.provinceName.localeCompare(b.provinceName, "th")
      );
    } else if (sortMode === "asc") {
      sorted.sort(
        (a, b) => a.recordCount - b.recordCount || a.provinceName.localeCompare(b.provinceName, "th")
      );
    } else {
      sorted.sort((a, b) => a.provinceName.localeCompare(b.provinceName, "th"));
    }
    return sorted;
  }, [provincialResult.items, regionFilter, statusFilter, searchQuery, sortMode]);

  const currentItemsLength =
    activeView === "national" ? filteredNationalItems.length : filteredProvincialItems.length;
  const totalPages = showAllRows ? 1 : Math.max(1, Math.ceil(currentItemsLength / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pagedNationalItems = useMemo(() => {
    if (showAllRows) return filteredNationalItems;
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredNationalItems.slice(start, start + PAGE_SIZE);
  }, [filteredNationalItems, safePage, showAllRows]);

  const pagedProvincialItems = useMemo(() => {
    if (showAllRows) return filteredProvincialItems;
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProvincialItems.slice(start, start + PAGE_SIZE);
  }, [filteredProvincialItems, safePage, showAllRows]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const yearText = yearFilter === "all" ? "ทุกปี_2547_2569" : `พศ_${yearFilter}`;

    const summarySheet = [
      {
        หมวดหมู่: `สมาคมกีฬาแห่งประเทศไทย (${nationalResult.summary.totalMaster} สมาคม)`,
        จำนวนทั้งหมด: nationalResult.summary.totalMaster,
        เคยส่งเข้าอบรมแล้ว: nationalResult.summary.participatedCount,
        ยังไม่มีประวัติ: nationalResult.summary.neverSentCount,
        "ร้อยละความครอบคลุม (%)": `${nationalResult.summary.coveragePercent}%`,
        "จำนวนอบรมสะสม (คน-ครั้ง)": nationalResult.summary.totalRecords,
        "บุคลากรเดี่ยวจริง (คน)": nationalResult.summary.totalUniquePeople,
      },
      {
        หมวดหมู่: "สมาคมกีฬาแห่งจังหวัด (77 จังหวัด)",
        จำนวนทั้งหมด: provincialResult.summary.totalMaster,
        เคยส่งเข้าอบรมแล้ว: provincialResult.summary.participatedCount,
        ยังไม่มีประวัติ: provincialResult.summary.neverSentCount,
        "ร้อยละความครอบคลุม (%)": `${provincialResult.summary.coveragePercent}%`,
        "จำนวนอบรมสะสม (คน-ครั้ง)": provincialResult.summary.totalRecords,
        "บุคลากรเดี่ยวจริง (คน)": provincialResult.summary.totalUniquePeople,
      },
    ];

    const natRows = nationalResult.items.map((item) => ({
      ลำดับ: item.orderNo,
      ชื่อสมาคมกีฬาแห่งประเทศไทย: item.officialName,
      "จำนวนอบรม (คน-ครั้ง)": item.recordCount,
      "บุคลากรจริง (คน)": item.uniquePeopleCount,
      ปีล่าสุดที่ส่งอบรม: item.latestYearBE ? `พ.ศ. ${item.latestYearBE}` : "-",
      หลักสูตรที่เคยเข้าอบรม: item.courses.join(", ") || "-",
      สถานะ:
        item.status === "none"
          ? "ยังไม่มีประวัติในระบบ (0 คน)"
          : item.status === "low"
          ? "ส่งน้อย (1–5 คน-ครั้ง)"
          : "ส่งต่อเนื่อง",
    }));

    const natZeroRows = nationalResult.neverSentItems.map((item, idx) => ({
      ลำดับ: idx + 1,
      เลขทะเบียน: item.orderNo,
      ชื่อสมาคมกีฬาแห่งประเทศไทย: item.officialName,
      หมายเหตุ: "ยังไม่มีประวัติการส่งบุคลากรเข้าอบรมในฐานข้อมูล กกท.",
    }));

    const provRows = provincialResult.items.map((item, idx) => ({
      ลำดับ: idx + 1,
      สมาคมกีฬาแห่งจังหวัด: item.officialName,
      จังหวัด: item.provinceName,
      ภูมิภาค: item.regionNameTh,
      "จำนวนอบรม (คน-ครั้ง)": item.recordCount,
      "บุคลากรจริง (คน)": item.uniquePeopleCount,
      ปีล่าสุดที่ส่งอบรม: item.latestYearBE ? `พ.ศ. ${item.latestYearBE}` : "-",
      หลักสูตรที่เคยเข้าอบรม: item.courses.join(", ") || "-",
      สถานะ:
        item.status === "none"
          ? "ยังไม่มีประวัติในระบบ (0 คน)"
          : item.status === "low"
          ? "ส่งน้อย (1–5 คน-ครั้ง)"
          : "ส่งต่อเนื่อง",
    }));

    const provZeroRows = provincialResult.neverSentItems.map((item, idx) => ({
      ลำดับ: idx + 1,
      สมาคมกีฬาแห่งจังหวัด: item.officialName,
      ภูมิภาค: item.regionNameTh,
      หมายเหตุ: "ยังไม่มีประวัติการส่งบุคลากรในนามสมาคมกีฬาแห่งจังหวัด",
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), "สรุปภาพรวม");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(natRows), "สมาคมกีฬาแห่งประเทศไทย");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(natZeroRows), "สมาคมฯ ยังไม่พบประวัติ");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(provRows), "สมาคมกีฬาแห่งจังหวัด");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(provZeroRows), "จังหวัด ยังไม่พบประวัติ");

    XLSX.writeFile(
      wb,
      `SAT_Association_Coverage_${yearText}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Master List Admin Handlers (with synchronous useRef Click Lock)
  const handleAddMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (mutatingLockRef.current) return;
    const clean = newAssocName.replace(/\s+/g, " ").trim();
    if (!clean) return;
    mutatingLockRef.current = true;
    try {
      const aliases = newAssocAliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      addNationalAssociation(clean, aliases);
      setNewAssocName("");
      setNewAssocAliases("");
    } finally {
      mutatingLockRef.current = false;
    }
  };

  const handleStartEditMaster = (item: NationalAssociationMasterItem) => {
    setEditingMasterId(item.id);
    setEditMasterName(item.name);
    setEditMasterAliases((item.aliases || []).join(", "));
  };

  const handleSaveEditMaster = (id: string) => {
    if (mutatingLockRef.current) return;
    const clean = editMasterName.replace(/\s+/g, " ").trim();
    if (!clean) return;
    mutatingLockRef.current = true;
    try {
      const aliases = editMasterAliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      updateNationalAssociation(id, { name: clean, aliases });
      setEditingMasterId(null);
    } finally {
      mutatingLockRef.current = false;
    }
  };

  const handleDeleteMaster = (item: NationalAssociationMasterItem) => {
    if (mutatingLockRef.current) return;
    if (!confirm(`ยืนยันการลบ "${item.name}" ออกจากทะเบียนมาตรฐานหรือไม่?`)) return;
    mutatingLockRef.current = true;
    try {
      deleteNationalAssociation(item.id);
    } finally {
      mutatingLockRef.current = false;
    }
  };

  const handleResetMaster = () => {
    if (mutatingLockRef.current) return;
    if (!confirm("ต้องการคืนค่ารายชื่อสมาคมกีฬาแห่งประเทศไทยกลับเป็นทะเบียนมาตรฐาน 93 สมาคมใช่หรือไม่?")) {
      return;
    }
    mutatingLockRef.current = true;
    try {
      resetNationalAssociationsToDefault();
    } finally {
      mutatingLockRef.current = false;
    }
  };

  const filteredMasterForManage = useMemo(() => {
    if (!masterSearchQuery.trim()) return masterAssociations;
    const q = masterSearchQuery.trim().toLowerCase();
    return masterAssociations.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.aliases && m.aliases.some((a) => a.toLowerCase().includes(q)))
    );
  }, [masterAssociations, masterSearchQuery]);

  const activeSummary =
    activeView === "national" ? nationalResult.summary : provincialResult.summary;
  const activeNeverSentList =
    activeView === "national" ? nationalResult.neverSentItems : provincialResult.neverSentItems;

  return (
    <section
      id={id}
      className="rounded-2xl border border-blue-200 bg-white p-5 sm:p-6 shadow-xs space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-[#16265E]">
              Association Coverage Tracker
            </span>
            <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              {nationalResult.summary.totalMaster} สมาคมฯ + 77 จังหวัด
            </span>
          </div>
          <h3 className="mt-2 text-lg sm:text-xl font-black text-[#16265E]">
            🏛️ ความครอบคลุมการส่งบุคลากร: สมาคมกีฬาแห่งประเทศไทย และสมาคมกีฬาแห่งจังหวัด
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            ตรวจสอบยอดส่งเข้าอบรมสะสม รายชื่อสมาคมที่ยังไม่พบประวัติในระบบ (0 คน) เพื่อเชิญชวนพัฒนาศักยภาพร่วมกับ กกท.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-semibold">ช่วงปี:</span>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 focus:border-[#16265E] focus:outline-hidden"
            >
              <option value="all">ทุกปี พ.ศ. (2547 – 2569)</option>
              {PAST_YEARS_BE.map((yr) => (
                <option key={yr} value={yr}>
                  พ.ศ. {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <span>📊</span>
            <span>ส่งออก Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#16265E] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#111e4a] transition-colors cursor-pointer"
          >
            <span>🖨️</span>
            <span>พิมพ์รายงาน A4</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-900 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <span>⚙️</span>
              <span>จัดการทะเบียน {masterAssociations.length} สมาคม</span>
            </button>
          )}
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveView("national");
            setRegionFilter("all");
            setPage(1);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
            activeView === "national"
              ? "bg-[#16265E] text-white border-[#16265E] shadow-xs"
              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50"
          }`}
        >
          <span>🏛️</span>
          <span>สมาคมกีฬาแห่งประเทศไทย ({nationalResult.summary.totalMaster})</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              activeView === "national"
                ? "bg-white/20 text-white"
                : "bg-blue-100 text-[#16265E]"
            }`}
          >
            {nationalResult.summary.participatedCount} / {nationalResult.summary.totalMaster} (
            {nationalResult.summary.coveragePercent}%)
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveView("provincial");
            setPage(1);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
            activeView === "provincial"
              ? "bg-emerald-800 text-white border-emerald-800 shadow-xs"
              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50"
          }`}
        >
          <span>🗺️</span>
          <span>สมาคมกีฬาแห่งจังหวัด (77 จังหวัด)</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              activeView === "provincial"
                ? "bg-white/20 text-white"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {provincialResult.summary.participatedCount} / {provincialResult.summary.totalMaster} (
            {provincialResult.summary.coveragePercent}%)
          </span>
        </button>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
          <p className="text-[11px] font-bold text-gray-500">
            {activeView === "national" ? "สมาคมกีฬาฯ ในทะเบียน" : "จังหวัดทั้งหมดทั่วประเทศ"}
          </p>
          <p className="mt-1 text-2xl font-black text-[#16265E]">
            {activeSummary.totalMaster}{" "}
            <span className="text-xs font-medium text-gray-500">
              {activeView === "national" ? "สมาคม" : "จังหวัด"}
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <p className="text-[11px] font-bold text-emerald-900">เคยส่งบุคลากรเข้าอบรมแล้ว</p>
          <p className="mt-1 text-2xl font-black text-emerald-700">
            {activeSummary.participatedCount}{" "}
            <span className="text-sm font-bold text-emerald-600">
              ({activeSummary.coveragePercent}%)
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setStatusFilter((prev) => (prev === "none" ? "all" : "none"));
            setPage(1);
          }}
          className={`text-left rounded-xl border p-3.5 transition-all cursor-pointer ${
            statusFilter === "none"
              ? "border-amber-500 bg-amber-100/70 ring-2 ring-amber-300"
              : "border-amber-200 bg-amber-50/60 hover:bg-amber-100/50"
          }`}
          title="คลิกเพื่อกรองเฉพาะกลุ่มที่ยังไม่มีประวัติ (0 คน)"
        >
          <p className="text-[11px] font-bold text-amber-900">
            ยังไม่มีประวัติในระบบ (คลิกกรอง)
          </p>
          <p className="mt-1 text-2xl font-black text-amber-800">
            {activeSummary.neverSentCount}{" "}
            <span className="text-xs font-medium text-amber-700">
              {activeView === "national" ? "สมาคม (0 คน)" : "จังหวัด (0 คน)"}
            </span>
          </p>
        </button>

        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
          <p className="text-[11px] font-bold text-blue-900">จำนวนผู้เข้าอบรมกลุ่มนี้</p>
          <p className="mt-1 text-2xl font-black text-[#16265E]">
            {activeSummary.totalRecords.toLocaleString()}{" "}
            <span className="text-xs font-medium text-gray-600">
              คน-ครั้ง ({activeSummary.totalUniquePeople.toLocaleString()} คนจริง)
            </span>
          </p>
        </div>
      </div>

      {/* Zero-History Target Callout Box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/45 p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📣</span>
            <h4 className="text-xs sm:text-sm font-bold text-amber-950">
              {activeView === "national"
                ? `สมาคมกีฬาแห่งประเทศไทยที่ยังไม่มีประวัติในระบบ (${activeNeverSentList.length} สมาคม)`
                : `สมาคมกีฬาแห่งจังหวัดที่ยังไม่มีประวัติในระบบ (${activeNeverSentList.length} จังหวัด)`}
            </h4>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 border border-amber-200">
            กลุ่มเป้าหมายที่พร้อมเชิญชวนเพิ่มเติม
          </span>
        </div>

        {activeNeverSentList.length === 0 ? (
          <p className="text-xs font-semibold text-emerald-700">
            ✅ ครอบคลุมครบ 100% ในช่วงเวลาที่เลือกแล้ว
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeNeverSentList.map((item) => {
              const label =
                "officialName" in item ? item.officialName : "";
              const key = "id" in item ? item.id : item.provinceId;
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-amber-950 shadow-2xs"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{label}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 5-Region Breakdown (Provincial view only) */}
      {activeView === "provincial" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {provincialResult.regionSummary.map((r) => {
            const active = regionFilter === r.region;
            return (
              <button
                key={r.region}
                type="button"
                onClick={() => {
                  setRegionFilter((prev) => (prev === r.region ? "all" : r.region));
                  setPage(1);
                }}
                className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${
                  active
                    ? "border-[#16265E] bg-blue-50 ring-2 ring-blue-200"
                    : "border-gray-200 bg-gray-50/70 hover:bg-gray-100/70"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#16265E]">
                  <span>{r.regionNameTh}</span>
                  <span className="font-mono">{r.coveragePercent}%</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1">
                  ส่งแล้ว {r.participatedProvinces}/{r.totalProvinces} จ. (รวม {r.totalRecords} ครั้ง)
                </p>
                {r.neverSentProvinces > 0 && (
                  <p className="text-[10.5px] font-semibold text-amber-700 mt-0.5">
                    ยังไม่มีประวัติ {r.neverSentProvinces} จ.
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              { key: "all", label: "ทั้งหมด" },
              { key: "none", label: "ยังไม่มีประวัติ (0 คน)" },
              { key: "low", label: "ส่งน้อย (1–5 ครั้ง)" },
              { key: "regular", label: "ส่งต่อเนื่อง (>5 ครั้ง)" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setStatusFilter(f.key);
                setPage(1);
              }}
              className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors cursor-pointer ${
                statusFilter === f.key
                  ? "bg-[#16265E] text-white shadow-2xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}

          {activeView === "provincial" && regionFilter !== "all" && (
            <button
              type="button"
              onClick={() => {
                setRegionFilter("all");
                setPage(1);
              }}
              className="rounded-lg bg-blue-100 px-2.5 py-1.5 font-bold text-[#16265E] cursor-pointer hover:bg-blue-200"
            >
              ล้างตัวกรองภูมิภาค ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={sortMode}
            onChange={(e) => {
              setSortMode(e.target.value as SortMode);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
          >
            <option value="order">เรียงตามลำดับทะเบียน (ก-ฮ / 1-93)</option>
            <option value="desc">เรียงยอดอบรม: มาก → น้อย</option>
            <option value="asc">เรียงยอดอบรม: น้อย → มาก (เน้น 0)</option>
          </select>

          <div className="relative flex-1 sm:w-56">
            <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาชื่อสมาคม, จังหวัด, หลักสูตร..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-7 text-xs focus:border-[#16265E] focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Coverage Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#16265E] text-white">
            <tr>
              <th className="py-2.5 px-3 text-center w-12 font-bold">#</th>
              <th className="py-2.5 px-3 font-bold">
                {activeView === "national" ? "ชื่อสมาคมกีฬาแห่งประเทศไทย" : "สมาคมกีฬาแห่งจังหวัด"}
              </th>
              {activeView === "provincial" && (
                <th className="py-2.5 px-3 font-bold w-32">ภูมิภาค</th>
              )}
              <th className="py-2.5 px-3 text-center font-bold w-28">จำนวน (คน-ครั้ง)</th>
              <th className="py-2.5 px-3 text-center font-bold w-24">คนจริง (คน)</th>
              <th className="py-2.5 px-3 text-center font-bold w-24">ปีล่าสุด</th>
              <th className="py-2.5 px-3 font-bold">หลักสูตรที่เคยเข้าอบรม</th>
              <th className="py-2.5 px-3 text-center font-bold w-36">สถานะ</th>
              <th className="py-2.5 px-3 text-center font-bold w-24">รายชื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeView === "national" &&
              (pagedNationalItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    ไม่พบรายชื่อสมาคมกีฬาแห่งประเทศไทยที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                pagedNationalItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.recordCount === 0
                        ? "bg-amber-50/35 hover:bg-amber-50/70"
                        : "hover:bg-blue-50/40"
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono text-gray-500">
                      {item.orderNo}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-gray-900">{item.officialName}</p>
                      {item.aliases.length > 0 && (
                        <p className="text-[10.5px] text-gray-400 mt-0.5">
                          ชื่อเดิม/ชื่อรองที่รวมนับ: {item.aliases.join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-[#16265E]">
                      {item.recordCount}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-gray-700">
                      {item.uniquePeopleCount}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-gray-600">
                      {item.latestYearBE ? `พ.ศ. ${item.latestYearBE}` : "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.courses.length === 0 ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {item.courses.slice(0, 4).map((c) => (
                            <span
                              key={c}
                              className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#16265E] border border-blue-100"
                            >
                              {c}
                            </span>
                          ))}
                          {item.courses.length > 4 && (
                            <span className="text-[10px] text-gray-500">
                              +{item.courses.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.status === "none" ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-900 border border-amber-200">
                          ยังไม่มีประวัติ (0 คน)
                        </span>
                      ) : item.status === "low" ? (
                        <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-[10.5px] font-bold text-sky-900 border border-sky-200">
                          ส่งน้อย (1–5 ครั้ง)
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-800 border border-emerald-200">
                          ส่งต่อเนื่อง
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.recordCount > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setTraineeModal({
                              title: item.officialName,
                              subtitle: `ส่งเข้าอบรมแล้ว ${item.recordCount} คน-ครั้ง (${item.uniquePeopleCount} บุคลากรจริง)`,
                              trainees: item.trainees,
                            })
                          }
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#16265E] hover:bg-blue-100 cursor-pointer"
                        >
                          ดูรายชื่อ
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ))}

            {activeView === "provincial" &&
              (pagedProvincialItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    ไม่พบรายชื่อจังหวัดที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                pagedProvincialItems.map((item, idx) => (
                  <tr
                    key={item.provinceId}
                    className={`transition-colors ${
                      item.recordCount === 0
                        ? "bg-amber-50/35 hover:bg-amber-50/70"
                        : "hover:bg-blue-50/40"
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono text-gray-500">
                      {(safePage - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                      {item.officialName}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{item.regionNameTh}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-[#16265E]">
                      {item.recordCount}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-gray-700">
                      {item.uniquePeopleCount}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-gray-600">
                      {item.latestYearBE ? `พ.ศ. ${item.latestYearBE}` : "-"}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.courses.length === 0 ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {item.courses.slice(0, 4).map((c) => (
                            <span
                              key={c}
                              className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 border border-emerald-100"
                            >
                              {c}
                            </span>
                          ))}
                          {item.courses.length > 4 && (
                            <span className="text-[10px] text-gray-500">
                              +{item.courses.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.status === "none" ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-900 border border-amber-200">
                          ยังไม่มีประวัติ (0 คน)
                        </span>
                      ) : item.status === "low" ? (
                        <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-[10.5px] font-bold text-sky-900 border border-sky-200">
                          ส่งน้อย (1–5 ครั้ง)
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-800 border border-emerald-200">
                          ส่งต่อเนื่อง
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.recordCount > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setTraineeModal({
                              title: item.officialName,
                              subtitle: `${item.regionNameTh} · ส่งเข้าอบรมแล้ว ${item.recordCount} คน-ครั้ง (${item.uniquePeopleCount} บุคลากรจริง)`,
                              trainees: item.trainees,
                            })
                          }
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100 cursor-pointer"
                        >
                          ดูรายชื่อ
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination & Toggle All */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
        <span>
          แสดง{" "}
          <strong>
            {currentItemsLength === 0
              ? 0
              : showAllRows
              ? `1–${currentItemsLength}`
              : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                  safePage * PAGE_SIZE,
                  currentItemsLength
                )}`}
          </strong>{" "}
          จากทั้งหมด <strong>{currentItemsLength}</strong> รายการ
        </span>

        <div className="flex items-center gap-1.5">
          {currentItemsLength > PAGE_SIZE && (
            <button
              type="button"
              onClick={() => {
                setShowAllRows((prev) => !prev);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              {showAllRows ? "แบ่งหน้าละ 20 รายการ" : `แสดงทั้งหมด (${currentItemsLength})`}
            </button>
          )}

          {!showAllRows && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 font-semibold disabled:opacity-40 cursor-pointer"
              >
                ‹ ก่อนหน้า
              </button>
              <span className="px-2 font-mono font-bold">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 font-semibold disabled:opacity-40 cursor-pointer"
              >
                ถัดไป ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Supplementary Scope Disclosures (PDPA & Exact Rules) */}
      {activeView === "national" &&
        (nationalResult.professionalAssociations.length > 0 ||
          nationalResult.excludedCustomAssociations.length > 0) && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-[11.5px] text-gray-700 space-y-2">
            <p className="font-bold text-[#16265E]">
              📌 ข้อมูลเพิ่มเติมที่แยกนับออกนอกทะเบียน {nationalResult.summary.totalMaster} สมาคมกีฬาแห่งประเทศไทย:
            </p>
            {nationalResult.professionalAssociations.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700">สมาคมกีฬาอาชีพ:</span>
                {nationalResult.professionalAssociations.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() =>
                      setTraineeModal({
                        title: p.name,
                        subtitle: `สมาคมกีฬาอาชีพ (แยกจากทะเบียน ${nationalResult.summary.totalMaster} สมาคม) · ${p.recordCount} คน-ครั้ง`,
                        trainees: p.trainees,
                      })
                    }
                    className="rounded-md bg-white border border-slate-300 px-2 py-0.5 text-[11px] font-medium hover:bg-blue-50 cursor-pointer"
                  >
                    {p.name} ({p.recordCount} ครั้ง)
                  </button>
                ))}
              </div>
            )}
            {nationalResult.excludedCustomAssociations.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700">
                  สมาคม/ชมรมภายใน กกท. (คงชื่อเดิม ไม่รวมเป็นสมาคมกีฬาแห่งประเทศไทย):
                </span>
                {nationalResult.excludedCustomAssociations.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() =>
                      setTraineeModal({
                        title: p.name,
                        subtitle: `แยกสังกัดตามประเภทหน่วยงานจริง · ${p.recordCount} คน-ครั้ง`,
                        trainees: p.trainees,
                      })
                    }
                    className="rounded-md bg-white border border-slate-300 px-2 py-0.5 text-[11px] font-medium hover:bg-blue-50 cursor-pointer"
                  >
                    {p.name} ({p.recordCount} ครั้ง)
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      {activeView === "provincial" && provincialResult.excludedDisabilityAssociations.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-[11.5px] text-gray-700 space-y-1.5">
          <p className="font-bold text-[#16265E]">
            📌 สมาคมกีฬาคนพิการระดับจังหวัด (คงชื่อเดิม แยกออกจากการนับรวมสมาคมกีฬาแห่งจังหวัด 77 จังหวัด):
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {provincialResult.excludedDisabilityAssociations.map((d) => (
              <button
                key={d.name}
                type="button"
                onClick={() =>
                  setTraineeModal({
                    title: d.name,
                    subtitle: `สมาคมกีฬาคนพิการจังหวัด (แยกจาก 77 สมาคมกีฬาแห่งจังหวัด) · ${d.recordCount} คน-ครั้ง`,
                    trainees: d.trainees,
                  })
                }
                className="rounded-md bg-white border border-slate-300 px-2 py-0.5 text-[11px] font-medium hover:bg-blue-50 cursor-pointer"
              >
                {d.name} ({d.recordCount} ครั้ง)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDPA-Safe Trainee Modal */}
      {traineeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[88vh] rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            <div className="bg-[#16265E] text-white p-4 sm:p-5 flex items-start justify-between gap-3">
              <div>
                <span className="rounded bg-white/15 px-2 py-0.5 text-[10.5px] font-semibold text-blue-100">
                  รายชื่อผู้ผ่านการอบรม (คุ้มครองข้อมูลส่วนบุคคล PDPA)
                </span>
                <h4 className="mt-1.5 text-base font-bold">{traineeModal.title}</h4>
                {traineeModal.subtitle && (
                  <p className="text-xs text-blue-200 mt-0.5">{traineeModal.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTraineeModal(null)}
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="py-2 px-2.5 text-center w-10">#</th>
                    <th className="py-2 px-2.5">ชื่อ-นามสกุล</th>
                    <th className="py-2 px-2.5">สังกัดที่บันทึก</th>
                    <th className="py-2 px-2.5">หลักสูตร</th>
                    <th className="py-2 px-2.5 text-center">ปี พ.ศ.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {traineeModal.trainees.map((t, idx) => (
                    <tr key={`${t.recordId}-${idx}`} className="hover:bg-blue-50/40">
                      <td className="py-2 px-2.5 text-center font-mono text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-gray-900">
                        {t.name}
                        {t.personnelId && (
                          <span className="ml-1.5 text-[10px] font-mono text-gray-400">
                            ({t.personnelId})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-gray-600">{t.affiliation}</td>
                      <td className="py-2 px-2.5">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#16265E] border border-blue-100">
                          {t.courseTitle}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono font-semibold text-gray-700">
                        {t.yearBE}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex items-center justify-between text-xs text-gray-500">
              <span>แสดงข้อมูลเฉพาะชื่อ-สังกัด-หลักสูตร-ปี พ.ศ. ตามหลัก PDPA</span>
              <button
                type="button"
                onClick={() => setTraineeModal(null)}
                className="rounded-xl bg-[#16265E] px-4 py-1.5 font-bold text-white hover:bg-[#111e4a] cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {isPrintOpen && (
        <AssociationCoveragePrintModal
          onClose={() => setIsPrintOpen(false)}
          nationalResult={nationalResult}
          provincialResult={provincialResult}
          selectedYear={yearFilter}
          initialScope={activeView === "national" ? "both" : "provincial"}
        />
      )}

      {/* Admin Master List Manager Modal */}
      {isAdmin && isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            <div className="bg-[#16265E] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold">
                  ⚙️ จัดการทะเบียนมาตรฐานสมาคมกีฬาแห่งประเทศไทย ({masterAssociations.length} สมาคม)
                </h4>
                <p className="text-xs text-blue-200 mt-0.5">
                  ข้อมูลที่แก้ไขจะซิงก์ขึ้น Supabase Cloud ให้ทุกอุปกรณ์อัตโนมัติ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Add New Form */}
            <form
              onSubmit={handleAddMaster}
              className="p-4 bg-blue-50/50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs"
            >
              <input
                type="text"
                placeholder="ชื่อสมาคมกีฬาแห่งประเทศไทยใหม่..."
                value={newAssocName}
                onChange={(e) => setNewAssocName(e.target.value)}
                required
                className="sm:col-span-6 rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-[#16265E] focus:outline-hidden"
              />
              <input
                type="text"
                placeholder="ชื่อเดิม/ชื่อรองคั่นด้วย , (ถ้ามี)"
                value={newAssocAliases}
                onChange={(e) => setNewAssocAliases(e.target.value)}
                className="sm:col-span-4 rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-[#16265E] focus:outline-hidden"
              />
              <button
                type="submit"
                className="sm:col-span-2 rounded-lg bg-[#16265E] px-3 py-2 font-bold text-white hover:bg-[#111e4a] cursor-pointer"
              >
                + เพิ่มสมาคม
              </button>
            </form>

            {/* Search & List */}
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2 text-xs bg-gray-50">
              <input
                type="text"
                placeholder="ค้นหาในทะเบียนสมาคม..."
                value={masterSearchQuery}
                onChange={(e) => setMasterSearchQuery(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 focus:border-[#16265E] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleResetMaster}
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer shrink-0"
              >
                🔄 คืนค่าเริ่มต้น 93 สมาคม
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100 text-xs">
              {filteredMasterForManage.map((item) => {
                const isEditing = editingMasterId === item.id;
                return (
                  <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                    {isEditing ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editMasterName}
                          onChange={(e) => setEditMasterName(e.target.value)}
                          className="rounded-lg border border-blue-400 px-2.5 py-1.5"
                        />
                        <input
                          type="text"
                          placeholder="ชื่อรองคั่นด้วย ,"
                          value={editMasterAliases}
                          onChange={(e) => setEditMasterAliases(e.target.value)}
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5"
                        />
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">
                          <span className="font-mono text-gray-400 mr-2">{item.orderNo}.</span>
                          {item.name}
                        </p>
                        {item.aliases && item.aliases.length > 0 && (
                          <p className="text-[11px] text-gray-500 pl-6">
                            ชื่อรอง: {item.aliases.join(", ")}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveEditMaster(item.id)}
                            className="rounded bg-emerald-600 px-2.5 py-1 font-bold text-white cursor-pointer"
                          >
                            บันทึก
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMasterId(null)}
                            className="rounded border border-gray-300 px-2.5 py-1 text-gray-600 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditMaster(item)}
                            className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-100 cursor-pointer"
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMaster(item)}
                            className="rounded border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            ลบ
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="rounded-xl bg-[#16265E] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#111e4a] cursor-pointer"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
