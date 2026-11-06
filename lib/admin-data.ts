export type ApplicantStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "reserve"
  | "action_required";

export type AiTone = "pass" | "fail" | "review";

export interface AiVerdict {
  tone: AiTone;
  line1: string;
  line2: string;
}

export interface AdminApplicant {
  id: number;
  ref: string | null;
  name: string;
  courseId: number;
  course: string;
  fileSize: number | null;
  ai: AiVerdict;
  status: ApplicantStatus;
  reserveOrder?: number;
}

export const adminUser = {
  name: "กองพัฒนาบุคลากรกีฬา",
};

export const adminStats: {
  label: string;
  value: string;
  secondary?: string;
  suffix?: string;
  tone: "default" | "warning" | "success" | "danger";
}[] = [
  {
    label: "ผู้สมัครทั้งหมด",
    value: "0",
    secondary: "/ 250",
    suffix: "คน",
    tone: "default",
  },
  {
    label: "รอตรวจสอบคุณสมบัติ",
    value: "0",
    suffix: "คน",
    tone: "warning",
  },
  {
    label: "ผ่านคุณสมบัติแล้ว",
    value: "0",
    suffix: "คน",
    tone: "success",
  },
  {
    label: "ไม่ผ่านคุณสมบัติ",
    value: "0",
    suffix: "คน",
    tone: "danger",
  },
];

export const adminCourseOptions = [
  { id: 1, label: "ผู้ฝึกสอน", title: "ผู้ฝึกสอนกีฬาระดับชาติ" },
  { id: 2, label: "ผู้ตัดสิน", title: "ผู้ตัดสินกีฬาอาชีพ" },
  { id: 3, label: "วิทยาศาสตร์การกีฬา", title: "วิทยาศาสตร์การกีฬา" },
  { id: 4, label: "การจัดการ", title: "การจัดการการกีฬา" },
  { id: 5, label: "จิตวิทยา", title: "จิตวิทยาการกีฬา" },
];

export const applicantChart = [
  { label: "ผู้ฝึกสอน", value: 0, height: 0, color: "#328FDD" },
  { label: "ผู้ตัดสิน", value: 0, height: 0, color: "#FE9732" },
  { label: "วิทยาศาสตร์การกีฬา", value: 0, height: 0, color: "#47B471" },
  { label: "การจัดการ", value: 0, height: 0, color: "#7755B3" },
  { label: "จิตวิทยา", value: 0, height: 0, color: "#DD3942" },
];

export const adminApplicants: AdminApplicant[] = [];

export function statusLabel(status: ApplicantStatus) {
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "reserve") return "บัญชีสำรอง";
  if (status === "rejected") return "ไม่ผ่านอนุมัติ";
  return "รอตรวจสอบ";
}
