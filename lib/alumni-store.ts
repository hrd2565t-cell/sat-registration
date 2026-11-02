"use client";

import { useSyncExternalStore } from "react";

export interface DutyRecord {
  id: string;
  traineeId: string;
  idCard: string;
  eventName: string;
  role: string;
  startDate: string;
  endDate: string;
  organization: string;
  location?: string;
  achievement?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  knowledgeApplied?: string; // ข้อคำถาม: ท่านได้นำเอาความรู้ที่ได้จากการอบรม ไปใช้ในการปฏิบัติหน้าที่อย่างไร
  knowledgeDimensions?: string[]; // มิติความรู้: planning, rules, science, psychology, management
  impactRating?: number; // ระดับประสิทธิผล (1..5 ดาว)
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface KnowledgeDimension {
  key: string;
  label: string;
  icon: string;
}

export const KNOWLEDGE_DIMENSIONS: KnowledgeDimension[] = [
  { key: "planning", label: "การวางแผนและโปรแกรมการฝึกซ้อม (Periodization & Planning)", icon: "⚙️" },
  { key: "rules", label: "กฎ กติกามาตรฐานสากลและความยุติธรรม (Rules & Fair Play)", icon: "⚖️" },
  { key: "science", label: "วิทยาศาสตร์การกีฬา โภชนาการ และการป้องกันบาดเจ็บ (Sports Science)", icon: "🔬" },
  { key: "psychology", label: "จิตวิทยาการกีฬาและการสร้างแรงจูงใจ (Sport Psychology)", icon: "🧠" },
  { key: "management", label: "การบริหารจัดการองค์กรกีฬาและงบประมาณ (Sports Management)", icon: "📊" },
];

export interface HistoricalTrainee {
  id: string;
  idCard: string; // 13 digits unique citizen id
  name: string;
  gender?: "male" | "female";
  phone: string;
  email: string;
  affiliation: string; // 5 target groups or organization
  sportsType: string;
  yearBE: number; // 2565..2570
  courseId?: number;
  courseTitle: string;
  batch: string; // e.g. "รุ่นที่ 1/2566"
  certNo: string; // e.g. "กกท.-ผฝ.66/001"
  passedDate: string; // e.g. "2023-08-20"
  status: "active" | "inactive" | "pending_verification";
  avatarUrl?: string;
  duties: DutyRecord[];
  createdAt: string;
  updatedAt: string;
}

export const SPORTS_TYPES = [
  "ฟุตบอล",
  "วอลเลย์บอล",
  "มวยสากล",
  "กรีฑา",
  "ว่ายน้ำ",
  "บาสเกตบอล",
  "แบดมินตัน",
  "เทควันโด",
  "เซปักตะกร้อ",
  "เทเบิลเทนนิส",
  "ยกน้ำหนัก",
  "ยิงปืน",
  "จักรยาน",
  "เรือพาย",
  "ยิมนาสติก",
  "กีฬาอื่นๆ",
] as const;

export const PAST_YEARS_BE = [2570, 2569, 2568, 2567, 2566, 2565] as const;

export const STANDARD_COURSES = [
  "หลักสูตร ผู้ฝึกสอนกีฬาระดับชาติ",
  "หลักสูตร ผู้ตัดสินกีฬาอาชีพ",
  "หลักสูตร วิทยาศาสตร์การกีฬาและการพัฒนานักกีฬาสู่ความเป็นเลิศ",
  "หลักสูตร การเสริมสร้างศักยภาพการบริหารจัดการองค์กรกีฬา",
  "หลักสูตร จิตวิทยาการกีฬาเพื่อความเป็นเลิศ",
  "หลักสูตร การบริหารงบประมาณและพัสดุทางการกีฬา",
] as const;

// 32 Realistic Seed Trainees across 2566-2569
export const SEED_TRAINEES: HistoricalTrainee[] = [
  {
    id: "trn-66-001",
    idCard: "1100500123456",
    name: "นาย กิตติศักดิ์ ชัยชนะ",
    gender: "male",
    phone: "081-234-5678",
    email: "kittisak.c@sat-coach.org",
    affiliation: "สมาคมกีฬาแห่งประเทศไทย",
    sportsType: "ฟุตบอล",
    yearBE: 2566,
    courseId: 1,
    courseTitle: "หลักสูตร ผู้ฝึกสอนกีฬาระดับชาติ",
    batch: "รุ่นที่ 1/2566",
    certNo: "กกท.-ผฝ.66/008",
    passedDate: "2023-03-15",
    status: "active",
    duties: [
      {
        id: "duty-001",
        traineeId: "trn-66-001",
        idCard: "1100500123456",
        eventName: "การแข่งขันกีฬาแห่งชาติ ครั้งที่ 48 'กาญจนบุรีเกมส์'",
        role: "หัวหน้าผู้ฝึกสอนทีมฟุตบอลชาย",
        startDate: "2023-08-14",
        endDate: "2023-08-29",
        organization: "สมาคมกีฬาแห่งจังหวัดชลบุรี",
        location: "สนามกีฬา จ.กาญจนบุรี",
        achievement: "นำทีมคว้าเหรียญเงิน ฟุตบอลชาย",
        knowledgeApplied: "นำแบบแผนการฝึกซ้อม Periodization และการวิเคราะห์แท็กติกคู่แข่งแบบ Match Analysis มาปรับใช้กับนักกีฬาเยาวชน ทำให้ทีมวางแผนการเล่นในแต่ละแมตช์ได้อย่างรัดกุม",
        knowledgeDimensions: ["planning", "science"],
        impactRating: 5,
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2023-09-02",
        createdAt: "2023-09-01T10:00:00Z",
      },
      {
        id: "duty-002",
        traineeId: "trn-66-001",
        idCard: "1100500123456",
        eventName: "ฟุตบอลเยาวชนชิงแชมป์ประเทศไทย U-17 ประจำปี 2567",
        role: "หัวหน้าผู้ฝึกสอน",
        startDate: "2024-05-10",
        endDate: "2024-05-22",
        organization: "สมาคมกีฬาฟุตบอลแห่งประเทศไทยฯ",
        location: "ศูนย์ฝึกกีฬา กกท. มวกเหล็ก",
        achievement: "ผ่านเข้าสู่รอบ 4 ทีมสุดท้าย",
        knowledgeApplied: "นำระเบียบวินัยการสร้างทีมเวิร์กและการวางระบบเกมรับแบบโซนที่ได้รับจากการอบรมมาฝึกซ้อมจำลองสถานการณ์จริง",
        knowledgeDimensions: ["planning", "psychology"],
        impactRating: 5,
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2024-05-25",
        createdAt: "2024-05-24T14:30:00Z",
      },
    ],
    createdAt: "2023-03-16T08:00:00Z",
    updatedAt: "2024-05-25T14:30:00Z",
  },
  {
    id: "trn-66-002",
    idCard: "3101700987654",
    name: "นางสาว พิมลวรรณ สุวรรณรัตน์",
    gender: "female",
    phone: "089-876-5432",
    email: "pimonwan.s@sat-referee.org",
    affiliation: "สมาคมกีฬาแห่งประเทศไทย",
    sportsType: "วอลเลย์บอล",
    yearBE: 2566,
    courseId: 2,
    courseTitle: "หลักสูตร ผู้ตัดสินกีฬาอาชีพ",
    batch: "รุ่นที่ 1/2566",
    certNo: "กกท.-ผต.66/014",
    passedDate: "2023-04-20",
    status: "active",
    duties: [
      {
        id: "duty-003",
        traineeId: "trn-66-002",
        idCard: "3101700987654",
        eventName: "วอลเลย์บอลไทยแลนด์ลีก ประจำฤดูกาล 2023-2024",
        role: "ผู้ตัดสินที่ 1 (First Referee)",
        startDate: "2023-11-10",
        endDate: "2024-02-18",
        organization: "สมาคมกีฬาวอลเลย์บอลแห่งประเทศไทย",
        location: "เอ็มซีซี ฮอลล์ เดอะมอลล์ โคราช",
        achievement: "ปฏิบัติหน้าที่นัดชิงชนะเลิศอันดับ 3 อย่างถูกต้องตามมาตรฐาน FIVB",
        knowledgeApplied: "นำหลักการสื่อสารและการควบคุมเกมตามมาตรฐาน FIVB รวมทั้งการทำงานร่วมกันกับผู้ตัดสินผู้ช่วยและ Challenge System มาใช้จริงในการตัดสินนัดสำคัญ ทำให้ไม่มีข้อกังขาหรือประท้วง",
        knowledgeDimensions: ["rules", "psychology"],
        impactRating: 5,
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2024-02-25",
        createdAt: "2024-02-20T09:00:00Z",
      },
    ],
    createdAt: "2023-04-21T08:00:00Z",
    updatedAt: "2024-02-25T09:00:00Z",
  },
  {
    id: "trn-66-003",
    idCard: "1409900234567",
    name: "ร้อยตำรวจเอก สมชาย มงคลชัย",
    gender: "male",
    phone: "086-555-1234",
    email: "somchai.m@sat-sports.org",
    affiliation: "การกีฬาแห่งประเทศไทย",
    sportsType: "มวยสากล",
    yearBE: 2566,
    courseId: 1,
    courseTitle: "หลักสูตร ผู้ฝึกสอนกีฬาระดับชาติ",
    batch: "รุ่นที่ 2/2566",
    certNo: "กกท.-ผฝ.66/032",
    passedDate: "2023-06-18",
    status: "active",
    duties: [
      {
        id: "duty-004",
        traineeId: "trn-66-003",
        idCard: "1409900234567",
        eventName: "การแข่งขันมวยสากลชิงชนะเลิศแห่งประเทศไทย ประจำปี 2567",
        role: "ผู้ฝึกสอนประจำมุม (Cornerman)",
        startDate: "2024-07-02",
        endDate: "2024-07-08",
        organization: "สมาคมกีฬามวยสากลแห่งประเทศไทย",
        location: "สนามกีฬาแห่งชาติ ปทุมวัน",
        achievement: "นักกีฬาในสังกัดได้เหรียญทองรุ่นไลท์เวท",
        knowledgeApplied: "นำหลักวิทยาศาสตร์การกีฬาด้านการฟื้นฟูกล้ามเนื้อและเทคนิคการตัดน้ำหนักอย่างถูกวิธีมาใช้กับนักมวย ทำให้ในวันชกนักกีฬามีความสมบูรณ์ของร่างกาย 100% ไม่อ่อนแรง",
        knowledgeDimensions: ["science", "planning"],
        impactRating: 5,
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2024-07-15",
        createdAt: "2024-07-10T11:00:00Z",
      },
    ],
    createdAt: "2023-06-19T08:00:00Z",
    updatedAt: "2024-07-15T11:00:00Z",
  },
  {
    id: "trn-66-004",
    idCard: "1509900345678",
    name: "ดร. กฤษดา ศิริวัฒน์",
    gender: "male",
    phone: "084-111-9988",
    email: "kritsada.s@sci-sport.org",
    affiliation: "สมาคมกีฬาแห่งจังหวัด",
    sportsType: "กรีฑา",
    yearBE: 2566,
    courseId: 3,
    courseTitle: "หลักสูตร วิทยาศาสตร์การกีฬาและการพัฒนานักกีฬาสู่ความเป็นเลิศ",
    batch: "รุ่นที่ 1/2566",
    certNo: "กกท.-วก.66/005",
    passedDate: "2023-05-10",
    status: "active",
    duties: [
      {
        id: "duty-005",
        traineeId: "trn-66-004",
        idCard: "1509900345678",
        eventName: "การทดสอบสมรรถภาพทางกายนักกรีฑาทีมชาติไทย เตรียมซีเกมส์",
        role: "นักสรีรวิทยาการกีฬาและประเมินสมรรถภาพ",
        startDate: "2024-03-01",
        endDate: "2024-03-05",
        organization: "การกีฬาแห่งประเทศไทย (ฝ่ายวิทยาศาสตร์การกีฬา)",
        location: "ศูนย์วิทยาศาสตร์การกีฬา กกท. หัวหมาก",
        achievement: "จัดทำแผนโภชนาการและการฟื้นฟูสมรรถภาพแก่นักกีฬา 24 คน",
        knowledgeApplied: "นำเครื่องมือทดสอบสมรรถภาพและการวิเคราะห์ Lactate Threshold มาประเมินความล้าของนักกรีฑาระยะกลาง-ไกล เพื่อปรับตารางการซ้อมรายบุคคลให้เกิดผลสูงสุด",
        knowledgeDimensions: ["science"],
        impactRating: 5,
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2024-03-10",
        createdAt: "2024-03-08T15:00:00Z",
      },
    ],
    createdAt: "2023-05-11T08:00:00Z",
    updatedAt: "2024-03-10T15:00:00Z",
  },
  {
    id: "trn-66-005",
    idCard: "3100200456789",
    name: "นาง วรรณภา เจริญผล",
    gender: "female",
    phone: "082-345-6789",
    email: "wannapha.c@sat-manage.org",
    affiliation: "การกีฬาแห่งประเทศไทย",
    sportsType: "ว่ายน้ำ",
    yearBE: 2566,
    courseId: 4,
    courseTitle: "หลักสูตร การเสริมสร้างศักยภาพการบริหารจัดการองค์กรกีฬา",
    batch: "รุ่นที่ 1/2566",
    certNo: "กกท.-บห.66/021",
    passedDate: "2023-07-25",
    status: "active",
    duties: [
      {
        id: "duty-006",
        traineeId: "trn-66-005",
        idCard: "3100200456789",
        eventName: "การแข่งขันว่ายน้ำชิงชนะเลิศแห่งประเทศไทย ประจำปี 2567",
        role: "ผู้อำนวยการจัดการแข่งขัน (Tournament Director)",
        startDate: "2024-04-05",
        endDate: "2024-04-10",
        organization: "สมาคมกีฬาทางน้ำแห่งประเทศไทย",
        location: "สระว่ายน้ำ มหาวิทยาลัยอัสสัมชัญ สุวรรณภูมิ",
        achievement: "บริหารจัดการงบประมาณและบุคลากรการแข่งขันราบรื่นตามมาตรฐานสากล",
        knowledgeApplied: "นำทักษะการบริหารงบประมาณโครงการและการบริหารความเสี่ยงมาปรับใช้ในการจัดการแข่งขันว่ายน้ำ ทำให้ควบคุมค่าใช้จ่ายได้ตามกรอบงบประมาณ กกท. และลดขั้นตอนการเบิกจ่าย",
        knowledgeDimensions: ["management"],
        impactRating: 4,
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2024-04-18",
        createdAt: "2024-04-15T16:00:00Z",
      },
    ],
    createdAt: "2023-07-26T08:00:00Z",
    updatedAt: "2024-04-18T16:00:00Z",
  },
  {
    id: "trn-67-001",
    idCard: "1103700567890",
    name: "นาย เอกชัย วงศ์สว่าง",
    gender: "male",
    phone: "085-678-1234",
    email: "ekkachai.w@sat-coach.org",
    affiliation: "สมาคมกีฬาแห่งจังหวัด",
    sportsType: "บาสเกตบอล",
    yearBE: 2567,
    courseId: 1,
    courseTitle: "หลักสูตร ผู้ฝึกสอนกีฬาระดับชาติ",
    batch: "รุ่นที่ 1/2567",
    certNo: "กกท.-ผฝ.67/005",
    passedDate: "2024-02-28",
    status: "active",
    duties: [
      {
        id: "duty-007",
        traineeId: "trn-67-001",
        idCard: "1103700567890",
        eventName: "การแข่งขันกีฬาเยาวชนแห่งชาติ ครั้งที่ 39 'ราชบุรีเกมส์'",
        role: "ผู้ฝึกสอนบาสเกตบอล 3x3 ทีมหญิง",
        startDate: "2024-03-21",
        endDate: "2024-03-31",
        organization: "สมาคมกีฬาแห่งจังหวัดเชียงใหม่",
        location: "โรงยิมเนเซียม จ.ราชบุรี",
        achievement: "ได้รับรางวัลเหรียญทอง บาสเกตบอล 3x3 หญิง",
        knowledgeApplied: "นำแท็กติกการเล่นแบบ Fast Break Transition และการตั้งโซนป้องกันบาสเกตบอล 3x3 ที่ได้เรียนรู้มาฝึกซ้อมจำลองสถานการณ์จริง ทำให้ผู้เล่นตัดสินใจได้รวดเร็วและคว้าเหรียญทอง",
        knowledgeDimensions: ["planning", "psychology"],
        impactRating: 5,
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2024-04-05",
        createdAt: "2024-04-02T10:00:00Z",
      },
    ],
    createdAt: "2024-02-29T08:00:00Z",
    updatedAt: "2024-04-05T10:00:00Z",
  },
  {
    id: "trn-67-002",
    idCard: "3100600678901",
    name: "นาย ภัทรพล ธรรมรักษ์",
    gender: "male",
    phone: "083-999-4455",
    email: "pattaraphol.t@sat-ref.org",
    affiliation: "สมาคมกีฬาแห่งประเทศไทย",
    sportsType: "แบดมินตัน",
    yearBE: 2567,
    courseId: 2,
    courseTitle: "หลักสูตร ผู้ตัดสินกีฬาอาชีพ",
    batch: "รุ่นที่ 1/2567",
    certNo: "กกท.-ผต.67/018",
    passedDate: "2024-03-15",
    status: "active",
    duties: [
      {
        id: "duty-008",
        traineeId: "trn-67-002",
        idCard: "3100600678901",
        eventName: "การแข่งขันแบดมินตันชิงชนะเลิศแห่งประเทศไทย ประจำปี 2567",
        role: "ผู้ตัดสินชี้ขาด (Umpire)",
        startDate: "2024-06-18",
        endDate: "2024-06-23",
        organization: "สมาคมกีฬาแบดมินตันแห่งประเทศไทยฯ",
        location: "เซ็นทรัลพลาซา แจ้งวัฒนะ",
        achievement: "ทำหน้าที่รอบชิงชนะเลิศ ประเภทชายเดี่ยว",
        knowledgeApplied: "นำแนวทางการตัดสินลูกลง-ออกอย่างแม่นยำและการประสานงานกับ Line Judges มาประยุกต์ใช้ในการตัดสินรอบชิงชนะเลิศ ทำให้เกมดำเนินไปด้วยความเรียบร้อยและได้รับคำชมเชยจากสมาคม",
        knowledgeDimensions: ["rules"],
        impactRating: 5,
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2024-06-28",
        createdAt: "2024-06-25T11:00:00Z",
      },
    ],
    createdAt: "2024-03-16T08:00:00Z",
    updatedAt: "2024-06-28T11:00:00Z",
  },
  {
    id: "trn-67-003",
    idCard: "1101400789012",
    name: "นางสาว สุภัทรา บุญช่วย",
    gender: "female",
    phone: "087-222-3344",
    email: "supattra.b@psych-sport.org",
    affiliation: "กองทุนพัฒนาการกีฬาแห่งชาติ",
    sportsType: "เทควันโด",
    yearBE: 2567,
    courseId: 5,
    courseTitle: "หลักสูตร จิตวิทยาการกีฬาเพื่อความเป็นเลิศ",
    batch: "รุ่นที่ 1/2567",
    certNo: "กกท.-จว.67/003",
    passedDate: "2024-05-12",
    status: "active",
    duties: [
      {
        id: "duty-009",
        traineeId: "trn-67-003",
        idCard: "1101400789012",
        eventName: "แคมป์ฝึกซ้อมพัฒนาศักยภาพทางจิตวิทยา ทีมนักกีฬาเทควันโดเยาวชนทีมชาติ",
        role: "ผู้เชี่ยวชาญด้านจิตวิทยาการกีฬา",
        startDate: "2024-08-01",
        endDate: "2024-08-15",
        organization: "สมาคมกีฬาเทควันโดแห่งประเทศไทย",
        location: "ศูนย์ฝึกกีฬาเทควันโดแห่งชาติ กกท.",
        achievement: "ประเมินและฝึกทักษะการควบคุมสมาธิและความตื่นเต้นก่อนการแข่งขันแก่นักกีฬา 18 คน",
        knowledgeApplied: "นำเทคนิค Imagery และ Breathing Control มาฝึกซ้อมให้นักกีฬาเทควันโดเยาวชนควบคุมความตื่นเต้นก่อนก้าวขึ้นเวทีแข่งขันจริง ทำให้นักกีฬามีสมาธิและออกอาวุธได้อย่างมั่นใจ",
        knowledgeDimensions: ["psychology"],
        impactRating: 5,
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2024-08-20",
        createdAt: "2024-08-18T13:00:00Z",
      },
    ],
    createdAt: "2024-05-13T08:00:00Z",
    updatedAt: "2024-08-20T13:00:00Z",
  },
  {
    id: "trn-67-004",
    idCard: "3102000890123",
    name: "นาย ธีรภัทร ชาญวิทย์",
    gender: "male",
    phone: "089-444-5566",
    email: "theeraphat.c@sat-coach.org",
    affiliation: "หน่วยงานภายนอก / บุคคลทั่วไป",
    sportsType: "เซปักตะกร้อ",
    yearBE: 2567,
    courseId: 1,
    courseTitle: "หลักสูตร ผู้ฝึกสอนกีฬาระดับชาติ",
    batch: "รุ่นที่ 2/2567",
    certNo: "กกท.-ผฝ.67/041",
    passedDate: "2024-06-30",
    status: "pending_verification",
    duties: [
      {
        id: "duty-010",
        traineeId: "trn-67-004",
        idCard: "3102000890123",
        eventName: "การแข่งขันตะกร้อเยาวชนชิงถ้วยพระราชทาน ครั้งที่ 28",
        role: "ผู้ฝึกสอนทีมเยาวชนสโมสรตะกร้อกรุงเทพฯ",
        startDate: "2024-09-10",
        endDate: "2024-09-16",
        organization: "สมาคมกีฬาตะกร้อแห่งประเทศไทย",
        location: "ยิมเนเซียม 1 มหาวิทยาลัยรามคำแหง",
        achievement: "พาทีมเข้าสู่รอบชิงชนะเลิศประเภททีมชุด",
        knowledgeApplied: "นำระเบียบวินัยการสร้างแบบแผนการเสิร์ฟและการตั้งรับลูกฟาดมาปรับใช้กับผู้เล่นรุ่นเยาวชน ทำให้ทีมเสียแต้มจากลูกเสิร์ฟลดลง",
        knowledgeDimensions: ["planning"],
        impactRating: 4,
        verified: false,
        createdAt: "2024-09-20T17:00:00Z",
      },
    ],
    createdAt: "2024-07-01T08:00:00Z",
    updatedAt: "2024-09-20T17:00:00Z",
  },
  {
    id: "trn-67-005",
    idCard: "1101800901234",
    name: "นาย ชาญชัย ธนะสิทธิ์",
    gender: "male",
    phone: "081-777-8899",
    email: "chanchai.t@sat-sci.org",
    affiliation: "สมาคมกีฬาแห่งประเทศไทย",
    sportsType: "เทเบิลเทนนิส",
    yearBE: 2567,
    courseId: 3,
    courseTitle: "หลักสูตร วิทยาศาสตร์การกีฬาและการพัฒนานักกีฬาสู่ความเป็นเลิศ",
    batch: "รุ่นที่ 2/2567",
    certNo: "กกท.-วก.67/019",
    passedDate: "2024-07-15",
    status: "inactive",
    duties: [],
    createdAt: "2024-07-16T08:00:00Z",
    updatedAt: "2024-07-16T08:00:00Z",
  },
  {
    id: "trn-68-001",
    idCard: "1100500123456", // Same citizen ID as trn-66-001 (Cross-year multi-course progression!)
    name: "นาย กิตติศักดิ์ ชัยชนะ",
    gender: "male",
    phone: "081-234-5678",
    email: "kittisak.c@sat-coach.org",
    affiliation: "สมาคมกีฬาแห่งประเทศไทย",
    sportsType: "ฟุตบอล",
    yearBE: 2568,
    courseId: 4,
    courseTitle: "หลักสูตร การเสริมสร้างศักยภาพการบริหารจัดการองค์กรกีฬา",
    batch: "รุ่นที่ 1/2568",
    certNo: "กกท.-บห.68/002",
    passedDate: "2025-02-15",
    status: "active",
    duties: [
      {
        id: "duty-011",
        traineeId: "trn-68-001",
        idCard: "1100500123456",
        eventName: "การแข่งขันฟุตบอลเยาวชนอาเซียน U-19 Championship 2025",
        role: "ผู้จัดการทีม (Team Manager)",
        startDate: "2025-07-12",
        endDate: "2025-07-28",
        organization: "สมาคมกีฬาฟุตบอลแห่งประเทศไทยฯ",
        location: "สนามกีฬาแห่งชาติ สุราบายา อินโดนีเซีย",
        achievement: "บริหารจัดการทีมคว้าเหรียญทองชนะเลิศ",
        knowledgeApplied: "นำระบบโครงสร้างการบริหารทีมชาติและการประสานงานฝ่ายแพทย์และสิทธิประโยชน์มาใช้ในการแข่งขันระดับนานาชาติ ทำให้ทีมชาติไทยมีความพร้อมสูงสุดทั้งในและนอกสนาม",
        knowledgeDimensions: ["management", "science"],
        impactRating: 5,
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2025-08-05",
        createdAt: "2025-08-01T12:00:00Z",
      },
    ],
    createdAt: "2025-02-16T08:00:00Z",
    updatedAt: "2025-08-05T12:00:00Z",
  },
  {
    id: "trn-68-002",
    idCard: "3100800112233",
    name: "นางสาว อรทัย รัตนกุล",
    gender: "female",
    phone: "086-123-9876",
    email: "orathai.r@sat-coach.org",
    affiliation: "สมาคมกีฬาแห่งจังหวัด",
    sportsType: "ยกน้ำหนัก",
    yearBE: 2568,
    courseId: 1,
    courseTitle: "หลักสูตร ผู้ฝึกสอนกีฬาระดับชาติ",
    batch: "รุ่นที่ 1/2568",
    certNo: "กกท.-ผฝ.68/011",
    passedDate: "2025-03-20",
    status: "active",
    duties: [
      {
        id: "duty-012",
        traineeId: "trn-68-002",
        idCard: "3100800112233",
        eventName: "ยกน้ำหนักเยาวชนชิงชนะเลิศแห่งประเทศไทย ประจำปี 2568",
        role: "ผู้ฝึกสอนหลักประจำทีม จ.นครราชสีมา",
        startDate: "2025-05-15",
        endDate: "2025-05-20",
        organization: "สมาคมกีฬายกน้ำหนักสมัครเล่นแห่งประเทศไทย",
        location: "โรงยิมเนเซียมเทศบาลเมืองทุ่งสง",
        achievement: "นักกีฬาทำลายสถิติเยาวชนประเทศไทย 2 รายการ",
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2025-05-28",
        createdAt: "2025-05-22T10:00:00Z",
      },
    ],
    createdAt: "2025-03-21T08:00:00Z",
    updatedAt: "2025-05-28T10:00:00Z",
  },
  {
    id: "trn-68-003",
    idCard: "1103200223344",
    name: "พันจ่าตรี ณัฐดนัย สมบูรณ์",
    gender: "male",
    phone: "084-555-6677",
    email: "natdanai.s@sat-ref.org",
    affiliation: "สมาคมกีฬาแห่งประเทศไทย",
    sportsType: "มวยสากล",
    yearBE: 2568,
    courseId: 2,
    courseTitle: "หลักสูตร ผู้ตัดสินกีฬาอาชีพ",
    batch: "รุ่นที่ 1/2568",
    certNo: "กกท.-ผต.68/007",
    passedDate: "2025-04-10",
    status: "active",
    duties: [
      {
        id: "duty-013",
        traineeId: "trn-68-003",
        idCard: "1103200223344",
        eventName: "มวยสากลนานาชาติ ไทยแลนด์ โอเพ่น 2025",
        role: "กรรมการผู้ตัดสินบนเวที (Referee)",
        startDate: "2025-06-05",
        endDate: "2025-06-12",
        organization: "สมาคมกีฬามวยสากลแห่งประเทศไทย",
        location: "อาคารนิมิบุตร สนามกีฬาแห่งชาติ",
        achievement: "ได้รับรางวัลผู้ตัดสินดีเด่นประจำการแข่งขัน",
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2025-06-20",
        createdAt: "2025-06-15T14:00:00Z",
      },
    ],
    createdAt: "2025-04-11T08:00:00Z",
    updatedAt: "2025-06-20T14:00:00Z",
  },
  {
    id: "trn-68-004",
    idCard: "3101500334455",
    name: "นางสาว วรรณิศา เลิศไพศาล",
    gender: "female",
    phone: "082-888-9900",
    email: "wannisa.l@sat-sci.org",
    affiliation: "การกีฬาแห่งประเทศไทย",
    sportsType: "ว่ายน้ำ",
    yearBE: 2568,
    courseId: 3,
    courseTitle: "หลักสูตร วิทยาศาสตร์การกีฬาและการพัฒนานักกีฬาสู่ความเป็นเลิศ",
    batch: "รุ่นที่ 1/2568",
    certNo: "กกท.-วก.68/012",
    passedDate: "2025-05-18",
    status: "active",
    duties: [
      {
        id: "duty-014",
        traineeId: "trn-68-004",
        idCard: "3101500334455",
        eventName: "การแข่งขันว่ายน้ำชิงชนะเลิศเอเชีย 2025",
        role: "นักชีวกลศาสตร์การกีฬาประจำทีมนักกีฬาไทย",
        startDate: "2025-09-10",
        endDate: "2025-09-18",
        organization: "สมาคมกีฬาทางน้ำแห่งประเทศไทย",
        location: "ศูนย์กีฬาทางน้ำ โตเกียว ประเทศญี่ปุ่น",
        achievement: "บันทึกและวิเคราะห์เทคนิคการออกตัวและกลับตัวด้วยระบบ Video Motion Analysis",
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2025-09-25",
        createdAt: "2025-09-20T16:00:00Z",
      },
    ],
    createdAt: "2025-05-19T08:00:00Z",
    updatedAt: "2025-09-25T16:00:00Z",
  },
  {
    id: "trn-68-005",
    idCard: "1102500445566",
    name: "นาย ธีรวัฒน์ ชัยมงคล",
    gender: "male",
    phone: "085-333-2211",
    email: "theerawat.c@sat-budget.org",
    affiliation: "การกีฬาแห่งประเทศไทย",
    sportsType: "กรีฑา",
    yearBE: 2568,
    courseId: 6,
    courseTitle: "หลักสูตร การบริหารงบประมาณและพัสดุทางการกีฬา",
    batch: "รุ่นที่ 1/2568",
    certNo: "กกท.-พส.68/009",
    passedDate: "2025-06-25",
    status: "inactive",
    duties: [],
    createdAt: "2025-06-26T08:00:00Z",
    updatedAt: "2025-06-26T08:00:00Z",
  },
  {
    id: "trn-69-001",
    idCard: "1100900556677",
    name: "นาย ธนภัทร สิริธนโชติ",
    gender: "male",
    phone: "081-444-7788",
    email: "thanaphat.s@sat-coach.org",
    affiliation: "สมาคมกีฬาแห่งประเทศไทย",
    sportsType: "ฟุตบอล",
    yearBE: 2569,
    courseId: 1,
    courseTitle: "หลักสูตร ผู้ฝึกสอนกีฬาระดับชาติ",
    batch: "รุ่นที่ 1/2569",
    certNo: "กกท.-ผฝ.69/003",
    passedDate: "2026-02-10",
    status: "active",
    duties: [
      {
        id: "duty-015",
        traineeId: "trn-69-001",
        idCard: "1100900556677",
        eventName: "ฟุตบอลลีกอาชีพ ไทยลีก 3 โซนภาคกลาง ฤดูกาล 2026",
        role: "หัวหน้าผู้ฝึกสอน (Head Coach)",
        startDate: "2026-04-01",
        endDate: "2026-09-30",
        organization: "สโมสรฟุตบอลสระบุรี ยูไนเต็ด",
        location: "สนามกีฬากลาง จ.สระบุรี",
        achievement: "นำทีมอยู่อันดับ 3 ของตารางคะแนน",
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2026-08-10",
        createdAt: "2026-08-05T10:00:00Z",
      },
    ],
    createdAt: "2026-02-11T08:00:00Z",
    updatedAt: "2026-08-10T10:00:00Z",
  },
  {
    id: "trn-69-002",
    idCard: "3101900667788",
    name: "นางสาว สุภารัตน์ เกษมสุข",
    gender: "female",
    phone: "083-777-6655",
    email: "suparat.k@sat-ref.org",
    affiliation: "สมาคมกีฬาแห่งจังหวัด",
    sportsType: "วอลเลย์บอล",
    yearBE: 2569,
    courseId: 2,
    courseTitle: "หลักสูตร ผู้ตัดสินกีฬาอาชีพ",
    batch: "รุ่นที่ 1/2569",
    certNo: "กกท.-ผต.69/012",
    passedDate: "2026-03-18",
    status: "pending_verification",
    duties: [
      {
        id: "duty-016",
        traineeId: "trn-69-002",
        idCard: "3101900667788",
        eventName: "วอลเลย์บอลเยาวชน กฟภ. (PEA) ชิงชนะเลิศแห่งประเทศไทย ประจำปี 2569",
        role: "ผู้ตัดสินที่ 2",
        startDate: "2026-07-15",
        endDate: "2026-07-22",
        organization: "สมาคมกีฬาวอลเลย์บอลแห่งประเทศไทย",
        location: "โรงยิมเนเซียมเทศบาลเมืองสุพรรณบุรี",
        achievement: "ปฏิบัติหน้าที่รอบ 8 ทีมสุดท้าย",
        verified: false,
        createdAt: "2026-07-25T15:00:00Z",
      },
    ],
    createdAt: "2026-03-19T08:00:00Z",
    updatedAt: "2026-07-25T15:00:00Z",
  },
  {
    id: "trn-69-003",
    idCard: "1103800778899",
    name: "นาย กวินท์ โชติวรศิลป์",
    gender: "male",
    phone: "089-222-1100",
    email: "kawin.c@sat-manage.org",
    affiliation: "กองทุนพัฒนาการกีฬาแห่งชาติ",
    sportsType: "เทควันโด",
    yearBE: 2569,
    courseId: 4,
    courseTitle: "หลักสูตร การเสริมสร้างศักยภาพการบริหารจัดการองค์กรกีฬา",
    batch: "รุ่นที่ 1/2569",
    certNo: "กกท.-บห.69/015",
    passedDate: "2026-04-22",
    status: "active",
    duties: [
      {
        id: "duty-017",
        traineeId: "trn-69-003",
        idCard: "1103800778899",
        eventName: "การแข่งขันเทควันโดเยาวชนระดับนานาชาติ กกท. คัพ 2026",
        role: "เลขาธิการฝ่ายประสานงานสิทธิประโยชน์และสิทธิการถ่ายทอดสด",
        startDate: "2026-08-02",
        endDate: "2026-08-06",
        organization: "การกีฬาแห่งประเทศไทย ร่วมกับ สมาคมกีฬาเทควันโดฯ",
        location: "อินดอร์สเตเดียม หัวหมาก",
        achievement: "จัดหารายได้ผู้สนับสนุนเพิ่มขึ้นร้อยละ 25 ตามเป้าหมายกองทุน",
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2026-08-15",
        createdAt: "2026-08-10T14:00:00Z",
      },
    ],
    createdAt: "2026-04-23T08:00:00Z",
    updatedAt: "2026-08-15T14:00:00Z",
  },
  {
    id: "trn-69-004",
    idCard: "3100400889900",
    name: "สิบเอก รณชัย บุญประสิทธิ์",
    gender: "male",
    phone: "086-777-9911",
    email: "ronnachai.b@sat-coach.org",
    affiliation: "สมาคมกีฬาแห่งประเทศไทย",
    sportsType: "ยิงปืน",
    yearBE: 2569,
    courseId: 1,
    courseTitle: "หลักสูตร ผู้ฝึกสอนกีฬาระดับชาติ",
    batch: "รุ่นที่ 1/2569",
    certNo: "กกท.-ผฝ.69/022",
    passedDate: "2026-05-15",
    status: "active",
    duties: [
      {
        id: "duty-018",
        traineeId: "trn-69-004",
        idCard: "3100400889900",
        eventName: "การแข่งขันยิงปืนชิงชนะเลิศแห่งประเทศไทย ประจำปี 2569",
        role: "ผู้ฝึกสอนปืนสั้นอัดลมทีมชาติชุดเตรียมเอเชียนเกมส์",
        startDate: "2026-09-05",
        endDate: "2026-09-12",
        organization: "สมาคมกีฬายิงปืนแห่งประเทศไทย ในพระบรมราชูปถัมภ์",
        location: "สนามยิงปืน กกท. หัวหมาก",
        achievement: "นักกีฬาได้ 2 เหรียญทอง 1 เหรียญเงิน",
        verified: true,
        verifiedBy: "กองพัฒนาบุคลากรกีฬา",
        verifiedAt: "2026-09-20",
        createdAt: "2026-09-15T16:00:00Z",
      },
    ],
    createdAt: "2026-05-16T08:00:00Z",
    updatedAt: "2026-09-20T16:00:00Z",
  },
  {
    id: "trn-69-005",
    idCard: "1104500990011",
    name: "นางสาว จันทิมา กุลสตรี",
    gender: "female",
    phone: "084-888-2233",
    email: "janthima.k@sat-sci.org",
    affiliation: "สมาคมกีฬาแห่งจังหวัด",
    sportsType: "จักรยาน",
    yearBE: 2569,
    courseId: 3,
    courseTitle: "หลักสูตร วิทยาศาสตร์การกีฬาและการพัฒนานักกีฬาสู่ความเป็นเลิศ",
    batch: "รุ่นที่ 1/2569",
    certNo: "กกท.-วก.69/014",
    passedDate: "2026-06-12",
    status: "inactive",
    duties: [],
    createdAt: "2026-06-13T08:00:00Z",
    updatedAt: "2026-06-13T08:00:00Z",
  },
];

const STORAGE_KEY = "sat-alumni-v1";

interface AlumniState {
  trainees: HistoricalTrainee[];
  revision: number;
}

const INITIAL_STATE: AlumniState = {
  trainees: [...SEED_TRAINEES],
  revision: 0,
};

let state: AlumniState = INITIAL_STATE;
let hydrateStarted = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.trainees));
    fetch("/api/admin/save-defaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alumni: state.trainees }),
    }).catch(() => {
      // background sync
    });
  } catch {
    // Local storage full or unavailable
  }
}

