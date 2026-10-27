export interface TargetGroupQuotas {
  sat: number; // การกีฬาแห่งประเทศไทย
  nationalAssoc: number; // สมาคมกีฬาแห่งประเทศไทย
  provincialAssoc: number; // สมาคมกีฬาแห่งจังหวัด
  nsdf: number; // กองทุนพัฒนาการกีฬาแห่งชาติ
  external: number; // หน่วยงานภายนอก
}

export const TARGET_GROUPS = [
  { key: "sat", label: "การกีฬาแห่งประเทศไทย" },
  { key: "nationalAssoc", label: "สมาคมกีฬาแห่งประเทศไทย" },
  { key: "provincialAssoc", label: "สมาคมกีฬาแห่งจังหวัด" },
  { key: "nsdf", label: "กองทุนพัฒนาการกีฬาแห่งชาติ" },
  { key: "external", label: "หน่วยงานภายนอก / บุคคลทั่วไป" },
] as const;

export type TargetGroupKey = (typeof TARGET_GROUPS)[number]["key"];

export const DEFAULT_TARGET_QUOTAS: TargetGroupQuotas = {
  sat: 10,
  nationalAssoc: 15,
  provincialAssoc: 15,
  nsdf: 5,
  external: 5,
};

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
  targetQuotas?: TargetGroupQuotas;
  courseObjective?: string;
  qualifications?: string[];
  requiredDocuments?: string[];
  evaluationCriteria?: string[];
  satSupport?: string[];
  expensesPolicy?: string;
}

export const DEFAULT_SAT_SUPPORT: string[] = [
  "ที่พักตลอดระยะเวลาการอบรม (ห้องพักคู่ตามหลักเกณฑ์ระเบียบ กกท.)",
  "อาหารหลัก 3 มื้อ และอาหารว่าง/เครื่องดื่ม 2 มื้อต่อวัน ตลอดช่วงเวลาอบรม",
  "เอกสารคู่มือหลักสูตร กระเป๋าเอกสาร และอุปกรณ์ประกอบการฝึกอบรม/ฝึกปฏิบัติ",
  "วุฒิบัตรรับรองจาก กกท. (เมื่อผ่านเกณฑ์การประเมินตามที่กำหนด)",
];

