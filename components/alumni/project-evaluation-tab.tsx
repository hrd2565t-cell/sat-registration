"use client";

import { useState, useMemo } from "react";
import type { HistoricalTrainee, QualitativeHighlight } from "@/lib/alumni-store";
import {
  computeEvaluationStats,
  computeCourseAffiliationMatrix,
  computeAnnualCohortStats,
  computeYearCohortSummary,
  updateCourseCategory,
  saveCourseTarget,
  getTargetForCourse,
  PAST_YEARS_BE,
  KNOWLEDGE_DIMENSIONS,
  AFFILIATION_GROUPS,
} from "@/lib/alumni-store";
import { loginAdmin } from "@/lib/admin-auth";
import * as XLSX from "xlsx";

interface ProjectEvaluationTabProps {
  trainees: HistoricalTrainee[];
  isAdmin?: boolean;
}

export function ProjectEvaluationTab({ trainees, isAdmin = false }: ProjectEvaluationTabProps) {
  const stats = useMemo(() => computeEvaluationStats(trainees), [trainees]);

  const [matrixYearFilter, setMatrixYearFilter] = useState<string>("all");
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<string>("all");

  // Inline Quick Edit Category State
  const [editingCourseTitle, setEditingCourseTitle] = useState<string | null>(null);
  const [editCategorySelect, setEditCategorySelect] = useState<string>("ผู้บริหารกีฬา");
  const [customCategoryInput, setCustomCategoryInput] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Target Editing State
  const [editingTargetCourse, setEditingTargetCourse] = useState<string | null>(null);
  const [editingTargetValue, setEditingTargetValue] = useState<number>(40);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Admin PIN Unlock Dialog State
  const [showPinPrompt, setShowPinPrompt] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<
    | { type: "category"; courseTitle: string; category: string }
    | { type: "target"; courseTitle: string; target: number }
    | null
  >(null);

  // Cohort Modal & Search State
  const [isCohortListModalOpen, setIsCohortListModalOpen] = useState<boolean>(false);
  const [cohortModalTab, setCohortModalTab] = useState<"new" | "returning">("new");
  const [cohortSearchQuery, setCohortSearchQuery] = useState<string>("");

  // Dynamic categories from actual trainee data
  const allCategories = useMemo(() => {
    const set = new Set<string>(["ผู้บริหารกีฬา", "ผู้ฝึกสอนกีฬา", "อื่นๆ"]);
    trainees.forEach((t) => {
      if (t.courseCategory) set.add(t.courseCategory);
    });
    return Array.from(set);
  }, [trainees]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleStartEdit = (courseTitle: string, currentCategory: string) => {
    if (!isAdmin) {
      setPendingAction({ type: "category", courseTitle, category: currentCategory });
      setShowPinPrompt(true);
      setPinInput("");
      setPinError("");
      return;
    }

    setEditingCourseTitle(courseTitle);
    if (["ผู้บริหารกีฬา", "ผู้ฝึกสอนกีฬา", "อื่นๆ"].includes(currentCategory)) {
      setEditCategorySelect(currentCategory);
      setIsCustomMode(false);
      setCustomCategoryInput("");
    } else {
      setEditCategorySelect("__custom__");
      setIsCustomMode(true);
      setCustomCategoryInput(currentCategory);
    }
  };

  const handleSaveCategory = (courseTitle: string) => {
    const finalCategory = isCustomMode ? customCategoryInput.trim() : editCategorySelect;
    if (!finalCategory) {
      alert("กรุณาระบุชื่อประเภทหลักสูตร");
      return;
    }

    const count = updateCourseCategory(courseTitle, finalCategory);
    setEditingCourseTitle(null);
    setIsCustomMode(false);
    showToast(`✅ ปรับประเภทหลักสูตร "${courseTitle}" เป็น "${finalCategory}" สำเร็จ (อัปเดตข้อมูล ${count} รายการ)`);
  };

  const handleCancelEdit = () => {
    setEditingCourseTitle(null);
    setIsCustomMode(false);
  };

  const handleStartEditTarget = (courseTitle: string, currentTarget: number) => {
    if (!isAdmin) {
      setPendingAction({ type: "target", courseTitle, target: currentTarget });
      setShowPinPrompt(true);
      setPinInput("");
      setPinError("");
      return;
    }

    setEditingTargetCourse(courseTitle);
    setEditingTargetValue(currentTarget);
  };

  const handleSaveTarget = (courseTitle: string) => {
    if (editingTargetValue <= 0) {
      alert("กรุณาระบุค่าเป้าหมายที่มากกว่า 0");
      return;
    }

    saveCourseTarget(
      courseTitle,
      editingTargetValue,
      matrixYearFilter === "all" ? "all" : Number(matrixYearFilter)
    );
    setEditingTargetCourse(null);
    showToast(`✅ บันทึกค่าเป้าหมายหลักสูตร "${courseTitle}" เป็น ${editingTargetValue} คน สำเร็จ`);
  };

  const handleCancelEditTarget = () => {
    setEditingTargetCourse(null);
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(pinInput.trim())) {
      setShowPinPrompt(false);
      setPinError("");
      if (pendingAction?.type === "category") {
        setEditingCourseTitle(pendingAction.courseTitle);
        if (["ผู้บริหารกีฬา", "ผู้ฝึกสอนกีฬา", "อื่นๆ"].includes(pendingAction.category)) {
          setEditCategorySelect(pendingAction.category);
          setIsCustomMode(false);
        } else {
          setEditCategorySelect("__custom__");
          setIsCustomMode(true);
          setCustomCategoryInput(pendingAction.category);
        }
      } else if (pendingAction?.type === "target") {
        setEditingTargetCourse(pendingAction.courseTitle);
        setEditingTargetValue(pendingAction.target);
      }
      setPendingAction(null);
    } else {
      setPinError("รหัส PIN ไม่ถูกต้อง (รหัสเริ่มต้น: 336699)");
    }
  };

  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case "ผู้บริหารกีฬา":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ผู้ฝึกสอนกีฬา":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "อื่นๆ":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
  };

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

  const matrixData = useMemo(() => {
    const rawMatrix = computeCourseAffiliationMatrix(
      trainees,
      matrixYearFilter === "all" ? "all" : Number(matrixYearFilter)
    );
    if (matrixCategoryFilter === "all") return rawMatrix;
    return rawMatrix.filter((r) => r.category === matrixCategoryFilter);
  }, [trainees, matrixYearFilter, matrixCategoryFilter]);

  // Totals for matrix footer
  const matrixTotals = useMemo(() => {
    const totals = {
      "สมาคมกีฬาแห่งประเทศไทย": 0,
      "การกีฬาแห่งประเทศไทย": 0,
      "สมาคมกีฬาแห่งจังหวัด": 0,
      "หน่วยงานภายนอก": 0,
      grandTotal: 0,
      grandTarget: 0,
    };
    matrixData.forEach((row) => {
      totals["สมาคมกีฬาแห่งประเทศไทย"] += row.groups["สมาคมกีฬาแห่งประเทศไทย"] || 0;
      totals["การกีฬาแห่งประเทศไทย"] += row.groups["การกีฬาแห่งประเทศไทย"] || 0;
      totals["สมาคมกีฬาแห่งจังหวัด"] += row.groups["สมาคมกีฬาแห่งจังหวัด"] || 0;
      totals["หน่วยงานภายนอก"] += row.groups["หน่วยงานภายนอก"] || 0;
      totals.grandTotal += row.total;
      totals.grandTarget += row.target;
    });
    return totals;
  }, [matrixData]);

  const overallAchievementRate = useMemo(() => {
    if (matrixTotals.grandTarget === 0) return 0;
    return Math.round((matrixTotals.grandTotal / matrixTotals.grandTarget) * 1000) / 10;
  }, [matrixTotals]);

  // Export Excel specifically for this Matrix Table
  const handleExportMatrixTableExcel = () => {
    const workbook = XLSX.utils.book_new();

    const exportRows: Record<string, string | number>[] = matrixData.map((row, idx) => ({
      ลำดับ: idx + 1,
      ชื่อหลักสูตร: row.courseTitle,
      ประเภทหลักสูตร: row.category,
      "ค่าเป้าหมาย (คน)": row.target,
      "สมาคมกีฬาแห่งประเทศไทย (คน)": row.groups["สมาคมกีฬาแห่งประเทศไทย"] || 0,
      "การกีฬาแห่งประเทศไทย (คน)": row.groups["การกีฬาแห่งประเทศไทย"] || 0,
      "สมาคมกีฬาแห่งจังหวัด (คน)": row.groups["สมาคมกีฬาแห่งจังหวัด"] || 0,
      "หน่วยงานภายนอก (คน)": row.groups["หน่วยงานภายนอก"] || 0,
      "รวมผ่านการอบรมจริง (คน)": row.total,
      "ร้อยละการบรรลุเป้าหมาย (%)": `${row.achievementRate}%`,
      ผลการประเมินเทียบเป้าหมาย:
        row.targetStatus === "achieved"
          ? "บรรลุเป้าหมาย (100% ขึ้นไป)"
          : row.targetStatus === "near"
          ? "ใกล้เคียงเป้าหมาย (80-99%)"
          : "ต่ำกว่าเป้าหมาย (ต่ำกว่า 80%)",
    }));

    // Add Summary Row
    exportRows.push({
      ลำดับ: "",
      ชื่อหลักสูตร: "รวมทั้งสิ้นทุกหลักสูตร",
      ประเภทหลักสูตร: "-",
      "ค่าเป้าหมาย (คน)": matrixTotals.grandTarget,
      "สมาคมกีฬาแห่งประเทศไทย (คน)": matrixTotals["สมาคมกีฬาแห่งประเทศไทย"],
      "การกีฬาแห่งประเทศไทย (คน)": matrixTotals["การกีฬาแห่งประเทศไทย"],
      "สมาคมกีฬาแห่งจังหวัด (คน)": matrixTotals["สมาคมกีฬาแห่งจังหวัด"],
      "หน่วยงานภายนอก (คน)": matrixTotals["หน่วยงานภายนอก"],
      "รวมผ่านการอบรมจริง (คน)": matrixTotals.grandTotal,
      "ร้อยละการบรรลุเป้าหมาย (%)": `${overallAchievementRate}%`,
      ผลการประเมินเทียบเป้าหมาย:
        overallAchievementRate >= 100
          ? "บรรลุเป้าหมายภาพรวม"
          : overallAchievementRate >= 80
          ? "ใกล้เคียงเป้าหมายภาพรวม"
          : "ต่ำกว่าเป้าหมายภาพรวม",
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, ws, "รายงานเมทริกซ์และเป้าหมาย");

    const yearLabel = matrixYearFilter === "all" ? "AllYears" : `Y${matrixYearFilter}`;
    XLSX.writeFile(
      workbook,
      `SAT_Course_Affiliation_Target_Report_${yearLabel}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const handlePrintMatrixReport = () => {
    window.print();
  };

  // Cohort Analytics
  const currentCohortSummary = useMemo(() => {
    return computeYearCohortSummary(
      trainees,
      matrixYearFilter === "all" ? "all" : Number(matrixYearFilter)
    );
  }, [trainees, matrixYearFilter]);

  const annualCohorts = useMemo(() => {
    return computeAnnualCohortStats(trainees);
  }, [trainees]);

  const filteredCohortModalList = useMemo(() => {
    const list =
      cohortModalTab === "new"
        ? currentCohortSummary.newPersonsList
        : currentCohortSummary.returningPersonsList;
    if (!cohortSearchQuery.trim()) return list;
    const q = cohortSearchQuery.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.affiliation.toLowerCase().includes(q) ||
        p.affiliationGroup.toLowerCase().includes(q) ||
        (p.personnelId && p.personnelId.toLowerCase().includes(q)) ||
        p.coursesInYear.some((c) => c.toLowerCase().includes(q))
    );
  }, [cohortModalTab, currentCohortSummary, cohortSearchQuery]);

  // Export Annual Cohort Growth Excel (Point 2)
  const handleExportAnnualCohortExcel = () => {
    const workbook = XLSX.utils.book_new();
    const rows: Record<string, string | number>[] = annualCohorts.map((row) => ({
      "ปีงบประมาณ (พ.ศ.)": row.yearBE,
      "ที่นั่งอบรมรวม (คน-ครั้ง)": row.totalRecords,
      "บุคลากรเดี่ยวจริง (คน)": row.uniquePersons,
      "การอบรมซ้ำในปี (คน-ครั้ง)": row.duplicateEnrollments,
      "บุคลากรหน้าใหม่ (คน)": row.newTrainees,
      "สัดส่วนหน้าใหม่ (%)": `${row.newPercentage}%`,
      "หน้าใหม่ - สมาคมกีฬาฯ": row.newByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0,
      "หน้าใหม่ - กกท.": row.newByGroup["การกีฬาแห่งประเทศไทย"] || 0,
      "หน้าใหม่ - สมาคมกีฬาจังหวัด": row.newByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0,
      "หน้าใหม่ - หน่วยงานภายนอก": row.newByGroup["หน่วยงานภายนอก"] || 0,
      "บุคลากรเดิมต่อยอด (คน)": row.returningTrainees,
      "สัดส่วนเดิมต่อยอด (%)": `${row.returningPercentage}%`,
    }));

    const totalRecordsAll = annualCohorts.reduce((acc, c) => acc + c.totalRecords, 0);
    const uniqueAll = stats.uniquePersonnelCount;
    const newAll = annualCohorts.reduce((acc, c) => acc + c.newTrainees, 0);

    // Summary Row
    rows.push({
      "ปีงบประมาณ (พ.ศ.)": "รวมสะสมทั้งหมด",
      "ที่นั่งอบรมรวม (คน-ครั้ง)": totalRecordsAll,
      "บุคลากรเดี่ยวจริง (คน)": uniqueAll,
      "การอบรมซ้ำในปี (คน-ครั้ง)": totalRecordsAll - uniqueAll,
      "บุคลากรหน้าใหม่ (คน)": newAll,
      "สัดส่วนหน้าใหม่ (%)": "100%",
      "หน้าใหม่ - สมาคมกีฬาฯ": annualCohorts.reduce((a, c) => a + (c.newByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0), 0),
      "หน้าใหม่ - กกท.": annualCohorts.reduce((a, c) => a + (c.newByGroup["การกีฬาแห่งประเทศไทย"] || 0), 0),
      "หน้าใหม่ - สมาคมกีฬาจังหวัด": annualCohorts.reduce((a, c) => a + (c.newByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0), 0),
      "หน้าใหม่ - หน่วยงานภายนอก": annualCohorts.reduce((a, c) => a + (c.newByGroup["หน่วยงานภายนอก"] || 0), 0),
      "บุคลากรเดิมต่อยอด (คน)": totalRecordsAll - newAll,
      "สัดส่วนเดิมต่อยอด (%)": "-",
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, ws, "ภาพรวมบุคลากรเดี่ยวรายปี");
    XLSX.writeFile(
      workbook,
      `SAT_Annual_Trainee_Cohort_Growth_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Export Cohort Trainee List Modal
  const handleExportCohortListExcel = () => {
    const workbook = XLSX.utils.book_new();
    const list =
      cohortModalTab === "new"
        ? currentCohortSummary.newPersonsList
        : currentCohortSummary.returningPersonsList;
    const label = cohortModalTab === "new" ? "บุคลากรหน้าใหม่" : "บุคลากรเดิมต่อยอด";
    const yearLabel = matrixYearFilter === "all" ? "ทุกปีงบประมาณ" : `ปี_พศ_${matrixYearFilter}`;

    const rows: Record<string, string | number>[] = list.map((p, idx) => ({
      ลำดับ: idx + 1,
      รหัสประจำตัว: p.personnelId || p.idCard,
      คำนำหน้า: p.prefix || "",
      "ชื่อ-นามสกุล": p.name,
      กลุ่มสังกัด: p.affiliationGroup,
      "หน่วยงาน/สมาคม": p.affiliation,
      หลักสูตรที่เข้าอบรมในปีนี้: p.coursesInYear.join(", "),
      ปีแรกที่เข้าสู่ระบบ: `พ.ศ. ${p.firstYearBE}`,
      จำนวนหลักสูตรสะสมทั้งหมด: p.totalCoursesAllTime,
      สถานะ: cohortModalTab === "new" ? "บุคลากรหน้าใหม่" : "ศิษย์เก่าพัฒนาต่อยอด",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, ws, label);
    XLSX.writeFile(
      workbook,
      `SAT_${label}_${yearLabel}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const handleExportEvaluationReport = () => {
    // 1. Summary sheet
    const summarySheetData = [
      { ตัวชี้วัด: "จำนวนประวัติการอบรมทั้งหมด (รายการ)", ค่าสถิติ: stats.totalTrainees },
      { ตัวชี้วัด: "จำนวนบุคลากรเดี่ยวแท้จริงในระบบ (คน)", ค่าสถิติ: stats.uniquePersonnelCount },
      { ตัวชี้วัด: "บุคลากรที่ยังปฏิบัติหน้าที่ต่อเนื่อง (Active)", ค่าสถิติ: stats.activeCount },
      { ตัวชี้วัด: "อัตราการนำความรู้ไปปฏิบัติหน้าที่จริง (%)", ค่าสถิติ: `${stats.activeRatePercent}%` },
      { ตัวชี้วัด: "บุคลากรที่รอตรวจสอบการทำหน้าที่ (Pending)", ค่าสถิติ: stats.pendingCount },
      { ตัวชี้วัด: "บุคลากรที่ยังไม่มีประวัติในรอบปี (Inactive)", ค่าสถิติ: stats.inactiveCount },
      { ตัวชี้วัด: "จำนวนครั้งการลงสนามปฏิบัติหน้าที่สะสม", ค่าสถิติ: stats.totalDutiesReported },
      { ตัวชี้วัด: "ดัชนีประสิทธิผลการนำความรู้ไปใช้ (คะแนนเต็ม 5)", ค่าสถิติ: stats.averageImpactRating },
    ];

    // 2. By Affiliation Group sheet (4 main groups)
    const groupSheetData = stats.byAffiliationGroup.map((g, idx) => ({
      ลำดับ: idx + 1,
      กลุ่มหน่วยงาน: g.name,
      จำนวนรายการ: g.count,
      สัดส่วน: `${g.percent}%`,
      จำนวนที่ยังปฏิบัติหน้าที่: g.activeCount,
      "อัตรา Active (%)": `${g.count > 0 ? Math.round((g.activeCount / g.count) * 100) : 0}%`,
    }));

    // 3. Course x Affiliation Matrix Sheet
    const fullMatrix = computeCourseAffiliationMatrix(trainees, "all");
    const matrixSheetData = fullMatrix.map((row, idx) => ({
      ลำดับ: idx + 1,
      ชื่อหลักสูตร: row.courseTitle,
      ประเภทหลักสูตร: row.category,
      "สมาคมกีฬาแห่งประเทศไทย (คน)": row.groups["สมาคมกีฬาแห่งประเทศไทย"] || 0,
      "สัดส่วน สมาคมกีฬาฯ (%)": `${row.percentByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0}%`,
      "การกีฬาแห่งประเทศไทย (คน)": row.groups["การกีฬาแห่งประเทศไทย"] || 0,
      "สัดส่วน กกท. (%)": `${row.percentByGroup["การกีฬาแห่งประเทศไทย"] || 0}%`,
      "สมาคมกีฬาแห่งจังหวัด (คน)": row.groups["สมาคมกีฬาแห่งจังหวัด"] || 0,
      "สัดส่วน สมาคมจังหวัด (%)": `${row.percentByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0}%`,
      "หน่วยงานภายนอก (คน)": row.groups["หน่วยงานภายนอก"] || 0,
      "สัดส่วน ภายนอก (%)": `${row.percentByGroup["หน่วยงานภายนอก"] || 0}%`,
      "รวมทั้งหมด (คน)": row.total,
    }));

    // 4. By Course Category sheet
    const categorySheetData = stats.byCourseCategory.map((c, idx) => ({
      ลำดับ: idx + 1,
      ประเภทหลักสูตร: c.name,
      จำนวนรายการ: c.count,
      สัดส่วน: `${c.percent}%`,
      จำนวนที่ยังปฏิบัติหน้าที่: c.activeCount,
      "อัตรา Active (%)": `${c.count > 0 ? Math.round((c.activeCount / c.count) * 100) : 0}%`,
    }));

    // 5. By Course sheet (17 courses)
    const courseSheetData = stats.byCourse.map((c, idx) => ({
      ลำดับ: idx + 1,
      ชื่อหลักสูตร: c.name,
      ประเภทหลักสูตร: c.category || "-",
      จำนวนผู้ผ่านการอบรม: c.count,
      "อัตราการนำไปใช้จริง (Active %)": `${c.activeRate}%`,
    }));

    // 6. Knowledge Transfer & Applied Knowledge sheet (Kirkpatrick Level 3)
    const knowledgeSheetData = stats.qualitativeHighlights.map((q, idx) => ({
      ลำดับ: idx + 1,
      ชื่อบุคลากร: q.traineeName,
      สังกัดหรือหน่วยงาน: q.sportsType,
      หลักสูตรที่สำเร็จ: q.courseTitle,
      การแข่งขันหรือกิจกรรมที่ปฏิบัติหน้าที่: q.eventName,
      บทบาทหน้าที่: q.role,
      มิติความรู้ที่นำไปใช้: q.dimensions
        .map((d) => KNOWLEDGE_DIMENSIONS.find((k) => k.key === d)?.label.split(" (")[0] || d)
        .join(", "),
      "การนำความรู้ไปใช้จริง (คำตอบผู้รับการอบรม)": q.text,
      "ระดับประสิทธิผล (1-5 ดาว)": q.rating,
    }));

    const workbook = XLSX.utils.book_new();
    const s1 = XLSX.utils.json_to_sheet(summarySheetData);
    const s2 = XLSX.utils.json_to_sheet(groupSheetData);
    const s3 = XLSX.utils.json_to_sheet(matrixSheetData);
    const s4 = XLSX.utils.json_to_sheet(categorySheetData);
    const s5 = XLSX.utils.json_to_sheet(courseSheetData);
    const s6 = XLSX.utils.json_to_sheet(knowledgeSheetData);

    XLSX.utils.book_append_sheet(workbook, s1, "สรุปภาพรวมโครงการ");
    XLSX.utils.book_append_sheet(workbook, s2, "จำแนกตามกลุ่มหน่วยงาน");
    XLSX.utils.book_append_sheet(workbook, s3, "เมทริกซ์หลักสูตรแยกกลุ่ม");
    XLSX.utils.book_append_sheet(workbook, s4, "จำแนกตามประเภทหลักสูตร");
    XLSX.utils.book_append_sheet(workbook, s5, "ประสิทธิผลรายหลักสูตร");
    XLSX.utils.book_append_sheet(workbook, s6, "การนำความรู้ไปใช้จริง");

    XLSX.writeFile(
      workbook,
      `SAT_Project_Evaluation_Report_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const [selectedDimensionFilter, setSelectedDimensionFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredHighlights = useMemo(() => {
    if (selectedDimensionFilter === "all") return stats.qualitativeHighlights;
    return stats.qualitativeHighlights.filter((q) =>
      q.dimensions.includes(selectedDimensionFilter)
    );
  }, [stats.qualitativeHighlights, selectedDimensionFilter]);

  const handleCopyQuote = (q: QualitativeHighlight) => {
    const textToCopy = `"${q.text}"\n— ${q.traineeName} (${q.role}, ${q.sportsType}) | หลักสูตร ${q.courseTitle}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maxTraineeYear = useMemo(() => {
    return Math.max(...Object.values(stats.traineesByYear), 1);
  }, [stats.traineesByYear]);

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#16265E] to-[#1e3a8a] p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-blue-400/10 blur-2xl" />
        <div className="pointer-events-none absolute right-40 top-0 h-32 w-32 rounded-full bg-amber-400/10 blur-xl" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#f59e0b] px-2.5 py-0.5 text-xs font-bold text-[#1e1b4b]">
                รายงานผลสัมฤทธิ์ระดับนโยบาย กกท.
              </span>
              <span className="rounded-md bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-blue-100">
                ข้อมูลย้อนหลัง 23 ปี (พ.ศ. 2547 - 2569)
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
              แดชบอร์ดการประเมินผลโครงการพัฒนาบุคลากรกีฬา
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-blue-100/80">
              วิเคราะห์ความคุ้มค่าและผลสัมฤทธิ์ของการจัดอบรม จากฐานข้อมูลจริง 2,732 รายการ (1,891 บุคลากรเดี่ยวแท้จริง)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportEvaluationReport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#16265E] shadow-sm hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <span>📊</span>
              <span>ส่งออกรายงานประเมินผล (Excel 6 แผ่น)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">ประวัติการอบรมทั้งหมด</span>
            <span className="rounded-full bg-blue-50 p-2 text-blue-700">📜</span>
          </div>
          <p className="mt-2 text-3xl font-black text-[#16265E]">
            {stats.totalTrainees.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            บุคลากรเดี่ยวแท้จริง: <strong className="text-[#16265E] font-bold">{stats.uniquePersonnelCount.toLocaleString()}</strong> ท่าน
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">อัตราการนำไปใช้จริง</span>
            <span className="rounded-full bg-emerald-50 p-2 text-emerald-700">🎯</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-emerald-700">{stats.activeRatePercent}%</p>
            <span className="text-xs font-semibold text-emerald-600">Active</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            บุคลากรที่ปฏิบัติหน้าที่ต่อเนื่อง: {stats.activeCount.toLocaleString()} รายการ
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">การลงสนามปฏิบัติหน้าที่</span>
            <span className="rounded-full bg-amber-50 p-2 text-amber-700">🏃</span>
          </div>
          <p className="mt-2 text-3xl font-black text-amber-800">
            {stats.totalDutiesReported.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            ครั้งที่มีการบันทึกรายงานในระบบ กกท.
          </p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">ดัชนีประสิทธิผล (Level 3)</span>
            <span className="rounded-full bg-purple-50 p-2 text-purple-700">⭐</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-purple-800">{stats.averageImpactRating}</p>
            <span className="text-xs font-semibold text-gray-500">/ 5.0</span>
          </div>
          <p className="mt-1 text-xs text-emerald-700 font-semibold">
            ระดับดีเลิศ (Kirkpatrick Impact)
          </p>
        </div>
      </div>

      {/* 23-Year Annual Historical Trend */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#16265E] flex items-center gap-2">
              <span>📈 สถิติการจัดอบรมย้อนหลัง 23 ปี (พ.ศ. 2547 - 2569)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              แสดงจำนวนบุคลากรที่สำเร็จการอบรมในแต่ละปีงบประมาณ
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block h-3 w-3 rounded-xs bg-[#16265E]" />
            <span>จำนวนผู้ผ่านการอบรม (คน)</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex items-end gap-2.5 min-w-[760px] pt-4 h-48 px-2">
            {PAST_YEARS_BE.slice()
              .reverse()
              .map((year) => {
                const traineeCount = stats.traineesByYear[year] || 0;
                const dutyCount = stats.dutiesByYear[year] || 0;
                const heightPercent = maxTraineeYear > 0 ? Math.round((traineeCount / maxTraineeYear) * 100) : 0;

                return (
                  <div
                    key={year}
                    className="flex-1 flex flex-col items-center group relative cursor-pointer"
                  >
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] rounded-md px-2 py-1 pointer-events-none whitespace-nowrap z-10 shadow-md">
                      พ.ศ. {year}: {traineeCount} คน {dutyCount > 0 ? `(${dutyCount} หน้าที่)` : ""}
                    </div>

                    <span className="text-[10px] font-bold text-[#16265E] mb-1">
                      {traineeCount > 0 ? traineeCount : ""}
                    </span>

                    <div className="w-full flex justify-center items-end h-28">
                      <div
                        className="w-full max-w-[24px] rounded-t-md bg-[#16265E] group-hover:bg-blue-600 transition-all"
                        style={{ height: `${Math.max(traineeCount > 0 ? 8 : 2, heightPercent)}%` }}
                      />
                    </div>

                    <span className="mt-2 text-[10px] font-medium text-gray-500 transform -rotate-45 origin-left sm:rotate-0 sm:origin-center">
                      '{String(year).slice(2)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: รายงานผลหลักสูตร แยกจำนวนคนตามกลุ่มหน่วยงาน (Course x Affiliation Matrix) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-blue-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-[#16265E]">
                รายงานเจาะลึกกลุ่มเป้าหมาย (Cross-Tabulation Matrix)
              </span>
            </div>
            <h3 className="mt-1.5 text-lg font-black text-[#16265E]">
              🏛️ รายงานผลหลักสูตร แยกจำนวนคนตามกลุ่มหน่วยงาน
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              แสดงภาพกว้างของแต่ละหลักสูตรว่ามีกลุ่มหน่วยงานใดเข้ามาฝึกอบรม พร้อมสัดส่วนการกระจายตัว
            </p>
          </div>

          {/* Filters and Actions for Matrix */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 text-[11px] font-semibold">ประเภท:</span>
                <select
                  value={matrixCategoryFilter}
                  onChange={(e) => setMatrixCategoryFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white p-1.5 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
                >
                  <option value="all">ทุกสายวิชาชีพ ({allCategories.length} กลุ่ม)</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 text-[11px] font-semibold">ปีงบประมาณ:</span>
                <select
                  value={matrixYearFilter}
                  onChange={(e) => setMatrixYearFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white p-1.5 text-xs text-gray-700 focus:border-[#16265E] focus:outline-hidden"
                >
                  <option value="all">ทุกปี พ.ศ. (2547 - 2569 • 17 หลักสูตร)</option>
                  {PAST_YEARS_BE.map((y) => {
                    const stat = yearStatsMap.get(y);
                    const info = stat && stat.traineeCount > 0
                      ? ` (${stat.courseCount} หลักสูตร • ${stat.traineeCount} คน)`
                      : " (ไม่มีจัดอบรม)";
                    return (
                      <option key={y} value={y}>
                        พ.ศ. {y}{info}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Export Buttons for this specific table */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportMatrixTableExcel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
                title="ดาวน์โหลดตารางเมทริกซ์และเป้าหมายนี้เป็นไฟล์ Excel (.xlsx)"
              >
                <span>📊</span>
                <span>ออกรายงาน Excel</span>
              </button>
              <button
                type="button"
                onClick={handlePrintMatrixReport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
                title="สั่งพิมพ์รายงานหน้านี้ (Print / Save as PDF)"
              >
                <span>🖨️</span>
                <span>พิมพ์รายงาน / PDF</span>
              </button>
            </div>
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

        {/* ========================================================================= */}
        {/* POINT 1: แถบสรุปดัชนีชี้วัดบุคลากรเดี่ยวแท้จริง & บุคลากรหน้าใหม่ (Cohort Metric Strip) */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-slate-50/60 p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-blue-200/60 pb-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#16265E] text-white text-sm shadow-xs">
                👤
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-[#16265E]">
                    สรุปข้อมูลบุคลากรเดี่ยวแท้จริง {matrixYearFilter === "all" ? "(รวมสะสมทุกปีงบประมาณ)" : `ประจำปีงบประมาณ พ.ศ. ${matrixYearFilter}`}
                  </h4>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                    Cohort Analysis
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  นับตามบุคคลจริง (Distinct Individuals) ตัดการนับซ้ำ เพื่อสะท้อนการขยายตัวของบุคลากรหน้าใหม่ที่เพิ่มขึ้นในแต่ละปี
                </p>
              </div>
            </div>

            {/* Quick Action Buttons to view lists */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCohortModalTab("new");
                  setCohortSearchQuery("");
                  setIsCohortListModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs cursor-pointer transition-colors"
                title="คลิกเพื่อดูรายชื่อบุคลากรหน้าใหม่ทั้งหมดในปีนี้"
              >
                <span>🌱 ดูรายชื่อบุคลากรหน้าใหม่ ({currentCohortSummary.newCount.toLocaleString()} คน)</span>
              </button>
              {currentCohortSummary.returningCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCohortModalTab("returning");
                    setCohortSearchQuery("");
                    setIsCohortListModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 px-3 py-1.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  title="คลิกเพื่อดูรายชื่อศิษย์เก่าเดิมที่กลับมาอบรมเพิ่ม"
                >
                  <span>🔄 ศิษย์เก่าต่อยอด ({currentCohortSummary.returningCount.toLocaleString()} คน)</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Unique Individuals */}
            <div className="rounded-xl border border-blue-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase">👥 บุคลากรเดี่ยวแท้จริง</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-[#16265E]">
                  บุคคลจริง
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#16265E]">{currentCohortSummary.uniquePersons.toLocaleString()}</span>
                <span className="text-xs font-medium text-gray-500">คน</span>
              </div>
              <div className="mt-2 text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-1.5">
                <span>จากยอดอบรม {currentCohortSummary.totalRecords.toLocaleString()} คน-ครั้ง</span>
                <span className={`font-semibold ${currentCohortSummary.duplicateEnrollments > 0 ? "text-amber-600" : "text-gray-400"}`}>
                  {currentCohortSummary.duplicateEnrollments > 0 ? `ซ้ำ ${currentCohortSummary.duplicateEnrollments} ที่นั่ง` : "ไม่มีซ้ำ"}
                </span>
              </div>
            </div>

            {/* Card 2: New Trainees */}
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">🆕 บุคลากรหน้าใหม่</span>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                  {currentCohortSummary.newPercentage}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-700">{currentCohortSummary.newCount.toLocaleString()}</span>
                <span className="text-xs font-bold text-emerald-800">คน</span>
              </div>
              <div className="mt-2 text-[11px] text-emerald-700 border-t border-emerald-200/60 pt-1.5 flex items-center justify-between">
                <span>เพิ่งเข้าสู่ระบบ กกท. เป็นครั้งแรก</span>
                <span className="font-extrabold text-emerald-800">+{currentCohortSummary.newCount}</span>
              </div>
            </div>

            {/* Card 3: Returning / Upskill Trainees */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-900 uppercase">🔄 บุคลากรเดิมพัฒนาต่อ</span>
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                  {currentCohortSummary.returningPercentage}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-indigo-800">{currentCohortSummary.returningCount.toLocaleString()}</span>
                <span className="text-xs font-bold text-indigo-900">คน</span>
              </div>
              <div className="mt-2 text-[11px] text-indigo-700 border-t border-indigo-200/60 pt-1.5 flex items-center justify-between">
                <span>ศิษย์เก่ากลับมา Upskill / Reskill</span>
                <span className="font-bold text-indigo-900">{currentCohortSummary.returningCount} คน</span>
              </div>
            </div>

            {/* Card 4: New Trainees Affiliation Distribution */}
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-700">🏛️ สังกัดของบุคลากรหน้าใหม่</span>
                <span className="text-[10px] text-gray-500 font-medium">4 กลุ่มหน่วยงาน</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2 text-[10.5px]">
                <div className="rounded-md bg-blue-50/90 p-1 px-1.5 border border-blue-100">
                  <div className="text-gray-500 text-[10px] truncate">สมาคมกีฬาฯ</div>
                  <div className="font-bold text-blue-700">{currentCohortSummary.newByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0} คน</div>
                </div>
                <div className="rounded-md bg-purple-50/90 p-1 px-1.5 border border-purple-100">
                  <div className="text-gray-500 text-[10px] truncate">กกท.</div>
                  <div className="font-bold text-purple-700">{currentCohortSummary.newByGroup["การกีฬาแห่งประเทศไทย"] || 0} คน</div>
                </div>
                <div className="rounded-md bg-amber-50/90 p-1 px-1.5 border border-amber-100">
                  <div className="text-gray-500 text-[10px] truncate">สมาคม จ.</div>
                  <div className="font-bold text-amber-700">{currentCohortSummary.newByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0} คน</div>
                </div>
                <div className="rounded-md bg-emerald-50/90 p-1 px-1.5 border border-emerald-100">
                  <div className="text-gray-500 text-[10px] truncate">หน่วยภายนอก</div>
                  <div className="font-bold text-emerald-700">{currentCohortSummary.newByGroup["หน่วยงานภายนอก"] || 0} คน</div>
                </div>
              </div>
              {/* Distribution Mini Progress Bar */}
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex mt-2 shadow-inner">
                <div
                  style={{ width: `${currentCohortSummary.newCount > 0 ? ((currentCohortSummary.newByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0) / currentCohortSummary.newCount) * 100 : 0}%` }}
                  className="bg-blue-600 transition-all"
                  title={`สมาคมกีฬาแห่งประเทศไทย: ${currentCohortSummary.newByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0} คน`}
                />
                <div
                  style={{ width: `${currentCohortSummary.newCount > 0 ? ((currentCohortSummary.newByGroup["การกีฬาแห่งประเทศไทย"] || 0) / currentCohortSummary.newCount) * 100 : 0}%` }}
                  className="bg-purple-600 transition-all"
                  title={`การกีฬาแห่งประเทศไทย: ${currentCohortSummary.newByGroup["การกีฬาแห่งประเทศไทย"] || 0} คน`}
                />
                <div
                  style={{ width: `${currentCohortSummary.newCount > 0 ? ((currentCohortSummary.newByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0) / currentCohortSummary.newCount) * 100 : 0}%` }}
                  className="bg-amber-600 transition-all"
                  title={`สมาคมกีฬาแห่งจังหวัด: ${currentCohortSummary.newByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0} คน`}
                />
                <div
                  style={{ width: `${currentCohortSummary.newCount > 0 ? ((currentCohortSummary.newByGroup["หน่วยงานภายนอก"] || 0) / currentCohortSummary.newCount) * 100 : 0}%` }}
                  className="bg-emerald-600 transition-all"
                  title={`หน่วยงานภายนอก: ${currentCohortSummary.newByGroup["หน่วยงานภายนอก"] || 0} คน`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#16265E] text-white">
              <tr>
                <th className="py-3 px-3.5 font-bold">#</th>
                <th className="py-3 px-3.5 font-bold min-w-[170px]">ชื่อหลักสูตร</th>
                <th className="py-3 px-3 font-bold min-w-[140px]">
                  <div className="flex items-center gap-1.5">
                    <span>ประเภท</span>
                    <span className="text-[10px] font-normal text-blue-200 bg-blue-900/60 px-1.5 py-0.2 rounded border border-blue-400/40">
                      แก้ไขได้ ✎
                    </span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center font-bold bg-blue-900/70 border-l border-blue-800 min-w-[110px]">
                  สมาคมกีฬาแห่งประเทศไทย
                </th>
                <th className="py-3 px-3 text-center font-bold bg-purple-900/70 border-l border-blue-800 min-w-[105px]">
                  การกีฬาแห่งประเทศไทย
                </th>
                <th className="py-3 px-3 text-center font-bold bg-amber-900/70 border-l border-blue-800 min-w-[105px]">
                  สมาคมกีฬาแห่งจังหวัด
                </th>
                <th className="py-3 px-3 text-center font-bold bg-emerald-900/70 border-l border-blue-800 min-w-[100px]">
                  หน่วยงานภายนอก
                </th>
                <th className="py-3 px-3 text-center font-bold bg-indigo-950 border-l border-blue-800 min-w-[125px]">
                  <div className="flex items-center justify-center gap-1">
                    <span>ค่าเป้าหมาย (คน)</span>
                    <span className="text-[10px] font-normal text-indigo-300">✎</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center font-black text-amber-300 border-l border-blue-800 min-w-[95px]">
                  ผ่านจริง (คน)
                </th>
                <th className="py-3 px-3 text-center font-bold bg-sky-950 border-l border-blue-800 min-w-[125px]">
                  % บรรลุเป้าหมาย
                </th>
                <th className="py-3 px-3 text-center font-bold min-w-[170px] border-l border-blue-800">
                  สัดส่วนกลุ่มหน่วยงาน (Distribution)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matrixData.map((row, idx) => {
                const satThaiCount = row.groups["สมาคมกีฬาแห่งประเทศไทย"] || 0;
                const satGovCount = row.groups["การกีฬาแห่งประเทศไทย"] || 0;
                const provCount = row.groups["สมาคมกีฬาแห่งจังหวัด"] || 0;
                const outCount = row.groups["หน่วยงานภายนอก"] || 0;

                const satThaiPct = row.percentByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0;
                const satGovPct = row.percentByGroup["การกีฬาแห่งประเทศไทย"] || 0;
                const provPct = row.percentByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0;
                const outPct = row.percentByGroup["หน่วยงานภายนอก"] || 0;

                return (
                  <tr key={row.courseTitle} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3.5 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3.5 font-bold text-[#16265E]">{row.courseTitle}</td>
                    <td className="py-2.5 px-3 min-w-[170px]">
                      {editingCourseTitle === row.courseTitle ? (
                        <div className="flex flex-col gap-1.5 py-1">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={isCustomMode ? "__custom__" : editCategorySelect}
                              onChange={(e) => {
                                if (e.target.value === "__custom__") {
                                  setIsCustomMode(true);
                                } else {
                                  setIsCustomMode(false);
                                  setEditCategorySelect(e.target.value);
                                }
                              }}
                              className="rounded-lg border border-[#16265E] bg-white px-2 py-1 text-xs text-gray-800 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-[#16265E]"
                              autoFocus
                            >
                              <option value="ผู้บริหารกีฬา">👔 ผู้บริหารกีฬา</option>
                              <option value="ผู้ฝึกสอนกีฬา">🏅 ผู้ฝึกสอนกีฬา</option>
                              <option value="อื่นๆ">📁 อื่นๆ</option>
                              <option value="__custom__">➕ กำหนดประเภทใหม่...</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleSaveCategory(row.courseTitle)}
                              className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              title="บันทึกการแก้ไข (Enter)"
                            >
                              ✓
                            </button>

                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                              title="ยกเลิก (Esc)"
                            >
                              ✕
                            </button>
                          </div>

                          {isCustomMode && (
                            <input
                              type="text"
                              placeholder="พิมพ์ชื่อประเภทใหม่..."
                              value={customCategoryInput}
                              onChange={(e) => setCustomCategoryInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveCategory(row.courseTitle);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              className="rounded-lg border border-purple-300 bg-purple-50/50 px-2 py-1 text-xs text-gray-800 focus:border-[#16265E] focus:outline-hidden"
                              autoFocus
                            />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${getCategoryBadgeStyle(
                              row.category
                            )}`}
                          >
                            {row.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(row.courseTitle, row.category)}
                            className="opacity-70 group-hover:opacity-100 hover:bg-blue-100 text-gray-500 hover:text-[#16265E] h-5 w-5 rounded flex items-center justify-center transition-all cursor-pointer text-xs"
                            title="คลิกเพื่อแก้ไขประเภทหลักสูตรนี้"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </td>

                    {/* สมาคมกีฬาแห่งประเทศไทย */}
                    <td className="py-2.5 px-3 text-center border-l border-gray-100">
                      {satThaiCount > 0 ? (
                        <span className="font-bold text-blue-800">
                          {satThaiCount} <span className="text-[10px] text-gray-400 font-normal">({satThaiPct}%)</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* การกีฬาแห่งประเทศไทย */}
                    <td className="py-2.5 px-3 text-center border-l border-gray-100">
                      {satGovCount > 0 ? (
                        <span className="font-bold text-purple-800">
                          {satGovCount} <span className="text-[10px] text-gray-400 font-normal">({satGovPct}%)</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* สมาคมกีฬาแห่งจังหวัด */}
                    <td className="py-2.5 px-3 text-center border-l border-gray-100">
                      {provCount > 0 ? (
                        <span className="font-bold text-amber-800">
                          {provCount} <span className="text-[10px] text-gray-400 font-normal">({provPct}%)</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* หน่วยงานภายนอก */}
                    <td className="py-2.5 px-3 text-center border-l border-gray-100">
                      {outCount > 0 ? (
                        <span className="font-bold text-emerald-800">
                          {outCount} <span className="text-[10px] text-gray-400 font-normal">({outPct}%)</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* ค่าเป้าหมาย (คน) */}
                    <td className="py-2.5 px-3 text-center border-l border-gray-100 bg-indigo-50/20">
                      {editingTargetCourse === row.courseTitle ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={editingTargetValue}
                            onChange={(e) => setEditingTargetValue(Number(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveTarget(row.courseTitle);
                              if (e.key === "Escape") handleCancelEditTarget();
                            }}
                            className="w-16 rounded-md border border-[#16265E] bg-white p-1 text-center text-xs font-bold text-gray-900 focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveTarget(row.courseTitle)}
                            className="rounded-md bg-emerald-600 px-1.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 cursor-pointer"
                            title="บันทึกเป้าหมาย (Enter)"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditTarget}
                            className="rounded-md bg-gray-200 px-1.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-300 cursor-pointer"
                            title="ยกเลิก (Esc)"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 group">
                          <span className="font-bold text-indigo-950 font-mono">
                            {row.target.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartEditTarget(row.courseTitle, row.target)}
                            className="opacity-60 group-hover:opacity-100 hover:bg-indigo-100 text-indigo-700 h-5 w-5 rounded flex items-center justify-center transition-all cursor-pointer text-xs"
                            title="คลิกเพื่อแก้ไขค่าเป้าหมายหลักสูตรนี้"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </td>

                    {/* รวมผ่านจริง (คน) */}
                    <td className="py-2.5 px-3 text-center border-l border-gray-200 font-black text-[#16265E] bg-amber-50/30 font-mono">
                      {row.total.toLocaleString()}
                    </td>

                    {/* % บรรลุเป้าหมาย */}
                    <td className="py-2.5 px-3 text-center border-l border-gray-100 bg-sky-50/20">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-extrabold text-xs text-gray-900 font-mono">
                          {row.achievementRate}%
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.2 text-[9px] font-bold ${
                            row.targetStatus === "achieved"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : row.targetStatus === "near"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {row.targetStatus === "achieved"
                            ? "🟢 บรรลุเป้า"
                            : row.targetStatus === "near"
                            ? "🟡 ใกล้เคียง"
                            : "🔴 ต่ำกว่าเป้า"}
                        </span>
                      </div>
                    </td>

                    {/* Stacked bar visualization */}
                    <td className="py-2.5 px-3 border-l border-gray-100">
                      <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex shadow-2xs">
                        {satThaiPct > 0 && (
                          <div
                            className="bg-blue-600 h-full"
                            style={{ width: `${satThaiPct}%` }}
                            title={`สมาคมกีฬาแห่งประเทศไทย: ${satThaiCount} คน (${satThaiPct}%)`}
                          />
                        )}
                        {satGovPct > 0 && (
                          <div
                            className="bg-purple-600 h-full"
                            style={{ width: `${satGovPct}%` }}
                            title={`กกท.: ${satGovCount} คน (${satGovPct}%)`}
                          />
                        )}
                        {provPct > 0 && (
                          <div
                            className="bg-amber-500 h-full"
                            style={{ width: `${provPct}%` }}
                            title={`สมาคมกีฬาจังหวัด: ${provCount} คน (${provPct}%)`}
                          />
                        )}
                        {outPct > 0 && (
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${outPct}%` }}
                            title={`หน่วยงานภายนอก: ${outCount} คน (${outPct}%)`}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total Footer Row */}
            <tfoot className="bg-gray-100 font-black text-gray-900 border-t-2 border-gray-300 text-xs">
              <tr>
                <td colSpan={3} className="py-3 px-3.5 text-right font-extrabold text-[#16265E]">
                  รวมทั้งสิ้นทุกหลักสูตร:
                </td>
                <td className="py-3 px-3 text-center font-black text-blue-900 border-l border-gray-200">
                  {matrixTotals["สมาคมกีฬาแห่งประเทศไทย"].toLocaleString()} คน
                </td>
                <td className="py-3 px-3 text-center font-black text-purple-900 border-l border-gray-200">
                  {matrixTotals["การกีฬาแห่งประเทศไทย"].toLocaleString()} คน
                </td>
                <td className="py-3 px-3 text-center font-black text-amber-900 border-l border-gray-200">
                  {matrixTotals["สมาคมกีฬาแห่งจังหวัด"].toLocaleString()} คน
                </td>
                <td className="py-3 px-3 text-center font-black text-emerald-900 border-l border-gray-200">
                  {matrixTotals["หน่วยงานภายนอก"].toLocaleString()} คน
                </td>
                <td className="py-3 px-3 text-center font-black text-indigo-950 border-l border-gray-200 bg-indigo-50/50">
                  {matrixTotals.grandTarget.toLocaleString()} คน
                </td>
                <td className="py-3 px-3 text-center font-black text-[#16265E] border-l border-gray-200 bg-amber-50/50">
                  {matrixTotals.grandTotal.toLocaleString()} คน
                </td>
                <td className="py-3 px-3 text-center font-black text-sky-900 border-l border-gray-200 bg-sky-50/50">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{overallAchievementRate}%</span>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                        overallAchievementRate >= 100
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : overallAchievementRate >= 80
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {overallAchievementRate >= 100
                        ? "🟢 บรรลุเป้า"
                        : overallAchievementRate >= 80
                        ? "🟡 ใกล้เคียง"
                        : "🔴 ต่ำกว่าเป้า"}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 border-l border-gray-200">
                  <div className="flex items-center justify-center gap-2 text-[10.5px] font-normal text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-xs bg-blue-600" /> สมาคมฯ
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-xs bg-purple-600" /> กกท.
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-xs bg-amber-500" /> จังหวัด
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-xs bg-emerald-500" /> ภายนอก
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POINT 2: ตารางเปรียบเทียบแนวโน้มรายปี (Year-over-Year Trainee Growth & Cohort Table) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-blue-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                สถิติการเติบโตเชิงลึก (Cohort Growth Analytics)
              </span>
            </div>
            <h3 className="mt-1.5 text-lg font-black text-[#16265E] flex items-center gap-2">
              <span>📈 สรุปภาพรวมและแนวโน้มการเติบโตของบุคลากรรายปี</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              เปรียบเทียบการเพิ่มขึ้นของ &quot;บุคลากรหน้าใหม่&quot; (First-time) ที่เข้าสู่วงการกีฬาในแต่ละปีงบประมาณ เทียบกับ &quot;ศิษย์เก่า&quot; ที่กลับมาพัฒนาทักษะต่อเนื่อง (Upskill / Reskill)
            </p>
          </div>

          {/* Action buttons for Cohort Table */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportAnnualCohortExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
              title="ดาวน์โหลดตารางแนวโน้มบุคลากรรายปีนี้เป็นไฟล์ Excel (.xlsx)"
            >
              <span>📊</span>
              <span>ออกรายงาน Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
              title="สั่งพิมพ์รายงานหน้านี้ (Print / Save as PDF)"
            >
              <span>🖨️</span>
              <span>พิมพ์รายงาน / PDF</span>
            </button>
          </div>
        </div>

        {/* 3 Executive Stat Strips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white text-lg">
              👥
            </div>
            <div>
              <div className="text-[11px] font-bold text-blue-900">บุคลากรเดี่ยวสะสมทั้งระบบ</div>
              <div className="text-xl font-black text-[#16265E]">
                {stats.uniquePersonnelCount.toLocaleString()} <span className="text-xs font-medium text-gray-500">คน</span>
              </div>
              <div className="text-[10px] text-gray-500">จากประวัติอบรมทั้งหมด {stats.totalTrainees.toLocaleString()} คน-ครั้ง</div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white text-lg">
              🌱
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-900">สัดส่วนบุคลากรหน้าใหม่</div>
              <div className="text-xl font-black text-emerald-700">
                {stats.totalTrainees > 0 ? Math.round((stats.uniquePersonnelCount / stats.totalTrainees) * 1000) / 10 : 0}%
              </div>
              <div className="text-[10px] text-emerald-800">บุคลากรที่ไม่เคยอบรมมาก่อนในระบบ</div>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-lg">
              🔄
            </div>
            <div>
              <div className="text-[11px] font-bold text-indigo-900">ค่าเฉลี่ยหลักสูตรต่อคน</div>
              <div className="text-xl font-black text-indigo-800">
                {stats.uniquePersonnelCount > 0 ? (stats.totalTrainees / stats.uniquePersonnelCount).toFixed(2) : "0"} <span className="text-xs font-medium text-gray-500">หลักสูตร/คน</span>
              </div>
              <div className="text-[10px] text-indigo-700">สะท้อนการกลับมาต่อยอดอย่างต่อเนื่อง</div>
            </div>
          </div>
        </div>

        {/* Annual Cohort Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#16265E] text-white">
              <tr>
                <th className="py-3 px-3.5 font-bold">ปีงบประมาณ</th>
                <th className="py-3 px-3 text-center font-bold">ที่นั่งอบรมรวม</th>
                <th className="py-3 px-3 text-center font-bold bg-blue-900/80 border-l border-blue-800">
                  👥 บุคลากรเดี่ยวจริง
                </th>
                <th className="py-3 px-3 text-center font-black bg-emerald-800/90 text-white border-l border-blue-800">
                  🆕 บุคลากรหน้าใหม่
                </th>
                <th className="py-3 px-3 text-center font-bold bg-emerald-900/80 border-l border-blue-800">
                  % หน้าใหม่
                </th>
                <th className="py-3 px-3 text-center font-black bg-indigo-900/80 text-white border-l border-blue-800">
                  🔄 ศิษย์เก่าต่อยอด
                </th>
                <th className="py-3 px-3 text-center font-bold bg-indigo-950 border-l border-blue-800">
                  % ศิษย์เก่า
                </th>
                <th className="py-3 px-3 text-center font-bold min-w-[150px] border-l border-blue-800">
                  สัดส่วน (🟢 ใหม่ vs 🟣 เดิม)
                </th>
                <th className="py-3 px-3 text-center font-bold min-w-[190px] border-l border-blue-800">
                  สังกัดคนหน้าใหม่ (สมาคม / กกท / จ. / ภายนอก)
                </th>
                <th className="py-3 px-3 text-center font-bold border-l border-blue-800">
                  การทำงาน
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {annualCohorts.map((cohort) => {
                const isSelectedYear = matrixYearFilter === String(cohort.yearBE);
                return (
                  <tr
                    key={cohort.yearBE}
                    className={`transition-colors ${
                      isSelectedYear ? "bg-blue-50/80 font-semibold" : "hover:bg-gray-50/70"
                    }`}
                  >
                    <td className="py-2.5 px-3.5 font-bold text-[#16265E] flex items-center gap-1.5">
                      <span>พ.ศ. {cohort.yearBE}</span>
                      {cohort.yearBE === 2569 && (
                        <span className="rounded-full bg-blue-100 text-[#16265E] px-1.5 py-0.2 text-[9px] font-bold">
                          ปีปัจจุบัน
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-gray-700">
                      {cohort.totalRecords.toLocaleString()} คน-ครั้ง
                    </td>
                    <td className="py-2.5 px-3 text-center border-l border-gray-100 font-mono font-bold text-blue-900 bg-blue-50/30">
                      {cohort.uniquePersons.toLocaleString()} คน
                    </td>
                    <td className="py-2.5 px-3 text-center border-l border-gray-100 font-mono font-black text-emerald-700 bg-emerald-50/40">
                      {cohort.newTrainees.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center border-l border-gray-100 font-mono text-emerald-800 bg-emerald-50/20 font-bold">
                      {cohort.newPercentage}%
                    </td>
                    <td className="py-2.5 px-3 text-center border-l border-gray-100 font-mono font-black text-indigo-800 bg-indigo-50/40">
                      {cohort.returningTrainees.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center border-l border-gray-100 font-mono text-indigo-900 bg-indigo-50/20 font-bold">
                      {cohort.returningPercentage}%
                    </td>

                    {/* Progress Bar (New vs Returning) */}
                    <td className="py-2.5 px-3 border-l border-gray-100">
                      <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex shadow-2xs">
                        <div
                          style={{ width: `${cohort.newPercentage}%` }}
                          className="bg-emerald-500 h-full"
                          title={`บุคลากรหน้าใหม่: ${cohort.newTrainees} คน (${cohort.newPercentage}%)`}
                        />
                        <div
                          style={{ width: `${cohort.returningPercentage}%` }}
                          className="bg-indigo-600 h-full"
                          title={`ศิษย์เก่าต่อยอด: ${cohort.returningTrainees} คน (${cohort.returningPercentage}%)`}
                        />
                      </div>
                    </td>

                    {/* Affiliation Mini badges for new trainees */}
                    <td className="py-2.5 px-3 border-l border-gray-100">
                      <div className="flex items-center justify-center gap-1.5 text-[10px]">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 border border-blue-200" title="สมาคมกีฬาแห่งประเทศไทย">
                          ส.{cohort.newByGroup["สมาคมกีฬาแห่งประเทศไทย"] || 0}
                        </span>
                        <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700 border border-purple-200" title="การกีฬาแห่งประเทศไทย">
                          กกท.{cohort.newByGroup["การกีฬาแห่งประเทศไทย"] || 0}
                        </span>
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700 border border-amber-200" title="สมาคมกีฬาแห่งจังหวัด">
                          จ.{cohort.newByGroup["สมาคมกีฬาแห่งจังหวัด"] || 0}
                        </span>
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 border border-emerald-200" title="หน่วยงานภายนอก">
                          ภ.{cohort.newByGroup["หน่วยงานภายนอก"] || 0}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-center border-l border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setMatrixYearFilter(String(cohort.yearBE));
                          window.scrollTo({ top: 800, behavior: "smooth" });
                        }}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                          isSelectedYear
                            ? "bg-[#16265E] text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                        title="กรองตารางเมทริกซ์ด้านบนให้เป็นปีนี้"
                      >
                        {isSelectedYear ? "✓ กำลังดูปีนี้" : "🔍 กรองปีนี้"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total Footer Row */}
            <tfoot className="bg-gray-100 font-black text-gray-900 border-t-2 border-gray-300 text-xs">
              <tr>
                <td className="py-3 px-3.5 font-extrabold text-[#16265E]">
                  รวมสะสมทั้งหมด:
                </td>
                <td className="py-3 px-3 text-center font-mono">
                  {stats.totalTrainees.toLocaleString()} คน-ครั้ง
                </td>
                <td className="py-3 px-3 text-center border-l border-gray-200 font-mono text-blue-900 bg-blue-50/50">
                  {stats.uniquePersonnelCount.toLocaleString()} คน
                </td>
                <td className="py-3 px-3 text-center border-l border-gray-200 font-mono text-emerald-800 bg-emerald-50/50">
                  {stats.uniquePersonnelCount.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-center border-l border-gray-200 font-mono text-emerald-900 bg-emerald-50/30">
                  100%
                </td>
                <td className="py-3 px-3 text-center border-l border-gray-200 font-mono text-indigo-900 bg-indigo-50/50">
                  {(stats.totalTrainees - stats.uniquePersonnelCount).toLocaleString()}
                </td>
                <td className="py-3 px-3 text-center border-l border-gray-200 font-mono text-indigo-950 bg-indigo-50/30">
                  -
                </td>
                <td className="py-3 px-3 border-l border-gray-200 text-center text-[10.5px] font-normal text-gray-500">
                  สัดส่วนสะสมตลอดช่วงเวลา
                </td>
                <td colSpan={2} className="py-3 px-3 border-l border-gray-200 text-center text-[10.5px] font-normal text-gray-500">
                  (ระบบ กกท. พ.ศ. 2547–2569)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Two Column Section: 4 Affiliation Groups vs Course Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Affiliation Groups Breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-[#16265E] flex items-center gap-2">
                <span>🏛️ สัดส่วนตาม 4 กลุ่มหน่วยงาน</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                การกระจายตัวของบุคลากรกีฬาตามโครงสร้างองค์กร
              </p>
            </div>
            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#16265E]">
              4 กลุ่มหลัก
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {stats.byAffiliationGroup.map((g) => {
              const activePct = g.count > 0 ? Math.round((g.activeCount / g.count) * 100) : 0;
              return (
                <div
                  key={g.name}
                  className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-2 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800">{g.name}</span>
                    <span className="font-mono text-[#16265E] font-bold">
                      {g.count.toLocaleString()} รายการ ({g.percent}%)
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden flex">
                    <div
                      className="bg-[#16265E] h-full"
                      style={{ width: `${g.percent}%` }}
                      title={`สัดส่วน: ${g.percent}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                    <span>ปฏิบัติงานต่อเนื่อง: <strong className="text-emerald-700">{g.activeCount}</strong> คน</span>
                    <span className="font-semibold text-emerald-700">Active {activePct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Course Category Breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-[#16265E] flex items-center gap-2">
                <span>🎯 สัดส่วนตามประเภทหลักสูตร</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                จำแนกตามสายวิชาชีพบุคลากรกีฬา
              </p>
            </div>
            <span className="rounded-md bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
              3 สายวิชาชีพ
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {stats.byCourseCategory.map((cat) => {
              const activePct = cat.count > 0 ? Math.round((cat.activeCount / cat.count) * 100) : 0;
              return (
                <div
                  key={cat.name}
                  className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 space-y-2 hover:bg-purple-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800">{cat.name}</span>
                    <span className="font-mono text-purple-900 font-bold">
                      {cat.count.toLocaleString()} รายการ ({cat.percent}%)
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden flex">
                    <div
                      className="bg-purple-700 h-full"
                      style={{ width: `${cat.percent}%` }}
                      title={`สัดส่วน: ${cat.percent}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                    <span>ปฏิบัติงานต่อเนื่อง: <strong className="text-emerald-700">{cat.activeCount}</strong> คน</span>
                    <span className="font-semibold text-emerald-700">Active {activePct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kirkpatrick Level 3 Evaluation: การนำความรู้ไปใช้จริงในการปฏิบัติหน้าที่ */}
      <div className="rounded-2xl border border-blue-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-900">
                Kirkpatrick Model · Level 3 (Behavior & Application)
              </span>
              <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-200">
                ⭐ ดัชนีประสิทธิผล {stats.averageImpactRating} / 5.0
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-[#16265E]">
              💡 การประเมินผลสัมฤทธิ์: การนำความรู้ไปใช้จริงในการปฏิบัติหน้าที่
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              รวบรวมจากคำตอบจริงของผู้ผ่านการอบรมในแบบรายงานการปฏิบัติหน้าที่ พร้อมประมวลผลดัชนีประสิทธิผล
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#16265E] border border-blue-100">
              รวบรวมข้อมูลเชิงคุณภาพแล้ว <strong className="text-[#16265E] font-bold">{stats.qualitativeHighlights.length}</strong> รายการ
            </span>
          </div>
        </div>

        {/* 2 Sub-blocks: Dimensions breakdown + Impact Rating summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-white p-5 flex flex-col justify-between shadow-2xs">
            <div>
              <span className="text-xs font-bold text-indigo-900">ดัชนีประสิทธิผลการถ่ายทอดความรู้</span>
              <p className="text-[11px] text-gray-500 mt-0.5">Knowledge Transfer Impact Index</p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black text-[#16265E]">{stats.averageImpactRating}</span>
                <span className="text-sm font-semibold text-gray-500">/ 5.00</span>
              </div>

              <div className="mt-2 flex items-center gap-1 text-amber-500 text-lg">
                {"★".repeat(Math.round(stats.averageImpactRating))}
                {"☆".repeat(Math.max(0, 5 - Math.round(stats.averageImpactRating)))}
              </div>

              <div className="mt-4 rounded-xl bg-white/90 p-3.5 border border-indigo-100 text-xs text-gray-700 space-y-1.5 shadow-2xs">
                <p className="font-bold text-emerald-800 flex items-center gap-1">
                  <span>✓</span>
                  <span>ระดับประสิทธิผล: ดีเลิศ (Excellence)</span>
                </p>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  บุคลากรสามารถนำทักษะเฉพาะทางจากการอบรมไปปฏิบัติหน้าที่ในสมาคมกีฬา กกท. และหน่วยงานภายนอกจนบรรลุผลสัมฤทธิ์
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-indigo-100/70 text-[11px] text-gray-500 flex justify-between">
              <span>รายงานประเมิน: {stats.totalRatingsCount} รายการ</span>
              <span className="text-emerald-700 font-semibold">100% บรรลุเกณฑ์ กกท.</span>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#16265E]">
                📊 สัดส่วนมิติองค์ความรู้ที่นำไปประยุกต์ใช้สูงสุด
              </h4>
              <span className="text-[11px] text-gray-500">จำแนกตาม 5 สมรรถนะบุคลากรกีฬา</span>
            </div>

            <div className="space-y-3 pt-1">
              {stats.dimensionBreakdown.map((dim) => (
                <div key={dim.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                      <span>{dim.icon}</span>
                      <span>{dim.label}</span>
                    </span>
                    <span className="font-mono text-gray-600 font-medium">
                      {dim.count} ครั้ง ({dim.percent}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#16265E] to-[#2563eb] rounded-full transition-all"
                      style={{ width: `${Math.max(6, dim.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Qualitative Quotes Wall */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <div>
              <h4 className="text-sm font-bold text-[#16265E] flex items-center gap-1.5">
                <span>💬</span>
                <span>คลังคำตอบจริงจากผู้รับการอบรม: "ท่านนำความรู้ไปใช้ในการปฏิบัติหน้าที่อย่างไร"</span>
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                เสียงสะท้อนจริงจากโค้ช ผู้ตัดสิน และผู้บริหารกีฬา สามารถคลิกคัดลอกข้อความเพื่อนำไปใช้อ้างอิงในเอกสารสรุปโครงการ
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedDimensionFilter("all")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  selectedDimensionFilter === "all"
                    ? "bg-[#16265E] text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                ทั้งหมด ({stats.qualitativeHighlights.length})
              </button>
              {KNOWLEDGE_DIMENSIONS.map((dim) => (
                <button
                  key={dim.key}
                  type="button"
                  onClick={() => setSelectedDimensionFilter(dim.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                    selectedDimensionFilter === dim.key
                      ? "bg-[#16265E] text-white font-semibold shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span>{dim.icon}</span>
                  <span>{dim.label.split(" (")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {filteredHighlights.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16265E] text-[10px] font-bold text-white shrink-0">
                        {q.traineeName.replace(/^(นาย|นางสาว|นาง|ดร\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.)\s*/, "").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{q.traineeName}</p>
                        <p className="text-[11px] text-gray-500">
                          {q.role} · {q.sportsType}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                      ⭐ {q.rating}/5
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 italic leading-relaxed pl-3 border-l-2 border-[#16265E]/40 my-2.5 bg-gray-50/50 py-1.5 rounded-r-lg">
                    "{q.text}"
                  </p>

                  <p className="text-[11px] text-gray-400 pl-3">
                    📍 งาน: {q.eventName} | 📜 {q.courseTitle}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {q.dimensions.map((dKey) => {
                      const dInfo = KNOWLEDGE_DIMENSIONS.find((k) => k.key === dKey);
                      return (
                        <span
                          key={dKey}
                          className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#16265E] border border-blue-100"
                        >
                          {dInfo?.icon} {dInfo?.label.split(" (")[0] || dKey}
                        </span>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyQuote(q)}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-50 hover:bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 transition-colors cursor-pointer border border-gray-200"
                    title="คัดลอกข้อความเพื่อนำไปใส่ในเล่มรายงานสรุปโครงการ"
                  >
                    <span>{copiedId === q.id ? "✓ คัดลอกสำเร็จ" : "📋 คัดลอกอ้างอิง"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Courses Efficiency Table (17 authentic courses) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#16265E]">
          📋 ประสิทธิภาพและการนำไปใช้จริงจำแนกตาม 17 หลักสูตรอบรม
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          เปรียบเทียบอัตราส่วนบุคลากรที่สำเร็จการอบรมและยังคงปฏิบัติงานจริงในแต่ละหลักสูตร
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#16265E] text-white">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">ชื่อหลักสูตร</th>
                <th className="py-2.5 px-3">ประเภทหลักสูตร</th>
                <th className="py-2.5 px-3 text-center">ยอดผู้สำเร็จการอบรม (รายการ)</th>
                <th className="py-2.5 px-3 text-center">ปฏิบัติหน้าที่ต่อเนื่อง (Active)</th>
                <th className="py-2.5 px-3 text-center">อัตราการนำไปใช้จริง (Active Rate)</th>
                <th className="py-2.5 px-3">ผลการประเมินโครงการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.byCourse.map((c, idx) => (
                <tr key={c.name} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-2.5 px-3 text-gray-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-semibold text-gray-900">{c.name}</td>
                  <td className="py-2.5 px-3 text-gray-600">{c.category || "-"}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-[#16265E]">{c.count}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                    {Math.round((c.count * c.activeRate) / 100)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold ${
                        c.activeRate >= 80
                          ? "bg-emerald-100 text-emerald-800"
                          : c.activeRate >= 60
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {c.activeRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {c.activeRate >= 80 ? (
                      <span className="text-emerald-700 font-medium">🌟 บรรลุเป้าหมายตามเกณฑ์ดีเลิศ</span>
                    ) : c.activeRate >= 60 ? (
                      <span className="text-blue-700 font-medium">✓ ผ่านเกณฑ์มาตรฐาน กกท.</span>
                    ) : (
                      <span className="text-amber-700 font-medium">⚠️ ควรติดตามสนับสนุนเพิ่มเติม</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COHORT TRAINEE LIST MODAL (บุคลากรหน้าใหม่ vs ศิษย์เก่าต่อยอด) */}
      {/* ========================================================================= */}
      {isCohortListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="bg-[#16265E] text-white p-5 flex items-center justify-between border-b border-blue-900">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-800/80 px-2 py-0.5 text-xs font-bold text-blue-200">
                    {matrixYearFilter === "all" ? "ทุกปีงบประมาณ" : `ปีงบประมาณ พ.ศ. ${matrixYearFilter}`}
                  </span>
                  <span className="text-xs text-blue-200">
                    • บุคลากรเดี่ยวแท้จริง {currentCohortSummary.uniquePersons.toLocaleString()} คน
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-bold">
                  {cohortModalTab === "new" ? "🌱 รายชื่อบุคลากรหน้าใหม่ (First-time Trainees)" : "🔄 รายชื่อศิษย์เก่าพัฒนาต่อยอด (Returning Trainees)"}
                </h3>
                <p className="text-xs text-blue-200/80 mt-0.5">
                  {cohortModalTab === "new"
                    ? "บุคลากรที่เพิ่งเข้ารับการอบรมกับ กกท. เป็นครั้งแรกในประวัติศาสตร์ (สร้างบุคลากรใหม่เข้าสู่วงการ)"
                    : "บุคลากรที่มีประวัติเคยผ่านการอบรมในปีก่อนหน้ามาแล้ว และกลับมาเพิ่มพูนทักษะเพิ่มเติมในปีนี้"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCohortListModalOpen(false)}
                className="rounded-xl p-2 text-blue-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Toolbar: Tabs, Search, and Export */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Tab Switcher */}
              <div className="flex items-center gap-1.5 bg-gray-200/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCohortModalTab("new")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cohortModalTab === "new"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  🌱 บุคลากรหน้าใหม่ ({currentCohortSummary.newCount.toLocaleString()} คน)
                </button>
                <button
                  type="button"
                  onClick={() => setCohortModalTab("returning")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cohortModalTab === "returning"
                      ? "bg-white text-indigo-900 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  🔄 ศิษย์เก่าต่อยอด ({currentCohortSummary.returningCount.toLocaleString()} คน)
                </button>
              </div>

              {/* Search & Export */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, สังกัด, รหัส, หลักสูตร..."
                    value={cohortSearchQuery}
                    onChange={(e) => setCohortSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-[#16265E] focus:outline-hidden"
                  />
                  {cohortSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCohortSearchQuery("")}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExportCohortListExcel}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                >
                  <span>📊</span>
                  <span>ออก Excel</span>
                </button>
              </div>
            </div>

            {/* Trainee List Table */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[55vh]">
              {filteredCohortModalList.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  ไม่พบข้อมูลบุคลากรที่ตรงกับคำค้นหา
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#16265E] text-white sticky top-0 shadow-xs">
                    <tr>
                      <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                      <th className="py-2.5 px-3 font-bold">รหัสบุคลากร</th>
                      <th className="py-2.5 px-3 font-bold">ชื่อ-นามสกุล</th>
                      <th className="py-2.5 px-3 font-bold">กลุ่มสังกัด</th>
                      <th className="py-2.5 px-3 font-bold">หน่วยงาน / สมาคม</th>
                      <th className="py-2.5 px-3 font-bold">หลักสูตรที่อบรมในปีนี้</th>
                      <th className="py-2.5 px-3 text-center font-bold">เข้าสู่ระบบปีแรก</th>
                      <th className="py-2.5 px-3 text-center font-bold">หลักสูตรสะสม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCohortModalList.map((person, idx) => (
                      <tr key={person.personKey} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-900">
                          {person.personnelId || (person.idCard.length === 13 ? `ID-••••${person.idCard.slice(-4)}` : person.idCard)}
                        </td>
                        <td className="py-2 px-3 font-bold text-gray-900">
                          {person.prefix ? `${person.prefix} ` : ""}{person.name}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              person.affiliationGroup === "สมาคมกีฬาแห่งประเทศไทย"
                                ? "bg-blue-100 text-blue-800"
                                : person.affiliationGroup === "การกีฬาแห่งประเทศไทย"
                                ? "bg-purple-100 text-purple-800"
                                : person.affiliationGroup === "สมาคมกีฬาแห่งจังหวัด"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {person.affiliationGroup}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-700 truncate max-w-[180px]" title={person.affiliation}>
                          {person.affiliation}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {person.coursesInYear.map((c) => (
                              <span key={c} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-[#16265E] border border-gray-200">
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-semibold text-gray-700">
                          พ.ศ. {person.firstYearBE}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-indigo-900">
                          {person.totalCoursesAllTime}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-3.5 px-5 flex items-center justify-between text-xs text-gray-500">
              <div>
                แสดง <strong>{filteredCohortModalList.length}</strong> จากทั้งหมด{" "}
                <strong>
                  {cohortModalTab === "new" ? currentCohortSummary.newCount : currentCohortSummary.returningCount}
                </strong>{" "}
                คน
              </div>
              <button
                type="button"
                onClick={() => setIsCohortListModalOpen(false)}
                className="rounded-xl bg-[#16265E] px-4 py-2 text-xs font-bold text-white hover:bg-[#111e4a] cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin PIN Unlock Modal */}
      {showPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                🔒
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">ยืนยันสิทธิ์ผู้ดูแลระบบ (Admin)</h4>
                <p className="text-xs text-gray-500">กรอกรหัส PIN เพื่อปลดล็อกสิทธิ์ปรับแก้ประเภทหลักสูตร</p>
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
                    setPendingAction(null);
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
    </div>
  );
}