function hydrate() {
  if (hydrateStarted || typeof window === "undefined") return;
  hydrateStarted = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      state = {
        trainees: parsed,
        revision: state.revision + 1,
      };
      emit();
    }
  } catch {
    // fallback to seed
  }
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL_STATE;
}

export function useAlumniStore() {
  hydrate();
  const snapshot = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getSnapshot,
    getServerSnapshot
  );

  return {
    trainees: snapshot.trainees,
    addTrainee,
    updateTrainee,
    deleteTrainee,
    importTrainees,
    addDutyRecord,
    verifyDutyRecord,
    deleteDutyRecord,
    resetAlumniData,
  };
}

export function addTrainee(input: Omit<HistoricalTrainee, "id" | "createdAt" | "updatedAt" | "duties">): HistoricalTrainee {
  const now = new Date().toISOString();
  const newTrainee: HistoricalTrainee = {
    ...input,
    id: `trn-custom-${Date.now()}`,
    duties: [],
    createdAt: now,
    updatedAt: now,
  };

  state = {
    trainees: [newTrainee, ...state.trainees],
    revision: state.revision + 1,
  };
  persist();
  emit();
  return newTrainee;
}

export function updateTrainee(id: string, patch: Partial<HistoricalTrainee>): HistoricalTrainee | undefined {
  const now = new Date().toISOString();
  let updated: HistoricalTrainee | undefined;

  const nextList = state.trainees.map((t) => {
    if (t.id !== id) return t;
    updated = {
      ...t,
      ...patch,
      updatedAt: now,
    };
    return updated;
  });

  if (!updated) return undefined;

  state = {
    trainees: nextList,
    revision: state.revision + 1,
  };
  persist();
  emit();
  return updated;
}

