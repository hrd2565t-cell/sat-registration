import type { HistoricalTrainee } from "./alumni-store";
import type { NationalAssociationMasterItem } from "./associations-store";
import { THAI_PROVINCES, THAI_REGIONS, type ThaiRegionKey } from "./provinces";
import { getCoreNameKey } from "./smart-name-engine";

export interface PDPAProtectedTraineeItem {
  recordId: string;
  personnelId?: string;
  name: string;
  affiliation: string;
  courseTitle: string;
  yearBE: number;
}

export type CoverageStatus = "none" | "low" | "regular";

export interface NationalAssociationCoverageItem {
  id: string;
  orderNo: number;
  officialName: string;
  shortName: string;
  aliases: string[];
  recordCount: number;
  uniquePeopleCount: number;
  latestYearBE: number | null;
  courses: string[];
  matchedRawNames: string[];
  trainees: PDPAProtectedTraineeItem[];
  status: CoverageStatus;
}

export interface SupplementaryAssociationItem {
  name: string;
  recordCount: number;
  uniquePeopleCount: number;
  latestYearBE: number | null;
  courses: string[];
  trainees: PDPAProtectedTraineeItem[];
}

export interface NationalCoverageSummary {
  totalMaster: number;
  participatedCount: number;
  neverSentCount: number;
  coveragePercent: number;
  totalRecords: number;
  totalUniquePeople: number;
}

export interface NationalCoverageResult {
  summary: NationalCoverageSummary;
  items: NationalAssociationCoverageItem[];
  neverSentItems: NationalAssociationCoverageItem[];
  professionalAssociations: SupplementaryAssociationItem[];
  excludedCustomAssociations: SupplementaryAssociationItem[];
}

export interface ProvincialAssociationCoverageItem {
  provinceId: string;
  provinceName: string;
  officialName: string;
  region: ThaiRegionKey;
  regionNameTh: string;
  recordCount: number;
  uniquePeopleCount: number;
  latestYearBE: number | null;
  courses: string[];
  matchedRawNames: string[];
  trainees: PDPAProtectedTraineeItem[];
  status: CoverageStatus;
}

export interface RegionCoverageSummary {
  region: ThaiRegionKey;
  regionNameTh: string;
  totalProvinces: number;
  participatedProvinces: number;
  neverSentProvinces: number;
  coveragePercent: number;
  totalRecords: number;
}

export interface ProvincialCoverageSummary {
  totalMaster: number;
  participatedCount: number;
  neverSentCount: number;
  coveragePercent: number;
  totalRecords: number;
  totalUniquePeople: number;
}

export interface ProvincialCoverageResult {
  summary: ProvincialCoverageSummary;
  items: ProvincialAssociationCoverageItem[];
  neverSentItems: ProvincialAssociationCoverageItem[];
  regionSummary: RegionCoverageSummary[];
  excludedDisabilityAssociations: SupplementaryAssociationItem[];
}

/**
 * กฎเฉพาะจากผู้ใช้งาน:
 * 1) "สมาคมเพาะกาย กกท." ไม่ใช่สมาคมกีฬาแห่งประเทศไทย ห้ามนำไปรวมกับสมาคมกีฬาเพาะกายและฟิตเนสแห่งประเทศไทย
 * 2) "สมาคมกีฬาคนพิการจังหวัด..." ไม่ใช่สมาคมกีฬาแห่งจังหวัด ห้ามนำไปรวมกับสมาคมกีฬาแห่งจังหวัดนั้นๆ
 */
export const EXPLICIT_EXCLUDED_NATIONAL_COMPACT = new Set([
  "สมาคมเพาะกายกกท.",
  "สมาคมเพาะกายกกท",
]);

const KNOWN_NATIONAL_TYPO_MAP: Array<[RegExp, string]> = [
  [/ยกน้ำหนสมัครเล่น/g, "ยกน้ำหนักสมัครเล่น"],
  [/มิกซ์มาเชี่ยลอาร์ต/g, "มิกซ์มาเชียลอาร์ต"],
];

export function normalizeThaiAssociationText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/เเ/g, "แ")
    .replace(/กาฬสินธ์ุ/g, "กาฬสินธุ์")
    .replace(/ราชูปถัมถ์/g, "ราชูปถัมภ์")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeNationalKey(raw: string): string {
  let text = normalizeThaiAssociationText(raw).replace(/\s+/g, "");
  text = text
    .replace(/ในพระ(บรม)?ราชูปถัม[ภถ]์.*$/g, "")
    .replace(/ในพระราชูปถัม[ภถ]์.*$/g, "")
    .replace(/ในพระอุปถัม[ภถ]์.*$/g, "")
    .replace(/ฯ$/g, "");
  for (const [pattern, replacement] of KNOWN_NATIONAL_TYPO_MAP) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/ฯ$/g, "");
}

