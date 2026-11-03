const XLSX = require('xlsx');

// 1. Read ข้อมูลบุคลากร.xlsx
const wbPersonnel = XLSX.readFile('ข้อมูลบุคลากร.xlsx');
const sheetPersonnel = wbPersonnel.Sheets[wbPersonnel.SheetNames[0]];
const rawPersonnel = XLSX.utils.sheet_to_json(sheetPersonnel);

console.log('Total rows in ข้อมูลบุคลากร.xlsx:', rawPersonnel.length);

function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .replace(/^(นาย|นางสาว|นาง|ดร\.|ดร|อาจารย์|อ\.|โค้ช|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.|พ\.ต\.ท\.|พ\.ต\.อ\.|พ\.ต\.ต\.|พ\.อ\.|พ\.ท\.|ร\.อ\.|ร\.ท\.|ร\.ต\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|เรือโท|เรือตรี|พลฯ|ส\.ต\.ต\.|ส\.ต\.ท\.|ส\.ต\.อ\.|ดาบตำรวจ|ด\.ต\.|ผศ\.|รศ\.|ศ\.)\s*/i, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

const rawNameCount = {};
const normToOriginal = {};

rawPersonnel.forEach((row, idx) => {
  const rawName = String(row['ชื่อ-นามสกุล'] || row['ชื่อ'] || '').trim();
  const norm = normalizeName(rawName);
  const id = row['รหัสประจำตัว'] || row['รหัส'] || ('row-' + idx);
  const org = row['หน่วยงาน'] || row['สังกัด'] || '';
  const group = row['กลุ่มหน่วยงาน'] || '';

  rawNameCount[rawName] = (rawNameCount[rawName] || 0) + 1;
  if (!normToOriginal[norm]) {
    normToOriginal[norm] = [];
  }
  normToOriginal[norm].push({ id, rawName, org, group, prefix: row['คำนำหน้าชื่อ'] || '' });
});

console.log('Unique raw names in ข้อมูลบุคลากร:', Object.keys(rawNameCount).length);
console.log('Unique normalized names in ข้อมูลบุคลากร:', Object.keys(normToOriginal).length);

const duplicates = Object.entries(normToOriginal).filter(([norm, list]) => list.length > 1);
console.log('Normalized duplicate names count in ข้อมูลบุคลากร:', duplicates.length);

if (duplicates.length > 0) {
  console.log('--- DETECTED DUPLICATE PERSONS IN ข้อมูลบุคลากร ---');
  duplicates.forEach(([norm, list]) => {
    console.log('Name [' + norm + '] appeared ' + list.length + ' times:');
    list.forEach(item => {
      console.log('  - ID: ' + item.id + ' | Name: ' + item.rawName + ' | Group: ' + item.group + ' | Org: ' + item.org);
    });
  });
}

// 2. Read ประวัติการอบรม.xlsx
const wbTraining = XLSX.readFile('ประวัติการอบรม.xlsx');
const sheetTraining = wbTraining.Sheets[wbTraining.SheetNames[0]];
const rawTraining = XLSX.utils.sheet_to_json(sheetTraining);

console.log('\nTotal rows in ประวัติการอบรม.xlsx:', rawTraining.length);

const trainingNames = {};
rawTraining.forEach((row, idx) => {
  const rawName = String(row['ชื่อ-นามสกุล'] || row['ชื่อ'] || '').trim();
  const norm = normalizeName(rawName);
  if (!trainingNames[norm]) trainingNames[norm] = [];
  trainingNames[norm].push({
    rawName,
    course: row['ชื่อหลักสูตร'] || row['หลักสูตร'] || '',
    year: row['ปี พ.ศ.'] || row['ปี'] || '',
    rowIdx: idx + 2
  });
});

console.log('Unique normalized trainee names in ประวัติการอบรม:', Object.keys(trainingNames).length);

// 3. Check for persons in training with identical course in the same year (true duplicate training records!)
let exactDuplicateTrainings = 0;
Object.entries(trainingNames).forEach(([norm, records]) => {
  const courseYearSet = new Set();
  records.forEach(r => {
    const key = r.course + '::' + r.year;
    if (courseYearSet.has(key)) {
      exactDuplicateTrainings++;
      console.log('EXACT DUPLICATE TRAINING FOUND: Person [' + r.rawName + '] Course [' + r.course + '] Year [' + r.year + ']');
    } else {
      courseYearSet.add(key);
    }
  });
});
console.log('Exact duplicate course-year entries in ประวัติการอบรม:', exactDuplicateTrainings);

// 4. Fuzzy match check in personnel (Levenshtein distance <= 2)
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

const normKeys = Object.keys(normToOriginal);
console.log('\nRunning fuzzy comparison across ' + normKeys.length + ' unique names...');
const nearMatches = [];
for (let i = 0; i < normKeys.length; i++) {
  for (let j = i + 1; j < normKeys.length; j++) {
    const n1 = normKeys[i];
    const n2 = normKeys[j];
    // if lengths differ by at most 2 and length >= 6
    if (Math.abs(n1.length - n2.length) <= 2 && n1.length >= 6) {
      const dist = levenshtein(n1, n2);
      if (dist === 1) { // 1 character difference!
        nearMatches.push({ n1, n2, dist, item1: normToOriginal[n1][0], item2: normToOriginal[n2][0] });
      }
    }
  }
}

console.log('Near matches (1 typo difference):', nearMatches.length);
nearMatches.slice(0, 30).forEach(m => {
  console.log('Near match: [' + m.item1.rawName + '] (' + m.item1.org + ') <===> [' + m.item2.rawName + '] (' + m.item2.org + ')');
});
