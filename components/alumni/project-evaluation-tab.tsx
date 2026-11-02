"use client";

import { useMemo } from "react";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import { computeEvaluationStats, PAST_YEARS_BE } from "@/lib/alumni-store";
import * as XLSX from "xlsx";

interface ProjectEvaluationTabProps {
  trainees: HistoricalTrainee[];
}

export function ProjectEvaluationTab({ trainees }: ProjectEvaluationTabProps) {
  const stats = useMemo(() => computeEvaluationStats(trainees), [trainees]);

  const handleExportEvaluationReport = () => {
    // 1. Summary sheet
    const summarySheetData = [
      { ตัวชี้วัด: "จำนวนผู้สำเร็จการอบรมทั้งหมด (คน)", ค่าสถิติ: stats.totalTrainees },
      { ตัวชี้วัด: "จำนวนบุคลากรเดี่ยว (Unique Passport)", ค่าสถิติ: stats.uniquePersonnelCount },
      { ตัวชี้วัด: "บุคลากรที่ยังปฏิบัติหน้าที่ต่อเนื่อง (Active)", ค่าสถิติ: stats.activeCount },
      { ตัวชี้วัด: "อัตราการนำความรู้ไปปฏิบัติหน้าที่จริง (%)", ค่าสถิติ: `${stats.activeRatePercent}%` },
      { ตัวชี้วัด: "บุคลากรที่รอตรวจสอบการทำหน้าที่ (Pending)", ค่าสถิติ: stats.pendingCount },
      { ตัวชี้วัด: "บุคลากรที่ยังไม่มีประวัติในรอบปี (Inactive)", ค่าสถิติ: stats.inactiveCount },
      { ตัวชี้วัด: "จำนวนครั้งการลงสนามปฏิบัติหน้าที่สะสม", ค่าสถิติ: stats.totalDutiesReported },
    ];

    // 2. By Sport sheet
    const sportSheetData = stats.bySportsType.map((s, idx) => ({
      อันดับ: idx + 1,
      ชนิดกีฬา: s.name,
      จำนวนผู้ผ่านการอบรม: s.count,
      จำนวนที่ยังปฏิบัติหน้าที่: s.activeCount,
      "อัตรา Active (%)": `${Math.round((s.activeCount / s.count) * 100)}%`,
    }));

    // 3. By Affiliation sheet
    const affilSheetData = stats.byAffiliation.map((a, idx) => ({
      ลำดับ: idx + 1,
      กลุ่มเป้าหมายสังกัด: a.name,
      จำนวนผู้ผ่านการอบรม: a.count,
      จำนวนที่ยังปฏิบัติหน้าที่: a.activeCount,
      "อัตรา Active (%)": `${Math.round((a.activeCount / a.count) * 100)}%`,
    }));

    const workbook = XLSX.utils.book_new();
    const s1 = XLSX.utils.json_to_sheet(summarySheetData);
    const s2 = XLSX.utils.json_to_sheet(sportSheetData);
    const s3 = XLSX.utils.json_to_sheet(affilSheetData);

    XLSX.utils.book_append_sheet(workbook, s1, "สรุปภาพรวมโครงการ");
    XLSX.utils.book_append_sheet(workbook, s2, "จำแนกตามชนิดกีฬา");
    XLSX.utils.book_append_sheet(workbook, s3, "จำแนกตามกลุ่มเป้าหมาย");

    XLSX.writeFile(
      workbook,
      `SAT_Project_Evaluation_Report_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#16265E] to-[#1e3a8a] p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-blue-400/10 blur-2xl" />
        <div className="pointer-events-none absolute right-40 top-0 h-32 w-32 rounded-full bg-amber-400/10 blur-xl" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="rounded-md bg-[#f59e0b] px-2.5 py-0.5 text-xs font-bold text-[#1e1b4b]">
              รายงานผลสัมฤทธิ์ระดับนโยบาย กกท.
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
              แดชบอร์ดการประเมินผลโครงการพัฒนาบุคลากรกีฬา
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-blue-100/80">
              วิเคราะห์ความคุ้มค่าและผลสัมฤทธิ์ของการจัดอบรม เปรียบเทียบข้อมูลย้อนหลังปี พ.ศ. 2565 - 2570
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportEvaluationReport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#16265E] shadow-sm hover:bg-blue-50 transition-colors"
            >
              <span>📊</span>
              <span>ส่งออกรายงาน (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <span>🖨️</span>
              <span>พิมพ์</span>
            </button>
          </div>
        </div>

        {/* 4 Core KPIs */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white/10 p-4 backdrop-blur-xs border border-white/10">
            <p className="text-blue-200 text-xs font-medium">ผู้ผ่านการอบรมสะสม</p>
            <p className="mt-1 text-3xl font-extrabold text-white">{stats.totalTrainees}</p>
            <p className="text-[11px] text-blue-200/70 mt-0.5">
              รวม {stats.uniquePersonnelCount} คน (มีผู้จบหลายหลักสูตร)
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4 backdrop-blur-xs border border-white/10">
            <p className="text-emerald-300 text-xs font-medium">อัตราการปฏิบัติหน้าที่จริง (Active)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-[#34d399]">{stats.activeRatePercent}%</span>
              <span className="text-xs text-emerald-200 font-semibold">({stats.activeCount} คน)</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-[#10b981] rounded-full"
                style={{ width: `${stats.activeRatePercent}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl bg-white/10 p-4 backdrop-blur-xs border border-white/10">
            <p className="text-amber-300 text-xs font-medium">การลงสนามปฏิบัติหน้าที่สะสม</p>
            <p className="mt-1 text-3xl font-extrabold text-[#facc15]">{stats.totalDutiesReported}</p>
            <p className="text-[11px] text-amber-200/70 mt-0.5">ครั้งในการแข่งขันและทัวร์นาเมนต์</p>
          </div>

          <div className="rounded-xl bg-white/10 p-4 backdrop-blur-xs border border-white/10">
            <p className="text-blue-200 text-xs font-medium">รอการตรวจสอบ (Pending)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-white">{stats.pendingCount}</span>
              <span className="text-xs text-white/70">รายการ</span>
            </div>
            <p className="text-[11px] text-blue-200/70 mt-0.5">
              Inactive: {stats.inactiveCount} คน ({100 - stats.activeRatePercent}%)
            </p>
          </div>
        </div>
      </div>

      {/* Annual Trend & Comparison */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#16265E]">
              📈 แนวโน้มการผลิตบุคลากรและการปฏิบัติหน้าที่รายปีงบประมาณ
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              สถิติเปรียบเทียบยอดผู้สำเร็จการอบรม และการลงสนามปฏิบัติหน้าที่ย้อนหลัง
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PAST_YEARS_BE.slice().reverse().map((year) => {
            const traineeCount = stats.traineesByYear[year] || 0;
            const dutyCount = stats.dutiesByYear[year] || 0;
            const maxTrainee = Math.max(...Object.values(stats.traineesByYear), 10);
            const heightPercent = Math.max(15, Math.round((traineeCount / maxTrainee) * 100));

            return (
              <div
                key={year}
                className="flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-center transition-colors hover:border-blue-300"
              >
                <span className="text-xs font-bold text-[#16265E]">พ.ศ. {year}</span>

                {/* Bar visualization */}
                <div className="my-3 flex h-24 w-full items-end justify-center gap-1.5 px-2">
                  <div
                    className="w-4 rounded-t-md bg-[#16265E] transition-all"
                    style={{ height: `${heightPercent}%` }}
                    title={`ผู้ผ่านการอบรม: ${traineeCount} คน`}
                  />
                  <div
                    className="w-4 rounded-t-md bg-[#10b981] transition-all"
                    style={{ height: `${Math.min(100, Math.max(10, dutyCount * 12))}%` }}
                    title={`การปฏิบัติหน้าที่: ${dutyCount} ครั้ง`}
                  />
                </div>

                <div className="w-full border-t border-gray-200 pt-2 text-[11px] space-y-0.5">
                  <p className="text-gray-600">
                    อบรม: <strong className="text-[#16265E]">{traineeCount}</strong> คน
                  </p>
                  <p className="text-emerald-700">
                    ปฏิบัติงาน: <strong>{dutyCount}</strong> ครั้ง
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-600">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-xs bg-[#16265E]" />
            <span>จำนวนผู้ผ่านการอบรม (คน)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-xs bg-[#10b981]" />
            <span>จำนวนครั้งที่ปฏิบัติหน้าที่จริง</span>
          </span>
        </div>
      </div>

      {/* Two Column Section: Sports Types vs Affiliation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sports Type Distribution */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-[#16265E] flex items-center justify-between">
            <span>🏅 สัดส่วนบุคลากรจำแนกตามชนิดกีฬา</span>
            <span className="text-xs font-normal text-gray-500">เรียงตามจำนวนมากสุด</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            ชนิดกีฬาที่มีบุคลากรผ่านการอบรมและยังปฏิบัติหน้าที่ต่อเนื่อง
          </p>

          <div className="mt-4 space-y-3">
            {stats.bySportsType.slice(0, 8).map((s) => {
              const activePct = Math.round((s.activeCount / s.count) * 100);
              const barWidth = Math.round((s.count / stats.totalTrainees) * 100);

              return (
                <div key={s.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800">กีฬา{s.name}</span>
                    <span className="text-gray-500 font-mono">
                      {s.count} คน (Active {activePct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden flex">
                    <div
                      className="bg-[#16265E] h-full"
                      style={{ width: `${barWidth}%` }}
                      title={`สัดส่วน: ${barWidth}%`}
                    />
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(activePct * barWidth) / 100}%` }}
                      title={`Active: ${activePct}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target Groups / Affiliation */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-[#16265E] flex items-center justify-between">
            <span>🏛️ สัดส่วนตาม 5 กลุ่มเป้าหมาย กกท.</span>
            <span className="text-xs font-normal text-gray-500">สังกัดหน่วยงาน</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            การกระจายตัวของบุคลากรในหน่วยงานกีฬาภาครัฐและเอกชน
          </p>

          <div className="mt-4 space-y-3">
            {stats.byAffiliation.map((a) => {
              const activePct = a.count > 0 ? Math.round((a.activeCount / a.count) * 100) : 0;
              return (
                <div
                  key={a.name}
                  className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 truncate">{a.name}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${activePct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-[#16265E]">{a.count}</span>
                    <span className="text-xs text-gray-500"> คน</span>
                    <p className="text-[10px] text-emerald-700 font-semibold">Active {activePct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Courses Efficiency Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#16265E]">
          📋 ประสิทธิภาพและการนำไปใช้จริงจำแนกตามหลักสูตร
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          เปรียบเทียบอัตราส่วนบุคลากรที่สำเร็จการอบรมและยังคงปฏิบัติงานจริงในแต่ละสายวิชาชีพ
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#16265E] text-white">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">ชื่อหลักสูตร</th>
                <th className="py-2.5 px-3 text-center">ยอดผู้สำเร็จการอบรม (คน)</th>
                <th className="py-2.5 px-3 text-center">ปฏิบัติหน้าที่ต่อเนื่อง (คน)</th>
                <th className="py-2.5 px-3 text-center">อัตราการนำไปใช้จริง (Active Rate)</th>
                <th className="py-2.5 px-3">ผลการประเมินโครงการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.byCourse.map((c, idx) => (
                <tr key={c.name} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-2.5 px-3 text-gray-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-semibold text-gray-900">{c.name}</td>
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
