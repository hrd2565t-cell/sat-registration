const XLSX = require('xlsx');
const fs = require('fs');

// 1. Read Excel files
const wbPersonnel = XLSX.readFile('ข้อมูลบุคลากร.xlsx');
const rawPersonnel = XLSX.utils.sheet_to_json(wbPersonnel.Sheets[wbPersonnel.SheetNames[0]]);

const wbTrain = XLSX.readFile('ประวัติการอบรม.xlsx');
const rawTraining = XLSX.utils.sheet_to_json(wbTrain.Sheets[wbTrain.SheetNames[0]]);

const wbCourses = XLSX.readFile('ข้อมูลหลักสูตร.xlsx');
const rawCourses = XLSX.utils.sheet_to_json(wbCourses.Sheets[wbCourses.SheetNames[0]]);

const courseTypeMap = new Map();
rawCourses.forEach(c => {
  courseTypeMap.set(c['ชื่อหลักสูตร'].trim(), c['ประเภทหลักสูตร'].trim());
});
courseTypeMap.set('การพัฒนาบุคลากรกีฬาสู่นักบริหารจัดการองค์กรกีฬาเพื่อความยั่งยืน', 'อื่นๆ');

function cleanName(n) {
  return String(n || '')
    .trim()
    .replace(/^(นาย|นางสาว|นาง|ดร\.|ดร|อาจารย์|อ\.|โค้ช|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.|พ\.ต\.ท\.|พ\.ต\.อ\.|พ\.ต\.ต\.|พ\.อ\.|พ\.ท\.|ร\.อ\.|ร\.ท\.|ร\.ต\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|เรือโท|เรือตรี|พลฯ|ส\.ต\.ต\.|ส\.ต\.ท\.|ส\.ต\.อ\.|ดาบตำรวจ|ด\.ต\.|ผศ\.|รศ\.|ศ\.|พลเรือเอก|พลเอก|พลโท|พลตรี)\s*/i, '')
    .trim();
}

function normalizeKey(n) {
  return cleanName(n).replace(/\s+/g, '').toLowerCase();
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Map training records to personnelId
const trainingByPerson = {};
rawTraining.forEach(t => {
  const pId = t['รหัสประจำตัว'].trim();
  if (!trainingByPerson[pId]) trainingByPerson[pId] = [];
  trainingByPerson[pId].push({
    course: t['หลักสูตร'].trim(),
    year: Number(t['ปีที่อบรม'])
  });
});

const personnelList = rawPersonnel.map(p => ({
  id: p['รหัสประจำตัว'].trim(),
  prefix: (p['คำนำหน้าชื่อ'] || '').trim(),
  rawName: (p['ชื่อ-นามสกุล'] || '').trim(),
  cleanName: cleanName(p['ชื่อ-นามสกุล']),
  normKey: normalizeKey(p['ชื่อ-นามสกุล']),
  group: (p['กลุ่มหน่วยงาน'] || '').trim(),
  org: (p['หน่วยงาน'] || '').trim(),
  trainings: trainingByPerson[p['รหัสประจำตัว'].trim()] || []
}));

// Find duplicate pairs
const duplicatePairs = [];
for (let i = 0; i < personnelList.length; i++) {
  for (let j = i + 1; j < personnelList.length; j++) {
    const p1 = personnelList[i];
    const p2 = personnelList[j];

    // Case 1: Exact normalized name match
    if (p1.normKey === p2.normKey) {
      duplicatePairs.push({ p1, p2, dist: 0, reason: 'ชื่อตรงกัน 100%' });
      continue;
    }

    // Case 2: Typo distance 1
    const dist = levenshtein(p1.normKey, p2.normKey);
    if (dist === 1 && p1.normKey.length >= 6) {
      // Check org compatibility
      const sameOrg = p1.org === p2.org || p1.org.includes(p2.org) || p2.org.includes(p1.org) || p1.group === p2.group;
      if (sameOrg) {
        duplicatePairs.push({ p1, p2, dist: 1, reason: 'พิมพ์ผิด 1 ตัวอักษร ในสังกัดเดียวกัน' });
      }
    } else if (dist === 2 && p1.normKey.length >= 6) {
      const sameExactOrg = p1.org === p2.org || (p1.org.length > 5 && p2.org.length > 5 && (p1.org.includes(p2.org) || p2.org.includes(p1.org)));
      if (sameExactOrg) {
        duplicatePairs.push({ p1, p2, dist: 2, reason: 'พิมพ์ผิด 2 ตัวอักษร ในสังกัดเดียวกัน' });
      }
    }
  }
}

// Special case: USR-2026-1738 ปิยะ ปิยะวัฒนกุล vs USR-2026-1845 ปิยะ วัฒนกุล
const p1738 = personnelList.find(p => p.id === 'USR-2026-1738');
const p1845 = personnelList.find(p => p.id === 'USR-2026-1845');
if (p1738 && p1845 && !duplicatePairs.some(dp => (dp.p1.id === 'USR-2026-1738' && dp.p2.id === 'USR-2026-1845') || (dp.p1.id === 'USR-2026-1845' && dp.p2.id === 'USR-2026-1738'))) {
  duplicatePairs.push({ p1: p1845, p2: p1738, dist: 4, reason: 'พิมพ์ชื่อต้นซ้ำซ้อนในนามสกุล (ปิยะ วัฒนกุล vs ปิยะ ปิยะวัฒนกุล)' });
}

console.log('=== ผลการตรวจสอบรายชื่อซ้ำซ้อนในฐานข้อมูล กกท. ===');
console.log('จำนวนบุคลากรทั้งหมดก่อนตรวจสอบ:', personnelList.length, 'คน');
console.log('จำนวนคู่ที่พบว่าเป็นบุคคลคนเดียวกันแต่ลงทะเบียนซ้ำ (Typo/Duplicate):', duplicatePairs.length, 'คู่');
console.log('จำนวนบุคลากรที่แท้จริงหลังจากตัดข้อมูลซ้ำ:', personnelList.length - duplicatePairs.length, 'คน\n');

// Map alias IDs to canonical ID
const aliasToCanonical = new Map();

duplicatePairs.forEach((pair, idx) => {
  let canonical = pair.p1;
  let alias = pair.p2;

  // Prefer correct spelling
  if (canonical.rawName.includes('ปิติค้าพร')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('กฤษฏาภัสสร์')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('เพื่อรักษ์')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('สุขสุวรรณ์')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('น้าชัย')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('ปริญาญา')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('พรประสิทธ์')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('พงค์')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('พวงสาโรจน')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('ไชยมัน')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('วรรคคี')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('สุปราณีว์')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('เชาร์วาทิน')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('สมเจตร')) { canonical = pair.p2; alias = pair.p1; }
  else if (canonical.rawName.includes('ปิยะวัฒนกุล')) { canonical = pair.p2; alias = pair.p1; }

  aliasToCanonical.set(alias.id, canonical.id);

  console.log(`${idx + 1}. ยุบรวม: [${alias.id}] "${alias.rawName}" (${alias.org})`);
  console.log(`   เข้าสู่ชื่อทางการ: [${canonical.id}] "${canonical.rawName}" (${canonical.org})`);
  console.log(`   เหตุผล: ${pair.reason}`);
  console.log(`   หลักสูตรเดิม: A=[${canonical.trainings.map(t=>t.course).join(', ')}] + B=[${alias.trainings.map(t=>t.course).join(', ')}]`);
  console.log('------------------------------------------------------------');
});
