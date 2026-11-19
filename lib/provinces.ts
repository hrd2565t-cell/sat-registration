export type ThaiRegionKey = "central" | "north" | "northeast" | "south" | "east";

export interface ThaiRegionInfo {
  key: ThaiRegionKey;
  nameTh: string;
  nameEn: string;
  badgeClass: string;
  headerColor: string;
  barColor: string;
}

export const THAI_REGIONS: Record<ThaiRegionKey, ThaiRegionInfo> = {
  central: {
    key: "central",
    nameTh: "ภาคกลาง",
    nameEn: "Central",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-200",
    headerColor: "#1e40af",
    barColor: "#3b82f6",
  },
  north: {
    key: "north",
    nameTh: "ภาคเหนือ",
    nameEn: "North",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-200",
    headerColor: "#065f46",
    barColor: "#10b981",
  },
  northeast: {
    key: "northeast",
    nameTh: "ภาคตะวันออกเฉียงเหนือ",
    nameEn: "Northeast",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
    headerColor: "#92400e",
    barColor: "#f59e0b",
  },
  east: {
    key: "east",
    nameTh: "ภาคตะวันออก",
    nameEn: "East",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-200",
    headerColor: "#6b21a8",
    barColor: "#a855f7",
  },
  south: {
    key: "south",
    nameTh: "ภาคใต้",
    nameEn: "South",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-200",
    headerColor: "#9f1239",
    barColor: "#f43f5e",
  },
};

export interface ProvinceInfo {
  id: string;
  nameTh: string;
  nameEn: string;
  region: ThaiRegionKey;
  regionNameTh: string;
  x: number; // SVG map coordinate
  y: number; // SVG map coordinate
}

