import defaultCoursesData from "@/data/courses.json";

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
  useCustomSchedule?: boolean;
  registrationDate?: string;
  resultDate?: string;
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

export const DEFAULT_GLOBAL_REGISTRATION_DATE = "6-22 ม.ค. 2570";
export const DEFAULT_GLOBAL_RESULT_DATE = "29 ม.ค. 2570";

export const DEFAULT_SAT_SUPPORT: string[] = [
  "ที่พักตลอดระยะเวลาการอบรม (ห้องพักคู่ตามหลักเกณฑ์ระเบียบ กกท.)",
  "อาหารหลัก 3 มื้อ และอาหารว่าง/เครื่องดื่ม 2 มื้อต่อวัน ตลอดช่วงเวลาอบรม",
  "เอกสารคู่มือหลักสูตร กระเป๋าเอกสาร และอุปกรณ์ประกอบการฝึกอบรม/ฝึกปฏิบัติ",
  "วุฒิบัตรรับรองจาก กกท. (เมื่อผ่านเกณฑ์การประเมินตามที่กำหนด)",
];

export const DEFAULT_EXPENSES_POLICY =
  "ค่าเบี้ยเลี้ยง ค่าพาหนะเดินทางไป-กลับ และค่าใช้จ่ายส่วนตัวอื่นๆ นอกเหนือจากที่ กกท. ให้การสนับสนุน ให้เบิกจ่ายจากหน่วยงานต้นสังกัดตามระเบียบ หรือรับผิดชอบชำระด้วยตนเอง";

export const DEFAULT_COURSE_ID = 2;

export const courses: Course[] = defaultCoursesData as Course[];

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

export const THAI_MONTHS = [
  { index: 0, abbr: "ม.ค.", full: "มกราคม", maxDays: 31 },
  { index: 1, abbr: "ก.พ.", full: "กุมภาพันธ์", maxDays: 29 },
  { index: 2, abbr: "มี.ค.", full: "มีนาคม", maxDays: 31 },
  { index: 3, abbr: "เม.ย.", full: "เมษายน", maxDays: 30 },
  { index: 4, abbr: "พ.ค.", full: "พฤษภาคม", maxDays: 31 },
  { index: 5, abbr: "มิ.ย.", full: "มิถุนายน", maxDays: 30 },
  { index: 6, abbr: "ก.ค.", full: "กรกฎาคม", maxDays: 31 },
  { index: 7, abbr: "ส.ค.", full: "สิงหาคม", maxDays: 31 },
  { index: 8, abbr: "ก.ย.", full: "กันยายน", maxDays: 30 },
  { index: 9, abbr: "ต.ค.", full: "ตุลาคม", maxDays: 31 },
  { index: 10, abbr: "พ.ย.", full: "พฤศจิกายน", maxDays: 30 },
  { index: 11, abbr: "ธ.ค.", full: "ธันวาคม", maxDays: 31 },
] as const;

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

export interface CourseDateFields {
  startDay: number;
  startMonth: number; // 0-11
  endDay: number;
  endMonth: number; // 0-11
  yearBE: number; // e.g. 2570
}

export function getDaysInMonth(monthIndex: number, yearBE = 2570): number {
  const yearCE = yearBE > 2400 ? yearBE - 543 : yearBE;
  return new Date(yearCE, monthIndex + 1, 0).getDate();
}

