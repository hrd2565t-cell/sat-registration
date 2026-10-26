import { AdminShell } from "@/components/layout/admin-shell";
import { ApplicantsDirectory } from "@/components/admin/applicants-directory";
import { adminCourseOptions, adminUser } from "@/lib/admin-data";

const statusValues = ["all", "pending", "approved", "rejected"] as const;

export const instant = false;

export default async function AdminApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    course?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const rawStatus = Array.isArray(params.status)
    ? params.status[0]
    : params.status;
  const rawCourse = Array.isArray(params.course)
    ? params.course[0]
    : params.course;
  const status =
    rawStatus && statusValues.includes(rawStatus as (typeof statusValues)[number])
      ? rawStatus
      : "all";
  const courseNumber = Number(rawCourse);
  const course = adminCourseOptions.some((item) => item.id === courseNumber)
    ? String(courseNumber)
    : "";

  return (
    <AdminShell
      title="รายชื่อผู้สมัคร - ระบบสมัครบุคลากรกีฬา"
      userName={adminUser.name}
      activeKey="dashboard"
    >
      <ApplicantsDirectory
        key={`${status}-${course}`}
        initialStatus={status}
        initialCourse={course}
      />
    </AdminShell>
  );
}