export function stripPatronageSuffix(officialName: string): string {
  return normalizeThaiAssociationText(officialName)
    .replace(/\s*ในพระ(?:บรม)?ราชูปถัม[ภถ]์.*$/g, "ฯ")
    .replace(/\s*ในพระราชูปถัม[ภถ]์.*$/g, "ฯ")
    .replace(/\s*ในพระอุปถัม[ภถ]์.*$/g, "ฯ")
    .trim();
}

function getSafePersonKey(t: HistoricalTrainee): string {
  if (t.personnelId && t.personnelId.trim()) {
    return t.personnelId.trim();
  }
  const cleanId = t.idCard ? t.idCard.replace(/\D/g, "") : "";
  if (cleanId.length === 13) {
    return cleanId;
  }
  return `name_${getCoreNameKey(t.name)}`;
}

function toPDPAItem(t: HistoricalTrainee): PDPAProtectedTraineeItem {
  return {
    recordId: t.id,
    personnelId: t.personnelId,
    name: t.name,
    affiliation: t.affiliation,
    courseTitle: t.courseTitle,
    yearBE: t.yearBE,
  };
}

function sortPDPAItems(items: PDPAProtectedTraineeItem[]): PDPAProtectedTraineeItem[] {
  return [...items].sort(
    (a, b) => b.yearBE - a.yearBE || a.name.localeCompare(b.name, "th")
  );
}

function addToSupplementaryMap(
  map: Map<
    string,
    {
      name: string;
      personKeys: Set<string>;
      courses: Set<string>;
      latestYearBE: number | null;
      trainees: PDPAProtectedTraineeItem[];
    }
  >,
  displayName: string,
  t: HistoricalTrainee
) {
  let entry = map.get(displayName);
  if (!entry) {
    entry = {
      name: displayName,
      personKeys: new Set<string>(),
      courses: new Set<string>(),
      latestYearBE: null,
      trainees: [],
    };
    map.set(displayName, entry);
  }
  entry.personKeys.add(getSafePersonKey(t));
  if (t.courseTitle) entry.courses.add(t.courseTitle);
  if (typeof t.yearBE === "number") {
    entry.latestYearBE =
      entry.latestYearBE === null ? t.yearBE : Math.max(entry.latestYearBE, t.yearBE);
  }
  entry.trainees.push(toPDPAItem(t));
}

function finalizeSupplementaryList(
  map: Map<
    string,
    {
      name: string;
      personKeys: Set<string>;
      courses: Set<string>;
      latestYearBE: number | null;
      trainees: PDPAProtectedTraineeItem[];
    }
  >
): SupplementaryAssociationItem[] {
  return Array.from(map.values())
    .map((e) => ({
      name: e.name,
      recordCount: e.trainees.length,
      uniquePeopleCount: e.personKeys.size,
      latestYearBE: e.latestYearBE,
      courses: Array.from(e.courses).sort((a, b) => a.localeCompare(b, "th")),
      trainees: sortPDPAItems(e.trainees),
    }))
    .sort((a, b) => b.recordCount - a.recordCount || a.name.localeCompare(b.name, "th"));
}

