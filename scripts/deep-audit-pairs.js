const XLSX = require('xlsx');

const wbPersonnel = XLSX.readFile('ข้อมูลบุคลากร.xlsx');
const rawPersonnel = XLSX.utils.sheet_to_json(wbPersonnel.Sheets[wbPersonnel.SheetNames[0]]);

const wbTrain = XLSX.readFile('ประวัติการอบรม.xlsx');
const rawTraining = XLSX.utils.sheet_to_json(wbTrain.Sheets[wbTrain.SheetNames[0]]);

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

function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .replace(/^(นาย|นางสาว|นาง|ดร\.|ดร|อาจารย์|อ\.|โค้ช|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.|พ\.ต\.ท\.|พ\.ต\.อ\.|พ\.ต\.ต\.|พ\.อ\.|พ\.ท\.|ร\.อ\.|ร\.ท\.|ร\.ต\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|เรือโท|เรือตรี|พลฯ|ส\.ต\.ต\.|ส\.ต\.ท\.|ส\.ต\.อ\.|ดาบตำรวจ|ด\.ต\.|ผศ\.|รศ\.|ศ\.)\s*/i, '')
    .replace(/\s+/g, '')
    .toLowerCase();
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

const list = rawPersonnel.map(p => ({
  id: p['รหัสประจำตัว'].trim(),
  prefix: (p['คำนำหน้าชื่อ'] || '').trim(),
  rawName: (p['ชื่อ-นามสกุล'] || '').trim(),
  normName: normalizeName(p['ชื่อ-นามสกุล']),
  group: (p['กลุ่มหน่วยงาน'] || '').trim(),
  org: (p['หน่วยงาน'] || '').trim(),
  trainings: trainingByPerson[p['รหัสประจำตัว'].trim()] || []
}));

console.log('Total personnel:', list.length);

// Find distance 1 and distance 2 matches
const suspectPairs = [];
for (let i = 0; i < list.length; i++) {
  for (let j = i + 1; j < list.length; j++) {
    const p1 = list[i];
    const p2 = list[j];
    
    // Check if same normalized name (exact without prefix)
    if (p1.normName === p2.normName) {
      suspectPairs.push({ type: 'EXACT_NORM', dist: 0, p1, p2 });
      continue;
    }

    // Levenshtein check
    const lenDiff = Math.abs(p1.normName.length - p2.normName.length);
    if (lenDiff <= 2 && p1.normName.length >= 6) {
      const dist = levenshtein(p1.normName, p2.normName);
      if (dist === 1) {
        suspectPairs.push({ type: 'TYPO_1', dist: 1, p1, p2 });
      } else if (dist === 2) {
        // Only if organization or group matches
        if (p1.group === p2.group || p1.org === p2.org || p1.org.includes(p2.org) || p2.org.includes(p1.org)) {
          suspectPairs.push({ type: 'TYPO_2_SAME_ORG', dist: 2, p1, p2 });
        }
      }
    }
  }
}

console.log('Total suspect duplicate pairs found:', suspectPairs.length);
suspectPairs.forEach((pair, idx) => {
  console.log(`\n#${idx + 1} [${pair.type}] (Dist: ${pair.dist})`);
  console.log(`  Person A [${pair.p1.id}]: ${pair.p1.prefix} ${pair.p1.rawName} | Group: ${pair.p1.group} | Org: ${pair.p1.org}`);
  console.log(`    Trainings: ${pair.p1.trainings.map(t => t.course + ' (' + t.year + ')').join(', ') || 'None'}`);
  console.log(`  Person B [${pair.p2.id}]: ${pair.p2.prefix} ${pair.p2.rawName} | Group: ${pair.p2.group} | Org: ${pair.p2.org}`);
  console.log(`    Trainings: ${pair.p2.trainings.map(t => t.course + ' (' + t.year + ')').join(', ') || 'None'}`);
});