export function parseCourseDateFields(
  dateStr: string | null | undefined
): CourseDateFields {
  const fallback: CourseDateFields = {
    startDay: 15,
    startMonth: 4, // พ.ค.
    endDay: 19,
    endMonth: 4,
    yearBE: 2570,
  };
  if (!dateStr) return fallback;
  const s = dateStr.trim();

  // รูปแบบ 1: ภายในเดือนเดียวกัน เช่น "15-20 พ.ค. 2570" หรือ "1 - 5 พ.ย. 2570"
  const m1 = s.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([ก-๙\.]+)\s+(\d{4})$/);
  if (m1) {
    const month = THAI_MONTH_INDEX_MAP[m1[3]];
    if (month !== undefined) {
      return {
        startDay: parseInt(m1[1], 10),
        startMonth: month,
        endDay: parseInt(m1[2], 10),
        endMonth: month,
        yearBE: parseInt(m1[4], 10),
      };
    }
  }

  // รูปแบบ 2: ข้ามเดือน เช่น "28 พ.ค. - 2 มิ.ย. 2570"
  const m2 = s.match(
    /^(\d{1,2})\s+([ก-๙\.]+)\s*-\s*(\d{1,2})\s+([ก-๙\.]+)\s+(\d{4})$/
  );
  if (m2) {
    const startMonth = THAI_MONTH_INDEX_MAP[m2[2]];
    const endMonth = THAI_MONTH_INDEX_MAP[m2[4]];
    if (startMonth !== undefined && endMonth !== undefined) {
      return {
        startDay: parseInt(m2[1], 10),
        startMonth,
        endDay: parseInt(m2[3], 10),
        endMonth,
        yearBE: parseInt(m2[5], 10),
      };
    }
  }

  // รูปแบบ 3: วันเดียว เช่น "15 พ.ค. 2570"
  const m3 = s.match(/^(\d{1,2})\s+([ก-๙\.]+)\s+(\d{4})$/);
  if (m3) {
    const month = THAI_MONTH_INDEX_MAP[m3[2]];
    if (month !== undefined) {
      const day = parseInt(m3[1], 10);
      return {
        startDay: day,
        startMonth: month,
        endDay: day,
        endMonth: month,
        yearBE: parseInt(m3[3], 10),
      };
    }
  }

  return fallback;
}

export function formatCourseDateFields(
  fields: CourseDateFields,
  includeYear = true
): string {
  const startMonthAbbr = THAI_MONTHS[fields.startMonth]?.abbr ?? "พ.ค.";
  const endMonthAbbr = THAI_MONTHS[fields.endMonth]?.abbr ?? startMonthAbbr;
  const yearSuffix = includeYear ? ` ${fields.yearBE}` : "";

  if (fields.startMonth === fields.endMonth) {
    if (fields.startDay === fields.endDay) {
      return `${fields.startDay} ${startMonthAbbr}${yearSuffix}`;
    }
    return `${fields.startDay}-${fields.endDay} ${startMonthAbbr}${yearSuffix}`;
  }
  return `${fields.startDay} ${startMonthAbbr} - ${fields.endDay} ${endMonthAbbr}${yearSuffix}`;
}

/**
 * แยกข้อความช่วงวันที่แบบหลายช่วง (คั่นด้วย "," หรือ "/") ออกเป็นรายการ CourseDateFields[]
 * เช่น "10-11 พ.ค., 18-22 พ.ค. 2570" -> [ช่วงที่ 1 (2 วัน), ช่วงที่ 2 (5 วัน)]
 */
export function parseCourseDateSessions(
  dateStr: string | null | undefined
): CourseDateFields[] {
  const fallback: CourseDateFields = {
    startDay: 15,
    startMonth: 4,
    endDay: 19,
    endMonth: 4,
    yearBE: 2570,
  };
  if (!dateStr || !dateStr.trim()) return [fallback];

  const yearMatches = dateStr.match(/\b(25\d{2})\b/g);
  const defaultYearBE = yearMatches
    ? parseInt(yearMatches[yearMatches.length - 1], 10)
    : 2570;

  const segments = dateStr
    .split(/[,/]/)
    .map((seg) => seg.trim())
    .filter(Boolean);

  if (segments.length === 0) return [fallback];

  const sessions = segments.map((seg) => {
    const cleaned = seg.replace(/^ช่วงที่\s*\d+\s*:\s*/, "").trim();
    const withYear = /\b25\d{2}\b/.test(cleaned)
      ? cleaned
      : `${cleaned} ${defaultYearBE}`;
    return parseCourseDateFields(withYear);
  });

  return sessions.length > 0 ? sessions : [fallback];
}

/**
 * รวมรายการช่วงวันที่หลายช่วงเป็นข้อความมาตรฐาน กกท.
 * เช่น 1 ช่วง -> "15-19 พ.ค. 2570"
 * เช่น 2 ช่วง -> "10-11 พ.ค., 18-22 พ.ค. 2570"
 */
export function formatCourseDateSessions(
  sessions: CourseDateFields[]
): string {
  if (!sessions || sessions.length === 0) {
    return "15-19 พ.ค. 2570";
  }
  if (sessions.length === 1) {
    return formatCourseDateFields(sessions[0], true);
  }

  return sessions
    .map((s, idx) => {
      const isLast = idx === sessions.length - 1;
      return formatCourseDateFields(s, isLast);
    })
    .join(", ");
}