export const THAI_PROVINCES: ProvinceInfo[] = [
  // --- ภาคกลาง (20 จังหวัด/กทม.) ---
  { id: "BKK", nameTh: "กรุงเทพมหานคร", nameEn: "Bangkok", region: "central", regionNameTh: "ภาคกลาง", x: 260, y: 395 },
  { id: "NON", nameTh: "นนทบุรี", nameEn: "Nonthaburi", region: "central", regionNameTh: "ภาคกลาง", x: 250, y: 385 },
  { id: "PTE", nameTh: "ปทุมธานี", nameEn: "Pathum Thani", region: "central", regionNameTh: "ภาคกลาง", x: 255, y: 375 },
  { id: "SPK", nameTh: "สมุทรปราการ", nameEn: "Samut Prakan", region: "central", regionNameTh: "ภาคกลาง", x: 265, y: 410 },
  { id: "SKN", nameTh: "สมุทรสาคร", nameEn: "Samut Sakhon", region: "central", regionNameTh: "ภาคกลาง", x: 245, y: 410 },
  { id: "SKM", nameTh: "สมุทรสงคราม", nameEn: "Samut Songkhram", region: "central", regionNameTh: "ภาคกลาง", x: 235, y: 420 },
  { id: "NPT", nameTh: "นครปฐม", nameEn: "Nakhon Pathom", region: "central", regionNameTh: "ภาคกลาง", x: 235, y: 385 },
  { id: "SPB", nameTh: "สุพรรณบุรี", nameEn: "Suphan Buri", region: "central", regionNameTh: "ภาคกลาง", x: 230, y: 355 },
  { id: "AYA", nameTh: "พระนครศรีอยุธยา", nameEn: "Phra Nakhon Si Ayutthaya", region: "central", regionNameTh: "ภาคกลาง", x: 260, y: 360 },
  { id: "SRB", nameTh: "สระบุรี", nameEn: "Saraburi", region: "central", regionNameTh: "ภาคกลาง", x: 280, y: 350 },
  { id: "LBR", nameTh: "ลพบุรี", nameEn: "Lop Buri", region: "central", regionNameTh: "ภาคกลาง", x: 270, y: 325 },
  { id: "ATG", nameTh: "อ่างทอง", nameEn: "Ang Thong", region: "central", regionNameTh: "ภาคกลาง", x: 250, y: 345 },
  { id: "SBR", nameTh: "สิงห์บุรี", nameEn: "Sing Buri", region: "central", regionNameTh: "ภาคกลาง", x: 248, y: 330 },
  { id: "CNT", nameTh: "ชัยนาท", nameEn: "Chai Nat", region: "central", regionNameTh: "ภาคกลาง", x: 235, y: 310 },
  { id: "UTI", nameTh: "อุทัยธานี", nameEn: "Uthai Thani", region: "central", regionNameTh: "ภาคกลาง", x: 205, y: 295 },
  { id: "KRI", nameTh: "กาญจนบุรี", nameEn: "Kanchanaburi", region: "central", regionNameTh: "ภาคกลาง", x: 195, y: 370 },
  { id: "RBR", nameTh: "ราชบุรี", nameEn: "Ratchaburi", region: "central", regionNameTh: "ภาคกลาง", x: 215, y: 410 },
  { id: "PBI", nameTh: "เพชรบุรี", nameEn: "Phetchaburi", region: "central", regionNameTh: "ภาคกลาง", x: 220, y: 445 },
  { id: "PKN", nameTh: "ประจวบคีรีขันธ์", nameEn: "Prachuap Khiri Khan", region: "central", regionNameTh: "ภาคกลาง", x: 215, y: 495 },
  { id: "NYK", nameTh: "นครนายก", nameEn: "Nakhon Nayok", region: "central", regionNameTh: "ภาคกลาง", x: 295, y: 370 },

  // --- ภาคตะวันออก (7 จังหวัด) ---
  { id: "CCO", nameTh: "ฉะเชิงเทรา", nameEn: "Chachoengsao", region: "east", regionNameTh: "ภาคตะวันออก", x: 295, y: 395 },
  { id: "PRI", nameTh: "ปราจีนบุรี", nameEn: "Prachin Buri", region: "east", regionNameTh: "ภาคตะวันออก", x: 315, y: 375 },
  { id: "SKW", nameTh: "สระแก้ว", nameEn: "Sa Kaeo", region: "east", regionNameTh: "ภาคตะวันออก", x: 360, y: 380 },
  { id: "CBI", nameTh: "ชลบุรี", nameEn: "Chon Buri", region: "east", regionNameTh: "ภาคตะวันออก", x: 290, y: 425 },
  { id: "RYG", nameTh: "ระยอง", nameEn: "Rayong", region: "east", regionNameTh: "ภาคตะวันออก", x: 305, y: 450 },
  { id: "CTI", nameTh: "จันทบุรี", nameEn: "Chanthaburi", region: "east", regionNameTh: "ภาคตะวันออก", x: 345, y: 445 },
  { id: "TRT", nameTh: "ตราด", nameEn: "Trat", region: "east", regionNameTh: "ภาคตะวันออก", x: 370, y: 470 },

  // --- ภาคเหนือ (16 จังหวัด) ---
  { id: "CMI", nameTh: "เชียงใหม่", nameEn: "Chiang Mai", region: "north", regionNameTh: "ภาคเหนือ", x: 175, y: 125 },
  { id: "CRI", nameTh: "เชียงราย", nameEn: "Chiang Rai", region: "north", regionNameTh: "ภาคเหนือ", x: 210, y: 80 },
  { id: "MSN", nameTh: "แม่ฮ่องสอน", nameEn: "Mae Hong Son", region: "north", regionNameTh: "ภาคเหนือ", x: 135, y: 110 },
  { id: "PYO", nameTh: "พะเยา", nameEn: "Phayao", region: "north", regionNameTh: "ภาคเหนือ", x: 230, y: 105 },
  { id: "LPN", nameTh: "ลำพูน", nameEn: "Lamphun", region: "north", regionNameTh: "ภาคเหนือ", x: 180, y: 150 },
  { id: "LPG", nameTh: "ลำปาง", nameEn: "Lampang", region: "north", regionNameTh: "ภาคเหนือ", x: 205, y: 145 },
  { id: "NAN", nameTh: "น่าน", nameEn: "Nan", region: "north", regionNameTh: "ภาคเหนือ", x: 260, y: 120 },
  { id: "PRE", nameTh: "แพร่", nameEn: "Phrae", region: "north", regionNameTh: "ภาคเหนือ", x: 230, y: 155 },
  { id: "UTD", nameTh: "อุตรดิตถ์", nameEn: "Uttaradit", region: "north", regionNameTh: "ภาคเหนือ", x: 235, y: 185 },
  { id: "STI", nameTh: "สุโขทัย", nameEn: "Sukhothai", region: "north", regionNameTh: "ภาคเหนือ", x: 205, y: 215 },
  { id: "PLK", nameTh: "พิษณุโลก", nameEn: "Phitsanulok", region: "north", regionNameTh: "ภาคเหนือ", x: 240, y: 220 },
  { id: "PCT", nameTh: "พิจิตร", nameEn: "Phichit", region: "north", regionNameTh: "ภาคเหนือ", x: 230, y: 250 },
  { id: "KPT", nameTh: "กำแพงเพชร", nameEn: "Kamphaeng Phet", region: "north", regionNameTh: "ภาคเหนือ", x: 195, y: 250 },
  { id: "PBN", nameTh: "เพชรบูรณ์", nameEn: "Phetchabun", region: "north", regionNameTh: "ภาคเหนือ", x: 270, y: 245 },
  { id: "NSN", nameTh: "นครสวรรค์", nameEn: "Nakhon Sawan", region: "north", regionNameTh: "ภาคเหนือ", x: 230, y: 280 },
  { id: "TAK", nameTh: "ตาก", nameEn: "Tak", region: "north", regionNameTh: "ภาคเหนือ", x: 165, y: 210 },

  // --- ภาคตะวันออกเฉียงเหนือ (20 จังหวัด) ---
  { id: "NMA", nameTh: "นครราชสีมา", nameEn: "Nakhon Ratchasima", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 320, y: 330 },
  { id: "BRM", nameTh: "บุรีรัมย์", nameEn: "Buri Ram", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 365, y: 340 },
  { id: "SRN", nameTh: "สุรินทร์", nameEn: "Surin", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 400, y: 345 },
  { id: "SSK", nameTh: "ศรีสะเกษ", nameEn: "Si Sa Ket", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 435, y: 345 },
  { id: "UBN", nameTh: "อุบลราชธานี", nameEn: "Ubon Ratchathani", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 475, y: 340 },
  { id: "ACR", nameTh: "อำนาจเจริญ", nameEn: "Amnat Charoen", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 465, y: 300 },
  { id: "YSO", nameTh: "ยโสธร", nameEn: "Yasothon", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 435, y: 310 },
  { id: "RET", nameTh: "ร้อยเอ็ด", nameEn: "Roi Et", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 405, y: 300 },
  { id: "MKM", nameTh: "มหาสารคาม", nameEn: "Maha Sarakham", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 380, y: 290 },
  { id: "KKN", nameTh: "ขอนแก่น", nameEn: "Khon Kaen", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 345, y: 265 },
  { id: "CPM", nameTh: "ชัยภูมิ", nameEn: "Chaiyaphum", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 305, y: 290 },
  { id: "LEI", nameTh: "เลย", nameEn: "Loei", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 280, y: 190 },
  { id: "NBP", nameTh: "หนองบัวลำภู", nameEn: "Nong Bua Lam Phu", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 325, y: 205 },
  { id: "UDN", nameTh: "อุดรธานี", nameEn: "Udon Thani", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 350, y: 195 },
  { id: "NKI", nameTh: "หนองคาย", nameEn: "Nong Khai", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 360, y: 165 },
  { id: "BKN", nameTh: "บึงกาฬ", nameEn: "Bueng Kan", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 400, y: 165 },
  { id: "SNK", nameTh: "สกลนคร", nameEn: "Sakon Nakhon", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 410, y: 210 },
  { id: "NPM", nameTh: "นครพนม", nameEn: "Nakhon Phanom", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 445, y: 205 },
  { id: "MDH", nameTh: "มุกดาหาร", nameEn: "Mukdahan", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 450, y: 255 },
  { id: "KSN", nameTh: "กาฬสินธุ์", nameEn: "Kalasin", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 385, y: 260 },

  // --- ภาคใต้ (14 จังหวัด) ---
  { id: "CPN", nameTh: "ชุมพร", nameEn: "Chumphon", region: "south", regionNameTh: "ภาคใต้", x: 205, y: 550 },
  { id: "RNG", nameTh: "ระนอง", nameEn: "Ranong", region: "south", regionNameTh: "ภาคใต้", x: 180, y: 575 },
  { id: "SNI", nameTh: "สุราษฎร์ธานี", nameEn: "Surat Thani", region: "south", regionNameTh: "ภาคใต้", x: 205, y: 620 },
  { id: "PNA", nameTh: "พังงา", nameEn: "Phangnga", region: "south", regionNameTh: "ภาคใต้", x: 180, y: 645 },
  { id: "PKT", nameTh: "ภูเก็ต", nameEn: "Phuket", region: "south", regionNameTh: "ภาคใต้", x: 175, y: 675 },
  { id: "KBI", nameTh: "กระบี่", nameEn: "Krabi", region: "south", regionNameTh: "ภาคใต้", x: 200, y: 670 },
  { id: "NRT", nameTh: "นครศรีธรรมราช", nameEn: "Nakhon Si Thammarat", region: "south", regionNameTh: "ภาคใต้", x: 235, y: 655 },
  { id: "TRG", nameTh: "ตรัง", nameEn: "Trang", region: "south", regionNameTh: "ภาคใต้", x: 215, y: 700 },
  { id: "PLG", nameTh: "พัทลุง", nameEn: "Phatthalung", region: "south", regionNameTh: "ภาคใต้", x: 240, y: 695 },
  { id: "STN", nameTh: "สตูล", nameEn: "Satun", region: "south", regionNameTh: "ภาคใต้", x: 220, y: 730 },
  { id: "SKA", nameTh: "สงขลา", nameEn: "Songkhla", region: "south", regionNameTh: "ภาคใต้", x: 255, y: 725 },
  { id: "PTN", nameTh: "ปัตตานี", nameEn: "Pattani", region: "south", regionNameTh: "ภาคใต้", x: 275, y: 740 },
  { id: "YLA", nameTh: "ยะลา", nameEn: "Yala", region: "south", regionNameTh: "ภาคใต้", x: 270, y: 770 },
  { id: "NWT", nameTh: "นราธิวาส", nameEn: "Narathiwat", region: "south", regionNameTh: "ภาคใต้", x: 295, y: 770 },
];