export const DEFAULT_EXPENSES_POLICY =
  "ค่าเบี้ยเลี้ยง ค่าพาหนะเดินทางไป-กลับ และค่าใช้จ่ายส่วนตัวอื่นๆ นอกเหนือจากที่ กกท. ให้การสนับสนุน ให้เบิกจ่ายจากหน่วยงานต้นสังกัดตามระเบียบ หรือรับผิดชอบชำระด้วยตนเอง";

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
    date: "15-20 พ.ค. 2570",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "ต้องมีใบประกอบวิชาชีพในระดับสากล",
    targetQuotas: { ...DEFAULT_TARGET_QUOTAS },
    courseObjective:
      "เพื่อยกระดับมาตรฐานความรู้และทักษะการฝึกสอนกีฬาสู่ระดับสากล เสริมสร้างสมรรถนะการวางแผนการฝึกซ้อม และการพัฒนานักกีฬาสู่ความเป็นเลิศในการแข่งขันระดับชาติและนานาชาติ",
    qualifications: [
      "มีสัญชาติไทย อายุ 20 ปีบริบูรณ์ขึ้นไป",
      "มีใบรับรอง/ใบประกอบวิชาชีพผู้ฝึกสอนกีฬา หรือผ่านการอบรมผู้ฝึกสอนขั้นต้นจากสมาคมกีฬาแห่งประเทศไทย",
      "มีประสบการณ์การทำหน้าที่ผู้ฝึกสอนกีฬาอย่างต่อเนื่องไม่น้อยกว่า 2 ปี",
      "สังกัดหน่วยงานใน 5 กลุ่มเป้าหมาย กกท. (มีหนังสือนำส่งรับรองจากต้นสังกัด)",
      "ต้องมีใบประกอบวิชาชีพในระดับสากล หรือได้รับการรับรองจากสหพันธ์กีฬานานาชาติ",
    ],
    requiredDocuments: [
      "รูปถ่ายหน้าตรงขนาด 1.5 - 2 นิ้ว ถ่ายไม่เกิน 6 เดือน (ไฟล์ JPG/PNG)",
      "หนังสือนำส่งรับรองจากต้นสังกัดหรือสมาคมกีฬา (ไฟล์ PDF)",
      "สำเนาใบรับรองการเป็นผู้ฝึกสอน หรือประกาศนียบัตรที่เกี่ยวข้อง (ไฟล์ PDF)",
      "สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง",
    ],
    evaluationCriteria: [
      "มีเวลาเข้าร่วมการอบรมไม่น้อยกว่าร้อยละ 80 ของเวลาทั้งหมด",
      "ผ่านการทดสอบภาคทฤษฎีและภาคปฏิบัติไม่ต่ำกว่าร้อยละ 70",
      "ได้รับวุฒิบัตรรับรองผู้ฝึกสอนกีฬาระดับชาติจากการกีฬาแห่งประเทศไทย (กกท.)",
    ],
    satSupport: [...DEFAULT_SAT_SUPPORT],
    expensesPolicy: DEFAULT_EXPENSES_POLICY,
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
    date: "18-22 พ.ค. 2570",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "ยังมีข้อมูลผู้ฝึกสอนไม่ครบถ้วน",
    targetQuotas: { ...DEFAULT_TARGET_QUOTAS },
    courseObjective:
      "เพื่อพัฒนามาตรฐานการตัดสินกีฬาอาชีพตามหลักกติกาสากล เสริมสร้างจริยธรรมการทำหน้าที่ และความแม่นยำในการตัดสินสถานการณ์แข่งขัน",
    qualifications: [
      "มีสัญชาติไทย อายุ 20 ปีบริบูรณ์ขึ้นไป",
      "ผ่านการอบรมผู้ตัดสินกีฬาขั้นพื้นฐานและปฏิบัติหน้าที่ในระดับจังหวัดหรือสมาคมกีฬาไม่น้อยกว่า 2 ปี",
      "มีสุขภาพร่างกายสมบูรณ์ แข็งแรง ผ่านเกณฑ์การทดสอบสมรรถภาพทางกายสำหรับผู้ตัดสิน",
      "สังกัดหน่วยงานใน 5 กลุ่มเป้าหมาย กกท. (มีหนังสือนำส่งรับรองจากต้นสังกัด)",
    ],
    requiredDocuments: [
      "รูปถ่ายหน้าตรงขนาด 1.5 - 2 นิ้ว ถ่ายไม่เกิน 6 เดือน (ไฟล์ JPG/PNG)",
      "หนังสือนำส่งจากต้นสังกัดหรือสมาคมกีฬา (ไฟล์ PDF)",
      "สำเนาใบรับรองการเป็นผู้ตัดสิน หรือประวัติการปฏิบัติหน้าที่ (ไฟล์ PDF)",
      "ใบรับรองแพทย์ตรวจสุขภาพและสมรรถภาพร่างกาย",
    ],
    evaluationCriteria: [
      "มีเวลาเข้าร่วมการอบรมไม่น้อยกว่าร้อยละ 80",
      "ผ่านการทดสอบกติกาข้อเขียนและภาคสนามไม่ต่ำกว่าร้อยละ 75",
      "ได้รับวุฒิบัตรผู้ตัดสินกีฬาอาชีพจากการกีฬาแห่งประเทศไทย",
    ],
    satSupport: [...DEFAULT_SAT_SUPPORT],
    expensesPolicy: DEFAULT_EXPENSES_POLICY,
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
    date: "1-5 ส.ค. 2570",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    targetQuotas: { ...DEFAULT_TARGET_QUOTAS },
    courseObjective:
      "เพื่อสร้างความรู้ความเข้าใจพื้นฐานด้านวิทยาศาสตร์การกีฬา สรีรวิทยา โภชนาการ และการป้องกันการบาดเจ็บเพื่อนำไปประยุกต์ใช้กับนักกีฬาอย่างถูกต้อง",
    qualifications: [
      "มีสัญชาติไทย อายุ 18 ปีบริบูรณ์ขึ้นไป",
      "เป็นผู้ฝึกสอนกีฬา, นักกายภาพบำบัด, ผู้ช่วยผู้ฝึกสอน หรือบุคลากรทางการกีฬา",
      "มีความพร้อมในการนำองค์ความรู้ไปพัฒนานักกีฬาในสังกัด",
      "สังกัดหน่วยงานใน 5 กลุ่มเป้าหมาย กกท.",
    ],
    requiredDocuments: [
      "รูปถ่ายหน้าตรงขนาด 1.5 - 2 นิ้ว",
      "หนังสือนำส่งจากต้นสังกัดหรือสมาคมกีฬา",
      "สำเนาหลักฐานแสดงการปฏิบัติงานหรือวุฒิการศึกษาที่เกี่ยวข้อง",
    ],
    evaluationCriteria: [
      "เวลาเข้าอบรมไม่น้อยกว่าร้อยละ 80",
      "ผ่านการทดสอบความรู้พื้นฐานวิทยาศาสตร์การกีฬาไม่ต่ำกว่าร้อยละ 60",
      "ได้รับวุฒิบัตรความรู้ด้านวิทยาศาสตร์การกีฬาขั้นพื้นฐาน",
    ],
    satSupport: [...DEFAULT_SAT_SUPPORT],
    expensesPolicy: DEFAULT_EXPENSES_POLICY,
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
    date: "8-12 ส.ค. 2570",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "มีคุณสมบัติเฉพาะสำหรับผู้ฝึกสอน",
    targetQuotas: { ...DEFAULT_TARGET_QUOTAS },
    courseObjective:
      "เพื่อเสริมสร้างทักษะการบริหารจัดการองค์การกีฬา การบริหารงบประมาณ สิทธิประโยชน์ และการจัดมหกรรมกีฬาอย่างมืออาชีพตามมาตรฐานสากล",
    qualifications: [
      "มีสัญชาติไทย อายุ 22 ปีบริบูรณ์ขึ้นไป",
      "เป็นบุคลากรฝ่ายบริหาร, กรรมการบริหาร หรือเจ้าหน้าที่ปฏิบัติงานในสมาคมกีฬาหรือ กกท.",
      "มีประสบการณ์ทำงานด้านการจัดการกีฬาไม่น้อยกว่า 1 ปี",
      "สังกัดหน่วยงานใน 5 กลุ่มเป้าหมาย กกท.",
    ],
    requiredDocuments: [
      "รูปถ่ายหน้าตรงขนาด 1.5 - 2 นิ้ว",
      "หนังสือนำส่งรับรองจากต้นสังกัดหรือนายกสมาคมกีฬา",
      "สำเนาเอกสารแสดงตำแหน่งและประวัติการทำงานในองค์กรกีฬา",
    ],
    evaluationCriteria: [
      "เวลาเข้าอบรมไม่น้อยกว่าร้อยละ 80",
      "จัดทำและนำเสนอแผนแม่บทการจัดการองค์การกีฬา (Case Study) ผ่านเกณฑ์",
      "ได้รับวุฒิบัตรการจัดการองค์การกีฬาจากการกีฬาแห่งประเทศไทย",
    ],
    satSupport: [...DEFAULT_SAT_SUPPORT],
    expensesPolicy: DEFAULT_EXPENSES_POLICY,
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
    date: "14-18 ต.ค. 2570",
    location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: "จำนวนที่นั่ง 50 คน",
    warningMessage: "มีคุณสมบัติเฉพาะสำหรับผู้ฝึกสอน",
    targetQuotas: { ...DEFAULT_TARGET_QUOTAS },
    courseObjective:
      "เพื่อพัฒนาความรู้และเทคนิคทางจิตวิทยาการกีฬา การสร้างแรงจูงใจ การควบคุมสมาธิและความวิตกกังวลในการแข่งขัน เพื่อยกระดับศักยภาพนักกีฬา",
    qualifications: [
      "มีสัญชาติไทย อายุ 20 ปีบริบูรณ์ขึ้นไป",
      "เป็นผู้ฝึกสอนกีฬา หรือบุคลากรที่มีหน้าที่ดูแลสภาพจิตใจและพัฒนาศักยภาพนักกีฬา",
      "ปฏิบัติหน้าที่ดูแลนักกีฬาในการฝึกซ้อมหรือการแข่งขันอย่างต่อเนื่อง",
      "สังกัดหน่วยงานใน 5 กลุ่มเป้าหมาย กกท.",
    ],
    requiredDocuments: [
      "รูปถ่ายหน้าตรงขนาด 1.5 - 2 นิ้ว",
      "หนังสือนำส่งรับรองจากต้นสังกัด",
      "หนังสือรับรองการปฏิบัติหน้าที่ผู้ฝึกสอนหรือการดูแลนักกีฬา",
    ],
    evaluationCriteria: [
      "เวลาเข้าอบรมไม่น้อยกว่าร้อยละ 80",
      "ผ่านการประเมินทักษะการให้คำปรึกษาและออกแบบโปรแกรมฝึกจิตวิทยาการกีฬา",
      "ได้รับวุฒิบัตรจิตวิทยาการกีฬาสำหรับผู้ฝึกสอนจากการกีฬาแห่งประเทศไทย",
    ],
    satSupport: [...DEFAULT_SAT_SUPPORT],
    expensesPolicy: DEFAULT_EXPENSES_POLICY,
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

