import type { HistoricalTrainee } from "./alumni-store";
import type { NationalAssociationMasterItem } from "./associations-store";
import type { Course } from "./courses";
import { getCoreNameKey } from "./smart-name-engine";
import {
  computeNationalAssociationCoverage,
  computeProvincialAssociationCoverage,
} from "./association-coverage";

export interface CourseCompetencyProfile {
  code: string;
  fullNameTh: string;
  category: string;
  competencySummary: string;
  keySkills: string[];
}

export interface AnnualOutcomeRecord {
  yearBE: number;
  reactionSatisfactionPct?: number | null; // Kirkpatrick Level 1
  learningPassPct?: number | null; // Kirkpatrick Level 2
  keyAchievements: string[];
  executiveNote?: string;
  updatedAt: string;
}

export interface AnnualCourseBreakdownItem {
  courseTitle: string;
  category: string;
  count: number;
  activeCount: number;
  competency: CourseCompetencyProfile;
}

export interface AnnualOutcomeMatrixRow {
  yearBE: number;
  courseCount: number;
  coursesList: AnnualCourseBreakdownItem[];
  totalRecords: number;
  uniquePersons: number;
  newTrainees: number;
  newPercentage: number;
  returningTrainees: number;
  returningPercentage: number;
  activeCount: number;
  activeRatePercent: number;
  dutiesCount: number;
  ratingsCount: number;
  averageImpactRating: number | null;
  nationalParticipated: number;
  nationalTotal: number;
  nationalCoveragePct: number;
  provincialParticipated: number;
  provincialTotal: number;
  provincialCoveragePct: number;
  byCategory: Record<string, number>;
  adminRecord?: AnnualOutcomeRecord;
}

export interface AggregatedAdminMetrics {
  avgReactionPct: number | null;
  reactionCount: number;
  avgLearningPct: number | null;
  learningCount: number;
  recordedYearsCount: number;
  recentHighlights: { yearBE: number; text: string }[];
}