/**
 * ค้นหาข้อมูลจังหวัดจากชื่อภาษาไทยหรือรหัสย่อ
 */
export function getProvinceByName(name?: string): ProvinceInfo | undefined {
  if (!name) return undefined;
  const clean = name.trim().replace(/^จ\.\s*|^จังหวัด\s*/, "");
  return THAI_PROVINCES.find(
    (p) =>
      p.nameTh === clean ||
      p.nameTh.includes(clean) ||
      clean.includes(p.nameTh) ||
      p.nameEn.toLowerCase() === clean.toLowerCase() ||
      p.id.toLowerCase() === clean.toLowerCase()
  );
}

/**
 * ตรวจจับชื่อจังหวัดจากข้อความสถานที่จัดอบรม (location) อัตโนมัติ
 * ตัวอย่าง:
 * "จังหวัดพระนครศรีอยุธยา" -> "พระนครศรีอยุธยา"
 * "สถาบันพระปกเกล้าและต่างจังหวัด" -> "กรุงเทพมหานคร"
 * "จังหวัดชลบุรี" -> "ชลบุรี"
 */
export function detectProvinceFromLocation(location?: string): string | undefined {
  if (!location) return undefined;
  const text = location.trim();

  // กรณีเฉพาะที่เจอบ่อย
  if (text.includes("กรุงเทพ") || text.includes("กทม") || text.includes("พระปกเกล้า") || text.includes("หัวหมาก") || text.includes("รามคำแหง")) {
    return "กรุงเทพมหานคร";
  }
  if (text.includes("อยุธยา")) {
    return "พระนครศรีอยุธยา";
  }

  // วนหาจังหวัดที่ตรงกับชื่อใน 77 จังหวัด
  for (const prov of THAI_PROVINCES) {
    if (text.includes(prov.nameTh)) {
      return prov.nameTh;
    }
  }

  return undefined;
}
