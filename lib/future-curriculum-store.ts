"use client";

export interface SurveySkillTopic {
  id: string;
  title: string;
  category: "tech_ai" | "commercial" | "governance" | "events" | "grassroots";
  categoryLabel: string;
  categoryIcon: string;
  description: string;
  targetAudience: string;
  votes: number;
  userVoted?: boolean;
  demandLevel: "high" | "medium" | "emerging";
  suggestedBy?: string;
  suggestedOrg?: string;
  createdAt: string;
  keyProblemsSolved: string;
}

export interface CourseModuleItem {
  moduleNo: number;
  title: string;
  desc: string;
  hours: number;
}

export interface ProposedCourseBlueprint {
  id: string;
  code: string;
  titleTh: string;
  titleEn: string;
  category: string;
  targetGroups: string[];
  durationHours: number;
  proposedYearBE: number;
  problemStatement: string;
  rationale: string;
  evidenceStat: string;
  evidenceVotes: number;
  coreModules: CourseModuleItem[];
  expectedOutcomes: string[];
  strategicAlignment: string; // Alignment with SAT HRD mandate (non-overlapping)
}

// 5 Replacement Domains specifically calibrated to avoid duplicate mandate with Sports Science Division
export const FUTURE_PILLARS = [
  {
    key: "tech_ai",
    label: "ปัญญาประดิษฐ์และสถิติข้อมูลกีฬา (AI & Sports Data Tech)",
    icon: "🤖",
    description: "การใช้ AI และซอฟต์แวร์วิเคราะห์สถิติคู่แข่ง แท็กติก และระบบการตัดสินยุคใหม่",
    color: "from-blue-600 to-indigo-700",
  },
  {
    key: "commercial",
    label: "การบริหารสิทธิประโยชน์และการตลาดกีฬา 4.0 (Commercialization & Sponsorship)",
    icon: "💼",
    description: "การหารายได้ การเจรจาสปอนเซอร์ การสร้างมูลค่าลิขสิทธิ์ และการสร้างแบรนด์สมาคมกีฬา",
    color: "from-emerald-600 to-teal-700",
  },
  {
    key: "governance",
    label: "ธรรมาภิบาล กฎหมาย และการคุ้มครองนักกีฬา (Safeguarding & Law)",
    icon: "⚖️",
    description: "สัญญานักกีฬา ธรรมาภิบาลองค์กรกีฬา การป้องกันการทุจริต และสวัสดิภาพ Safe Sport",
    color: "from-purple-600 to-indigo-800",
  },
  {
    key: "events",
    label: "การบริหารจัดการแข่งขันและสนามกีฬาสมัยใหม่ (Modern Event & Venue Operations)",
    icon: "🏟️",
    description: "มาตรฐานการจัดมหกรรมกีฬา การบริหารสนามแข่งขัน ระบบรักษาความปลอดภัย และ Green Sports (ESG)",
    color: "from-amber-600 to-orange-700",
  },
  {
    key: "grassroots",
    label: "การพัฒนากีฬาขั้นพื้นฐานและนักกีฬาเยาวชน (Grassroots & Youth Pathway)",
    icon: "🌱",
    description: "การวางรากฐานสมาคมกีฬาแห่งจังหวัด การสร้างเครือข่ายเยาวชน และเส้นทางสู่ความเป็นเลิศ",
    color: "from-sky-600 to-blue-700",
  },
] as const;