export const HISTORICAL_COURSE_COMPETENCIES: Record<string, CourseCompetencyProfile> = {
  TSLP: {
    code: "TSLP",
    fullNameTh: "หลักสูตรผู้นำกีฬาขั้นสูง (Thailand Sports Leadership Program)",
    category: "ผู้บริหารกีฬา",
    competencySummary:
      "พัฒนานักบริหารและผู้นำองค์กรกีฬาระดับสูง ให้มีวิสัยทัศน์เชิงยุทธศาสตร์ การตัดสินใจเชิงนโยบาย และเครือข่ายความร่วมมือระดับประเทศ",
    keySkills: [
      "การวางยุทธศาสตร์องค์กรกีฬา",
      "ภาวะผู้นำระดับสูงและเครือข่าย",
      "การขับเคลื่อนนโยบายกีฬาเพื่อความเป็นเลิศ",
    ],
  },
  GGE: {
    code: "GGE",
    fullNameTh: "หลักสูตรธรรมาภิบาลในองค์กรกีฬา (Good Governance in Sports)",
    category: "ผู้บริหารกีฬา",
    competencySummary:
      "เสริมสร้างระบบบริหารจัดการองค์กรกีฬาอย่างโปร่งใส ตรวจสอบได้ ถูกกฎหมายกีฬา และสอดคล้องกับมาตรฐานธรรมาภิบาลภาครัฐและสากล",
    keySkills: [
      "หลักธรรมาภิบาลและความโปร่งใส",
      "การบริหารความเสี่ยงและกฎหมายกีฬา",
      "การจัดการข้อพิพาทและจริยธรรมองค์กร",
    ],
  },
  Olympic: {
    code: "Olympic",
    fullNameTh: "หลักสูตรการบริหารจัดการองค์กรกีฬาตามแนวทางโอลิมปิกสากล",
    category: "อื่นๆ",
    competencySummary:
      "ถ่ายทอดโครงสร้างและมาตรฐานสากลของขบวนการโอลิมปิก ทั้งระบบการบริหารสมาคม การวางแผนเตรียมทีม และคุณค่าโอลิมปิก",
    keySkills: [
      "โครงสร้างโอลิมปิกและสหพันธ์กีฬานานาชาติ",
      "คุณค่าโอลิมปิกและ Fair Play",
      "การประสานงานมหกรรมกีฬานานาชาติ",
    ],
  },
  ICSM: {
    code: "ICSM",
    fullNameTh:
      "หลักสูตรผู้บริหารกีฬาขั้นสูงระดับนานาชาติ (International Certificate in Sports Management)",
    category: "ผู้บริหารกีฬา",
    competencySummary:
      "ยกระดับขีดความสามารถผู้บริหารและบุคลากรสมาคมกีฬาด้านการจัดการองค์กร การวางแผนโครงการ และมาตรฐานการบริหารจัดการกีฬาสากล",
    keySkills: [
      "การจัดการองค์กรกีฬาสมัยใหม่",
      "การวางแผนกลยุทธ์และทรัพยากร",
      "มาตรฐานการประสานงานระดับสากล",
    ],
  },
  ICSC: {
    code: "ICSC",
    fullNameTh:
      "หลักสูตรผู้ฝึกสอนกีฬาระดับนานาชาติ (International Coaching / Sports Coaching)",
    category: "ผู้ฝึกสอนกีฬา",
    competencySummary:
      "ยกระดับผู้ฝึกสอนกีฬาไทยให้มีหลักการออกแบบโปรแกรมฝึกซ้อม การวิเคราะห์สมรรถนะ และการดูแลนักกีฬาตามมาตรฐานโค้ชระดับนานาชาติ",
    keySkills: [
      "การออกแบบแผนการฝึกซ้อมระยะยาว",
      "การประเมินสมรรถนะและแท็กติก",
      "จรรยาบรรณและความปลอดภัยนักกีฬา",
    ],
  },
  "HCDP-ICSM": {
    code: "HCDP-ICSM",
    fullNameTh:
      "หลักสูตรพัฒนาสมรรถนะขั้นสูงสำหรับผู้บริหารกีฬา (High Competency Development Program - ICSM)",
    category: "ผู้บริหารกีฬา",
    competencySummary:
      "ต่อยอดสมรรถนะผู้บริหารกีฬาสู่ระดับสูง เพื่อยกระดับประสิทธิภาพการดำเนินงานของสมาคมกีฬาและหน่วยงานในเครือข่าย กกท.",
    keySkills: [
      "การบริหารโครงการกีฬาขั้นสูง",
      "การพัฒนาคุณภาพการดำเนินงานสมาคม",
      "การสื่อสารและภาวะผู้นำ",
    ],
  },
  "HCDP-ICSC": {
    code: "HCDP-ICSC",
    fullNameTh:
      "หลักสูตรพัฒนาสมรรถนะขั้นสูงสำหรับผู้ฝึกสอนกีฬา (High Competency Development Program - ICSC)",
    category: "ผู้ฝึกสอนกีฬา",
    competencySummary:
      "เพิ่มพูนทักษะเชิงลึกให้ผู้ฝึกสอนที่ผ่านระดับพื้นฐาน เพื่อยกระดับขีดความสามารถในการปั้นนักกีฬาสู่เวทีระดับชาติและนานาชาติ",
    keySkills: [
      "เทคนิคการฝึกสอนเฉพาะทางขั้นสูง",
      "การเตรียมความพร้อมนักกีฬาสู่แข่งขัน",
      "การบริหารทีมผู้ฝึกสอน",
    ],
  },
  "National classifier": {
    code: "National classifier",
    fullNameTh:
      "หลักสูตรการจัดระดับความพิการทางการกีฬาระดับชาติ (National Classifier for Para Sports)",
    category: "อื่นๆ",
    competencySummary:
      "ผลิตผู้เชี่ยวชาญการประเมินและจัดระดับความพิการทางการกีฬาระดับชาติ รองรับการแข่งขันกีฬาคนพิการให้เป็นไปตามกติกาพาราลิมปิกสากล",
    keySkills: [
      "เกณฑ์การจัดระดับความพิการตามมาตรฐานสากล",
      "จริยธรรมและความเป็นกลางของผู้จัดระดับ",
      "การปฏิบัติหน้าที่จริงในสนามแข่งคนพิการ",
    ],
  },
  "การพัฒนาบุคลากรกีฬาสู่นักบริหารจัดการองค์กรกีฬาเพื่อความยั่งยืน": {
    code: "การพัฒนาบุคลากรกีฬาสู่นักบริหารจัดการองค์กรกีฬาเพื่อความยั่งยืน",
    fullNameTh:
      "หลักสูตรการพัฒนาบุคลากรกีฬาสู่นักบริหารจัดการองค์กรกีฬาเพื่อความยั่งยืน",
    category: "อื่นๆ",
    competencySummary:
      "สร้างนักบริหารจัดการองค์กรกีฬารุ่นใหม่ที่พร้อมขับเคลื่อนองค์กรสู่ความยั่งยืน ทั้งด้านการบริหารคน การเงิน ความโปร่งใส และการเชื่อมโยงชุมชน",
    keySkills: [
      "การวางแผนพัฒนาองค์กรกีฬาอย่างยั่งยืน",
      "การบูรณาการงานบริหารและเครือข่ายภาคี",
      "การประเมินผลสัมฤทธิ์องค์กร",
    ],
  },
  Bnc: {
    code: "Bnc",
    fullNameTh:
      "หลักสูตรพื้นฐานสำหรับบุคลากรและผู้จัดระดับความพิการทางการกีฬา (Basic National Classifier)",
    category: "อื่นๆ",
    competencySummary:
      "สร้างฐานบุคลากรและเครือข่ายด้านกีฬาคนพิการในภูมิภาค ให้เข้าใจหลักพื้นฐานการจำแนกประเภทและสนับสนุนการจัดการแข่งขันคนพิการ",
    keySkills: [
      "ความรู้พื้นฐานระบบกีฬาคนพิการ",
      "แนวทางการประเมินเบื้องต้นตามหลักวิชาการ",
      "การประสานงานระดับจังหวัดและสถานศึกษา",
    ],
  },
  SSCC: {
    code: "SSCC",
    fullNameTh:
      "หลักสูตรผู้ฝึกสอนกีฬาระดับเฉพาะทางและสมรรถนะการฝึกซ้อม (Sports Specific Coaching Course)",
    category: "ผู้ฝึกสอนกีฬา",
    competencySummary:
      "เสริมทักษะการวางแผนฝึกซ้อมเฉพาะชนิดกีฬา การพัฒนาทักษะทางเทคนิค และการป้องกันการบาดเจ็บในนักกีฬาแข่งขัน",
    keySkills: [
      "ศาสตร์และศิลป์การฝึกสอนเฉพาะชนิดกีฬา",
      "การวิเคราะห์ข้อผิดพลาดเทคนิค",
      "การฟื้นฟูและป้องกันการบาดเจ็บ",
    ],
  },
  PSCE: {
    code: "PSCE",
    fullNameTh:
      "หลักสูตรการพัฒนาศักยภาพผู้ฝึกสอนกีฬาสู่ความเป็นเลิศ (Professional Sports Coaching Excellence)",
    category: "ผู้ฝึกสอนกีฬา",
    competencySummary:
      "เตรียมความพร้อมผู้ฝึกสอนมืออาชีพสู่ความเป็นเลิศ ด้านการบริหารแผนการซ้อม การวิเคราะห์เกมแข่งขัน และภาวะผู้นำข้างสนาม",
    keySkills: [
      "การวางแผนฝึกซ้อมมุ่งเน้นผลแข่งขัน",
      "จิตวิทยาและแรงจูงใจนักกีฬา",
      "การปรับแท็กติกระหว่างแข่งขัน",
    ],
  },
  PSAAD: {
    code: "PSAAD",
    fullNameTh:
      "หลักสูตรการพัฒนาสมรรถนะผู้บริหารสมาคมกีฬาแห่งประเทศไทย (PSAAD)",
    category: "ผู้บริหารกีฬา",
    competencySummary:
      "เพิ่มศักยภาพเจ้าหน้าที่และผู้บริหารสมาคมกีฬาแห่งประเทศไทยด้านการบริหารงานสมาคม ระบบเอกสารราชการ การเบิกจ่าย และการรายงานผล",
    keySkills: [
      "การบริหารงานสมาคมกีฬาแห่งประเทศไทย",
      "การจัดทำแผนงานและงบประมาณสมาคม",
      "มาตรฐานการประสานงานกับ กกท.",
    ],
  },
  "PSAAD-ISPEP": {
    code: "PSAAD-ISPEP",
    fullNameTh:
      "หลักสูตรพัฒนาผู้บริหารสมาคมกีฬาร่วมกับมาตรฐานนานาชาติ (PSAAD - ISPEP)",
    category: "ผู้บริหารกีฬา",
    competencySummary:
      "ยกระดับผู้บริหารสมาคมกีฬาไทยสู่กรอบการบริหารจัดการกีฬาระดับนานาชาติ การพัฒนาความเป็นเลิศอย่างเป็นระบบ และระบบประกันคุณภาพองค์กร",
    keySkills: [
      "ระบบบริหารจัดการสมาคมกีฬาระดับสากล",
      "การเชื่อมโยงยุทธศาสตร์สู่ความเป็นเลิศ",
      "การประเมินประสิทธิภาพองค์กร",
    ],
  },
  "TSL-ISPEP": {
    code: "TSL-ISPEP",
    fullNameTh:
      "หลักสูตรผู้นำกีฬาไทยสู่เวทีสากล (Thailand Sports Leaders - ISPEP)",
    category: "ผู้บริหารกีฬา",
    competencySummary:
      "พัฒนาผู้นำกีฬาระดับแนวหน้าให้พร้อมปฏิบัติงานในเวทีนานาชาติ ทั้งการบริหารความร่วมมือ การเป็นเจ้าภาพ และเครือข่ายกีฬาภูมิภาค",
    keySkills: [
      "ภาวะผู้นำกีฬาระดับนานาชาติ",
      "การเจรจาและความร่วมมือระหว่างประเทศ",
      "ยุทธศาสตร์ความเป็นเลิศทางการกีฬา",
    ],
  },
  "Lv.1": {
    code: "Lv.1",
    fullNameTh: "หลักสูตรพัฒนามาตรฐานบุคลากรกีฬาระดับ 1 (Level 1 Foundation)",
    category: "อื่นๆ",
    competencySummary:
      "ปูพื้นฐานมาตรฐานการทำงานบุคลากรกีฬาขั้นต้น เพื่อให้สามารถสนับสนุนกิจกรรมกีฬาและการแข่งขันในองค์กรได้อย่างถูกต้อง",
    keySkills: [
      "ความรู้พื้นฐานการดำเนินงานกีฬา",
      "บทบาทหน้าที่และความปลอดภัยเบื้องต้น",
      "การทำงานร่วมกับเครือข่ายกีฬา",
    ],
  },
  Switzerland: {
    code: "Switzerland",
    fullNameTh:
      "หลักสูตรศึกษาดูงานและแลกเปลี่ยนการบริหารองค์กรกีฬานานาชาติ (สวิตเซอร์แลนด์)",
    category: "อื่นๆ",
    competencySummary:
      "แลกเปลี่ยนองค์ความรู้และนวัตกรรมการบริหารองค์กรกีฬาระดับโลกจากศูนย์กลางกีฬาโอลิมปิกและสหพันธ์กีฬานานาชาติ ณ ประเทศสวิตเซอร์แลนด์",
    keySkills: [
      "โมเดลการบริหารสหพันธ์กีฬาระดับโลก",
      "ธรรมาภิบาลและสิทธิประโยชน์กีฬาสากล",
      "การนำแนวปฏิบัติสากลมาปรับใช้ในไทย",
    ],
  },
};

