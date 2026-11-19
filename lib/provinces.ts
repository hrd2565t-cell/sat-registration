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
  lat?: number; // GPS Latitude
  lng?: number; // GPS Longitude
}

/**
 * เส้นโครงร่างภูมิศาสตร์ประเทศไทยแท้ (High-Precision Realistic Thailand Map Paths)
 * วาดตามแนวชายฝั่งทะเลอ่าวไทย, ทะเลอันดามัน, คอดกระ (ด้ามขวาน), แม่น้ำโขง, และแนวเทือกเขา
 */
export const THAILAND_MAP_PATHS = {
  // ภาคเหนือ: ขวานบน ขอบเขาชายแดนเมียนมา ลาว สันเขาหลวงพระบาง
  north:
    "M 205 48 C 220 50, 238 56, 248 68 C 255 78, 274 95, 270 125 C 266 150, 278 180, 282 225 C 284 250, 275 272, 260 282 C 245 285, 230 285, 215 282 C 190 275, 160 235, 150 195 C 142 165, 128 135, 134 105 C 140 85, 175 58, 205 48 Z",

  // ภาคตะวันออกเฉียงเหนือ: ที่ราบสูงโคราช โค้งเลียบแม่น้ำโขง จรดทิวเขาพนมดงรัก
  northeast:
    "M 276 182 C 295 170, 335 155, 385 150 C 418 152, 452 170, 460 205 C 466 235, 482 270, 485 320 C 484 340, 460 352, 420 354 C 375 352, 340 348, 290 340 C 298 300, 292 255, 282 215 C 278 198, 272 188, 276 182 Z",

  // ภาคกลางและตะวันตก: ลุ่มแม่น้ำเจ้าพระยา ชายฝั่งอ่าวไทยตอนบน ทิวเขาตะนาวศรี
  central:
    "M 215 282 C 230 285, 252 284, 268 288 C 282 305, 292 335, 290 355 C 302 368, 308 382, 298 395 C 285 408, 272 418, 258 422 C 242 425, 230 435, 228 465 C 226 495, 222 530, 218 550 C 205 540, 206 495, 202 445 C 185 410, 172 365, 182 325 C 192 298, 205 288, 215 282 Z",

  // ภาคตะวันออก: ทิวเขาบรรทัด ชายฝั่งชลบุรี-ระยอง-จันทบุรี-ตราด
  east:
    "M 298 395 C 318 385, 348 382, 375 385 C 388 412, 378 448, 384 482 C 375 488, 355 475, 340 458 C 322 452, 300 442, 288 425 C 285 408, 290 398, 298 395 Z",

  // ภาคใต้: ด้ามขวานทองแท้ คอดกระ อ่าวบ้านดอน ทะเลสาบสงขลา แหลมมลายูเบตง
  south:
    "M 218 550 C 225 565, 215 595, 228 625 C 242 645, 255 680, 268 715 C 280 735, 298 755, 305 775 C 290 785, 265 790, 245 775 C 230 760, 215 740, 218 720 C 205 700, 188 665, 182 630 C 176 595, 185 570, 205 550 C 210 548, 215 548, 218 550 Z",

  // เกาะสำคัญทางยุทธศาสตร์
  islands: [
    { nameTh: "ภูเก็ต", x: 173, y: 676, path: "M 170 668 C 168 674, 169 684, 174 687 C 177 684, 178 674, 175 668 Z" },
    { nameTh: "เกาะสมุย", x: 245, y: 612, path: "M 241 606 C 246 604, 251 609, 248 616 C 243 617, 239 611, 241 606 Z" },
    { nameTh: "เกาะพะงัน", x: 247, y: 596, path: "M 244 593 C 248 591, 252 595, 250 600 C 246 601, 243 596, 244 593 Z" },
    { nameTh: "เกาะช้าง", x: 365, y: 490, path: "M 361 485 C 366 482, 370 490, 366 496 C 360 494, 359 488, 361 485 Z" },
  ],
};

