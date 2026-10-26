export interface Course {
  id: number;
  image: string;
  imageAlt: string;
  status: "open" | "full";
  capacity: number;
  seatsLeft?: number;
  title: string;
  shortTitle?: string;
  date: string;
  location: string;
  seats: string;
  warningMessage?: string;
}

export const DEFAULT_COURSE_ID = 2;

export const courses: Course[] = [
  {
    id: 1,
    image: "/assets/course-national-coach.png",
    imageAlt: "National Coach - รูปประกอบหลักสูตร",
    status: "open",
    capacity: 50,
    seatsLeft: 12,
    title: "หลักสูตรผู้ฝึกสอนกีฬาระดับชาติ (National Coach)",
    shortTitle: "ผู้ฝึกสอน",
    date: "15-20 พ.ค. 2569",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "ต้องมีใบประกอบวิชาชีพในระดับสากล",
  },
  {
    id: 2,
    image: "/assets/course-professional-referee.png",
    imageAlt: "Professional Referee - รูปประกอบหลักสูตร",
    status: "open",
    capacity: 50,
    seatsLeft: 24,
    title: "หลักสูตรผู้ตัดสินกีฬาอาชีพ (Professional Referee)",
    shortTitle: "ผู้ตัดสิน",
    date: "18-22 พ.ค. 2569",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "ยังมีข้อมูลผู้ฝึกสอนไม่ครบถ้วน",
  },
  {
    id: 3,
    image: "/assets/course-basic-sports-science.png",
    imageAlt: "Basic Sports Science - รูปประกอบหลักสูตร",
    status: "full",
    capacity: 50,
    seatsLeft: 0,
    title: "วิทยาศาสตร์การกีฬาขั้นพื้นฐาน (Basic Sports Science)",
    shortTitle: "วิทยาศาสตร์การกีฬา",
    date: "1-5 ส.ค. 2569",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
  },
  {
    id: 4,
    image: "/assets/course-sports-management.png",
    imageAlt: "Sports Management - รูปประกอบหลักสูตร",
    status: "open",
    capacity: 50,
    seatsLeft: 5,
    title: "หลักสูตรการจัดการองค์การกีฬา (Sports Management)",
    shortTitle: "การจัดการ",
    date: "8-12 ส.ค. 2569",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "มีคุณสมบัติเฉพาะสำหรับผู้ฝึกสอน",
  },
  {
    id: 5,
    image: "/assets/course-sports-psychology.png",
    imageAlt: "Sports Psychology - รูปประกอบหลักสูตร",
    status: "open",
    capacity: 50,
    seatsLeft: 30,
    title: "จิตวิทยาการกีฬาสำหรับผู้ฝึกสอน (Sports Psychology)",
    shortTitle: "จิตวิทยา",
    date: "14-18 ต.ค. 2569",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "มีคุณสมบัติเฉพาะสำหรับผู้ฝึกสอน",
  },
];

export function getCourseById(
  id: string | number | null | undefined,
  courseList: Course[] = courses
): Course | undefined {
  if (id === null || id === undefined || id === "") return undefined;
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return undefined;
  return courseList.find((course) => course.id === numericId);
}

export function getDefaultCourse(courseList: Course[] = courses): Course {
  return (
    courseList.find((course) => course.id === DEFAULT_COURSE_ID) ??
    courseList[0]
  );
}

/**
 * สกัดชื่อย่อ / Keyword ของหลักสูตรสำหรับแสดงผลใน Dropdown ตัวกรอง, แผนภูมิ หรือป้ายกำกับ
 * เพื่อความกระชับ สะอาดตา และไม่ยาวเกินไป
 *
 * การทำงาน:
 * 1. หากหลักสูตรมี shortTitle ที่ระบุไว้ จะใช้ค่านั้นก่อน
 * 2. หากไม่มี shortTitle หรือถูกล้างออก จะตรวจหา Keyword สำคัญโดยอัตโนมัติ:
 *    - "ผู้ฝึกสอน", "ผู้ตัดสิน", "วิทยาศาสตร์การกีฬา", "การจัดการ", "จิตวิทยา"
 * 3. หากเป็นชื่อใหม่ที่ไม่มีในกลุ่มข้างต้น จะทำการตัดคำฟุ่มเฟือยอัตโนมัติ:
 *    - ตัดคำนำหน้า: "หลักสูตร", "โครงการ", "การอบรม", "อบรม"
 *    - ตัดข้อความในวงเล็บกลม/เหลี่ยม: เช่น (National Coach), [ขั้นต้น]
 *    - ตัดช่องว่างส่วนเกิน และจำกัดความยาวให้พอดี (สูงสุด 20 ตัวอักษร)
 */
export function getCourseKeyword(
  courseOrTitle:
    | Course
    | { title: string; shortTitle?: string }
    | string
    | null
    | undefined
): string {
  if (!courseOrTitle) return "";

  if (typeof courseOrTitle === "object") {
    if (courseOrTitle.shortTitle && courseOrTitle.shortTitle.trim()) {
      return courseOrTitle.shortTitle.trim();
    }
  }

  const rawTitle =
    typeof courseOrTitle === "string" ? courseOrTitle : courseOrTitle.title;
  if (!rawTitle) return "";

  // 1. ตรวจสอบ Keyword หลักที่มักพบใน กกท.
  if (rawTitle.includes("ผู้ฝึกสอน")) return "ผู้ฝึกสอน";
  if (rawTitle.includes("ผู้ตัดสิน")) return "ผู้ตัดสิน";
  if (rawTitle.includes("วิทยาศาสตร์การกีฬา")) return "วิทยาศาสตร์การกีฬา";
  if (rawTitle.includes("จิตวิทยา")) return "จิตวิทยา";
  if (rawTitle.includes("การจัดการ")) return "การจัดการ";

  // 2. Fallback: คัดลอกและทำความสะอาดข้อความอัตโนมัติ
  let cleaned = rawTitle
    .replace(/\s*\([^)]*\)/g, "") // ตัดเนื้อหาในวงเล็บกลม (...)
    .replace(/\s*\[[^\]]*\]/g, "") // ตัดเนื้อหาในวงเล็บเหลี่ยม [...]
    .replace(
      /^(?:หลักสูตร|โครงการฝึกอบรม|การฝึกอบรม|ฝึกอบรม|การอบรม|อบรม|โครงการ)\s*/,
      ""
    ) // ตัดคำนำหน้า
    .trim();

  if (cleaned.length > 20) {
    cleaned = cleaned.slice(0, 18).trim() + "…";
  }

  return cleaned || rawTitle;
}