// Initial pre-seeded survey responses from authentic SAT stakeholders (reflecting 5 agency groups)
export const INITIAL_SKILL_TOPICS: SurveySkillTopic[] = [
  {
    id: "topic-1",
    title: "การประยุกต์ใช้ AI ในการวิเคราะห์สถิติคู่แข่งและวางแผนกลยุทธ์การฝึกซ้อม",
    category: "tech_ai",
    categoryLabel: "เทคโนโลยี & AI ในกีฬา",
    categoryIcon: "🤖",
    description: "การนำเครื่องมือ AI และ Video Analytics มาใช้ย่อยสถิติการเล่นเพื่อวางแผนแท็กติกสำหรับผู้ฝึกสอน",
    targetAudience: "ผู้ฝึกสอนกีฬา, ผู้ช่วยผู้ฝึกสอน, สมาคมกีฬาแห่งประเทศไทย",
    votes: 342,
    demandLevel: "high",
    suggestedBy: "นายสุรชัย (ผู้ฝึกสอน)",
    suggestedOrg: "สมาคมกีฬาแบดมินตันแห่งประเทศไทย",
    createdAt: "2569-08-15",
    keyProblemsSolved: "ปัจจุบันคู่แข่งระดับโลกใช้ AI สแกนแท็กติกหมดแล้ว แต่โค้ชไทยส่วนใหญ่ยังบันทึกด้วยมือและใช้ความรู้สึก",
  },
  {
    id: "topic-2",
    title: "กลยุทธ์การทำสัญญาสปอนเซอร์และสร้างมูลค่าลิขสิทธิ์ทางการค้าของสมาคมกีฬา",
    category: "commercial",
    categoryLabel: "การตลาด & สิทธิประโยชน์",
    categoryIcon: "💼",
    description: "วิธีเจรจาต่อรองกับแบรนด์เอกชน การร่างข้อเสนอสปอนเซอร์ และการประเมินมูลค่าสื่อ (Media Value)",
    targetAudience: "ผู้บริหารสมาคมกีฬา, คณะกรรมการบริหาร, เจ้าหน้าที่ฝ่ายสิทธิประโยชน์",
    votes: 318,
    demandLevel: "high",
    suggestedBy: "ดร.ศศิธร (กรรมการฝ่ายหารายได้)",
    suggestedOrg: "สมาคมกีฬาแห่งประเทศไทย",
    createdAt: "2569-07-20",
    keyProblemsSolved: "สมาคมกีฬาพึ่งพางบประมาณจาก กกท. และกองทุนฯ เกิน 80% ขาดทักษะการหารายได้เชิงพาณิชย์จากภาคเอกชน",
  },
  {
    id: "topic-3",
    title: "การปกป้องคุ้มครองสวัสดิภาพนักกีฬา (Safeguarding) และกฎหมายสัญญาจ้างนักกีฬาอาชีพ",
    category: "governance",
    categoryLabel: "ธรรมาภิบาล & กฎหมายกีฬา",
    categoryIcon: "⚖️",
    description: "แนวทาง Safe Sport สากล การป้องกันการคุกคามทุกรูปแบบ และการบริหารสัญญาที่เป็นธรรมต่อนักกีฬาและสมาคม",
    targetAudience: "ผู้บริหารสมาคมกีฬา, ผู้ฝึกสอน, เจ้าหน้าที่คุ้มครองสิทธินักกีฬา กกท.",
    votes: 275,
    demandLevel: "high",
    suggestedBy: "นิติกรประจำองค์กรกีฬา",
    suggestedOrg: "การกีฬาแห่งประเทศไทย",
    createdAt: "2569-09-02",
    keyProblemsSolved: "องค์กรกีฬานานาชาติ (IOC, FIFA) บังคับใช้เกณฑ์ Safeguarding เข้มงวด หากไม่มีเจ้าหน้าที่ผ่านการรับรองจะไม่สามารถส่งแข่งได้",
  },
  {
    id: "topic-4",
    title: "การบริหารจัดการการแข่งขันกีฬาสมัยใหม่ (Modern Tournament & Venue Operations)",
    category: "events",
    categoryLabel: "การบริหารจัดการแข่งขัน",
    categoryIcon: "🏟️",
    description: "การจัดผังสนาม การควบคุมฝูงชน ระบบรักษาความปลอดภัย การบริหารอาสาสมัคร และ Green Event (ESG)",
    targetAudience: "เจ้าหน้าที่จัดการแข่งขัน, สมาคมกีฬาแห่งจังหวัด, ผู้บริหารศูนย์กีฬา กกท.",
    votes: 246,
    demandLevel: "medium",
    suggestedBy: "ฝ่ายจัดมหกรรมกีฬา",
    suggestedOrg: "สมาคมกีฬาแห่งจังหวัดเชียงใหม่",
    createdAt: "2569-06-12",
    keyProblemsSolved: "การจัดอีเวนต์กีฬาระดับชาติและนานาชาติในต่างจังหวัดมักประสบปัญหาการบริหารพื้นที่และการจัดการขยะตามมาตรฐาน ESG",
  },
  {
    id: "topic-5",
    title: "ระบบการสร้างนักกีฬาเยาวชนแบบองค์รวม (Long-Term Athlete Development: LTAD) สำหรับสมาคมจังหวัด",
    category: "grassroots",
    categoryLabel: "กีฬาขั้นพื้นฐาน & เยาวชน",
    categoryIcon: "🌱",
    description: "การเชื่อมประสานโรงเรียน ชมรมกีฬา และสมาคมจังหวัด เพื่อสร้างไปป์ไลน์นักกีฬาตั้งแต่รุ่นอายุ 8-16 ปีอย่างเป็นระบบ",
    targetAudience: "สมาคมกีฬาแห่งจังหวัด, ผู้ฝึกสอนระดับเยาวชน, สำนักงาน กกท. จังหวัด",
    votes: 289,
    demandLevel: "high",
    suggestedBy: "ประธานชมรมกีฬาเยาวชน",
    suggestedOrg: "สมาคมกีฬาแห่งจังหวัดขอนแก่น",
    createdAt: "2569-05-30",
    keyProblemsSolved: "นักกีฬาเยาวชนมักหลุดออกจากระบบเมื่อจบมัธยม เพราะไม่มีการวางแผนเส้นทางอาชีพและบันไดความก้าวหน้าร่วมกับสมาคมแห่งประเทศไทย",
  },
  {
    id: "topic-6",
    title: "ระบบเทคโนโลยีตัดสินดิจิทัล (VAR, Hawk-Eye & Digital Scoring) และการจัดการข้อขัดแย้งในสนาม",
    category: "tech_ai",
    categoryLabel: "เทคโนโลยี & AI ในกีฬา",
    categoryIcon: "🤖",
    description: "การใช้เทคโนโลยีช่วยตัดสิน การประสานงานระหว่างผู้ตัดสินในสนามกับห้องวิดีโอ และจิตวิทยาคลี่คลายข้อพิพาท",
    targetAudience: "ผู้ตัดสินกีฬา, กรรมการเทคนิค, ผู้ควบคุมการแข่งขัน",
    votes: 215,
    demandLevel: "medium",
    suggestedBy: "ผู้ตัดสินระดับชาติ",
    suggestedOrg: "สมาคมกีฬาฟุตบอล / สมาคมกีฬาวอลเลย์บอล",
    createdAt: "2569-09-10",
    keyProblemsSolved: "ผู้ตัดสินรุ่นเก่าไม่คุ้นชินกับการสื่อสารผ่านระบบดิจิทัล ทำให้เกิดความล่าช้าและข้อผิดพลาดในการตัดสิน",
  },
  {
    id: "topic-7",
    title: "การตลาดดิจิทัลและสร้างคอนเทนต์กีฬาเพื่อขยายฐานแฟนคลับ (Digital Sports Media & Fan Engagement)",
    category: "commercial",
    categoryLabel: "การตลาด & สิทธิประโยชน์",
    categoryIcon: "💼",
    description: "การผลิตมีเดียคอนเทนต์ การถ่ายทอดสดผ่าน OTT/Social Media และการเปลี่ยนผู้ติดตามออนไลน์ให้เป็นผู้สนับสนุน",
    targetAudience: "ฝ่ายประชาสัมพันธ์สมาคมกีฬา, นักการตลาดกีฬา, สื่อมวลชนกีฬา",
    votes: 260,
    demandLevel: "medium",
    suggestedBy: "แอดมินเพจสมาคมกีฬา",
    suggestedOrg: "สมาคมกีฬาเทควันโดแห่งประเทศไทย",
    createdAt: "2569-07-05",
    keyProblemsSolved: "หลายชนิดกีฬาได้เหรียญทองระดับโลกแต่ไม่มีสปอนเซอร์ เพราะไม่มีช่องทางสื่อสารและสร้างฐานแฟนคลับของตัวเอง",
  },
  {
    id: "topic-8",
    title: "ธรรมาภิบาลองค์กรกีฬา การบริหารงบประมาณแผ่นดิน และการปฏิบัติตาม พ.ร.บ. กกท. 2558",
    category: "governance",
    categoryLabel: "ธรรมาภิบาล & กฎหมายกีฬา",
    categoryIcon: "⚖️",
    description: "ระบบบัญชีและเบิกจ่ายเงินอุดหนุนกองทุนฯ การป้องกันข้อพิพาททางกฎหมาย และการบริหารตามหลักความโปร่งใส",
    targetAudience: "เลขาธิการสมาคม, เหรัญญิก, เจ้าหน้าที่ธุรการสมาคมกีฬา",
    votes: 230,
    demandLevel: "medium",
    suggestedBy: "ฝ่ายกำกับดูแลสมาคมกีฬา",
    suggestedOrg: "กองพัฒนาบุคลากรกีฬา กกท.",
    createdAt: "2569-08-28",
    keyProblemsSolved: "สมาคมกีฬาหลายแห่งถูกตัดสิทธิหรืองดเงินอุดหนุนเพราะทำเอกสารเบิกจ่ายผิดระเบียบราชการโดยไม่ได้ตั้งใจ",
  },
];