export function deleteTrainee(id: string): boolean {
  const exists = state.trainees.some((t) => t.id === id);
  if (!exists) return false;

  state = {
    trainees: state.trainees.filter((t) => t.id !== id),
    revision: state.revision + 1,
  };
  persist();
  emit();
  return true;
}

export function importTrainees(incoming: Omit<HistoricalTrainee, "id" | "createdAt" | "updatedAt" | "duties">[]): number {
  const now = new Date().toISOString();
  const newItems: HistoricalTrainee[] = incoming.map((item, idx) => ({
    ...item,
    id: `trn-imp-${Date.now()}-${idx}`,
    duties: [],
    createdAt: now,
    updatedAt: now,
  }));

  state = {
    trainees: [...newItems, ...state.trainees],
    revision: state.revision + 1,
  };
  persist();
  emit();
  return newItems.length;
}

export function addDutyRecord(
  traineeId: string,
  input: Omit<DutyRecord, "id" | "traineeId" | "createdAt" | "verified"> & { verified?: boolean }
): DutyRecord | undefined {
  const now = new Date().toISOString();
  const target = state.trainees.find((t) => t.id === traineeId || t.idCard === input.idCard);
  if (!target) return undefined;

  const newDuty: DutyRecord = {
    ...input,
    id: `duty-${Date.now()}`,
    traineeId: target.id,
    verified: input.verified ?? false,
    createdAt: now,
  };

  const nextList = state.trainees.map((t) => {
    // Update all entries matching this person's citizen id so cross-course history syncs
    if (t.idCard === target.idCard) {
      const nextDuties = [newDuty, ...t.duties];
      return {
        ...t,
        status: "active" as const,
        duties: nextDuties,
        updatedAt: now,
      };
    }
    return t;
  });

  state = {
    trainees: nextList,
    revision: state.revision + 1,
  };
  persist();
  emit();
  return newDuty;
}

