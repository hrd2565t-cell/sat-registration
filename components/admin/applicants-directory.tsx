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
  const approved = applications.filter(
    (item) => item.status === "approved"
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
      label: "อนุมัติแล้ว",
      value: String(approved),
      href: "/admin/applicants?status=approved",
      status: "approved",
      tone: "success" as const,
    },
    {
      label: "ไม่ผ่าน",
      value: String(rejected),
      href: "/admin/applicants?status=rejected",
      status: "rejected",
      tone: "danger" as const,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
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
