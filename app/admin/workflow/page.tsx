import { WorkflowBoard } from "@/components/admin/workflow/workflow-board";
import { AdminShell } from "@/components/layout/admin-shell";
import { adminUser } from "@/lib/admin-data";

export default function AdminWorkflowPage() {
  return (
    <AdminShell
      title="ผังขั้นตอนการดำเนินงาน (Flowchart) - ระบบสมัครบุคลากรกีฬา"
      userName={adminUser.name}
      activeKey="workflow"
    >
      <WorkflowBoard />
    </AdminShell>
  );
}
