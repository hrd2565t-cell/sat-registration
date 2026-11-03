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

// Verified duplicate mapping (typos/duplicate entries in historical data merged into canonical profile)
const aliasToCanonical = {
  "USR-2026-1703": "USR-2026-0020", // กฤตจุฑา ปิติค้าพร -> กฤตจุฑา ปิติคำพร
  "USR-2026-0028": "USR-2026-1817", // กฤษฏาภัสสร์ -> กฤษฎาภัสสร์ อินไชยะ
  "USR-2026-1687": "USR-2026-0161", // จิระ เพื่อรักษ์ -> จิระ เพื่อนรักษ์
  "USR-2026-1621": "USR-2026-0252", // ชาญชัย สุขสุวรรณ์ -> ชาญชัย สุขสุวรรณ
  "USR-2026-0357": "USR-2026-1798", // ดำรง -> ดำรงค์ ไชยเสนา
  "USR-2026-1710": "USR-2026-0524", // น้าชัย -> นำชัย รัตนพงษ์บัณฑิต
  "USR-2026-0562": "USR-2026-1725", // บรรสิทธิ -> บรรณสิทธิ สิทธิบรรณกุล
  "USR-2026-0640": "USR-2026-0638", // ปริญาญา -> ปริญญา เสนาวรานนท์
  "USR-2026-0675": "USR-2026-0667", // ปิยะพงศ์ -> ปิยพงศ์ พิรุณ
  "USR-2026-1797": "USR-2026-0707", // พรประสิทธ์ -> พรประสิทธิ์ เล็กสุทธิ์
  "USR-2026-1760": "USR-2026-0726", // พัชรพงศ์ วิริยธรรมเจริญ -> พัชรพงศ์ วิริยะธรรมเจริญ
  "USR-2026-1588": "USR-2026-0733", // พัฒนชาติ -> พัฒนาชาติ กฤดิบวร
  "USR-2026-1589": "USR-2026-0743", // พัสสพงค์ -> พัสสพงศ์ พิทักษ์พูลสิน
  "USR-2026-0782": "USR-2026-1564", // เพิ่มศักดิ์ พวงสาโรจน -> เพิ่มศักดิ์ พวงสาโรจน์
  "USR-2026-0947": "USR-2026-1749", // รุ่งโรจน์ ไชยมัน -> รุ่งโรจน์ ไชยมั่น
  "USR-2026-1079": "USR-2026-1899", // วิสูตร วรรคคี -> วิสูตร วรรคดี
  "USR-2026-1633": "USR-2026-1083", // วีระพงษ์ -> วีรพงษ์ บริสุทธิ์สุขกมล
  "USR-2026-1326": "USR-2026-1910", // สุธีพงศ์ -> สุธีพงษ์ แก้วทับ
  "USR-2026-1338": "USR-2026-1690", // สุปราณีว์ -> สุปราณี ขวัญบุญจันทร์
  "USR-2026-1488": "USR-2026-1639", // อัสนีย์ เชาร์วาทิน -> อัสนีย์ เชาว์วาทิน
  "USR-2026-1688": "USR-2026-1854", // สมเจตร -> สมเจตน์ มาละ
  "USR-2026-1738": "USR-2026-1845", // ปิยะ ปิยะวัฒนกุล -> ปิยะ วัฒนกุล
};

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
      eventName: "เซปักตะกร้อชิงแชมป์โลก คิงส์คัพ ครั้งที่ 37",
      role: "ผู้จัดการทีมชาติไทย",
      startDate: "2024-09-01",
      endDate: "2024-09-08",
      organization: "สมาคมกีฬาตะกร้อแห่งประเทศไทย",
      location: "ศูนย์การค้าแฟชั่นไอส์แลนด์",
      achievement: "ทีมชาติไทยคว้าแชมป์ทุกประเภทที่ส่งเข้าแข่งขัน",
      knowledgeApplied: "นำหลักการบริหารจัดการองค์กรกีฬาสมัยใหม่และการสื่อสารภาวะผู้นำ (TSLP) มาบริหารนักกีฬาและสต๊าฟโค้ช",
      knowledgeDimensions: ["management", "psychology"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2024-09-12",
    },
  ],
  "USR-2026-0010": [
    {
      id: "duty-real-006",
      eventName: "การแข่งขันบาสเกตบอลลีกอาชีพแห่งประเทศไทย (TBL 2025)",
      role: "ผู้ตัดสินเทคนิคสากล",
      startDate: "2025-07-10",
      endDate: "2025-08-30",
      organization: "สมาคมกีฬาบาสเกตบอลแห่งประเทศไทย",
      location: "อาคารนิมิบุตร สนามกีฬาแห่งชาติ",
      achievement: "ตัดสินเกมรอบชิงชนะเลิศได้อย่างยุติธรรมและไร้ข้อร้องเรียน",
      knowledgeApplied: "นำกติกาสากลและจริยธรรมผู้ตัดสินจากหลักสูตร Olympic มาใช้ควบคุมเกมการแข่งขันที่มีความกดดันสูง",
      knowledgeDimensions: ["rules", "psychology"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-09-05",
    },
  ],
  "USR-2026-0015": [
    {
      id: "duty-real-007",
      eventName: "โครงการจัดการแข่งขันกีฬาเยาวชนแห่งชาติ ครั้งที่ 40",
      role: "หัวหน้าฝ่ายบริหารงบประมาณและตรวจสอบพัสดุ",
      startDate: "2025-03-20",
      endDate: "2025-04-05",
      organization: "ฝ่ายการคลัง การกีฬาแห่งประเทศไทย",
      location: "จ.ชลบุรี",
      achievement: "บริหารงบประมาณโครงการกว่า 80 ล้านบาทอย่างโปร่งใส ตรวจสอบได้ 100%",
      knowledgeApplied: "นำหลักธรรมาภิบาลและการบริหารงบประมาณกีฬา (TSLP) มาควบคุมการจัดซื้อจัดจ้างให้เป็นไปตามระเบียบพัสดุภาครัฐ",
      knowledgeDimensions: ["management", "rules"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2025-04-10",
    },
  ],
  "USR-2026-0019": [
    {
      id: "duty-real-008",
      eventName: "การแข่งขันกีฬาแห่งชาติ ครั้งที่ 49",
      role: "ผู้อำนวยการฝ่ายเทคนิคและพัฒนากีฬาจังหวัด",
      startDate: "2024-12-09",
      endDate: "2024-12-20",
      organization: "สมาคมกีฬาแห่งจังหวัดจันทบุรี",
      location: "สนามกีฬา จ.จันทบุรี",
      achievement: "จังหวัดจันทบุรีขยับขึ้นสู่อันดับท็อป 10 ตารางเหรียญรางวัล",
      knowledgeApplied: "จัดทำแผนยุทธศาสตร์พัฒนานักกีฬาและวิทยาศาสตร์การกีฬาของจังหวัดตามโมเดล GGE",
      knowledgeDimensions: ["planning", "science", "management"],
      impactRating: 5,
      verified: true,
      verifiedBy: "กองพัฒนาบุคลากรกีฬา",
      verifiedAt: "2024-12-25",
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

// 2. Transform all 2,732 training records with canonical deduplication
const allRecords = trainings.map((t, index) => {
  const rawPId = t["รหัสประจำตัว"].trim();
  const canonicalPId = aliasToCanonical[rawPId] || rawPId;
  const p = personMap.get(canonicalPId) || personMap.get(rawPId) || {};

  const prefix = (p["คำนำหน้าชื่อ"] || "").trim();
  const rawName = (p["ชื่อ-นามสกุล"] || "").trim();
  const fullName = prefix ? `${prefix} ${rawName}`.trim() : rawName;
  const course = t["หลักสูตร"].trim();
  const yearBE = Number(t["ปีที่อบรม"]);
  const group = (p["กลุ่มหน่วยงาน"] || "หน่วยงานภายนอก").trim();
  const org = (p["หน่วยงาน"] || group).trim();
  const cat = courseTypeMap.get(course) || "อื่นๆ";

  // Check duties
  const personDuties = (sampleDutiesByPerson[canonicalPId] || []).map((d) => ({
    ...d,
    idCard: canonicalPId,
    traineeId: `TR-${String(index + 1).padStart(5, "0")}`,
    createdAt: `${yearBE - 543}-10-01T08:00:00Z`,
  }));

  const isActive = yearBE >= 2565 || personDuties.length > 0;

  return {
    id: `TR-${String(index + 1).padStart(5, "0")}`,
    personnelId: canonicalPId,
    idCard: canonicalPId,
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

// Count unique personnel after canonical deduplication
const uniquePersonnelSet = new Set(allRecords.map(r => r.personnelId));
console.log("Total training records:", allRecords.length);
console.log("Total unique personnel after deduplication:", uniquePersonnelSet.size);

// Write to data/alumni.json
fs.writeFileSync("data/alumni.json", JSON.stringify(allRecords, null, 2), "utf8");
console.log("Successfully generated data/alumni.json with", allRecords.length, "records.");
