const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// 1. Read files
const wbPersonnel = XLSX.readFile("ข้อมูลบุคลากร.xlsx");
const personnel = XLSX.utils.sheet_to_json(wbPersonnel.Sheets[wbPersonnel.SheetNames[0]]);
const personMap = new Map();
personnel.forEach((p) => {
  personMap.set(p["รหัสประจำตัว"].trim(), p);
});

const wbCourses = XLSX.readFile("ข้อมูลหลักสูตร.xlsx");
const courses = XLSX.utils.sheet_to_json(wbCourses.Sheets[wbCourses.SheetNames[0]]);
const courseTypeMap = new Map();
courses.forEach((c) => {
  courseTypeMap.set(c["ชื่อหลักสูตร"].trim(), c["ประเภทหลักสูตร"].trim());
});
courseTypeMap.set("การพัฒนาบุคลากรกีฬาสู่นักบริหารจัดการองค์กรกีฬาเพื่อความยั่งยืน", "อื่นๆ");

const wbTrain = XLSX.readFile("ประวัติการอบรม.xlsx");
const trainings = XLSX.utils.sheet_to_json(wbTrain.Sheets[wbTrain.SheetNames[0]]);

// Sample high quality duty records for evaluation & tracking
const sampleDutiesByPerson = {
  "USR-2026-0002": [
    {
      id: "duty-real-001",
      eventName: "การแข่งขันรักบี้ฟุตบอลชิงชนะเลิศแห่งประเทศไทย ประจำปี 2568",
      role: "หัวหน้าผู้ฝึกสอน",
      startDate: "2025-08-15",
      endDate: "2025-08-25",
      organization: "สมาคมกีฬารักบี้ฟุตบอลแห่งประเทศไทยฯ",
      location: "สนามกีฬาเฉลิมพระเกียรติ คลอง 6",
      achievement: "นำทีมคว้าแชมป์ดิวิชั่น 1",
      knowledgeApplied: "นำแบบแผนการวางโปรแกรมฝึกซ้อม Periodization และการซ้อมจำลองสถานการณ์คู่ต่อสู้ที่ได้รับจากการอบรม ICSC มาใช้วางแผนการเล่น",
      knowledgeDimensions: ["planning", "science"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-09-01",
    },
  ],
  "USR-2026-0003": [
    {
      id: "duty-real-002",
      eventName: "การแข่งขันกรีฑาชิงชนะเลิศแห่งประเทศไทย และนานาชาติ ประจำปี 2568",
      role: "ผู้จัดการทีม",
      startDate: "2025-06-10",
      endDate: "2025-06-18",
      organization: "สมาคมกีฬากรีฑาแห่งประเทศไทยฯ",
      location: "ศูนย์ฝึกกรีฑาแห่งชาติ มธ.รังสิต",
      achievement: "บริหารจัดการทีมและระบบโลจิสติกส์นักกีฬาอย่างมีประสิทธิภาพ",
      knowledgeApplied: "นำหลักการบริหารจัดการองค์กรกีฬา (ICSM) และการจัดทำงบประมาณโครงการตามมาตรฐานสากลมาบริหารทีมชาติไทย",
      knowledgeDimensions: ["management"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-06-25",
    },
  ],
  "USR-2026-0005": [
    {
      id: "duty-real-003",
      eventName: "การแข่งขันยิงปืนชิงแชมป์เอเชีย (Asian Shooting Championships 2025)",
      role: "ผู้ฝึกสอนและผู้ควบคุมเทคนิค",
      startDate: "2025-07-02",
      endDate: "2025-07-12",
      organization: "สมาคมกีฬายิงปืนแห่งประเทศไทยฯ",
      location: "สนามกีฬายิงปืนแห่งชาติ หัวหมาก",
      achievement: "นักกีฬาทำคะแนนผ่านเกณฑ์มาตรฐานคว้าโควตาเวิลด์คัพ",
      knowledgeApplied: "นำเทคนิคจิตวิทยาการกีฬาและการฝึกสมาธิ (Sport Psychology) จากการอบรม ICSC มาฝึกซ้อมการควบคุมลมหายใจและความกดดันในรอบไฟนอล",
      knowledgeDimensions: ["psychology", "science"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-07-15",
    },
  ],
  "USR-2026-0007": [
    {
      id: "duty-real-004",
      eventName: "การแข่งขันฮอกกี้ชิงชนะเลิศแห่งประเทศไทย ประจำปี 2568",
      role: "หัวหน้าผู้ฝึกสอน",
      startDate: "2025-05-18",
      endDate: "2025-05-28",
      organization: "สมาคมกีฬาฮอกกี้แห่งประเทศไทย",
      location: "สนามฮอกกี้ มวกเหล็ก จ.สระบุรี",
      achievement: "นำทีมคว้าเหรียญเงิน รุ่นทั่วไป",
      knowledgeApplied: "นำแบบฝึกซ้อมเฉพาะตำแหน่งและการฟื้นฟูกล้ามเนื้อด้วยวิทยาศาสตร์การกีฬามาประยุกต์ใช้",
      knowledgeDimensions: ["planning", "science"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-06-01",
    },
  ],
  "USR-2026-0008": [
    {
      id: "duty-real-005",
      eventName: "การแข่งขันเซปักตะกร้อชิงแชมป์โลก คิงส์คัพ ครั้งที่ 38",
      role: "หัวหน้าผู้ฝึกสอนทีมชาติไทย",
      startDate: "2025-09-01",
      endDate: "2025-09-08",
      organization: "สมาคมกีฬาตะกร้อแห่งประเทศไทย",
      location: "เอ็มซีซี ฮอลล์ เดอะมอลล์ โคราช",
      achievement: "นำทีมชาติไทยคว้าแชมป์โลกประเภททีมชุดชาย",
      knowledgeApplied: "นำหลักการบริหารทีมชาติและการรักษาสภาพความฟิตสูงสุดตามหลัก Periodization และจิตวิทยาผู้นำมาใช้ในการแข่งขันระดับโลก",
      knowledgeDimensions: ["planning", "management", "psychology"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-09-10",
    },
  ],
  "USR-2026-0009": [
    {
      id: "duty-real-006",
      eventName: "การแข่งขันฟันดาบเยาวชนชิงชนะเลิศแห่งเอเชีย",
      role: "ผู้ตัดสินชี้ขาดระดับนานาชาติ",
      startDate: "2025-04-10",
      endDate: "2025-04-18",
      organization: "สมาคมกีฬาฟันดาบแห่งประเทศไทยฯ",
      location: "ศูนย์ฝึกกีฬาในร่ม กกท. หัวหมาก",
      achievement: "ปฏิบัติหน้าที่ตัดสินรอบชิงชนะเลิศ ดาบฟอยล์บุคคลชาย ได้รับคำชมเชยจากสหพันธ์",
      knowledgeApplied: "นำกฎกติกาสากลฉบับปรับปรุงใหม่ และการสื่อสารอย่างเป็นธรรมกับนักกีฬาและโค้ชมาปฏิบัติหน้าที่อย่างถูกต้อง",
      knowledgeDimensions: ["rules"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-04-20",
    },
  ],
  "USR-2026-0015": [
    {
      id: "duty-real-007",
      eventName: "โครงการสนับสนุนงบประมาณพัฒนานักกีฬาและบุคลากรกีฬาเพื่อความเป็นเลิศ",
      role: "ผู้บริหารแผนงานและงบประมาณ",
      startDate: "2025-01-10",
      endDate: "2025-09-30",
      organization: "การกีฬาแห่งประเทศไทย (ฝ่ายการคลังกองทุน)",
      location: "การกีฬาแห่งประเทศไทย หัวหมาก",
      achievement: "บริหารจัดการเบิกจ่ายงบประมาณกองทุนฯ ได้อย่างโปร่งใส ถูกต้องตามระเบียบ 100%",
      knowledgeApplied: "นำหลักการธรรมาภิบาล การบริหารความเสี่ยง และการวางแผนงบประมาณองค์กรกีฬา (TSLP) มาใช้กำกับติดตามโครงการ",
      knowledgeDimensions: ["management", "rules"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-10-01",
    },
  ],
  "USR-2026-0006": [
    {
      id: "duty-real-008",
      eventName: "การแข่งขันกีฬาเยาวชนแห่งชาติ รอบคัดเลือกภาค 5",
      role: "ผู้ฝึกสอนกีฬาเยาวชน",
      startDate: "2025-02-15",
      endDate: "2025-02-23",
      organization: "สมาคมกีฬาแห่งจังหวัดตาก",
      location: "สนามกีฬาจังหวัดตาก",
      achievement: "นักกีฬาเยาวชนจังหวัดตากผ่านการคัดเลือกเข้าสู่รอบระดับชาติ 12 คน",
      knowledgeApplied: "นำหลักการวางแผนการซ้อมสำหรับนักกีฬาเยาวชน และการป้องกันการบาดเจ็บในวัยเจริญเติบโตมาใช้จริง",
      knowledgeDimensions: ["planning", "science"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-03-01",
    },
  ],
  "USR-2026-0001": [
    {
      id: "duty-real-009",
      eventName: "มหกรรมกีฬาคนพิการแห่งชาติ ครั้งที่ 39",
      role: "ผู้ฝึกสอนและผู้ช่วยเหลือนักกีฬาคนพิการ",
      startDate: "2025-01-20",
      endDate: "2025-01-27",
      organization: "ศูนย์การศึกษาพิเศษ ประจำจังหวัดสระแก้ว",
      location: "สนามกีฬา จ.กาญจนบุรี",
      achievement: "นำนักกีฬาคว้าเหรียญทอง บอคเซีย",
      knowledgeApplied: "นำหลักจิตวิทยาการสร้างแรงบันดาลใจและการปรับอุปกรณ์กีฬาให้เหมาะสมกับสมรรถภาพของคนพิการแต่ละประเภท",
      knowledgeDimensions: ["psychology", "science"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-02-05",
    },
  ],
};

// 2. Transform all 2,732 training records
const allRecords = trainings.map((t, index) => {
  const pId = t["รหัสประจำตัว"].trim();
  const p = personMap.get(pId) || {};
  const prefix = (p["คำนำหน้าชื่อ"] || "").trim();
  const rawName = (p["ชื่อ-นามสกุล"] || "").trim();
  const fullName = prefix ? `${prefix} ${rawName}`.trim() : rawName;
  const course = t["หลักสูตร"].trim();
  const yearBE = Number(t["ปีที่อบรม"]);
  const group = (p["กลุ่มหน่วยงาน"] || "หน่วยงานภายนอก").trim();
  const org = (p["หน่วยงาน"] || group).trim();
  const cat = courseTypeMap.get(course) || "อื่นๆ";

  // Check duties
  const personDuties = (sampleDutiesByPerson[pId] || []).map((d) => ({
    ...d,
    idCard: pId,
    traineeId: `TR-${String(index + 1).padStart(5, "0")}`,
    createdAt: `${yearBE - 543}-10-01T08:00:00Z`,
  }));

  const isActive = yearBE >= 2565 || personDuties.length > 0;

  return {
    id: `TR-${String(index + 1).padStart(5, "0")}`,
    personnelId: pId,
    idCard: pId,
    name: fullName,
    prefix: prefix || undefined,
    affiliation: org,
    affiliationGroup: group,
    sportsType: org,
    courseTitle: course,
    courseCategory: cat,
    yearBE: yearBE,
    batch: `รุ่นปี พ.ศ. ${yearBE}`,
    passedDate: `${yearBE - 543}-09-30`,
    status: isActive ? "active" : "inactive",
    duties: personDuties,
    createdAt: `${yearBE - 543}-10-01T08:00:00Z`,
    updatedAt: `${yearBE - 543}-10-01T08:00:00Z`,
  };
});

// Write to data/alumni.json
fs.writeFileSync("data/alumni.json", JSON.stringify(allRecords, null, 2), "utf8");
console.log("Successfully generated data/alumni.json with", allRecords.length, "records.");