/**
 * คำนวณค่าเริ่มต้นของ "ช่วงวันเปิดรับสมัคร" และ "วันประกาศผลผู้มีสิทธิ์เข้าอบรม"
 * อัตโนมัติจากวันเริ่มการอบรมช่วงแรก
 */
export function computeDefaultCourseScheduleFields(
  trainingSessions: CourseDateFields[]
): { regFields: CourseDateFields; resultFields: CourseDateFields } {
  const first = trainingSessions[0] ?? {
    startDay: 15,
    startMonth: 4,
    endDay: 19,
    endMonth: 4,
    yearBE: 2570,
  };
  const yearCE = first.yearBE - 543;
  const trainStart = new Date(yearCE, first.startMonth, first.startDay);

  // เปิดรับสมัคร: ล่วงหน้า 30 วัน ถึง 14 วันก่อนวันเริ่มอบรม
  const regStart = new Date(
    trainStart.getFullYear(),
    trainStart.getMonth(),
    trainStart.getDate() - 30
  );
  const regEnd = new Date(
    trainStart.getFullYear(),
    trainStart.getMonth(),
    trainStart.getDate() - 14
  );

  // วันประกาศผลรายชื่อผู้มีสิทธิ์เข้าอบรม: ล่วงหน้า 7 วันก่อนวันเริ่มอบรม
  const resDate = new Date(
    trainStart.getFullYear(),
    trainStart.getMonth(),
    trainStart.getDate() - 7
  );

  return {
    regFields: {
      startDay: regStart.getDate(),
      startMonth: regStart.getMonth(),
      endDay: regEnd.getDate(),
      endMonth: regEnd.getMonth(),
      yearBE: regEnd.getFullYear() + 543,
    },
    resultFields: {
      startDay: resDate.getDate(),
      startMonth: resDate.getMonth(),
      endDay: resDate.getDate(),
      endMonth: resDate.getMonth(),
      yearBE: resDate.getFullYear() + 543,
    },
  };
}

export function computeDefaultCourseSchedule(trainingDateStr: string): {
  registrationDate: string;
  resultDate: string;
} {
  const sessions = parseCourseDateSessions(trainingDateStr);
  const { regFields, resultFields } =
    computeDefaultCourseScheduleFields(sessions);
  return {
    registrationDate: formatCourseDateFields(regFields, true),
    resultDate: formatCourseDateFields(resultFields, true),
  };
}

export function getGlobalCourseSchedule(
  courseList: Course[] = courses
): {
  registrationDate: string;
  resultDate: string;
} {
  const sharedCourse =
    courseList.find((c) => !c.useCustomSchedule && c.registrationDate?.trim()) ??
    courseList.find((c) => c.registrationDate?.trim());

  return {
    registrationDate:
      sharedCourse?.registrationDate?.trim() ||
      DEFAULT_GLOBAL_REGISTRATION_DATE,
    resultDate:
      sharedCourse?.resultDate?.trim() || DEFAULT_GLOBAL_RESULT_DATE,
  };
}

export function getCourseScheduleDates(
  course: Pick<
    Course,
    "date" | "registrationDate" | "resultDate" | "useCustomSchedule"
  >,
  courseList?: Course[]
): {
  registrationDate: string;
  resultDate: string;
  trainingDate: string;
  isCustom: boolean;
} {
  const isCustom = Boolean(course.useCustomSchedule);
  if (isCustom && course.registrationDate?.trim() && course.resultDate?.trim()) {
    return {
      registrationDate: course.registrationDate.trim(),
      resultDate: course.resultDate.trim(),
      trainingDate: course.date,
      isCustom: true,
    };
  }

  const globalSched = getGlobalCourseSchedule(courseList);
  return {
    registrationDate: globalSched.registrationDate,
    resultDate: globalSched.resultDate,
    trainingDate: course.date,
    isCustom: false,
  };
}

export interface ParsedDateRange {
  start: Date;
  end: Date;
}

/**
 * แปลงข้อความช่วงวันที่แบบไทย单ช่วง เช่น "15-20 พ.ค. 2570" หรือ "28 พ.ค. - 2 มิ.ย. 2570"
 */