export const THAI_MONTH_INDEX_MAP: Record<string, number> = {
  "ม.ค.": 0,
  "ก.พ.": 1,
  "มี.ค.": 2,
  "เม.ย.": 3,
  "พ.ค.": 4,
  "มิ.ย.": 5,
  "ก.ค.": 6,
  "ส.ค.": 7,
  "ก.ย.": 8,
  "ต.ค.": 9,
  "พ.ย.": 10,
  "ธ.ค.": 11,
};

export interface ParsedDateRange {
  start: Date;
  end: Date;
}

/**
 * แปลงข้อความช่วงวันที่แบบไทย เช่น "15-20 พ.ค. 2569" หรือ "28 พ.ค. - 2 มิ.ย. 2569"
 * เป็น Date object เพื่อนำไปคำนวณการซ้อนทับกันของเวลา
 */
export function parseThaiDateRange(
  dateStr: string | null | undefined
): ParsedDateRange | null {
  if (!dateStr) return null;
  const s = dateStr.trim();

  // รูปแบบ 1: ภายในเดือนเดียวกัน เช่น "15-20 พ.ค. 2569"
  const m1 = s.match(
    /^(\d{1,2})\s*-\s*(\d{1,2})\s+([ก-๙\.]+)\s+(\d{4})$/
  );
  if (m1) {
    const startDay = parseInt(m1[1], 10);
    const endDay = parseInt(m1[2], 10);
    const month = THAI_MONTH_INDEX_MAP[m1[3]] ?? 0;
    const yearBE = parseInt(m1[4], 10);
    const yearCE = yearBE > 2400 ? yearBE - 543 : yearBE;
    return {
      start: new Date(yearCE, month, startDay, 0, 0, 0),
      end: new Date(yearCE, month, endDay, 23, 59, 59),
    };
  }

  // รูปแบบ 2: ข้ามเดือน เช่น "28 พ.ค. - 2 มิ.ย. 2569"
  const m2 = s.match(
    /^(\d{1,2})\s+([ก-๙\.]+)\s*-\s*(\d{1,2})\s+([ก-๙\.]+)\s+(\d{4})$/
  );
  if (m2) {
    const startDay = parseInt(m2[1], 10);
    const startMonth = THAI_MONTH_INDEX_MAP[m2[2]] ?? 0;
    const endDay = parseInt(m2[3], 10);
    const endMonth = THAI_MONTH_INDEX_MAP[m2[4]] ?? 0;
    const yearBE = parseInt(m2[5], 10);
    const yearCE = yearBE > 2400 ? yearBE - 543 : yearBE;
    return {
      start: new Date(yearCE, startMonth, startDay, 0, 0, 0),
      end: new Date(yearCE, endMonth, endDay, 23, 59, 59),
    };
  }

  return null;
}