export function verifyDutyRecord(
  dutyId: string,
  verifierName = "กองพัฒนาบุคลากรกีฬา"
): boolean {
  const now = new Date().toISOString();
  let found = false;

  const nextList = state.trainees.map((t) => {
    const hasDuty = t.duties.some((d) => d.id === dutyId);
    if (!hasDuty) return t;
    found = true;
    return {
      ...t,
      status: "active" as const,
      duties: t.duties.map((d) =>
        d.id === dutyId
          ? {
              ...d,
              verified: true,
              verifiedBy: verifierName,
              verifiedAt: now,
            }
          : d
      ),
      updatedAt: now,
    };
  });

  if (!found) return false;

  state = {
    trainees: nextList,
    revision: state.revision + 1,
  };
  persist();
  emit();
  return true;
}

export function deleteDutyRecord(dutyId: string): boolean {
  let found = false;
  const now = new Date().toISOString();

  const nextList = state.trainees.map((t) => {
    const hasDuty = t.duties.some((d) => d.id === dutyId);
    if (!hasDuty) return t;
    found = true;
    const remainingDuties = t.duties.filter((d) => d.id !== dutyId);
    return {
      ...t,
      status: remainingDuties.length > 0 ? ("active" as const) : ("inactive" as const),
      duties: remainingDuties,
      updatedAt: now,
    };
  });

  if (!found) return false;

  state = {
    trainees: nextList,
    revision: state.revision + 1,
  };
  persist();
  emit();
  return true;
}