function parseSingleThaiDateRange(
  dateStr: string | null | undefined
): ParsedDateRange | null {
  if (!dateStr) return null;
  const s = dateStr.trim();

  // รูปแบบ 1: ภายในเดือนเดียวกัน เช่น "15-20 พ.ค. 2570"
  const m1 = s.match(
    /^(\d{1,2})\s*-\s*(\d{1,2})\s+([ก-๙\.]+)\s+(\d{4})$/
  );
  if (m1) {
    const startDay = parseInt(m1[1], 10);
    const endDay = parseInt(m1[2], 10);
    const month = THAI_MONTH_INDEX_MAP[m1[3]];
    if (month === undefined) return null;
    const yearBE = parseInt(m1[4], 10);
    const yearCE = yearBE > 2400 ? yearBE - 543 : yearBE;
    return {
      start: new Date(yearCE, month, startDay, 0, 0, 0),
      end: new Date(yearCE, month, endDay, 23, 59, 59),
    };
  }

  // รูปแบบ 2: ข้ามเดือน เช่น "28 พ.ค. - 2 มิ.ย. 2570"
  const m2 = s.match(
    /^(\d{1,2})\s+([ก-๙\.]+)\s*-\s*(\d{1,2})\s+([ก-๙\.]+)\s+(\d{4})$/
  );
  if (m2) {
    const startDay = parseInt(m2[1], 10);
    const startMonth = THAI_MONTH_INDEX_MAP[m2[2]];
    const endDay = parseInt(m2[3], 10);
    const endMonth = THAI_MONTH_INDEX_MAP[m2[4]];
    if (startMonth === undefined || endMonth === undefined) return null;
    const yearBE = parseInt(m2[5], 10);
    const yearCE = yearBE > 2400 ? yearBE - 543 : yearBE;
    return {
      start: new Date(yearCE, startMonth, startDay, 0, 0, 0),
      end: new Date(yearCE, endMonth, endDay, 23, 59, 59),
    };
  }

  // รูปแบบ 3: วันเดียว เช่น "15 พ.ค. 2570"
  const m3 = s.match(/^(\d{1,2})\s+([ก-๙\.]+)\s+(\d{4})$/);
  if (m3) {
    const day = parseInt(m3[1], 10);
    const month = THAI_MONTH_INDEX_MAP[m3[2]];
    if (month === undefined) return null;
    const yearBE = parseInt(m3[3], 10);
    const yearCE = yearBE > 2400 ? yearBE - 543 : yearBE;
    return {
      start: new Date(yearCE, month, day, 0, 0, 0),
      end: new Date(yearCE, month, day, 23, 59, 59),
    };
  }

  return null;
}

/**
 * แปลงข้อความช่วงวันที่แบบไทย (รองรับทั้งแบบช่วงเดียวและหลายช่วง เช่น "10-11 พ.ค., 18-22 พ.ค. 2570")
 * เป็นรายการ ParsedDateRange[] เพื่อนำไปคำนวณการซ้อนทับกันของเวลาอย่างแม่นยำรายช่วง
 */
export function parseThaiDateRanges(
  dateStr: string | null | undefined
): ParsedDateRange[] {
  if (!dateStr || !dateStr.trim()) return [];

  const yearMatches = dateStr.match(/\b(25\d{2})\b/g);
  const defaultYearBE = yearMatches
    ? parseInt(yearMatches[yearMatches.length - 1], 10)
    : 2570;

  const segments = dateStr
    .split(/[,/]/)
    .map((seg) => seg.trim())
    .filter(Boolean);

  const results: ParsedDateRange[] = [];
  for (const seg of segments) {
    const cleaned = seg.replace(/^ช่วงที่\s*\d+\s*:\s*/, "").trim();
    const withYear = /\b25\d{2}\b/.test(cleaned)
      ? cleaned
      : `${cleaned} ${defaultYearBE}`;
    const parsed = parseSingleThaiDateRange(withYear);
    if (parsed) {
      results.push(parsed);
    }
  }
  return results;
}

export function parseThaiDateRange(
  dateStr: string | null | undefined
): ParsedDateRange | null {
  const ranges = parseThaiDateRanges(dateStr);
  return ranges[0] ?? null;
}

/**
 * ตรวจสอบว่าช่วงวันที่ของหลักสูตร 2 รายการ มีการซ้อนทับกันหรือไม่ (รองรับหลายช่วงการอบรม)
 */
export function isCourseDateOverlapping(
  dateStr1: string | null | undefined,
  dateStr2: string | null | undefined
): boolean {
  const ranges1 = parseThaiDateRanges(dateStr1);
  const ranges2 = parseThaiDateRanges(dateStr2);
  if (ranges1.length === 0 || ranges2.length === 0) return false;
  return ranges1.some((r1) =>
    ranges2.some((r2) => r1.start <= r2.end && r1.end >= r2.start)
  );
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