export function computeNationalAssociationCoverage(
  trainees: HistoricalTrainee[],
  masterList: NationalAssociationMasterItem[],
  yearFilter: number | "all" = "all"
): NationalCoverageResult {
  const filtered =
    yearFilter === "all"
      ? trainees
      : trainees.filter((t) => t.yearBE === Number(yearFilter));

  interface Bucket {
    master: NationalAssociationMasterItem;
    personKeys: Set<string>;
    courses: Set<string>;
    matchedRawNames: Set<string>;
    latestYearBE: number | null;
    trainees: PDPAProtectedTraineeItem[];
  }

  const buckets: Bucket[] = [];
  const lookup = new Map<string, Bucket>();

  for (const item of masterList) {
    const bucket: Bucket = {
      master: item,
      personKeys: new Set<string>(),
      courses: new Set<string>(),
      matchedRawNames: new Set<string>(),
      latestYearBE: null,
      trainees: [],
    };
    buckets.push(bucket);

    const mainKey = canonicalizeNationalKey(item.name);
    if (mainKey && !lookup.has(mainKey)) {
      lookup.set(mainKey, bucket);
    }
    if (Array.isArray(item.aliases)) {
      for (const alias of item.aliases) {
        const aliasKey = canonicalizeNationalKey(alias);
        if (aliasKey && !lookup.has(aliasKey)) {
          lookup.set(aliasKey, bucket);
        }
      }
    }
  }

  const proMap = new Map<
    string,
    {
      name: string;
      personKeys: Set<string>;
      courses: Set<string>;
      latestYearBE: number | null;
      trainees: PDPAProtectedTraineeItem[];
    }
  >();
  const excludedMap = new Map<
    string,
    {
      name: string;
      personKeys: Set<string>;
      courses: Set<string>;
      latestYearBE: number | null;
      trainees: PDPAProtectedTraineeItem[];
    }
  >();

  const matchedOverallPeople = new Set<string>();
  let totalMatchedRecords = 0;

  for (const t of filtered) {
    const cleanAffil = normalizeThaiAssociationText(t.affiliation || "");
    if (!cleanAffil) continue;

    const compact = cleanAffil.replace(/\s+/g, "");
    if (EXPLICIT_EXCLUDED_NATIONAL_COMPACT.has(compact)) {
      addToSupplementaryMap(excludedMap, cleanAffil, t);
      continue;
    }

    const key = canonicalizeNationalKey(cleanAffil);
    const matchedBucket = lookup.get(key);

    if (matchedBucket) {
      const personKey = getSafePersonKey(t);
      matchedBucket.personKeys.add(personKey);
      matchedOverallPeople.add(personKey);
      if (t.courseTitle) matchedBucket.courses.add(t.courseTitle);
      matchedBucket.matchedRawNames.add(t.affiliation);
      if (typeof t.yearBE === "number") {
        matchedBucket.latestYearBE =
          matchedBucket.latestYearBE === null
            ? t.yearBE
            : Math.max(matchedBucket.latestYearBE, t.yearBE);
      }
      matchedBucket.trainees.push(toPDPAItem(t));
      totalMatchedRecords += 1;
    } else if (
      t.affiliationGroup === "สมาคมกีฬาแห่งประเทศไทย" &&
      compact.includes("อาชีพ")
    ) {
      addToSupplementaryMap(proMap, cleanAffil, t);
    }
  }

  const items: NationalAssociationCoverageItem[] = buckets.map((b) => {
    const recordCount = b.trainees.length;
    const status: CoverageStatus =
      recordCount === 0 ? "none" : recordCount <= 5 ? "low" : "regular";
    return {
      id: b.master.id,
      orderNo: b.master.orderNo,
      officialName: b.master.name,
      shortName: stripPatronageSuffix(b.master.name),
      aliases: b.master.aliases ? [...b.master.aliases] : [],
      recordCount,
      uniquePeopleCount: b.personKeys.size,
      latestYearBE: b.latestYearBE,
      courses: Array.from(b.courses).sort((a, bName) => a.localeCompare(bName, "th")),
      matchedRawNames: Array.from(b.matchedRawNames),
      trainees: sortPDPAItems(b.trainees),
      status,
    };
  });

  const participatedCount = items.filter((i) => i.recordCount > 0).length;
  const totalMaster = items.length;
  const neverSentItems = items.filter((i) => i.recordCount === 0);

  return {
    summary: {
      totalMaster,
      participatedCount,
      neverSentCount: neverSentItems.length,
      coveragePercent:
        totalMaster > 0 ? Math.round((participatedCount / totalMaster) * 1000) / 10 : 0,
      totalRecords: totalMatchedRecords,
      totalUniquePeople: matchedOverallPeople.size,
    },
    items,
    neverSentItems,
    professionalAssociations: finalizeSupplementaryList(proMap),
    excludedCustomAssociations: finalizeSupplementaryList(excludedMap),
  };
}

const PROVINCES_BY_LENGTH = [...THAI_PROVINCES].sort(
  (a, b) => b.nameTh.length - a.nameTh.length
);

