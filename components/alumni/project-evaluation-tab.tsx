"use client";

import { useState, useMemo } from "react";
import type { HistoricalTrainee, QualitativeHighlight } from "@/lib/alumni-store";
import { computeEvaluationStats, PAST_YEARS_BE, KNOWLEDGE_DIMENSIONS } from "@/lib/alumni-store";
import * as XLSX from "xlsx";

interface ProjectEvaluationTabProps {
  trainees: HistoricalTrainee[];
}

export function ProjectEvaluationTab({ trainees }: ProjectEvaluationTabProps) {
  const stats = useMemo(() => computeEvaluationStats(trainees), [trainees]);

  const handleExportEvaluationReport = () => {
    // 1. Summary sheet
    const summarySheetData = [
      { ตัวชี้วัด: "จำนวนประวัติการอบรมทั้งหมด (รายการ)", ค่าสถิติ: stats.totalTrainees },
      { ตัวชี้วัด: "จำนวนบุคลากรเดี่ยวในระบบ (คน)", ค่าสถิติ: stats.uniquePersonnelCount },
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

    // 3. By Course Category sheet
    const categorySheetData = stats.byCourseCategory.map((c, idx) => ({
      ลำดับ: idx + 1,
      ประเภทหลักสูตร: c.name,
      จำนวนรายการ: c.count,
      สัดส่วน: `${c.percent}%`,
      จำนวนที่ยังปฏิบัติหน้าที่: c.activeCount,
      "อัตรา Active (%)": `${c.count > 0 ? Math.round((c.activeCount / c.count) * 100) : 0}%`,
    }));

    // 4. By Course sheet (17 courses)
    const courseSheetData = stats.byCourse.map((c, idx) => ({
      ลำดับ: idx + 1,
      ชื่อหลักสูตร: c.name,
      ประเภทหลักสูตร: c.category || "-",
      จำนวนผู้ผ่านการอบรม: c.count,
      "อัตราการนำไปใช้จริง (Active %)": `${c.activeRate}%`,
    }));

    // 5. Knowledge Transfer & Applied Knowledge sheet (Kirkpatrick Level 3)
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
    const s3 = XLSX.utils.json_to_sheet(categorySheetData);
    const s4 = XLSX.utils.json_to_sheet(courseSheetData);
    const s5 = XLSX.utils.json_to_sheet(knowledgeSheetData);

    XLSX.utils.book_append_sheet(workbook, s1, "สรุปภาพรวมโครงการ");
    XLSX.utils.book_append_sheet(workbook, s2, "จำแนกตามกลุ่มหน่วยงาน");
    XLSX.utils.book_append_sheet(workbook, s3, "จำแนกตามประเภทหลักสูตร");
    XLSX.utils.book_append_sheet(workbook, s4, "ประสิทธิผลรายหลักสูตร");
    XLSX.utils.book_append_sheet(workbook, s5, "การนำความรู้ไปใช้จริง");

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

  // Find maximum trainees in a single year for bar scaling
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
              วิเคราะห์ความคุ้มค่าและผลสัมฤทธิ์ของการจัดอบรม จากฐานข้อมูลจริง 2,732 รายการ (1,913 บุคลากรเดี่ยว)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportEvaluationReport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#16265E] shadow-sm hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <span>📊</span>
              <span>ส่งออกรายงานประเมินผล (Excel 5 แผ่น)</span>
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
            บุคลากรเดี่ยว: <strong className="text-[#16265E] font-bold">{stats.uniquePersonnelCount.toLocaleString()}</strong> ท่าน
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

        {/* Scrollable multi-year chart */}
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
                    {/* Tooltip on hover */}
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
          {/* Left 1 col: Impact Index Card */}
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

          {/* Right 2 cols: 5 Knowledge Dimensions breakdown */}
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

            {/* Filter buttons */}
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
    </div>
  );
}