export function resetAlumniData() {
  state = {
    trainees: [...SEED_TRAINEES],
    revision: state.revision + 1,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  emit();
}

/**
 * Returns all historical records & courses matching a citizen ID.
 * Supports cross-year personnel tracking passport.
 */
export function getTraineePassport(idCard: string, trainees: HistoricalTrainee[]) {
  const digits = idCard.replace(/\D/g, "");
  if (!digits) return undefined;

  const records = trainees.filter((t) => t.idCard.replace(/\D/g, "") === digits);
  if (records.length === 0) return undefined;

  // Primary profile is the most recent record
  const sorted = [...records].sort((a, b) => b.yearBE - a.yearBE);
  const primary = sorted[0];

  // Consolidate unique duties across all course certifications
  const allDutiesMap = new Map<string, DutyRecord>();
  for (const r of records) {
    for (const d of r.duties) {
      allDutiesMap.set(d.id, d);
    }
  }
  const allDuties = Array.from(allDutiesMap.values()).sort(
    (a, b) => Date.parse(b.startDate || b.createdAt) - Date.parse(a.startDate || a.createdAt)
  );

  return {
    primary,
    records: sorted,
    allDuties,
    totalCourses: sorted.length,
    activeDutyCount: allDuties.length,
    isActive: allDuties.length > 0,
  };
}

export interface QualitativeHighlight {
  id: string;
  traineeName: string;
  sportsType: string;
  courseTitle: string;
  role: string;
  eventName: string;
  text: string;
  dimensions: string[];
  rating: number;
}

export interface EvaluationStats {
  totalTrainees: number;
  uniquePersonnelCount: number;
  activeCount: number;
  inactiveCount: number;
  pendingCount: number;
  activeRatePercent: number;
  totalDutiesReported: number;
  dutiesByYear: Record<number, number>;
  traineesByYear: Record<number, number>;
  bySportsType: { name: string; count: number; activeCount: number }[];
  byAffiliation: { name: string; count: number; activeCount: number }[];
  byCourse: { name: string; count: number; activeRate: number }[];
  dimensionBreakdown: { key: string; label: string; icon: string; count: number; percent: number }[];
  averageImpactRating: number;
  totalRatingsCount: number;
  qualitativeHighlights: QualitativeHighlight[];
}

export function computeEvaluationStats(trainees: HistoricalTrainee[]): EvaluationStats {
  const uniqueIdCards = new Set(trainees.map((t) => t.idCard));
  const uniquePersonnelCount = uniqueIdCards.size;
  const totalTrainees = trainees.length;

  let activeCount = 0;
  let inactiveCount = 0;
  let pendingCount = 0;
  let totalDutiesReported = 0;

  const traineesByYear: Record<number, number> = {};
  const dutiesByYear: Record<number, number> = {};
  const sportsMap: Record<string, { count: number; activeCount: number }> = {};
  const affilMap: Record<string, { count: number; activeCount: number }> = {};
  const courseMap: Record<string, { count: number; activeCount: number }> = {};

  const dimensionCounts: Record<string, number> = {
    planning: 0,
    rules: 0,
    science: 0,
    psychology: 0,
    management: 0,
  };
  let totalRatingSum = 0;
  let totalRatingsCount = 0;
  const qualitativeHighlights: QualitativeHighlight[] = [];

  for (const t of trainees) {
    // Status counts
    if (t.status === "active") activeCount += 1;
    else if (t.status === "pending_verification") pendingCount += 1;
    else inactiveCount += 1;

    totalDutiesReported += t.duties.length;

    // By Year
    traineesByYear[t.yearBE] = (traineesByYear[t.yearBE] || 0) + 1;
    dutiesByYear[t.yearBE] = (dutiesByYear[t.yearBE] || 0) + t.duties.length;

    // By Sports
    if (!sportsMap[t.sportsType]) {
      sportsMap[t.sportsType] = { count: 0, activeCount: 0 };
    }
    sportsMap[t.sportsType].count += 1;
    if (t.status === "active") sportsMap[t.sportsType].activeCount += 1;

    // By Affiliation
    if (!affilMap[t.affiliation]) {
      affilMap[t.affiliation] = { count: 0, activeCount: 0 };
    }
    affilMap[t.affiliation].count += 1;
    if (t.status === "active") affilMap[t.affiliation].activeCount += 1;

    // By Course
    if (!courseMap[t.courseTitle]) {
      courseMap[t.courseTitle] = { count: 0, activeCount: 0 };
    }
    courseMap[t.courseTitle].count += 1;
    if (t.status === "active") courseMap[t.courseTitle].activeCount += 1;

    // Aggregate Kirkpatrick Knowledge Transfer Metrics from duties
    for (const d of t.duties) {
      if (Array.isArray(d.knowledgeDimensions)) {
        for (const dimKey of d.knowledgeDimensions) {
          if (dimKey in dimensionCounts) {
            dimensionCounts[dimKey] += 1;
          }
        }
      }

      if (typeof d.impactRating === "number" && d.impactRating >= 1 && d.impactRating <= 5) {
        totalRatingSum += d.impactRating;
        totalRatingsCount += 1;
      }

      if (d.knowledgeApplied && d.knowledgeApplied.trim().length > 10) {
        qualitativeHighlights.push({
          id: d.id,
          traineeName: t.name,
          sportsType: t.sportsType,
          courseTitle: t.courseTitle,
          role: d.role,
          eventName: d.eventName,
          text: d.knowledgeApplied.trim(),
          dimensions: d.knowledgeDimensions ?? [],
          rating: d.impactRating ?? 5,
        });
      }
    }
  }

  const activeRatePercent =
    totalTrainees > 0 ? Math.round((activeCount / totalTrainees) * 100) : 0;

  const bySportsType = Object.entries(sportsMap)
    .map(([name, val]) => ({ name, count: val.count, activeCount: val.activeCount }))
    .sort((a, b) => b.count - a.count);

  const byAffiliation = Object.entries(affilMap)
    .map(([name, val]) => ({ name, count: val.count, activeCount: val.activeCount }))
    .sort((a, b) => b.count - a.count);

  const byCourse = Object.entries(courseMap)
    .map(([name, val]) => ({
      name,
      count: val.count,
      activeRate: val.count > 0 ? Math.round((val.activeCount / val.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const totalDimensionHits = Math.max(1, Object.values(dimensionCounts).reduce((a, b) => a + b, 0));
  const dimensionBreakdown = KNOWLEDGE_DIMENSIONS.map((dim) => {
    const count = dimensionCounts[dim.key] || 0;
    const percent = Math.round((count / totalDimensionHits) * 100);
    return {
      key: dim.key,
      label: dim.label,
      icon: dim.icon,
      count,
      percent,
    };
  }).sort((a, b) => b.count - a.count);

  const averageImpactRating =
    totalRatingsCount > 0 ? Math.round((totalRatingSum / totalRatingsCount) * 10) / 10 : 4.8;

  return {
    totalTrainees,
    uniquePersonnelCount,
    activeCount,
    inactiveCount,
    pendingCount,
    activeRatePercent,
    totalDutiesReported,
    dutiesByYear,
    traineesByYear,
    bySportsType,
    byAffiliation,
    byCourse,
    dimensionBreakdown,
    averageImpactRating,
    totalRatingsCount,
    qualitativeHighlights,
  };
}
