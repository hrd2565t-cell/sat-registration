"use client";

import { useState, useMemo } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { ApplicantsChart } from "@/components/admin/applicants-chart";
import { ApplicantsTable } from "@/components/admin/applicants-table";
import { TargetGroupAnalytics } from "@/components/admin/target-group-analytics";
import { BudgetAnalyticsTab } from "@/components/admin/budget-analytics-tab";
import { TrainingMapTab } from "@/components/admin/training-map-tab";
import { StatCard } from "@/components/ui/stat-card";
import { adminUser } from "@/lib/admin-data";
import { useApplications } from "@/lib/applications-store";
import { useCourses } from "@/lib/courses-store";

export default function AdminDashboardPage() {
  const { applications } = useApplications();
  const { courses } = useCourses();
  const [activeTab, setActiveTab] = useState<"overview" | "budget" | "map">("overview");

  const activeCourses = useMemo(() => courses.filter((c) => !c.isHistorical), [courses]);

  const pending = applications.filter((item) => item.status === "pending").length;
  const actionRequired = applications.filter(
    (item) => item.status === "action_required"
  ).length;
  const approved = applications.filter(
    (item) => item.status === "approved"
  ).length;
  const reserve = applications.filter(
    (item) => item.status === "reserve"
  ).length;
  const rejected = applications.filter(
    (item) => item.status === "rejected"
  ).length;

  const stats = [
    {
      label: "ผู้สมัครทั้งหมด",
      value: String(applications.length),
      suffix: "คน",
      tone: "default" as const,
    },
    {
      label: "รอตรวจสอบ",
      value: String(pending),
      suffix: "คน",
      tone: "warning" as const,
    },
    {
      label: "ขอเอกสารเพิ่ม",
      value: String(actionRequired),
      suffix: "คน",
      tone: "warning" as const,
    },
    {
      label: "ผ่านคุณสมบัติ (ตัวจริง)",
      value: String(approved),
      suffix: "คน",
      tone: "success" as const,
    },
    {
      label: "บัญชีสำรอง",
      value: String(reserve),
      suffix: "คน",
      tone: "info" as const,
    },
    {
      label: "ไม่ผ่านคุณสมบัติ",
      value: String(rejected),
      suffix: "คน",
      tone: "danger" as const,
    },
  ];

  return (
    <AdminShell
      title="หน้าจัดการสำหรับแอดมิน (Admin Dashboard) - ระบบสมัครบุคลากรกีฬา"
      userName={adminUser.name}
      activeKey="dashboard"
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-4">
        {/* Top KPI Ribbon */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              tone={stat.tone}
            />
          ))}
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-white px-2 rounded-xl shadow-2xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "border-[#16265E] text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="text-base">📊</span>
            <span>ภาพรวมโควตา 5 กลุ่ม & ผู้สมัคร</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("budget")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "budget"
                ? "border-[#16265E] text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="text-base">💰</span>
            <span>วิเคราะห์ความคุ้มค่าของงบประมาณ</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800 font-extrabold">
              ROI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "map"
                ? "border-[#16265E] text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span className="text-base">🗺️</span>
            <span>แผนที่ความถี่การจัดอบรม</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800 font-extrabold">
              77 จังหวัด
            </span>
          </button>
        </div>

        {/* Tab 1: Overview & Quotas */}
        {activeTab === "overview" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <TargetGroupAnalytics
              applications={applications}
              courses={activeCourses}
            />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[230px_minmax(0,1fr)] print:grid-cols-1">
              <ApplicantsChart />
              <ApplicantsTable />
            </div>
          </div>
        )}

        {/* Tab 2: Budget Value Analytics */}
        {activeTab === "budget" && (
          <div className="animate-in fade-in duration-200">
            <BudgetAnalyticsTab
              courses={courses}
              applications={applications}
            />
          </div>
        )}

        {/* Tab 3: Geographic Training Heatmap */}
        {activeTab === "map" && (
          <div className="animate-in fade-in duration-200">
            <TrainingMapTab
              courses={courses}
              applications={applications}
            />
          </div>
        )}
      </div>
    </AdminShell>
  );
}