export function computeProvincialAssociationCoverage(
  trainees: HistoricalTrainee[],
  yearFilter: number | "all" = "all"
): ProvincialCoverageResult {
  const filtered =
    yearFilter === "all"
      ? trainees
      : trainees.filter((t) => t.yearBE === Number(yearFilter));

  interface ProvBucket {
    provinceId: string;
    provinceName: string;
    region: ThaiRegionKey;
    regionNameTh: string;
    personKeys: Set<string>;
    courses: Set<string>;
    matchedRawNames: Set<string>;
    latestYearBE: number | null;
    trainees: PDPAProtectedTraineeItem[];
  }

  const buckets = new Map<string, ProvBucket>();
  for (const p of THAI_PROVINCES) {
    buckets.set(p.id, {
      provinceId: p.id,
      provinceName: p.nameTh,
      region: p.region,
      regionNameTh: p.regionNameTh,
      personKeys: new Set<string>(),
      courses: new Set<string>(),
      matchedRawNames: new Set<string>(),
      latestYearBE: null,
      trainees: [],
    });
  }

  const disabilityMap = new Map<
    string,
    {
      name: string;
      personKeys: Set<string>;
      courses: Set<string>;
      latestYearBE: number | null;
      trainees: PDPAProtectedTraineeItem[];
    }
  >();

  const matchedOverallPeople = new Set<string>();
  let totalMatchedRecords = 0;

  for (const t of filtered) {
    const cleanAffil = normalizeThaiAssociationText(t.affiliation || "");
    if (!cleanAffil) continue;

    const compact = cleanAffil.replace(/\s+/g, "");

    // กฎเข้มงวด #2: แยกสมาคมกีฬาคนพิการจังหวัดออกจากสมาคมกีฬาแห่งจังหวัดเสมอ
    if (compact.includes("คนพิการ") || compact.includes("คนตาบอด")) {
      if (compact.includes("สมาคมกีฬาคนพิการจังหวัด")) {
        addToSupplementaryMap(disabilityMap, cleanAffil, t);
      }
      continue;
    }

    const isProvincialAssoc =
      compact.startsWith("สมาคมกีฬาแห่งจังหวัด") ||
      compact.startsWith("สมาคมกีฬาจังหวัด");
    if (!isProvincialAssoc) continue;

    const matchedProvince = PROVINCES_BY_LENGTH.find((p) => compact.includes(p.nameTh));
    if (!matchedProvince) continue;

    const bucket = buckets.get(matchedProvince.id)!;
    const personKey = getSafePersonKey(t);
    bucket.personKeys.add(personKey);
    matchedOverallPeople.add(personKey);
    if (t.courseTitle) bucket.courses.add(t.courseTitle);
    bucket.matchedRawNames.add(t.affiliation);
    if (typeof t.yearBE === "number") {
      bucket.latestYearBE =
        bucket.latestYearBE === null ? t.yearBE : Math.max(bucket.latestYearBE, t.yearBE);
    }
    bucket.trainees.push(toPDPAItem(t));
    totalMatchedRecords += 1;
  }

  const items: ProvincialAssociationCoverageItem[] = Array.from(buckets.values()).map((b) => {
    const recordCount = b.trainees.length;
    const status: CoverageStatus =
      recordCount === 0 ? "none" : recordCount <= 5 ? "low" : "regular";
    return {
      provinceId: b.provinceId,
      provinceName: b.provinceName,
      officialName: `สมาคมกีฬาแห่งจังหวัด${b.provinceName}`,
      region: b.region,
      regionNameTh: b.regionNameTh,
      recordCount,
      uniquePeopleCount: b.personKeys.size,
      latestYearBE: b.latestYearBE,
      courses: Array.from(b.courses).sort((a, bName) => a.localeCompare(bName, "th")),
      matchedRawNames: Array.from(b.matchedRawNames),
      trainees: sortPDPAItems(b.trainees),
      status,
    };
  });

  const regionOrder: ThaiRegionKey[] = ["central", "north", "northeast", "east", "south"];
  const regionSummary: RegionCoverageSummary[] = regionOrder.map((regionKey) => {
    const regionItems = items.filter((i) => i.region === regionKey);
    const totalProvinces = regionItems.length;
    const participatedProvinces = regionItems.filter((i) => i.recordCount > 0).length;
    const totalRecords = regionItems.reduce((sum, i) => sum + i.recordCount, 0);
    return {
      region: regionKey,
      regionNameTh: THAI_REGIONS[regionKey].nameTh,
      totalProvinces,
      participatedProvinces,
      neverSentProvinces: totalProvinces - participatedProvinces,
      coveragePercent:
        totalProvinces > 0
          ? Math.round((participatedProvinces / totalProvinces) * 1000) / 10
          : 0,
      totalRecords,
    };
  });

  const participatedCount = items.filter((i) => i.recordCount > 0).length;
  const totalMaster = items.length;
  const neverSentItems = items.filter((i) => i.recordCount === 0);

  return {
    summary: {
      totalMaster,
      participatedCount,
      neverSentCount: neverSentItems.length,
      coveragePercent:
        totalMaster > 0 ? Math.round((participatedCount / totalMaster) * 1000) / 10 : 0,
      totalRecords: totalMatchedRecords,
      totalUniquePeople: matchedOverallPeople.size,
    },
    items,
    neverSentItems,
    regionSummary,
    excludedDisabilityAssociations: finalizeSupplementaryList(disabilityMap),
  };
}