export function getCourseCompetencyInfo(
  courseTitle: string,
  liveCourses?: Course[],
  categoryFallback?: string
): CourseCompetencyProfile {
  const cleanTitle = (courseTitle || "").trim();

  if (Array.isArray(liveCourses) && cleanTitle) {
    const matchedLive = liveCourses.find(
      (c) =>
        c.title?.trim() === cleanTitle ||
        c.shortTitle?.trim() === cleanTitle ||
        (cleanTitle.length >= 4 && c.title?.includes(cleanTitle))
    );
    if (matchedLive && matchedLive.courseObjective?.trim()) {
      return {
        code: cleanTitle,
        fullNameTh: matchedLive.title,
        category: categoryFallback || "หลักสูตรพัฒนาบุคลากรกีฬา",
        competencySummary: matchedLive.courseObjective.trim(),
        keySkills:
          Array.isArray(matchedLive.evaluationCriteria) &&
          matchedLive.evaluationCriteria.length > 0
            ? matchedLive.evaluationCriteria.slice(0, 3)
            : ["พัฒนาสมรรถนะตามเกณฑ์การกีฬาแห่งประเทศไทย"],
      };
    }
  }

  if (HISTORICAL_COURSE_COMPETENCIES[cleanTitle]) {
    return HISTORICAL_COURSE_COMPETENCIES[cleanTitle];
  }

  const lowerKey = cleanTitle.toLowerCase();
  const ciHit = Object.entries(HISTORICAL_COURSE_COMPETENCIES).find(
    ([k]) => k.toLowerCase() === lowerKey
  );
  if (ciHit) return ciHit[1];

  return {
    code: cleanTitle || "หลักสูตร กกท.",
    fullNameTh: cleanTitle || "หลักสูตรพัฒนาบุคลากรกีฬา กกท.",
    category: categoryFallback || "อื่นๆ",
    competencySummary:
      "พัฒนาสมรรถนะบุคลากรกีฬาตามมาตรฐานกองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย",
    keySkills: [
      "พัฒนาองค์ความรู้เฉพาะด้านการกีฬา",
      "ยกระดับมาตรฐานการปฏิบัติหน้าที่ในหน่วยงาน",
    ],
  };
}

