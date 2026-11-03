const XLSX = require('xlsx');

const wbPersonnel = XLSX.readFile('ข้อมูลบุคลากร.xlsx');
const rawPersonnel = XLSX.utils.sheet_to_json(wbPersonnel.Sheets[wbPersonnel.SheetNames[0]]);

const wbTrain = XLSX.readFile('ประวัติการอบรม.xlsx');
const rawTraining = XLSX.utils.sheet_to_json(wbTrain.Sheets[wbTrain.SheetNames[0]]);

const trainMap = {};
rawTraining.forEach(t => {
  const pId = t['รหัสประจำตัว'].trim();
  if (!trainMap[pId]) trainMap[pId] = [];
  trainMap[pId].push({
    course: t['หลักสูตร'].trim(),
    year: Number(t['ปีที่อบรม'])
  });
});

const personMap = {};
rawPersonnel.forEach(p => {
  personMap[p['รหัสประจำตัว'].trim()] = p;
});

// Candidate duplicate pairs
const pairs = [
  { keep: 'USR-2026-0020', dup: 'USR-2026-1703', reason: 'ปิติคำพร vs ปิติค้าพร (สมาคมกีฬาขี่ม้าโปโล)' },
  { keep: 'USR-2026-1817', dup: 'USR-2026-0028', reason: 'กฤษฎาภัสสร์ vs กฤษฏาภัสสร์ (กกท.)' },
  { keep: 'USR-2026-0161', dup: 'USR-2026-1687', reason: 'จิระ เพื่อนรักษ์ vs จิระ เพื่อรักษ์ (กกท./กองทุนกีฬา)' },
  { keep: 'USR-2026-0252', dup: 'USR-2026-1621', reason: 'ชาญชัย สุขสุวรรณ vs ชาญชัย สุขสุวรรณ์ (สมาคมกีฬายูยิตสู)' },
  { keep: 'USR-2026-1798', dup: 'USR-2026-0357', reason: 'ดำรงค์ ไชยเสนา vs ดำรง ไชยเสนา (กกท.)' },
  { keep: 'USR-2026-0524', dup: 'USR-2026-1710', reason: 'นำชัย รัตนพงษ์บัณฑิต vs น้าชัย รัตนพงษ์บัณฑิต (กกท.)' },
  { keep: 'USR-2026-1725', dup: 'USR-2026-0562', reason: 'บรรณสิทธิ สิทธิบรรณกุล vs บรรสิทธิ สิทธิบรรณกุล' },
  { keep: 'USR-2026-0638', dup: 'USR-2026-0640', reason: 'ปริญญา เสนาวรานนท์ vs ปริญาญา เสนาวรานนท์ (สมาคมกีฬาจังหวัดปัตตานี)' },
  { keep: 'USR-2026-0667', dup: 'USR-2026-1740', reason: 'ปิยพงศ์ พิรุณ vs ปิยะพงศ์ พิรุณ (สมาคมกีฬาบาสเกตบอล)' },
  { keep: 'USR-2026-0718', dup: 'USR-2026-1744', reason: 'พรประสิทธิ์ เล็กสุทธิ์ vs พรประสิทธ์ เล็กสุทธิ์ (กกท.)' },
  { keep: 'USR-2026-0726', dup: 'USR-2026-1760', reason: 'พัชรพงศ์ วิริยะธรรมเจริญ vs พัชรพงศ์ วิริยธรรมเจริญ (กกท.)' },
  { keep: 'USR-2026-0730', dup: 'USR-2026-1616', reason: 'พัฒนาชาติ กฤดิบวร vs พัฒนชาติ กฤดิบวร (สมาคมกีฬาวู้ดบอล)' },
  { keep: 'USR-2026-0733', dup: 'USR-2026-1617', reason: 'พัสสพงศ์ พิทักษ์พูลสิน vs พัสสพงค์ พิทักษ์พูลสิน (สมาคมกีฬาบิลเลียด)' },
  { keep: 'USR-2026-1564', dup: 'USR-2026-0782', reason: 'เพิ่มศักดิ์ พวงสาโรจน์ vs เพิ่มศักดิ์ พวงสาโรจน (สมาคมกีฬาจักรยาน)' },
  { keep: 'USR-2026-1749', dup: 'USR-2026-0947', reason: 'รุ่งโรจน์ ไชยมั่น vs รุ่งโรจน์ ไชยมัน (สมาคมกีฬาคนพิการ)' },
  { keep: 'USR-2026-1899', dup: 'USR-2026-1079', reason: 'วิสูตร วรรคดี vs วิสูตร วรรคคี (กกท.)' },
  { keep: 'USR-2026-1083', dup: 'USR-2026-1633', reason: 'วีรพงษ์ บริสุทธิ์สุขกมล vs วีระพงษ์ บริสุทธิ์สุขกมล' },
  { keep: 'USR-2026-1910', dup: 'USR-2026-1326', reason: 'สุธีพงษ์ แก้วทับ vs สุธีพงศ์ แก้วทับ (สมาคมกีฬาปัญจกีฬา)' },
  { keep: 'USR-2026-1690', dup: 'USR-2026-1338', reason: 'สุปราณี ขวัญบุญจันทร์ vs สุปราณีว์ ขวัญบุญจันทร์ (สมาคมกีฬาคอร์ฟบอล)' },
  { keep: 'USR-2026-1639', dup: 'USR-2026-1488', reason: 'อัสนีย์ เชาว์วาทิน vs อัสนีย์ เชาร์วาทิน (สมาคมกีฬาจังหวัดนครราชสีมา)' },
  { keep: 'USR-2026-1854', dup: 'USR-2026-1688', reason: 'สมเจตน์ มาละ vs สมเจตร มาละ (กองทุนกีฬา)' },
  { keep: 'USR-2026-1845', dup: 'USR-2026-1738', reason: 'ปิยะ วัฒนกุล vs ปิยะ ปิยะวัฒนกุล (กกท.)' },
];

console.log('Total verified pairs:', pairs.length);
pairs.forEach((p, idx) => {
  const pKeep = personMap[p.keep];
  const pDup = personMap[p.dup];
  const tKeep = trainMap[p.keep] || [];
  const tDup = trainMap[p.dup] || [];
  console.log(`${idx + 1}. [${p.keep}] ${pKeep['ชื่อ-นามสกุล']} (${tKeep.length} หลักสูตร) <== [${p.dup}] ${pDup['ชื่อ-นามสกุล']} (${tDup.length} หลักสูตร)`);
  console.log(`   เหตุผล: ${p.reason}`);
});
