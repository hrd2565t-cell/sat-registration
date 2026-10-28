export type ApplicantStatus = "pending" | "approved" | "rejected" | "reserve";

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
    value: "185",
    secondary: "/ 250",
    suffix: "คน",
    tone: "default",
  },
  {
    label: "รอตรวจสอบคุณสมบัติ",
    value: "42",
    suffix: "คน",
    tone: "warning",
  },
  {
    label: "ผ่านคุณสมบัติแล้ว",
    value: "130",
    suffix: "คน",
    tone: "success",
  },
  {
    label: "ไม่ผ่านคุณสมบัติ",
    value: "13",
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
  { label: "ผู้ฝึกสอน", value: 185, height: 84.6, color: "#328FDD" },
  { label: "ผู้ตัดสิน", value: 42, height: 55.3, color: "#FE9732" },
  { label: "วิทยาศาสตร์การกีฬา", value: 130, height: 43.3, color: "#47B471" },
  { label: "การจัดการ", value: 76, height: 38.9, color: "#7755B3" },
  { label: "จิตวิทยา", value: 13, height: 14.9, color: "#DD3942" },
];

const firstApplicants: AdminApplicant[] = [
  {
    id: 1,
    ref: "SAT-00452",
    name: "นาย สมภพ เรือน",
    courseId: 1,
    course: "ผู้ฝึกสอนกีฬาระดับชาติ",
    fileSize: 1.2,
    ai: { tone: "pass", line1: "แนะนำให้ผ่าน (94%)", line2: "เอกสารครบถ้วน" },
    status: "pending",
  },
  {
    id: 2,
    ref: "SAT-00453",
    name: "นางสาว รักษ์ ภัท ทิพา",
    courseId: 2,
    course: "ผู้ตัดสินกีฬาอาชีพ",
    fileSize: 0.8,
    ai: { tone: "pass", line1: "แนะนำให้ผ่าน (88%)", line2: "มีเอกสารครบถ้วน" },
    status: "approved",
  },
  {
    id: 3,
    ref: null,
    name: "นาย วิทูรา ใจดี",
    courseId: 3,
    course: "วิทยาศาสตร์การกีฬา",
    fileSize: null,
    ai: { tone: "fail", line1: "แนะนำไม่ให้ผ่าน (12%)", line2: "ขาดเอกสารสำคัญ" },
    status: "rejected",
  },
  {
    id: 4,
    ref: null,
    name: "นาย ภาณุพงษ์ เอ็น",
    courseId: 4,
    course: "การจัดการการกีฬา",
    fileSize: 1.5,
    ai: { tone: "pass", line1: "แนะนำให้ผ่าน (91%)", line2: "ตรวจสอบเงื่อนไข" },
    status: "pending",
  },
  {
    id: 5,
    ref: null,
    name: "นางสาว ณิชา ดี",
    courseId: 5,
    course: "จิตวิทยาการกีฬา",
    fileSize: 2.1,
    ai: { tone: "review", line1: "รอการตรวจสอบ", line2: "เอกสารยังไม่ครบถ้วน" },
    status: "pending",
  },
];

const namePool = [
  "นาย กิตติศักดิ์ พงษ์ไพร",
  "นางสาว ปวีณา ศรีสุข",
  "นาย อนุชา ทองดี",
  "นางสาว อารยา บุญมี",
  "นาย ธนวัฒน์ ใจกล้า",
  "นางสาว ชลิตา แก้วใส",
  "นาย ภูวดล วงศ์ไทย",
  "นางสาว มณีรัตน์ สุขใจ",
  "นาย ศุภชัย ดีงาม",
  "นางสาว สุนิสา พูลผล",
  "นาย วรากร เมืองทอง",
  "นางสาว นภาพร แสงทอง",
  "นาย ธีรภัทร แก้วมณี",
  "นางสาว รุ่งทิพย์ ทองคำ",
  "นาย พีระพงษ์ สายทอง",
  "นางสาว จิราพร สุขสันต์",
  "นาย ณัฐพล ใจมั่น",
  "นางสาว กนกวรรณ ศรีทอง",
  "นาย สุรชัย กล้าหาญ",
  "นางสาว ปิยะดา วงศ์งาม",
];

const statusPool: ApplicantStatus[] = [
  "approved",
  "pending",
  "approved",
  "rejected",
  "pending",
  "approved",
  "rejected",
  "pending",
];

const fileSizes = [0.6, 0.9, 1.3, 1.8, 2.2];

const generatedApplicants: AdminApplicant[] = Array.from(
  { length: 37 },
  (_, index) => {
    const id = index + 6;
    const courseId = (index % 5) + 1;
    const course = adminCourseOptions[courseId - 1].title;
    const status = statusPool[index % statusPool.length];
    const confidence =
      status === "rejected"
        ? 8 + ((index * 7) % 23)
        : 78 + ((index * 5) % 21);
    const ai: AiVerdict =
      status === "rejected"
        ? {
            tone: "fail",
            line1: `แนะนำไม่ให้ผ่าน (${confidence}%)`,
            line2: "ขาดเอกสารสำคัญ",
          }
        : status === "approved"
          ? {
              tone: "pass",
              line1: `แนะนำให้ผ่าน (${confidence}%)`,
              line2: "เอกสารครบถ้วน",
            }
          : index % 4 === 0
            ? {
                tone: "review",
                line1: "รอการตรวจสอบ",
                line2: "เอกสารยังไม่ครบถ้วน",
              }
            : {
                tone: "pass",
                line1: `แนะนำให้ผ่าน (${confidence}%)`,
                line2: "เอกสารครบถ้วน",
              };

    return {
      id,
      ref: `SAT-${String(454 + index).padStart(5, "0")}`,
      name: namePool[index % namePool.length],
      courseId,
      course,
      fileSize: index % 7 === 3 ? null : fileSizes[index % fileSizes.length],
      ai,
      status,
    };
  }
);

export const adminApplicants: AdminApplicant[] = [
  ...firstApplicants,
  ...generatedApplicants,
];

export function statusLabel(status: ApplicantStatus) {
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "reserve") return "บัญชีสำรอง";
  if (status === "rejected") return "ไม่ผ่านอนุมัติ";
  return "รอตรวจสอบ";
}
