"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  TARGET_GROUPS,
  type TargetGroupKey,
  type Course,
  type TargetGroupQuotas,
  DEFAULT_TARGET_QUOTAS,
} from "@/lib/courses";
import type { ApplicantRecord } from "@/lib/applications-store";

interface TargetGroupAnalyticsProps {
  applications: ApplicantRecord[];
  courses: Course[];
}

export function TargetGroupAnalytics({
  applications,
  courses,
}: TargetGroupAnalyticsProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<number | "all">("all");

  const filteredApps = useMemo(() => {
    if (selectedCourseId === "all") return applications;
    return applications.filter((app) => app.courseId === selectedCourseId);
  }, [applications, selectedCourseId]);

  const activeCourse = useMemo(() => {
    if (selectedCourseId === "all") return null;
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  // Combined quotas across all courses or specific course
  const totalQuotas: TargetGroupQuotas = useMemo(() => {
    if (activeCourse) {
      return activeCourse.targetQuotas || DEFAULT_TARGET_QUOTAS;
    }
    return courses.reduce(
      (acc, c) => {
        const q = c.targetQuotas || DEFAULT_TARGET_QUOTAS;
        return {
          sat: acc.sat + (q.sat || 0),
          nationalAssoc: acc.nationalAssoc + (q.nationalAssoc || 0),
          provincialAssoc: acc.provincialAssoc + (q.provincialAssoc || 0),
          nsdf: acc.nsdf + (q.nsdf || 0),
          external: acc.external + (q.external || 0),
        };
      },
      { sat: 0, nationalAssoc: 0, provincialAssoc: 0, nsdf: 0, external: 0 }
    );
  }, [activeCourse, courses]);

  // Helper to match applicant's affiliation with TargetGroupKey
  const getAppGroupKey = (affiliation: string): TargetGroupKey => {
    const text = (affiliation || "").toLowerCase();
    if (text.includes("กกท") || text.includes("การกีฬาแห่งประเทศไทย")) return "sat";
    if (text.includes("จังหวัด")) return "provincialAssoc";
    if (text.includes("สมาคมกีฬา")) return "nationalAssoc";
    if (text.includes("กองทุน") || text.includes("nsdf")) return "nsdf";
    return "external";
  };

  // Group metrics
  const groupStats = useMemo(() => {
    const map: Record<
      TargetGroupKey,
      {
        total: number;
        approved: number;
        reserve: number;
        pending: number;
        action_required: number;
        rejected: number;
        quota: number;
      }
    > = {
      sat: { total: 0, approved: 0, reserve: 0, pending: 0, action_required: 0, rejected: 0, quota: totalQuotas.sat },
      nationalAssoc: { total: 0, approved: 0, reserve: 0, pending: 0, action_required: 0, rejected: 0, quota: totalQuotas.nationalAssoc },
      provincialAssoc: { total: 0, approved: 0, reserve: 0, pending: 0, action_required: 0, rejected: 0, quota: totalQuotas.provincialAssoc },
      nsdf: { total: 0, approved: 0, reserve: 0, pending: 0, action_required: 0, rejected: 0, quota: totalQuotas.nsdf },
      external: { total: 0, approved: 0, reserve: 0, pending: 0, action_required: 0, rejected: 0, quota: totalQuotas.external },
    };

    filteredApps.forEach((app) => {
      const key = getAppGroupKey(app.affiliation);
      const stat = map[key];
      if (!stat) return;
      stat.total += 1;
      if (app.status === "approved") stat.approved += 1;
      else if (app.status === "reserve") stat.reserve += 1;
      else if (app.status === "action_required") stat.action_required += 1;
      else if (app.status === "rejected") stat.rejected += 1;
      else stat.pending += 1;
    });

    return map;
  }, [filteredApps, totalQuotas]);

  // Overall KPIs
  const totalRegistered = filteredApps.length;
  const totalApproved = filteredApps.filter((a) => a.status === "approved").length;
  const totalReserve = filteredApps.filter((a) => a.status === "reserve").length;
  const totalActionRequired = filteredApps.filter((a) => a.status === "action_required").length;
  const totalPending = filteredApps.filter((a) => a.status === "pending").length;
  const grandQuota =
    totalQuotas.sat +
    totalQuotas.nationalAssoc +
    totalQuotas.provincialAssoc +
    totalQuotas.nsdf +
    totalQuotas.external;
  const overallFillRate = grandQuota > 0 ? Math.round((totalApproved / grandQuota) * 100) : 0;

  return (
    <Card padding="none" radius="lg" className="overflow-hidden border border-[#dbe2ea] bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-[#e5e7eb] bg-[#f8fafc] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[#1e3a8a] text-white">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </span>
            <h3 className="text-[13.5px] font-bold text-[#0f172a]">
              สรุปภาพรวมผู้บริหาร: การจัดสรรโควตา 5 กลุ่มเป้าหมาย กกท.
            </h3>
          </div>
          <p className="mt-0.5 text-[11px] text-[#64748b]">
            ติดตามสัดส่วนการสมัครและการอนุมัติตัวจริงเทียบกับโควตาเชิงยุทธศาสตร์
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCourseId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCourseId(val === "all" ? "all" : Number(val));
            }}
            className="rounded-[6px] border border-[#cbd5e1] bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#1e293b] shadow-sm focus:border-[#1e3a8a] focus:outline-none"
          >
            <option value="all">📊 สรุปทุกหลักสูตร (ภาพรวมทั้งหมด)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}. {c.shortTitle || c.title.slice(0, 32)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#1e3a8a] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#1e3a8a] shadow-sm transition-colors hover:bg-[#eff6ff]"
            title="พิมพ์หน้ารายงานสำหรับที่ประชุมผู้บริหาร"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            พิมพ์รายงานสรุป
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
        <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
          <p className="text-[10px] font-medium text-[#64748b]">ยอดผู้สมัครทั้งหมด</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[19px] font-bold text-[#0f172a]">{totalRegistered}</span>
            <span className="text-[10.5px] text-[#64748b]">คน</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-2.5">
          <p className="text-[10px] font-medium text-[#166534]">อนุมัติตัวจริงแล้ว</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[19px] font-bold text-[#15803d]">{totalApproved}</span>
            <span className="text-[10.5px] text-[#166534]">/ {grandQuota} คน ({overallFillRate}%)</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#bfdbfe] bg-[#eff6ff] p-2.5">
          <p className="text-[10px] font-medium text-[#1e40af]">บัญชีสำรองรอเรียก</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[19px] font-bold text-[#1d4ed8]">{totalReserve}</span>
            <span className="text-[10.5px] text-[#1e40af]">คน</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#fed7aa] bg-[#fff7ed] p-2.5">
          <p className="text-[10px] font-medium text-[#c2410c]">ขอเอกสารเพิ่มเติม</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[19px] font-bold text-[#ea580c]">{totalActionRequired}</span>
            <span className="text-[10.5px] text-[#c2410c]">คน</span>
          </div>
        </div>

        <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
          <p className="text-[10px] font-medium text-[#64748b]">รอตรวจสอบคุณสมบัติ</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[19px] font-bold text-[#334155]">{totalPending}</span>
            <span className="text-[10.5px] text-[#64748b]">คน</span>
          </div>
        </div>
      </div>

      {/* Target Groups Breakdown Table */}
      <div className="overflow-x-auto border-t border-[#e2e8f0]">
        <table className="w-full text-left text-[11.5px]">
          <thead className="bg-[#f8fafc] text-[10.5px] uppercase tracking-wider text-[#475569]">
            <tr>
              <th className="py-2.5 pl-4 pr-2 font-semibold">กลุ่มเป้าหมาย กกท.</th>
              <th className="px-2 py-2.5 text-center font-semibold">โควตาเป้าหมาย</th>
              <th className="px-2 py-2.5 text-center font-semibold">สมัครจริง</th>
              <th className="px-2 py-2.5 text-center font-semibold">อนุมัติตัวจริง</th>
              <th className="px-2 py-2.5 text-center font-semibold">สำรอง</th>
              <th className="px-2 py-2.5 text-center font-semibold">ขอเอกสารเพิ่ม</th>
              <th className="py-2.5 pl-2 pr-4 font-semibold">ความคืบหน้าเทียบโควตา</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {TARGET_GROUPS.map((tg) => {
              const stat = groupStats[tg.key];
              const quota = stat.quota;
              const fillPct = quota > 0 ? Math.min(100, Math.round((stat.approved / quota) * 100)) : 100;
              const isOver = quota > 0 && stat.approved >= quota;

              return (
                <tr key={tg.key} className="hover:bg-[#f8fafc]">
                  <td className="py-2.5 pl-4 pr-2 font-medium text-[#0f172a]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#1e3a8a]" />
                      <span>{tg.label}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center font-semibold text-[#334155]">
                    {quota} ที่นั่ง
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold text-[#0f172a]">
                    {stat.total}
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold text-[#15803d]">
                    {stat.approved}
                  </td>
                  <td className="px-2 py-2.5 text-center font-medium text-[#1d4ed8]">
                    {stat.reserve}
                  </td>
                  <td className="px-2 py-2.5 text-center font-medium text-[#c2410c]">
                    {stat.action_required}
                  </td>
                  <td className="py-2.5 pl-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-[#e2e8f0] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOver ? "bg-[#15803d]" : fillPct >= 70 ? "bg-[#d97706]" : "bg-[#2563eb]"
                          }`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-[10.5px] font-semibold text-[#475569]">
                        {fillPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Strategic Insight Alert */}
      <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 text-[11px] text-[#475569]">
        <div className="flex items-center justify-between">
          <span>
            💡 <strong>ข้อสังเกตเชิงยุทธศาสตร์:</strong> หากกลุ่มเป้าหมายใดมียอดอนุมัติตัวจริงเต็มโควตา ระบบจะจัดผู้สมัครกลุ่มดังกล่าวเข้าสู่ <strong>&ldquo;บัญชีรายชื่อสำรอง&rdquo;</strong> โดยอัตโนมัติ และผู้บริหารสามารถพิจารณาปรับเกลี่ยที่นั่งไปยังกลุ่มอื่นได้
          </span>
        </div>
      </div>
    </Card>
  );
}
