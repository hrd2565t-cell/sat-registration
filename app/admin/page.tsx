"use client";

import { AdminShell } from "@/components/layout/admin-shell";
import { ApplicantsChart } from "@/components/admin/applicants-chart";
import { ApplicantsTable } from "@/components/admin/applicants-table";
import { TargetGroupAnalytics } from "@/components/admin/target-group-analytics";
import { StatCard } from "@/components/ui/stat-card";
import { adminUser } from "@/lib/admin-data";
import { useApplications } from "@/lib/applications-store";
import { useCourses } from "@/lib/courses-store";

export default function AdminDashboardPage() {
  const { applications } = useApplications();
  const { courses } = useCourses();
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

        {/* Executive 5 Target Groups Analytics & Quota Fulfillment */}
        <TargetGroupAnalytics
          applications={applications}
          courses={courses}
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[230px_minmax(0,1fr)] print:grid-cols-1">
          <ApplicantsChart />
          <ApplicantsTable />
        </div>
      </div>
    </AdminShell>
  );
}
