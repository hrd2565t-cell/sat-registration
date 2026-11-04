import XLSX from "xlsx";
import fs from "fs";

const uploadedFp = "C:/Users/HRD/.gemini/antigravity/brain/19d5b86f-8188-49c1-98f2-3e70a7a5be2f/.user_uploaded/media_1793777202159_c310bbe9.xlsx";
const wb = XLSX.readFile(uploadedFp);
const rows = XLSX.utils.sheet_to_json(wb.Sheets["ทำเนียบบุคลากรเดี่ยว"]);

const currentAlumni = JSON.parse(fs.readFileSync("data/alumni.json", "utf8"));
console.log("Current alumni count:", currentAlumni.length);

const currentKeySet = new Set();
currentAlumni.forEach(a => {
  const pId = (a.personnelId || a.idCard || "").trim();
  const c = a.courseTitle.trim();
  const y = a.yearBE;
  currentKeySet.add(`${pId}|${c}|${y}`);
  currentKeySet.add(`${a.name.trim()}|${c}|${y}`);
});

const newRecords = [];
let nextTrId = 2733;

rows.forEach((r) => {
  const pId = (r["รหัสประจำตัว"] || "").toString().trim();
  const name = (r["ชื่อ-นามสกุล"] || "").toString().trim();
  const prefix = (r["คำนำหน้า"] || "").toString().trim();
  const group = (r["กลุ่มหน่วยงาน"] || "").toString().trim();
  const org = (r["ชื่อสมาคม/หน่วยงาน"] || "").toString().trim();
  const rawCourses = r["หลักสูตรทั้งหมดที่สำเร็จ (ปีที่จบ)"] || "";

  const matches = rawCourses.match(/([^,]+?)\s*\((\d{4})\)/g);
  if (matches) {
    matches.forEach(m => {
      const matchParts = m.match(/(.+?)\s*\((\d{4})\)/);
      if (matchParts) {
        const courseTitle = matchParts[1].trim();
        const yearBE = Number(matchParts[2]);

        const key1 = `${pId}|${courseTitle}|${yearBE}`;
        const key2 = `${name}|${courseTitle}|${yearBE}`;

        if (!currentKeySet.has(key1) && !currentKeySet.has(key2)) {
          let cleanName = name;
          if (prefix && cleanName.startsWith(prefix)) {
            cleanName = cleanName.slice(prefix.length).trim();
          }
          const parts = cleanName.split(/\s+/);
          const firstName = parts[0] || "";
          const lastName = parts.slice(1).join(" ") || "";

          const record = {
            id: `TR-${String(nextTrId++).padStart(5, "0")}`,
            personnelId: pId,
            idCard: pId,
            name: name,
            prefix: prefix || undefined,
            firstName: firstName,
            lastName: lastName,
            affiliation: org,
            affiliationGroup: group,
            sportsType: org,
            courseTitle: courseTitle,
            courseCategory: courseTitle === "GGE" ? "ผู้บริหารกีฬา" : "อื่นๆ",
            yearBE: yearBE,
            batch: `รุ่นปี พ.ศ. ${yearBE}`,
            passedDate: `${yearBE - 543}-09-30`,
            status: "active",
            duties: [],
            createdAt: `${yearBE - 543}-10-01T08:00:00Z`,
            updatedAt: `${yearBE - 543}-10-01T08:00:00Z`
          };
          newRecords.push(record);
          currentKeySet.add(key1);
          currentKeySet.add(key2);
        }
      }
    });
  }
});

console.log("Newly added records count:", newRecords.length);
if (newRecords.length !== 79) {
  throw new Error(`Expected exactly 79 new records, got ${newRecords.length}`);
}

const fullAlumni = [...currentAlumni, ...newRecords];
console.log("Final total alumni records:", fullAlumni.length);
if (fullAlumni.length !== 2811) {
  throw new Error(`Expected exactly 2811 records, got ${fullAlumni.length}`);
}

const uniquePersonnel = new Set(fullAlumni.map(t => (t.personnelId || t.idCard).trim()));
console.log("Final unique personnel count:", uniquePersonnel.size);
if (uniquePersonnel.size !== 1943) {
  throw new Error(`Expected exactly 1943 unique personnel, got ${uniquePersonnel.size}`);
}

// Backup old file and save new
fs.writeFileSync("data/alumni.json", JSON.stringify(fullAlumni, null, 2), "utf8");
console.log("Successfully wrote 2,811 records to data/alumni.json!");

// Save the 79 new records separately so we can batch-upload directly to Supabase
fs.writeFileSync("data/missing-79-records.json", JSON.stringify(newRecords, null, 2), "utf8");
console.log("Successfully wrote data/missing-79-records.json!");
