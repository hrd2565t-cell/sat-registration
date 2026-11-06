"use client";

import { AdminShell } from "@/components/layout/admin-shell";
import { ClaimsReviewTab } from "@/components/admin/claims-review-tab";
import { adminUser } from "@/lib/admin-data";

export default function AdminClaimsPage() {
  return (
    <AdminShell
      title="ตรวจสอบยืนยันตัวตนเจ้าของประวัติ (Identity Claims)"
      userName={adminUser.name}
      activeKey="claims"
    >
      <ClaimsReviewTab />
    </AdminShell>
  );
}
