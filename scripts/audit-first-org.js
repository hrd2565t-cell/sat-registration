const XLSX = require('xlsx');

const wbPersonnel = XLSX.readFile('ข้อมูลบุคลากร.xlsx');
const rawPersonnel = XLSX.utils.sheet_to_json(wbPersonnel.Sheets[wbPersonnel.SheetNames[0]]);

const wbTrain = XLSX.readFile('ประวัติการอบรม.xlsx');
const rawTraining = XLSX.utils.sheet_to_json(wbTrain.Sheets[wbTrain.SheetNames[0]]);

function cleanName(n) {
  return String(n || '')
    .trim()
    .replace(/^(นาย|นางสาว|นาง|ดร\.|ดร|อาจารย์|อ\.|โค้ช|ว่าที่\s*ร\.ต\.|ว่าที่ร้อยตรี|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.|พ\.ต\.ท\.|พ\.ต\.อ\.|พ\.ต\.ต\.|พ\.อ\.|พ\.ท\.|ร\.อ\.|ร\.ท\.|ร\.ต\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|เรือโท|เรือตรี|พลฯ|ส\.ต\.ต\.|ส\.ต\.ท\.|ส\.ต\.อ\.|ดาบตำรวจ|ด\.ต\.|ผศ\.|รศ\.|ศ\.|พลเรือเอก|พลเอก|พลโท|พลตรี)\s*/i, '')
    .trim();
}

// Split first name and last name
const people = rawPersonnel.map(p => {
  const full = cleanName(p['ชื่อ-นามสกุล']);
  const parts = full.split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return {
    id: p['รหัสประจำตัว'].trim(),
    raw: p['ชื่อ-นามสกุล'].trim(),
    clean: full,
    first: firstName,
    last: lastName,
    org: (p['หน่วยงาน'] || '').trim(),
    group: (p['กลุ่มหน่วยงาน'] || '').trim()
  };
});

// Check if same first name + same organization
const byFirstAndOrg = {};
people.forEach(p => {
  if (p.first.length >= 3 && p.org.length >= 4) {
    const key = p.first + ':::' + p.org;
    if (!byFirstAndOrg[key]) byFirstAndOrg[key] = [];
    byFirstAndOrg[key].push(p);
  }
});

const sameFirstOrg = Object.entries(byFirstAndOrg).filter(([k, list]) => list.length > 1);
console.log('Same first name and same organization pairs:', sameFirstOrg.length);
sameFirstOrg.forEach(([k, list]) => {
  console.log('\nGroup:', k);
  list.forEach(p => console.log('  -', p.id, p.raw, '| Last:', p.last));
});