function getSafePersonKey(t: HistoricalTrainee): string {
  if (t.personnelId && t.personnelId.trim()) {
    return t.personnelId.trim();
  }
  const cleanId = t.idCard ? t.idCard.replace(/\D/g, "") : "";
  if (cleanId.length === 13) {
    return cleanId;
  }
  return `name_${getCoreNameKey(t.name)}`;
}

export function computeAnnualOutcomesMatrix(
  trainees: HistoricalTrainee[],
  masterAssociations: NationalAssociationMasterItem[],
  annualRecords: Record<number, AnnualOutcomeRecord>,
  liveCourses?: Course[]
): AnnualOutcomeMatrixRow[] {
  const firstYearByPerson = new Map<string, number>();
  const traineesByYear = new Map<number, HistoricalTrainee[]>();

  for (const t of trainees) {
    const pKey = getSafePersonKey(t);
    const prevFirst = firstYearByPerson.get(pKey);
    if (prevFirst === undefined || t.yearBE < prevFirst) {
      firstYearByPerson.set(pKey, t.yearBE);
    }
    const yrList = traineesByYear.get(t.yearBE);
    if (yrList) {
      yrList.push(t);
    } else {
      traineesByYear.set(t.yearBE, [t]);
    }
  }

  const years = Array.from(traineesByYear.keys()).sort((a, b) => b - a);
  const rows: AnnualOutcomeMatrixRow[] = [];

  for (const yearBE of years) {
    const yearTrainees = traineesByYear.get(yearBE) || [];
    const totalRecords = yearTrainees.length;
    const uniquePersonKeys = new Set<string>();
    const newPersonKeys = new Set<string>();
    const returningPersonKeys = new Set<string>();
    const byCategory: Record<string, number> = {};
    const courseMap = new Map<
      string,
      { category: string; count: number; activeCount: number }
    >();

    let activeCount = 0;
    let dutiesCount = 0;
    let ratingSum = 0;
    let ratingsCount = 0;

    for (const t of yearTrainees) {
      const pKey = getSafePersonKey(t);
      uniquePersonKeys.add(pKey);
      if (firstYearByPerson.get(pKey) === yearBE) {
        newPersonKeys.add(pKey);
      } else {
        returningPersonKeys.add(pKey);
      }

      if (t.status === "active") activeCount += 1;

      const cat = t.courseCategory || "อื่นๆ";
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      const cTitle = t.courseTitle || "ไม่ระบุหลักสูตร";
      const prevCourse = courseMap.get(cTitle);
      if (prevCourse) {
        prevCourse.count += 1;
        if (t.status === "active") prevCourse.activeCount += 1;
      } else {
        courseMap.set(cTitle, {
          category: cat,
          count: 1,
          activeCount: t.status === "active" ? 1 : 0,
        });
      }

      const duties = Array.isArray(t.duties) ? t.duties : [];
      dutiesCount += duties.length;
      for (const d of duties) {
        if (
          typeof d.impactRating === "number" &&
          d.impactRating >= 1 &&
          d.impactRating <= 5
        ) {
          ratingSum += d.impactRating;
          ratingsCount += 1;
        }
      }
    }

    const uniquePersons = uniquePersonKeys.size;
    const newTrainees = newPersonKeys.size;
    const returningTrainees = returningPersonKeys.size;

    const natCov = computeNationalAssociationCoverage(
      yearTrainees,
      masterAssociations,
      "all"
    );
    const provCov = computeProvincialAssociationCoverage(yearTrainees, "all");

    const coursesList: AnnualCourseBreakdownItem[] = Array.from(courseMap.entries())
      .map(([courseTitle, val]) => ({
        courseTitle,
        category: val.category,
        count: val.count,
        activeCount: val.activeCount,
        competency: getCourseCompetencyInfo(courseTitle, liveCourses, val.category),
      }))
      .sort((a, b) => b.count - a.count || a.courseTitle.localeCompare(b.courseTitle, "th"));

    rows.push({
      yearBE,
      courseCount: coursesList.length,
      coursesList,
      totalRecords,
      uniquePersons,
      newTrainees,
      newPercentage:
        uniquePersons > 0 ? Math.round((newTrainees / uniquePersons) * 1000) / 10 : 0,
      returningTrainees,
      returningPercentage:
        uniquePersons > 0
          ? Math.round((returningTrainees / uniquePersons) * 1000) / 10
          : 0,
      activeCount,
      activeRatePercent:
        totalRecords > 0 ? Math.round((activeCount / totalRecords) * 100) : 0,
      dutiesCount,
      ratingsCount,
      averageImpactRating:
        ratingsCount > 0 ? Math.round((ratingSum / ratingsCount) * 10) / 10 : null,
      nationalParticipated: natCov.summary.participatedCount,
      nationalTotal: natCov.summary.totalMaster,
      nationalCoveragePct: natCov.summary.coveragePercent,
      provincialParticipated: provCov.summary.participatedCount,
      provincialTotal: provCov.summary.totalMaster,
      provincialCoveragePct: provCov.summary.coveragePercent,
      byCategory,
      adminRecord: annualRecords[yearBE],
    });
  }

  return rows;
}

