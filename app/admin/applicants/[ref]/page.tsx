import { ApplicantDetail } from "@/components/admin/applicant-detail";
import { AdminShell } from "@/components/layout/admin-shell";
import { adminUser } from "@/lib/admin-data";

export const instant = false;

export default async function ApplicantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ mode?: string | string[] }>;
}) {
  const { ref } = await params;
  const query = await searchParams;
  const rawMode = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  const mode = rawMode === "review" ? "review" : "list";
  const reference = decodeURIComponent(ref);

  return (
    <AdminShell
      title={`รายละเอียดผู้สมัคร ${reference} - ระบบสมัครบุคลากรกีฬา`}
      userName={adminUser.name}
      activeKey={mode === "review" ? "review" : "dashboard"}
    >
      <ApplicantDetail refId={reference} mode={mode} />
    </AdminShell>
  );
}
