"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { Course } from "@/lib/courses";
import type { ApplicantRecord } from "@/lib/applications-store";
import { updateCourse } from "@/lib/courses-store";
import { CourseEditDialog } from "@/components/admin/course-edit-dialog";

interface BudgetAnalyticsTabProps {
  courses: Course[];
  applications: ApplicantRecord[];
}

export function BudgetAnalyticsTab({ courses, applications }: BudgetAnalyticsTabProps) {
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [inlineBudgets, setInlineBudgets] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    courses.forEach((c) => {
      map[c.id] = c.budget !== undefined ? String(c.budget) : "";
    });
    return map;
  });
  const [savedNotices, setSavedNotices] = useState<Record<number, boolean>>({});
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // คำนวณสถิติภาพรวมงบประมาณ
  const stats = useMemo(() => {
    let totalBudget = 0;
    let coursesWithBudgetCount = 0;
    let totalCapacity = 0;
    let totalApproved = 0;
    let totalApplicants = 0;

    // ยอดจัดสรรงบประมาณแยกตาม 5 กลุ่มเป้าหมาย กกท. (บาท)
    const targetGroupInvestments = {
      sat: 0,
      nsdf: 0,
      nationalAssoc: 0,
      provincialAssoc: 0,
      external: 0,
    };

    const courseMetrics = courses.map((course) => {
      const courseApps = applications.filter((a) => a.courseId === course.id && a.status !== "rejected");
      const approvedApps = courseApps.filter((a) => a.status === "approved");
      const cap = course.capacity || 40;
      const budgetVal = course.budget !== undefined ? course.budget : (Number(inlineBudgets[course.id]) || 0);

      if (budgetVal > 0) {
        totalBudget += budgetVal;
        coursesWithBudgetCount++;
      }
      totalCapacity += cap;
      totalApproved += approvedApps.length;
      totalApplicants += courseApps.length;

      // ต้นทุนต่อหัว: หากมีผู้อนุมัติตัวจริงแล้วคิดจากตัวจริง หากยังไม่มีคิดจากความจุเป้าหมาย
      const effectiveHeads = approvedApps.length > 0 ? approvedApps.length : cap;
      const costPerHead = budgetVal > 0 && effectiveHeads > 0 ? Math.round(budgetVal / effectiveHeads) : 0;
      const costPerApplicant = budgetVal > 0 && courseApps.length > 0 ? Math.round(budgetVal / courseApps.length) : 0;

      // จัดสรรงบสู่ 5 กลุ่มเป้าหมายตามสัดส่วนโควตาของหลักสูตรนี้
      const quotas = course.targetQuotas || { sat: 5, nationalAssoc: 15, provincialAssoc: 15, nsdf: 0, external: 5 };
      const quotaSum = (quotas.sat || 0) + (quotas.nsdf || 0) + (quotas.nationalAssoc || 0) + (quotas.provincialAssoc || 0) + (quotas.external || 0) || cap;
      
      if (budgetVal > 0 && quotaSum > 0) {
        targetGroupInvestments.sat += (budgetVal * (quotas.sat || 0)) / quotaSum;
        targetGroupInvestments.nsdf += (budgetVal * (quotas.nsdf || 0)) / quotaSum;
        targetGroupInvestments.nationalAssoc += (budgetVal * (quotas.nationalAssoc || 0)) / quotaSum;
        targetGroupInvestments.provincialAssoc += (budgetVal * (quotas.provincialAssoc || 0)) / quotaSum;
        targetGroupInvestments.external += (budgetVal * (quotas.external || 0)) / quotaSum;
      }

      return {
        ...course,
        applicantCount: courseApps.length,
        approvedCount: approvedApps.length,
        budgetVal,
        costPerHead,
        costPerApplicant,
      };
    });

    const averageCostPerTrainee = totalApproved > 0 && totalBudget > 0
      ? Math.round(totalBudget / totalApproved)
      : totalCapacity > 0 && totalBudget > 0
      ? Math.round(totalBudget / totalCapacity)
      : 0;

    const averageCostPerApplicant = totalApplicants > 0 && totalBudget > 0
      ? Math.round(totalBudget / totalApplicants)
      : 0;

    return {
      totalBudget,
      coursesWithBudgetCount,
      totalCapacity,
      totalApproved,
      totalApplicants,
      averageCostPerTrainee,
      averageCostPerApplicant,
      courseMetrics,
      targetGroupInvestments,
    };
  }, [courses, applications, inlineBudgets]);

  // จัดการบันทึกงบประมาณแบบรวดเร็วผ่านตาราง (Quick Inline Edit)
  const handleInlineBudgetChange = (courseId: number, val: string) => {
    setInlineBudgets((prev) => ({ ...prev, [courseId]: val }));
  };

  const handleSaveInlineBudget = (courseId: number) => {
    const raw = inlineBudgets[courseId];
    const num = raw.trim() ? Number(raw.replace(/,/g, "")) : undefined;
    updateCourse(courseId, { budget: num });
    setSavedNotices((prev) => ({ ...prev, [courseId]: true }));
    setTimeout(() => {
      setSavedNotices((prev) => ({ ...prev, [courseId]: false }));
    }, 3000);
  };

  // ส่งออกข้อมูลเป็นไฟล์ Excel (CSV)
  const handleExportCsv = () => {
    const headers = [
      "รหัสหลักสูตร",
      "ชื่อหลักสูตร",
      "จังหวัดที่จัด",
      "กำหนดการจัดอบรม",
      "ความจุเป้าหมาย (คน)",
      "สมัครจริง (คน)",
      "อนุมัติตัวจริง (คน)",
      "งบประมาณจัดสรร (บาท)",
      "ต้นทุนเฉลี่ยต่อผู้ผ่านการอบรม (บาท/คน)",
      "ต้นทุนเฉลี่ยต่อผู้สมัคร (บาท/คน)",
    ];

    const rows = stats.courseMetrics.map((m) => [
      `#${m.id}`,
      `"${m.title.replace(/"/g, '""')}"`,
      `"${(m.province || "-").replace(/"/g, '""')}"`,
      `"${(m.date || "-").replace(/"/g, '""')}"`,
      m.capacity,
      m.applicantCount,
      m.approvedCount,
      m.budgetVal,
      m.costPerHead,
      m.costPerApplicant,
    ]);

    // บรรทัดสรุปผลรวม
    rows.push([
      "รวมทั้งหมด",
      `"รวม ${courses.length} หลักสูตร"`,
      "-",
      "-",
      stats.totalCapacity,
      stats.totalApplicants,
      stats.totalApproved,
      stats.totalBudget,
      stats.averageCostPerTrainee,
      stats.averageCostPerApplicant,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SAT_Budget_Analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printedDateThai = useMemo(() => {
    const now = new Date();
    const monthsThai = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
    ];
    return `${now.getDate()} ${monthsThai[now.getMonth()]} พ.ศ. ${now.getFullYear() + 543}`;
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#16265E] sm:text-lg flex items-center gap-2">
            <span>💰</span>
            <span>วิเคราะห์ความคุ้มค่าของงบประมาณ (Budget Value & ROI Analytics)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            ติดตามต้นทุนต่อหัว (Cost per Trainee) ประสิทธิภาพการใช้งบประมาณ และสัดส่วนการลงทุนพัฒนาบุคลากรกีฬา กกท.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition active:scale-95 cursor-pointer"
          >
            <span>📥</span>
            <span>ส่งออก Excel (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#111e4a] transition active:scale-95 cursor-pointer"
          >
            <span>🖨️</span>
            <span>พิมพ์รายงานสรุปเสนอผู้บริหาร (PDF)</span>
          </button>
        </div>
      </div>

      {/* Strategic KPI Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Budget */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase">งบประมาณจัดสรรรวม</span>
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              {stats.coursesWithBudgetCount}/{courses.length} หลักสูตร
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-[#16265E]">
            ฿{stats.totalBudget.toLocaleString("th-TH")}
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            เฉลี่ย <strong>฿{courses.length > 0 ? Math.round(stats.totalBudget / courses.length).toLocaleString("th-TH") : 0}</strong> ต่อหลักสูตร
          </p>
        </div>

        {/* Card 2: Cost per Approved Trainee */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase">ต้นทุนต่อผู้ผ่านการอบรม (ตัวจริง)</span>
            <span className="text-lg">🎯</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">
            ฿{stats.averageCostPerTrainee.toLocaleString("th-TH")}
            <span className="text-xs font-normal text-emerald-700"> /คน</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            คำนวณจากผู้ผ่านการคัดเลือกตัวจริง <strong>{stats.totalApproved}</strong> คน (เป้าหมาย {stats.totalCapacity} คน)
          </p>
        </div>

        {/* Card 3: Cost per Applicant */}
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 uppercase">ต้นทุนต่อผู้สมัครจริง</span>
            <span className="text-lg">👥</span>
          </div>
          <p className="mt-2 text-2xl font-black text-purple-900">
            ฿{stats.averageCostPerApplicant.toLocaleString("th-TH")}
            <span className="text-xs font-normal text-purple-700"> /คน</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            จากจำนวนผู้ยื่นใบสมัครทั้งหมด <strong>{stats.totalApplicants}</strong> คน
          </p>
        </div>

        {/* Card 4: Target Groups Investment Summary */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase">สัดส่วนลงทุน 5 กลุ่มเป้าหมาย</span>
            <span className="text-[10px] text-amber-700 font-semibold">(จำแนกตามโควตา)</span>
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-gray-700">
            <div className="flex justify-between">
              <span>🏛️ กกท.:</span>
              <strong>฿{Math.round(stats.targetGroupInvestments.sat).toLocaleString("th-TH")}</strong>
            </div>
            <div className="flex justify-between">
              <span>🏅 สมาคมแห่งประเทศไทย:</span>
              <strong>฿{Math.round(stats.targetGroupInvestments.nationalAssoc).toLocaleString("th-TH")}</strong>
            </div>
            <div className="flex justify-between">
              <span>🗺️ สมาคมจังหวัด:</span>
              <strong>฿{Math.round(stats.targetGroupInvestments.provincialAssoc).toLocaleString("th-TH")}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Budget Data Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/80 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#16265E]">
              ตารางบันทึกและวิเคราะห์งบประมาณรายหลักสูตร
            </h3>
            <p className="text-[11px] text-gray-500">
              💡 สามารถพิมพ์ตัวเลขงบประมาณในช่อง <strong>"งบประมาณจัดสรร (บาท)"</strong> เพื่อแก้ไขและบันทึกขึ้น Cloud ได้ทันที
            </p>
          </div>
          <span className="text-xs text-gray-500">
            ทั้งหมด {courses.length} หลักสูตร
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100/70 text-[11px] font-bold text-gray-800">
                <th className="py-2.5 px-3 text-center w-12">#</th>
                <th className="py-2.5 px-3">ชื่อหลักสูตรการฝึกอบรม</th>
                <th className="py-2.5 px-3 text-center">จังหวัดที่จัด</th>
                <th className="py-2.5 px-3 text-center">ผู้สมัคร / ตัวจริง / ที่นั่ง</th>
                <th className="py-2.5 px-3 text-right w-48">งบประมาณจัดสรร (บาท)</th>
                <th className="py-2.5 px-3 text-right">ต้นทุนต่อหัว (บาท/คน)</th>
                <th className="py-2.5 px-3 text-center">ความคุ้มค่า</th>
                <th className="py-2.5 px-3 text-center w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.courseMetrics.map((m, idx) => {
                const isNotice = savedNotices[m.id];
                const costBadge =
                  m.costPerHead === 0
                    ? { label: "ยังไม่ระบุงบ", cls: "bg-gray-100 text-gray-600" }
                    : m.costPerHead <= 12000
                    ? { label: "✓ ประหยัด/คุ้มค่าสูง", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" }
                    : m.costPerHead <= 25000
                    ? { label: "มาตรฐาน", cls: "bg-blue-100 text-blue-800 border-blue-300" }
                    : { label: "เข้มข้น/ต้นทุนสูง", cls: "bg-amber-100 text-amber-900 border-amber-300" };

                return (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 text-center font-bold text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900 line-clamp-1">{m.title}</p>
                      <p className="text-[10.5px] text-gray-500 mt-0.5">
                        🗓️ {m.date} · 📍 {m.location}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block rounded-md bg-gray-100 border border-gray-300 px-2 py-0.5 text-[10.5px] font-semibold text-gray-800">
                        {m.province || "กรุงเทพมหานคร"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-[#16265E]">{m.applicantCount}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="font-bold text-emerald-700">{m.approvedCount}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="text-gray-600">{m.capacity}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={inlineBudgets[m.id] !== undefined ? inlineBudgets[m.id] : ""}
                            onChange={(e) => handleInlineBudgetChange(m.id, e.target.value)}
                            onBlur={() => handleSaveInlineBudget(m.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveInlineBudget(m.id);
                            }}
                            placeholder="0"
                            className="h-8 w-32 rounded-lg border border-gray-300 bg-white px-2.5 text-right font-mono text-xs font-bold text-gray-900 shadow-2xs focus:border-[#16265E] focus:outline-none focus:ring-2 focus:ring-[#16265E]/20"
                            title="พิมพ์ตัวเลขแล้วกด Enter หรือคลิกออกเพื่อบันทึกอัตโนมัติ"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineBudget(m.id)}
                          className="h-8 w-8 shrink-0 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-[#16265E] flex items-center justify-center text-xs shadow-2xs cursor-pointer"
                          title="บันทึกงบประมาณ"
                        >
                          💾
                        </button>
                      </div>
                      {isNotice && (
                        <p className="mt-0.5 text-[9.5px] font-semibold text-emerald-700">
                          ✓ บันทึกสำเร็จ
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                      {m.costPerHead > 0 ? `฿${m.costPerHead.toLocaleString("th-TH")}` : "-"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[9.5px] font-bold ${costBadge.cls}`}>
                        {costBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setEditingCourse(m)}
                        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer shadow-2xs"
                      >
                        แก้ไข
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 text-xs font-bold text-gray-900">
                <td colSpan={3} className="py-3 px-4">
                  รวมงบประมาณทั้งสิ้น ({courses.length} หลักสูตร)
                </td>
                <td className="py-3 px-3 text-center font-mono">
                  {stats.totalApplicants} / {stats.totalApproved} / {stats.totalCapacity}
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm text-[#16265E]">
                  ฿{stats.totalBudget.toLocaleString("th-TH")}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-800">
                  ฿{stats.averageCostPerTrainee.toLocaleString("th-TH")}
                </td>
                <td colSpan={2} className="py-3 px-3 text-center text-gray-500 text-[10px]">
                  เฉลี่ยทั้งโครงการ
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Edit Course Dialog if clicked */}
      {editingCourse && (
        <CourseEditDialog
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={(patch) => {
            const res = updateCourse(editingCourse.id, patch);
            setEditingCourse(null);
            return Boolean(res);
          }}
        />
      )}

      {/* Printable Executive Modal Dialog */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 backdrop-blur-xs print:static print:inset-auto print:block print:bg-white print:p-0">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  @page {
                    size: A4 landscape;
                    margin: 8mm 8mm 8mm 8mm;
                  }
                  body * {
                    visibility: hidden;
                  }
                  .budget-print-container, .budget-print-container * {
                    visibility: visible;
                  }
                  .budget-print-container {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                  }
                }
              `,
            }}
          />

          <div className="relative my-auto flex max-h-[96vh] w-full max-w-[1240px] flex-col rounded-2xl bg-white shadow-2xl print:my-0 print:max-h-none print:w-full print:rounded-none print:shadow-none">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3.5 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xl">🖨️</span>
                <span className="font-bold text-[#16265E] text-sm">
                  รายงานสรุปการวิเคราะห์ความคุ้มค่าของงบประมาณ (เสนอผู้บริหาร)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition cursor-pointer"
                >
                  พิมพ์เอกสาร / บันทึก PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  ✕ ปิด
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="overflow-y-auto p-6 print:p-0 print:overflow-visible">
              <div
                className="budget-print-container mx-auto w-full max-w-[1140px] bg-white p-6 text-gray-900 border border-gray-200 shadow-xs print:border-0 print:shadow-none print:p-0"
                style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif" }}
              >
                {/* Header: SAT Emblem & Official Title */}
                <div className="flex items-start justify-between border-b-2 border-[#16265E] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0">
                      <Image
                        src="/assets/logo-sat-header.png"
                        alt="ตราสัญลักษณ์ กกท."
                        width={56}
                        height={56}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <h1 className="text-base font-black text-[#16265E] sm:text-lg">
                        การกีฬาแห่งประเทศไทย (กกท.)
                      </h1>
                      <p className="text-xs font-bold text-gray-800 sm:text-sm">
                        กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ
                      </p>
                      <p className="text-[11px] font-semibold text-[#1e3a8a]">
                        รายงานสรุปการวิเคราะห์ความคุ้มค่าของงบประมาณโครงการพัฒนาบุคลากรกีฬา
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px]">
                    <span className="inline-block rounded bg-blue-50 px-2 py-0.5 font-bold text-[#16265E] border border-blue-200">
                      เอกสารเสนอผู้บริหาร
                    </span>
                    <p className="mt-1 text-gray-600">
                      วันที่พิมพ์รายงาน: <strong>{printedDateThai}</strong>
                    </p>
                  </div>
                </div>

                {/* KPI Summary Strip */}
                <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
                  <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-2.5 text-center">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">งบประมาณรวมทั้งสิ้น</p>
                    <p className="mt-0.5 text-lg font-black text-[#16265E]">
                      ฿{stats.totalBudget.toLocaleString("th-TH")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-2.5 text-center">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase">เป้าหมายผู้เข้ารับการอบรม</p>
                    <p className="mt-0.5 text-lg font-black text-gray-900">
                      {stats.totalCapacity} คน
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-center">
                    <p className="text-[10px] text-emerald-800 font-semibold uppercase">อนุมัติตัวจริงแล้ว</p>
                    <p className="mt-0.5 text-lg font-black text-emerald-900">
                      {stats.totalApproved} คน
                    </p>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50/70 p-2.5 text-center">
                    <p className="text-[10px] text-purple-800 font-semibold uppercase">ต้นทุนเฉลี่ยต่อคน</p>
                    <p className="mt-0.5 text-lg font-black text-purple-900">
                      ฿{stats.averageCostPerTrainee.toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>

                {/* Print Table */}
                <div className="mt-4 overflow-hidden rounded-lg border border-gray-300">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300 bg-gray-100 text-[10.5px] font-bold text-gray-900">
                        <th className="py-2 px-2 text-center w-10">ลำดับ</th>
                        <th className="py-2 px-2">ชื่อหลักสูตรการฝึกอบรม</th>
                        <th className="py-2 px-2 text-center">จังหวัด</th>
                        <th className="py-2 px-2 text-center">กำหนดการ</th>
                        <th className="py-2 px-2 text-center">เป้าหมาย (คน)</th>
                        <th className="py-2 px-2 text-center">ตัวจริง (คน)</th>
                        <th className="py-2 px-2 text-right">งบประมาณ (บาท)</th>
                        <th className="py-2 px-2 text-right">ต้นทุน/คน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stats.courseMetrics.map((m, idx) => (
                        <tr key={m.id} className="text-[10px]">
                          <td className="py-2 px-2 text-center font-bold text-gray-500">{idx + 1}</td>
                          <td className="py-2 px-2 font-semibold text-gray-900">{m.title}</td>
                          <td className="py-2 px-2 text-center">{m.province || "กรุงเทพมหานคร"}</td>
                          <td className="py-2 px-2 text-center text-gray-600">{m.date}</td>
                          <td className="py-2 px-2 text-center">{m.capacity}</td>
                          <td className="py-2 px-2 text-center font-bold text-emerald-800">{m.approvedCount}</td>
                          <td className="py-2 px-2 text-right font-mono font-bold">
                            {m.budgetVal > 0 ? `฿${m.budgetVal.toLocaleString("th-TH")}` : "-"}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-[#16265E]">
                            {m.costPerHead > 0 ? `฿${m.costPerHead.toLocaleString("th-TH")}` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-400 bg-gray-100 font-bold text-[11px]">
                        <td colSpan={4} className="py-2.5 px-3">รวมทั้งสิ้น ({courses.length} หลักสูตร)</td>
                        <td className="py-2.5 px-2 text-center">{stats.totalCapacity}</td>
                        <td className="py-2.5 px-2 text-center text-emerald-900">{stats.totalApproved}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-[#16265E]">
                          ฿{stats.totalBudget.toLocaleString("th-TH")}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-[#16265E]">
                          ฿{stats.averageCostPerTrainee.toLocaleString("th-TH")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Sign-off Section */}
                <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
                  <div className="rounded-lg border border-gray-200 p-4 text-center">
                    <p className="font-bold text-gray-800">ผู้รายงาน / เจ้าหน้าที่ประสานงานหลักสูตร</p>
                    <div className="mx-auto mt-12 w-48 border-b border-gray-400 border-dashed" />
                    <p className="mt-2 text-gray-700">( ............................................................ )</p>
                    <p className="text-[10px] text-gray-500 mt-1">วันที่ ........ / ........ / ................</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 text-center">
                    <p className="font-bold text-[#16265E]">ผู้อำนวยการกองพัฒนาบุคลากรกีฬา</p>
                    <div className="mx-auto mt-12 w-48 border-b border-gray-400 border-dashed" />
                    <p className="mt-2 text-gray-700">( ............................................................ )</p>
                    <p className="text-[10px] text-gray-500 mt-1">วันที่ ........ / ........ / ................</p>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-2 text-[9.5px] text-gray-500">
                  <span>กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย</span>
                  <span>ระบบรับสมัครและฐานข้อมูลบุคลากรกีฬาออนไลน์</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
