import { CoursesAdmin } from "@/components/admin/courses-admin";
import { AdminShell } from "@/components/layout/admin-shell";
import { adminUser } from "@/lib/admin-data";

export default function AdminCoursesPage() {
  return (
    <AdminShell
      title="จัดการหลักสูตร - ระบบสมัครบุคลากรกีฬา"
      userName={adminUser.name}
      activeKey="courses"
    >
      <CoursesAdmin />
    </AdminShell>
  );
}
