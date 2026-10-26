import { SettingsAdmin } from "@/components/admin/settings-admin";
import { AdminShell } from "@/components/layout/admin-shell";
import { adminUser } from "@/lib/admin-data";

export default function AdminSettingsPage() {
  return (
    <AdminShell
      title="ตั้งค่าระบบ - ระบบสมัครบุคลากรกีฬา"
      userName={adminUser.name}
      activeKey="settings"
    >
      <SettingsAdmin />
    </AdminShell>
  );
}
