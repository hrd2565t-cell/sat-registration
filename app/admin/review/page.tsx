import { ReviewQueue } from "@/components/admin/review-queue";
import { AdminShell } from "@/components/layout/admin-shell";
import { adminUser } from "@/lib/admin-data";

export default function AdminReviewPage() {
  return (
    <AdminShell
      title="คิวตรวจสอบคุณสมบัติ - ระบบสมัครบุคลากรกีฬา"
      userName={adminUser.name}
      activeKey="review"
    >
      <ReviewQueue />
    </AdminShell>
  );
}