// 5 Proposed Future Course Blueprints (พ.ศ. 2570 – 2572)
// STRICT COMPLIANCE: 0% overlap with Sports Science Division, 100% within Sports Personnel Development Division mandate
export const PROPOSED_FUTURE_COURSES: ProposedCourseBlueprint[] = [
  {
    id: "course-future-1",
    code: "SAT-AI-COACH",
    titleTh: "การประยุกต์ใช้ปัญญาประดิษฐ์และสถิติข้อมูลขั้นสูงเพื่อการฝึกซ้อมและกลยุทธ์การแข่งขัน",
    titleEn: "Sports AI, Performance Analytics & Tech-Driven Coaching Masterclass",
    category: "ผู้ฝึกสอนและผู้ตัดสิน",
    targetGroups: ["ผู้ฝึกสอนกีฬาแห่งชาติ", "ผู้ช่วยผู้ฝึกสอนสมาคมกีฬา", "ผู้ตัดสินเทคนิคระดับสูง"],
    durationHours: 36,
    proposedYearBE: 2570,
    problemStatement:
      "ผู้ฝึกสอนไทยกว่า 85% ยังคงวางแผนการซ้อมและวิเคราะห์คู่แข่งโดยอิงจากประสบการณ์ส่วนบุคคล ขาดทักษะการดึง Data และ AI มาแปลงเป็นแผนแท็กติก ส่งผลให้เสียเปรียบในระดับเอเชียและระดับโลก",
    rationale:
      "พัฒนายกระดับผู้ฝึกสอนกีฬาไทยสู่ 'Smart Coach' ที่สามารถใช้ซอฟต์แวร์วิเคราะห์วิดีโอ การอ่านค่า Heatmap สถิติคู่แข่ง และการใช้ AI สรุปแนวโน้มการเล่นได้อย่างแม่นยำ ไม่ซ้ำซ้อนกับฝ่ายวิทยาศาสตร์การกีฬา เพราะเน้นเรื่อง 'กลยุทธ์การแข่งขันและการสื่อสารกับนักกีฬา'",
    evidenceStat: "ได้รับคะแนนโหวตอันดับ 1 ในหมวดเทคโนโลยี (342 โหวต จาก 43 สมาคมกีฬา)",
    evidenceVotes: 342,
    strategicAlignment:
      "ภารกิจฝ่ายพัฒนาบุคลากรกีฬาโดยตรง มุ่งพัฒนาสมรรถนะโค้ชด้านกลยุทธ์การแข่งขัน (Tactical & Pedagogical Intelligence)",
    coreModules: [
      {
        moduleNo: 1,
        title: "Introduction to Modern Sports Data & AI Tools",
        desc: "ภาพรวมเครื่องมือ AI ในวงการกีฬาสากล และการเลือกใช้ซอฟต์แวร์วิเคราะห์เกม",
        hours: 6,
      },
      {
        moduleNo: 2,
        title: "Video Tagging & Opponent Tactical Scouting",
        desc: "การสเกาต์คู่แข่งด้วยวิดีโอสถิติ การสร้าง Dashboard จุดแข็ง-จุดอ่อนคู่ต่อสู้",
        hours: 12,
      },
      {
        moduleNo: 3,
        title: "In-Game Decision Making & Real-time Metrics",
        desc: "การแปลผลข้อมูลระหว่างแข่งเพื่อแก้เกมและการตัดสินใจที่แม่นยำ",
        hours: 9,
      },
      {
        moduleNo: 4,
        title: "Data Storytelling & Athlete Communication",
        desc: "การสื่อสารข้อมูลสถิติให้นักกีฬาเข้าใจง่ายและนำไปใช้จริงโดยไม่สร้างความกดดัน",
        hours: 9,
      },
    ],
    expectedOutcomes: [
      "ผู้ผ่านการอบรมสามารถสร้างระบบวิเคราะห์สถิติคู่แข่งของสมาคมกีฬาได้ด้วยตนเอง",
      "ลดเวลาการประชุมทีมและเพิ่มความแม่นยำในการแก้เกมระหว่างการแข่งขัน",
      "มีผลงานนำเสนอแผนกลยุทธ์จำลอง (Capstone Project) 1 โครงการต่อคน",
    ],
  },
  {
    id: "course-future-2",
    code: "SAT-COMM-SPONSOR",
    titleTh: "การบริหารสิทธิประโยชน์ การตลาดดิจิทัล และการระดมทุนสมาคมกีฬา 4.0",
    titleEn: "Executive Sports Commercialization, Digital Sponsorship & Fundraising",
    category: "ผู้บริหารองค์กรกีฬา",
    targetGroups: ["ผู้บริหารสมาคมกีฬาแห่งประเทศไทย", "เลขาธิการสมาคม", "ฝ่ายสิทธิประโยชน์และการตลาด"],
    durationHours: 30,
    proposedYearBE: 2570,
    problemStatement:
      "สมาคมกีฬาส่วนใหญ่พึ่งพางบประมาณสนับสนุนจากภาครัฐ (กกท. และกองทุนฯ) เกือบ 90% ขาดศักยภาพในการเจรจากับภาคเอกชน และไม่มีแพลตฟอร์มสร้างรายได้ด้วยตนเองอย่างยั่งยืน",
    rationale:
      "สร้างความยั่งยืนทางการเงินให้แก่องค์กรกีฬาไทยตามยุทธศาสตร์ชาติ สอนทักษะการทำ Sponsorship Pitch Deck, การคำนวณ Return on Investment (ROI) ให้สปอนเซอร์ และการใช้ Digital Media สร้างมูลค่าการตลาด",
    evidenceStat: "ได้รับคะแนนโหวตอันดับ 2 ของระบบ (318 โหวต) และเป็นความต้องการเร่งด่วนของสมาคมกีฬา",
    evidenceVotes: 318,
    strategicAlignment:
      "ภารกิจฝ่ายพัฒนาบุคลากรกีฬา ด้านการยกระดับผู้บริหารสมาคมกีฬาสู่การบริหารงานมืออาชีพ (Professional Sports Administration)",
    coreModules: [
      {
        moduleNo: 1,
        title: "Modern Sports Commercial Landscape & Valuation",
        desc: "โครงสร้างเศรษฐกิจกีฬา การประเมินมูลค่าสิทธิประโยชน์ และความต้องการของแบรนด์ยุคใหม่",
        hours: 6,
      },
      {
        moduleNo: 2,
        title: "Crafting High-Converting Sponsorship Proposals",
        desc: "การออกแบบข้อเสนอสปอนเซอร์ที่ตอบโจทย์การตลาด ไม่ใช่แค่การขอเงินบริจาค",
        hours: 9,
      },
      {
        moduleNo: 3,
        title: "Digital Fan Engagement & Content Monetization",
        desc: "การสร้างช่องทางสื่อของสมาคมเพื่อสร้างฐานแฟนคลับและดึงดูดเม็ดเงินโฆษณา",
        hours: 9,
      },
      {
        moduleNo: 4,
        title: "Sponsor Servicing, Rights Delivery & Renewal Contracts",
        desc: "การส่งมอบสิทธิประโยชน์ตามสัญญาอย่างมืออาชีพเพื่อการต่อสัญญาระยะยาว",
        hours: 6,
      },
    ],
    expectedOutcomes: [
      "ผู้เข้าอบรมทุกสมาคมผลิตเอกสารข้อเสนอสปอนเซอร์จริง (Real Sponsorship Pitch Deck) 1 ฉบับ",
      "สมาคมมีแผนสร้างรายได้เสริมจากภาคเอกชนอย่างน้อย 15-20% ภายใน 1 ปีหลังจบอบรม",
    ],
  },
  {
    id: "course-future-3",
    code: "SAT-SAFE-GOVERN",
    titleTh: "ธรรมาภิบาลองค์กรกีฬา การปกป้องคุ้มครองสวัสดิภาพนักกีฬา และกฎหมายสัญญากีฬา",
    titleEn: "Sports Safeguarding, Legal Integrity & Good Governance Masterclass",
    category: "ผู้บริหารและบุคลากรสนับสนุน",
    targetGroups: ["กรรมการบริหารสมาคมกีฬา", "เจ้าหน้าที่คุ้มครองสิทธินักกีฬา (Safeguarding Officers)", "นิติกรประจำสมาคม"],
    durationHours: 24,
    proposedYearBE: 2571,
    problemStatement:
      "มาตรฐานโอลิมปิกสากล (IOC) และสหพันธ์กีฬานานาชาติเริ่มบังคับใช้นโยบาย Safe Sport หากสมาคมใดไม่มีนโยบายและเจ้าหน้าที่ Safeguarding ที่ผ่านการรับรอง จะถูกลดอันดับและห้ามเข้าร่วมการแข่งขันระดับนานาชาติ",
    rationale:
      "สร้างมาตรฐาน Safe Sport และธรรมาภิบาลองค์กรกีฬาในประเทศไทย เพื่อปกป้องนักกีฬาเยาวชนจากความรุนแรง การคุกคาม และข้อพิพาทสัญญาที่ไม่เป็นธรรม สอดคล้องกับ พ.ร.บ. กกท. และพันธกรณีระหว่างประเทศ",
    evidenceStat: "ได้รับ 275 โหวต โดยเฉพาะกลุ่มนักกีฬาหญิงและสมาคมกีฬาต่อสู้/ศิลปะป้องกันตัว",
    evidenceVotes: 275,
    strategicAlignment:
      "ฝ่ายพัฒนาบุคลากรกีฬามีหน้าที่โดยตรงในการรับรองคุณวุฒิเจ้าหน้าที่คุ้มครองความปลอดภัยนักกีฬาและธรรมาภิบาลองค์กร",
    coreModules: [
      {
        moduleNo: 1,
        title: "International Safe Sport Framework & IOC Standards",
        desc: "กรอบแนวทางสากลด้านสวัสดิภาพนักกีฬา นิยามของการคุกคาม และการสร้างพื้นที่ปลอดภัย",
        hours: 6,
      },
      {
        moduleNo: 2,
        title: "Incident Reporting, Case Management & Whistleblowing",
        desc: "กระบวนการรับเรื่องร้องเรียน การสืบสวนข้อเท็จจริงอย่างเป็นธรรม และการรักษาความลับ",
        hours: 6,
      },
      {
        moduleNo: 3,
        title: "Fair Athlete Contracts & Dispute Resolution",
        desc: "การร่างสัญญาจ้างนักกีฬาและผู้ฝึกสอนที่เป็นธรรม สิทธิประโยชน์ และระงับข้อพิพาทผ่านอนุญาโตตุลาการ",
        hours: 6,
      },
      {
        moduleNo: 4,
        title: "Association Good Governance & Financial Accountability",
        desc: "ธรรมาภิบาล การจัดซื้อจัดจ้าง และการปฏิบัติตามระเบียบเงินอุดหนุนของรัฐ",
        hours: 6,
      },
    ],
    expectedOutcomes: [
      "สมาคมกีฬาที่เข้าร่วมมีร่างระเบียบข้อบังคับ Safe Sport Policy ประจำสมาคม",
      "มีบุคลากรที่ผ่านการรับรองเป็น 'Certified Safeguarding Officer' ประจำองค์กรกีฬา",
    ],
  },
  {
    id: "course-future-4",
    code: "SAT-EVENT-OPS",
    titleTh: "การบริหารจัดการการแข่งขันกีฬาสมัยใหม่และการปฏิบัติการสนามแข่งขันมาตรฐานสากล",
    titleEn: "Modern Sports Event Operations, Logistics & Venue Management",
    category: "เจ้าหน้าที่เทคนิคและฝ่ายจัดอีเวนต์",
    targetGroups: ["เจ้าหน้าที่จัดการแข่งขันสมาคมกีฬา", "ผู้บริหารสนามกีฬา กกท.", "สมาคมกีฬาแห่งจังหวัด"],
    durationHours: 30,
    proposedYearBE: 2571,
    problemStatement:
      "การแข่งขันกีฬาในประเทศไทยหลายรายการยังขาดการบริหารจัดการที่เป็นมืออาชีพ มีปัญหาเรื่องความปลอดภัย การควบคุมฝูงชน การบริหารจราจร และการจัดการขยะสิ่งแวดล้อม ทำให้ไม่ผ่านเกณฑ์การประเมินเพื่อยกระดับเป็นอีเวนต์ระดับนานาชาติ",
    rationale:
      "ยกระดับเจ้าหน้าที่เทคนิคและผู้จัดการสนามกีฬาทั่วประเทศ ให้เข้าใจระบบการแข่งขันยุคใหม่ (Venue Operations, Accreditation, Crisis Management, และ Green Event ตามแนวคิด ESG) สร้างความประทับใจแก่นักกีฬาและผู้ชม",
    evidenceStat: "ได้รับ 246 โหวต จากทั้งสมาคมแห่งประเทศไทยและสมาคมกีฬาแห่งจังหวัด",
    evidenceVotes: 246,
    strategicAlignment:
      "พัฒนาสมรรถนะบุคลากรจัดการแข่งขันและเจ้าหน้าที่เทคนิคประจำศูนย์กีฬา กกท. ทั่วประเทศ",
    coreModules: [
      {
        moduleNo: 1,
        title: "Tournament Master Planning & Timeline Logistics",
        desc: "การวางแผนปฏิบัติการแข่งขัน (Operations Master Plan) และการประสานงานทุกหน่วยงาน",
        hours: 6,
      },
      {
        moduleNo: 2,
        title: "Venue Flow, Crowd Control & Safety Protocol",
        desc: "การจัดโซนนิ่ง (Field of Play, VIP, Media, Spectators) แผนฉุกเฉินและการอพยพ",
        hours: 9,
      },
      {
        moduleNo: 3,
        title: "Accreditation, Volunteer & Stakeholder Workforce Management",
        desc: "ระบบบัตรผ่านเข้าออก (Accreditation) และการบริหารจิตวิทยาอาสาสมัคร",
        hours: 9,
      },
      {
        moduleNo: 4,
        title: "Sustainable Green Sports Events (ESG Framework)",
        desc: "การจัดการขยะ คาร์บอนต่ำ และการใช้พลังงานสะอาดในมหกรรมกีฬา",
        hours: 6,
      },
    ],
    expectedOutcomes: [
      "ผู้ผ่านการอบรมสามารถเขียนแผนปฏิบัติการจัดแข่งขัน (Operations Manual) ฉบับสมบูรณ์ได้",
      "สนามกีฬาและอีเวนต์ของ กกท. ได้รับการยกระดับมาตรฐานความปลอดภัยและสิ่งแวดล้อม",
    ],
  },
  {
    id: "course-future-5",
    code: "SAT-GRASSROOTS-YOUTH",
    titleTh: "การสร้างระบบนิเวศกีฬาขั้นพื้นฐานและการพัฒนาเส้นทางนักกีฬาเยาวชนสู่ความเป็นเลิศ",
    titleEn: "Grassroots Sports Ecosystem & Youth Athlete Pathway Management",
    category: "สมาคมกีฬาแห่งจังหวัดและเยาวชน",
    targetGroups: ["ผู้บริหารสมาคมกีฬาแห่งจังหวัด", "ผู้ฝึกสอนกีฬาเยาวชนท้องถิ่น", "เจ้าหน้าที่สำนักงาน กกท. จังหวัด"],
    durationHours: 24,
    proposedYearBE: 2572,
    problemStatement:
      "การพัฒนานักกีฬาในระดับจังหวัดมักเป็นแบบ 'ต่างคนต่างทำ' ขาดการเชื่อมโยงกับโรงเรียน ชุมชน และสมาคมกีฬาแห่งประเทศไทย ทำให้นักกีฬาเยาวชนฝีมือดีขาดโอกาสการสนับสนุนอย่างต่อเนื่องและเลิกเล่นก่อนวัยอันควร",
    rationale:
      "พัฒนาศักยภาพบุคลากรระดับภูมิภาคให้มีทักษะในการสร้างเครือข่ายกีฬาชุมชน (Grassroots Community) การจัดลีกกีฬาเยาวชนระดับจังหวัด และการวางบันไดการพัฒนานักกีฬา (Long-Term Athlete Development: LTAD) เพื่อส่งต่อนักกีฬาช้างเผือกสู่แคมป์ทีมชาติอย่างเป็นระบบ",
    evidenceStat: "ได้รับ 289 โหวต จากตัวแทนสมาคมกีฬาแห่งจังหวัดทั้ง 77 จังหวัด",
    evidenceVotes: 289,
    strategicAlignment:
      "ตอบโจทย์นโยบายกระจายการพัฒนาบุคลากรกีฬาสู่ภูมิภาคและท้องถิ่น เสริมสร้างความเข้มแข็งให้สมาคมกีฬาแห่งจังหวัด",
    coreModules: [
      {
        moduleNo: 1,
        title: "Long-Term Athlete Development (LTAD) Foundations",
        desc: "หลักการพัฒนานักกีฬาระยะยาวตามช่วงวัย เพื่อป้องกันการบาดเจ็บและการเลิกเล่นก่อนวัย",
        hours: 6,
      },
      {
        moduleNo: 2,
        title: "Building Regional Grassroots Sports Networks",
        desc: "การเชื่อมประสานโรงเรียน เทศบาล อบจ. และชมรมกีฬาในพื้นที่เพื่อสร้างกิจกรรมร่วม",
        hours: 6,
      },
      {
        moduleNo: 3,
        title: "Designing Sustainable Youth Leagues & Tournaments",
        desc: "การออกแบบลีกกีฬาเยาวชนประจำจังหวัดที่เน้นการมีส่วนร่วมและการพัฒนาฝีมือต่อเนื่อง",
        hours: 6,
      },
      {
        moduleNo: 4,
        title: "Talent Identification & Pathway to National Team",
        desc: "การคัดกรองแววนักกีฬา (Talent ID) และการส่งต่อข้อมูลสู่นักคัดเลือกสมาคมกีฬาแห่งประเทศไทย",
        hours: 6,
      },
    ],
    expectedOutcomes: [
      "ผู้แทนสมาคมกีฬาแห่งจังหวัดสามารถร่างแผนพัฒนาเส้นทางนักกีฬาเยาวชนประจำจังหวัดได้",
      "เกิดฐานข้อมูลเชื่อมโยงนักกีฬาเยาวชนระหว่างภูมิภาคกับสมาคมกีฬาแห่งประเทศไทย",
    ],
  },
];

const LOCAL_STORAGE_KEY_TOPICS = "sat_future_survey_topics_v1";

export function loadSurveyTopics(): SurveySkillTopic[] {
  if (typeof window === "undefined") return INITIAL_SKILL_TOPICS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TOPICS);
    if (!raw) return INITIAL_SKILL_TOPICS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    console.error("Error loading survey topics:", e);
  }
  return INITIAL_SKILL_TOPICS;
}

export function saveSurveyTopics(topics: SurveySkillTopic[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_TOPICS, JSON.stringify(topics));
  } catch (e) {
    console.error("Error saving survey topics:", e);
  }
}