/**
 * ตรวจสอบว่าช่วงวันที่ของหลักสูตร 2 รายการ มีการซ้อนทับกันหรือไม่
 */
export function isCourseDateOverlapping(
  dateStr1: string | null | undefined,
  dateStr2: string | null | undefined
): boolean {
  const r1 = parseThaiDateRange(dateStr1);
  const r2 = parseThaiDateRange(dateStr2);
  if (!r1 || !r2) return false;
  return r1.start <= r2.end && r1.end >= r2.start;
}

/**
 * ระบุ TargetGroupKey จากข้อความสังกัดของผู้สมัคร
 */
export function getTargetGroupKey(
  affiliation: string | undefined | null
): TargetGroupKey {
  if (!affiliation) return "external";
  if (affiliation.includes("กองทุน")) return "nsdf";
  if (
    affiliation.includes("สมาคมกีฬาแห่งจังหวัด") ||
    affiliation.includes("สมาคมกีฬาจังหวัด")
  ) {
    return "provincialAssoc";
  }
  if (affiliation.includes("สมาคมกีฬาแห่งประเทศไทย")) return "nationalAssoc";
  if (
    affiliation.includes("การกีฬาแห่งประเทศไทย") ||
    affiliation.includes("กกท")
  ) {
    return "sat";
  }
  return "external";
}