export function computeAggregatedAdminMetrics(
  records: Record<number, AnnualOutcomeRecord>
): AggregatedAdminMetrics {
  const list = Object.values(records).sort((a, b) => b.yearBE - a.yearBE);
  let reactionSum = 0;
  let reactionCount = 0;
  let learningSum = 0;
  let learningCount = 0;
  const recentHighlights: { yearBE: number; text: string }[] = [];

  for (const rec of list) {
    if (
      typeof rec.reactionSatisfactionPct === "number" &&
      Number.isFinite(rec.reactionSatisfactionPct)
    ) {
      reactionSum += rec.reactionSatisfactionPct;
      reactionCount += 1;
    }
    if (
      typeof rec.learningPassPct === "number" &&
      Number.isFinite(rec.learningPassPct)
    ) {
      learningSum += rec.learningPassPct;
      learningCount += 1;
    }
    if (Array.isArray(rec.keyAchievements)) {
      for (const text of rec.keyAchievements) {
        if (text && text.trim()) {
          recentHighlights.push({ yearBE: rec.yearBE, text: text.trim() });
        }
      }
    }
  }

  return {
    avgReactionPct:
      reactionCount > 0 ? Math.round((reactionSum / reactionCount) * 10) / 10 : null,
    reactionCount,
    avgLearningPct:
      learningCount > 0 ? Math.round((learningSum / learningCount) * 10) / 10 : null,
    learningCount,
    recordedYearsCount: list.length,
    recentHighlights,
  };
}
