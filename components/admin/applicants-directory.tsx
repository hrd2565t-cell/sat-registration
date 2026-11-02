"use client";

import Link from "next/link";
import { ApplicantsTable } from "@/components/admin/applicants-table";
import { StatCard } from "@/components/ui/stat-card";
import { useApplications } from "@/lib/applications-store";

export function ApplicantsDirectory({
  initialStatus,
  initialCourse,
}: {
  initialStatus: string;
  initialCourse: string;
}) {
  const { applications } = useApplications();
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

  const cards = [
    {
      label: "ผู้สมัครทั้งหมด",
      value: String(applications.length),
      href: "/admin/applicants",
      status: "all",
      tone: "default" as const,
    },
    {
      label: "รอตรวจสอบ",
      value: String(pending),
      href: "/admin/applicants?status=pending",
      status: "pending",
      tone: "warning" as const,
    },
    {
      label: "ขอเอกสารเพิ่ม",
      value: String(actionRequired),
      href: "/admin/applicants?status=action_required",
      status: "action_required",
      tone: "warning" as const,
    },
    {
      label: "ผ่านคุณสมบัติ (ตัวจริง)",
      value: String(approved),
      href: "/admin/applicants?status=approved",
      status: "approved",
      tone: "success" as const,
    },
    {
      label: "บัญชีสำรอง",
      value: String(reserve),
      href: "/admin/applicants?status=reserve",
      status: "reserve",
      tone: "info" as const,
    },
    {
      label: "ไม่ผ่านคุณสมบัติ",
      value: String(rejected),
      href: "/admin/applicants?status=rejected",
      status: "rejected",
      tone: "danger" as const,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-3">
        {cards.map((card) => {
          const active = initialStatus === card.status;
          return (
            <Link
              key={card.label}
              href={card.href}
              aria-current={active ? "page" : undefined}
              className={`block rounded-md transition-shadow hover:shadow-[0_4px_14px_rgba(16,24,40,0.08)] ${
                active ? "ring-2 ring-[#2386D3] ring-offset-1" : ""
              }`}
            >
              <StatCard
                label={card.label}
                value={card.value}
                suffix="คน"
                tone={card.tone}
                className="h-full"
              />
            </Link>
          );
        })}
      </div>

      <div className="mt-3">
        <ApplicantsTable
          title="รายการผู้สมัครทั้งหมด"
          description="ค้นหา ตรวจสอบ และจัดการสถานะผู้สมัครได้จากรายการนี้"
          initialStatus={initialStatus}
          initialCourse={initialCourse}
        />
      </div>
    </div>
  );
}
