const fs = require('fs');
const path = require('path');

async function prepareGeoJson() {
  console.log('Fetching Thailand GeoJSON from upstream source...');
  const url = 'https://raw.githubusercontent.com/apisit/thailand.json/master/thailand.json';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch GeoJSON: ${res.status} ${res.statusText}`);
  }
  const geojson = await res.json();

  // Read provinces from lib/provinces.ts
  const provincesTs = fs.readFileSync(path.join(__dirname, '../lib/provinces.ts'), 'utf8');

  // Match THAI_PROVINCES entries
  // Example: { id: "BKK", nameTh: "กรุงเทพมหานคร", nameEn: "Bangkok", region: "central", regionNameTh: "ภาคกลาง", x: 256, y: 395, lat: 13.7563, lng: 100.5018 }
  const regex = /{\s*id:\s*"([^"]+)",\s*nameTh:\s*"([^"]+)",\s*nameEn:\s*"([^"]+)",\s*region:\s*"([^"]+)",\s*regionNameTh:\s*"([^"]+)",[^}]*lat:\s*([0-9.]+),\s*lng:\s*([0-9.]+)\s*}/g;
  let match;
  const provList = [];
  while ((match = regex.exec(provincesTs)) !== null) {
    provList.push({
      id: match[1],
      nameTh: match[2],
      nameEn: match[3],
      region: match[4],
      regionNameTh: match[5],
      lat: parseFloat(match[6]),
      lng: parseFloat(match[7]),
    });
  }

  console.log(`Parsed ${provList.length} provinces from lib/provinces.ts`);

  const normalize = s => s ? s.toLowerCase().replace(/[^a-z]/g, '') : '';
  const provByNormEn = new Map();
  const provByNameTh = new Map();

  provList.forEach(p => {
    provByNormEn.set(normalize(p.nameEn), p);
    provByNameTh.set(p.nameTh, p);
  });

  // Common aliases
  provByNormEn.set('bangkokmetropolis', provByNameTh.get('กรุงเทพมหานคร'));
  provByNormEn.set('lopburi', provByNameTh.get('ลพบุรี'));
  provByNormEn.set('buriram', provByNameTh.get('บุรีรัมย์'));
  provByNormEn.set('phangnga', provByNameTh.get('พังงา'));
  provByNormEn.set('sisaket', provByNameTh.get('ศรีสะเกษ'));
  provByNormEn.set('chonburi', provByNameTh.get('ชลบุรี'));
  provByNormEn.set('prachinburi', provByNameTh.get('ปราจีนบุรี'));
  provByNormEn.set('suphanburi', provByNameTh.get('สุพรรณบุรี'));
  provByNormEn.set('singburi', provByNameTh.get('สิงห์บุรี'));
  provByNormEn.set('nongbualamphu', provByNameTh.get('หนองบัวลำภู'));
  provByNormEn.set('phranakhonsiayutthaya', provByNameTh.get('พระนครศรีอยุธยา'));

  let matchedCount = 0;
  geojson.features.forEach(feat => {
    const origName = feat.properties.name;
    const norm = normalize(origName);
    const matched = provByNormEn.get(norm);

    if (matched) {
      feat.properties = {
        name: origName,
        id: matched.id,
        nameTh: matched.nameTh,
        nameEn: matched.nameEn,
        region: matched.region,
        regionNameTh: matched.regionNameTh,
        lat: matched.lat,
        lng: matched.lng,
      };
      matchedCount++;
    } else {
      console.warn('Unmatched GeoJSON feature:', origName);
    }
  });

  console.log(`Successfully mapped ${matchedCount} / ${geojson.features.length} provinces!`);

  const outDir = path.join(__dirname, '../public/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'thailand-provinces.geojson');
  fs.writeFileSync(outPath, JSON.stringify(geojson), 'utf8');
  console.log(`Saved enriched GeoJSON to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

prepareGeoJson().catch(err => {
  console.error(err);
  process.exit(1);
});