export const THAI_PROVINCES: ProvinceInfo[] = [
  // --- ภาคกลาง (20 จังหวัด/กทม.) ---
  { id: "BKK", nameTh: "กรุงเทพมหานคร", nameEn: "Bangkok", region: "central", regionNameTh: "ภาคกลาง", x: 256, y: 395, lat: 13.7563, lng: 100.5018 },
  { id: "NON", nameTh: "นนทบุรี", nameEn: "Nonthaburi", region: "central", regionNameTh: "ภาคกลาง", x: 252, y: 386, lat: 13.8621, lng: 100.5134 },
  { id: "PTE", nameTh: "ปทุมธานี", nameEn: "Pathum Thani", region: "central", regionNameTh: "ภาคกลาง", x: 256, y: 376, lat: 14.0208, lng: 100.5250 },
  { id: "SPK", nameTh: "สมุทรปราการ", nameEn: "Samut Prakan", region: "central", regionNameTh: "ภาคกลาง", x: 265, y: 410, lat: 13.5991, lng: 100.5998 },
  { id: "SKN", nameTh: "สมุทรสาคร", nameEn: "Samut Sakhon", region: "central", regionNameTh: "ภาคกลาง", x: 245, y: 410, lat: 13.5475, lng: 100.2744 },
  { id: "SKM", nameTh: "สมุทรสงคราม", nameEn: "Samut Songkhram", region: "central", regionNameTh: "ภาคกลาง", x: 236, y: 418, lat: 13.4098, lng: 100.0023 },
  { id: "NPT", nameTh: "นครปฐม", nameEn: "Nakhon Pathom", region: "central", regionNameTh: "ภาคกลาง", x: 238, y: 385, lat: 13.8199, lng: 100.0601 },
  { id: "SPB", nameTh: "สุพรรณบุรี", nameEn: "Suphan Buri", region: "central", regionNameTh: "ภาคกลาง", x: 232, y: 355, lat: 14.4745, lng: 100.1177 },
  { id: "AYA", nameTh: "พระนครศรีอยุธยา", nameEn: "Phra Nakhon Si Ayutthaya", region: "central", regionNameTh: "ภาคกลาง", x: 258, y: 360, lat: 14.3532, lng: 100.5684 },
  { id: "SRB", nameTh: "สระบุรี", nameEn: "Saraburi", region: "central", regionNameTh: "ภาคกลาง", x: 278, y: 350, lat: 14.5289, lng: 100.9101 },
  { id: "LBR", nameTh: "ลพบุรี", nameEn: "Lop Buri", region: "central", regionNameTh: "ภาคกลาง", x: 270, y: 325, lat: 14.7995, lng: 100.6534 },
  { id: "ATG", nameTh: "อ่างทอง", nameEn: "Ang Thong", region: "central", regionNameTh: "ภาคกลาง", x: 250, y: 345, lat: 14.5896, lng: 100.4551 },
  { id: "SBR", nameTh: "สิงห์บุรี", nameEn: "Sing Buri", region: "central", regionNameTh: "ภาคกลาง", x: 248, y: 330, lat: 14.8936, lng: 100.4046 },
  { id: "CNT", nameTh: "ชัยนาท", nameEn: "Chai Nat", region: "central", regionNameTh: "ภาคกลาง", x: 235, y: 310, lat: 15.1852, lng: 100.1251 },
  { id: "UTI", nameTh: "อุทัยธานี", nameEn: "Uthai Thani", region: "central", regionNameTh: "ภาคกลาง", x: 205, y: 295, lat: 15.3837, lng: 100.0245 },
  { id: "KRI", nameTh: "กาญจนบุรี", nameEn: "Kanchanaburi", region: "central", regionNameTh: "ภาคกลาง", x: 195, y: 370, lat: 14.0228, lng: 99.5328 },
  { id: "RBR", nameTh: "ราชบุรี", nameEn: "Ratchaburi", region: "central", regionNameTh: "ภาคกลาง", x: 215, y: 410, lat: 13.5376, lng: 99.8167 },
  { id: "PBI", nameTh: "เพชรบุรี", nameEn: "Phetchaburi", region: "central", regionNameTh: "ภาคกลาง", x: 220, y: 445, lat: 13.1119, lng: 99.9398 },
  { id: "PKN", nameTh: "ประจวบคีรีขันธ์", nameEn: "Prachuap Khiri Khan", region: "central", regionNameTh: "ภาคกลาง", x: 216, y: 495, lat: 11.8126, lng: 99.7972 },
  { id: "NYK", nameTh: "นครนายก", nameEn: "Nakhon Nayok", region: "central", regionNameTh: "ภาคกลาง", x: 292, y: 370, lat: 14.2069, lng: 101.2131 },

  // --- ภาคตะวันออก (7 จังหวัด) ---
  { id: "CCO", nameTh: "ฉะเชิงเทรา", nameEn: "Chachoengsao", region: "east", regionNameTh: "ภาคตะวันออก", x: 295, y: 395, lat: 13.6904, lng: 101.0779 },
  { id: "PRI", nameTh: "ปราจีนบุรี", nameEn: "Prachin Buri", region: "east", regionNameTh: "ภาคตะวันออก", x: 315, y: 375, lat: 14.0510, lng: 101.3718 },
  { id: "SKW", nameTh: "สระแก้ว", nameEn: "Sa Kaeo", region: "east", regionNameTh: "ภาคตะวันออก", x: 358, y: 380, lat: 13.8240, lng: 102.0646 },
  { id: "CBI", nameTh: "ชลบุรี", nameEn: "Chon Buri", region: "east", regionNameTh: "ภาคตะวันออก", x: 292, y: 422, lat: 13.3611, lng: 100.9847 },
  { id: "RYG", nameTh: "ระยอง", nameEn: "Rayong", region: "east", regionNameTh: "ภาคตะวันออก", x: 308, y: 445, lat: 12.6814, lng: 101.2816 },
  { id: "CTI", nameTh: "จันทบุรี", nameEn: "Chanthaburi", region: "east", regionNameTh: "ภาคตะวันออก", x: 342, y: 445, lat: 12.6114, lng: 102.1039 },
  { id: "TRT", nameTh: "ตราด", nameEn: "Trat", region: "east", regionNameTh: "ภาคตะวันออก", x: 368, y: 470, lat: 12.2428, lng: 102.5175 },

  // --- ภาคเหนือ (16 จังหวัด) ---
  { id: "CMI", nameTh: "เชียงใหม่", nameEn: "Chiang Mai", region: "north", regionNameTh: "ภาคเหนือ", x: 175, y: 125, lat: 18.7883, lng: 98.9853 },
  { id: "CRI", nameTh: "เชียงราย", nameEn: "Chiang Rai", region: "north", regionNameTh: "ภาคเหนือ", x: 210, y: 75, lat: 19.9072, lng: 99.8325 },
  { id: "MSN", nameTh: "แม่ฮ่องสอน", nameEn: "Mae Hong Son", region: "north", regionNameTh: "ภาคเหนือ", x: 142, y: 110, lat: 19.3020, lng: 97.9654 },
  { id: "PYO", nameTh: "พะเยา", nameEn: "Phayao", region: "north", regionNameTh: "ภาคเหนือ", x: 228, y: 105, lat: 19.1664, lng: 99.9019 },
  { id: "LPN", nameTh: "ลำพูน", nameEn: "Lamphun", region: "north", regionNameTh: "ภาคเหนือ", x: 180, y: 150, lat: 18.5744, lng: 99.0087 },
  { id: "LPG", nameTh: "ลำปาง", nameEn: "Lampang", region: "north", regionNameTh: "ภาคเหนือ", x: 205, y: 145, lat: 18.2888, lng: 99.4928 },
  { id: "NAN", nameTh: "น่าน", nameEn: "Nan", region: "north", regionNameTh: "ภาคเหนือ", x: 255, y: 120, lat: 18.7756, lng: 100.7730 },
  { id: "PRE", nameTh: "แพร่", nameEn: "Phrae", region: "north", regionNameTh: "ภาคเหนือ", x: 228, y: 155, lat: 18.1446, lng: 100.1410 },
  { id: "UTD", nameTh: "อุตรดิตถ์", nameEn: "Uttaradit", region: "north", regionNameTh: "ภาคเหนือ", x: 235, y: 185, lat: 17.6201, lng: 100.0993 },
  { id: "STI", nameTh: "สุโขทัย", nameEn: "Sukhothai", region: "north", regionNameTh: "ภาคเหนือ", x: 205, y: 215, lat: 17.0056, lng: 99.8264 },
  { id: "PLK", nameTh: "พิษณุโลก", nameEn: "Phitsanulok", region: "north", regionNameTh: "ภาคเหนือ", x: 240, y: 220, lat: 16.8211, lng: 100.2659 },
  { id: "PCT", nameTh: "พิจิตร", nameEn: "Phichit", region: "north", regionNameTh: "ภาคเหนือ", x: 230, y: 250, lat: 16.4418, lng: 100.3488 },
  { id: "KPT", nameTh: "กำแพงเพชร", nameEn: "Kamphaeng Phet", region: "north", regionNameTh: "ภาคเหนือ", x: 195, y: 250, lat: 16.4834, lng: 99.5215 },
  { id: "PBN", nameTh: "เพชรบูรณ์", nameEn: "Phetchabun", region: "north", regionNameTh: "ภาคเหนือ", x: 268, y: 245, lat: 16.4190, lng: 101.1565 },
  { id: "NSN", nameTh: "นครสวรรค์", nameEn: "Nakhon Sawan", region: "north", regionNameTh: "ภาคเหนือ", x: 230, y: 280, lat: 15.7057, lng: 100.1378 },
  { id: "TAK", nameTh: "ตาก", nameEn: "Tak", region: "north", regionNameTh: "ภาคเหนือ", x: 172, y: 215, lat: 16.8839, lng: 99.1258 },

  // --- ภาคตะวันออกเฉียงเหนือ (20 จังหวัด) ---
  { id: "NMA", nameTh: "นครราชสีมา", nameEn: "Nakhon Ratchasima", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 325, y: 330, lat: 14.9799, lng: 102.0977 },
  { id: "BRM", nameTh: "บุรีรัมย์", nameEn: "Buri Ram", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 365, y: 340, lat: 14.9930, lng: 103.1029 },
  { id: "SRN", nameTh: "สุรินทร์", nameEn: "Surin", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 398, y: 342, lat: 14.8818, lng: 103.4936 },
  { id: "SSK", nameTh: "ศรีสะเกษ", nameEn: "Si Sa Ket", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 432, y: 342, lat: 15.1186, lng: 104.3220 },
  { id: "UBN", nameTh: "อุบลราชธานี", nameEn: "Ubon Ratchathani", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 468, y: 335, lat: 15.2448, lng: 104.8473 },
  { id: "ACR", nameTh: "อำนาจเจริญ", nameEn: "Amnat Charoen", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 458, y: 298, lat: 15.8585, lng: 104.6298 },
  { id: "YSO", nameTh: "ยโสธร", nameEn: "Yasothon", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 432, y: 308, lat: 15.7926, lng: 104.1451 },
  { id: "RET", nameTh: "ร้อยเอ็ด", nameEn: "Roi Et", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 405, y: 300, lat: 16.0538, lng: 103.6520 },
  { id: "MKM", nameTh: "มหาสารคาม", nameEn: "Maha Sarakham", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 380, y: 290, lat: 16.1852, lng: 103.3007 },
  { id: "KKN", nameTh: "ขอนแก่น", nameEn: "Khon Kaen", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 350, y: 265, lat: 16.4322, lng: 102.8236 },
  { id: "CPM", nameTh: "ชัยภูมิ", nameEn: "Chaiyaphum", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 305, y: 290, lat: 15.8063, lng: 102.0315 },
  { id: "LEI", nameTh: "เลย", nameEn: "Loei", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 285, y: 195, lat: 17.4860, lng: 101.7223 },
  { id: "NBP", nameTh: "หนองบัวลำภู", nameEn: "Nong Bua Lam Phu", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 328, y: 205, lat: 17.2037, lng: 102.4407 },
  { id: "UDN", nameTh: "อุดรธานี", nameEn: "Udon Thani", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 352, y: 195, lat: 17.4138, lng: 102.7872 },
  { id: "NKI", nameTh: "หนองคาย", nameEn: "Nong Khai", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 360, y: 168, lat: 17.8783, lng: 102.7420 },
  { id: "BKN", nameTh: "บึงกาฬ", nameEn: "Bueng Kan", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 398, y: 168, lat: 18.3633, lng: 103.6529 },
  { id: "SNK", nameTh: "สกลนคร", nameEn: "Sakon Nakhon", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 410, y: 210, lat: 17.1546, lng: 104.1486 },
  { id: "NPM", nameTh: "นครพนม", nameEn: "Nakhon Phanom", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 442, y: 205, lat: 17.3998, lng: 104.7844 },
  { id: "MDH", nameTh: "มุกดาหาร", nameEn: "Mukdahan", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 448, y: 252, lat: 16.5436, lng: 104.7235 },
  { id: "KSN", nameTh: "กาฬสินธุ์", nameEn: "Kalasin", region: "northeast", regionNameTh: "ภาคตะวันออกเฉียงเหนือ", x: 388, y: 260, lat: 16.4316, lng: 103.5065 },

  // --- ภาคใต้ (14 จังหวัด) ---
  { id: "CPN", nameTh: "ชุมพร", nameEn: "Chumphon", region: "south", regionNameTh: "ภาคใต้", x: 210, y: 555, lat: 10.4930, lng: 99.1800 },
  { id: "RNG", nameTh: "ระนอง", nameEn: "Ranong", region: "south", regionNameTh: "ภาคใต้", x: 185, y: 578, lat: 9.9658, lng: 98.6348 },
  { id: "SNI", nameTh: "สุราษฎร์ธานี", nameEn: "Surat Thani", region: "south", regionNameTh: "ภาคใต้", x: 210, y: 620, lat: 9.1382, lng: 99.3217 },
  { id: "PNA", nameTh: "พังงา", nameEn: "Phangnga", region: "south", regionNameTh: "ภาคใต้", x: 185, y: 645, lat: 8.4501, lng: 98.5255 },
  { id: "PKT", nameTh: "ภูเก็ต", nameEn: "Phuket", region: "south", regionNameTh: "ภาคใต้", x: 173, y: 676, lat: 7.8804, lng: 98.3923 },
  { id: "KBI", nameTh: "กระบี่", nameEn: "Krabi", region: "south", regionNameTh: "ภาคใต้", x: 200, y: 670, lat: 8.0863, lng: 98.9063 },
  { id: "NRT", nameTh: "นครศรีธรรมราช", nameEn: "Nakhon Si Thammarat", region: "south", regionNameTh: "ภาคใต้", x: 236, y: 655, lat: 8.4304, lng: 99.9631 },
  { id: "TRG", nameTh: "ตรัง", nameEn: "Trang", region: "south", regionNameTh: "ภาคใต้", x: 215, y: 700, lat: 7.5563, lng: 99.6114 },
  { id: "PLG", nameTh: "พัทลุง", nameEn: "Phatthalung", region: "south", regionNameTh: "ภาคใต้", x: 240, y: 695, lat: 7.6166, lng: 100.0740 },
  { id: "STN", nameTh: "สตูล", nameEn: "Satun", region: "south", regionNameTh: "ภาคใต้", x: 220, y: 730, lat: 6.6238, lng: 100.0674 },
  { id: "SKA", nameTh: "สงขลา", nameEn: "Songkhla", region: "south", regionNameTh: "ภาคใต้", x: 256, y: 725, lat: 7.1988, lng: 100.5951 },
  { id: "PTN", nameTh: "ปัตตานี", nameEn: "Pattani", region: "south", regionNameTh: "ภาคใต้", x: 275, y: 740, lat: 6.8675, lng: 101.2501 },
  { id: "YLA", nameTh: "ยะลา", nameEn: "Yala", region: "south", regionNameTh: "ภาคใต้", x: 268, y: 770, lat: 6.5411, lng: 101.2804 },
  { id: "NWT", nameTh: "นราธิวาส", nameEn: "Narathiwat", region: "south", regionNameTh: "ภาคใต้", x: 295, y: 770, lat: 6.4255, lng: 101.8253 },
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
 */
export function detectProvinceFromLocation(location?: string): string | undefined {
  if (!location) return undefined;
  const text = location.trim();

  if (text.includes("กรุงเทพ") || text.includes("กทม") || text.includes("พระปกเกล้า") || text.includes("หัวหมาก") || text.includes("รามคำแหง")) {
    return "กรุงเทพมหานคร";
  }
  if (text.includes("อยุธยา")) {
    return "พระนครศรีอยุธยา";
  }

  for (const prov of THAI_PROVINCES) {
    if (text.includes(prov.nameTh)) {
      return prov.nameTh;
    }
  }

  return undefined;
}
