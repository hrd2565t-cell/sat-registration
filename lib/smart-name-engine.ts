/**
 * Smart Thai Name & Prefix Normalization and Matching Engine
 * Specially designed for Sports Authority of Thailand (SAT) personnel database.
 */

import type { HistoricalTrainee } from "./alumni-store";

export const THAI_PREFIX_PATTERNS = [
  // Composite & Noble / Academic
  "ผศ.\\s*ว่าที่\\s*ร\\.?ต\\.?หญิง",
  "ว่าที่\\s*ร้อยตรีหญิง",
  "ว่าที่\\s*ร\\.?ต\\.?หญิง",
  "พลตรี\\s*นายแพทย์",
  "พันเอก\\s*\\(พิเศษ\\)",
  "นาวาอากาศเอกหญิง",
  "นาวาอากาศตรีหญิง",
  "เรืออากาศเอกหญิง",
  "พันตำรวจโทหญิง",
  "สิบตำรวจโทหญิง",
  "พลเรือตรีหญิง",
  "พลโทหญิง",
  "พันตรีหญิง",
  "ร้อยเอกหญิง",
  "ร้อยโทหญิง",
  "เรือเอกหญิง",
  "ว่าที่\\s*ร้อยเอก",
  "ว่าที่\\s*ร้อยโท",
  "ว่าที่\\s*ร้อยตรี",
  "ว่าที่\\s*ร\\.?ต\\.?",

  // Air Force
  "พันจ่าอากาศเอก",
  "พันจ่าอากาศโท",
  "พันจ่าอากาศตรี",
  "นาวาอากาศเอก",
  "นาวาอากาศโท",
  "นาวาอากาศตรี",
  "เรืออากาศเอก",
  "เรืออากาศโท",
  "เรืออากาศตรี",
  "จ่าอากาศเอก",
  "จ่าอากาศโท",
  "จ่าอากาศตรี",
  "พลอากาศเอก",
  "พลอากาศโท",
  "พลอากาศตรี",

  // Navy
  "พลเรือเอก",
  "พลเรือโท",
  "พลเรือตรี",
  "นาวาเอก",
  "นาวาโท",
  "นาวาตรี",
  "เรือเอก",
  "เรือโท",
  "เรือตรี",
  "พันจ่าเอก",
  "พันจ่าโท",
  "พันจ่าตรี",
  "จ่าเอก",
  "จ่าโท",
  "จ่าตรี",

  // Police
  "พลตำรวจเอก",
  "พลตำรวจโท",
  "พลตำรวจตรี",
  "พันตำรวจเอก",
  "พันตำรวจโท",
  "พันตำรวจตรี",
  "ร้อยตำรวจเอก",
  "ร้อยตำรวจโท",
  "ร้อยตำรวจตรี",
  "สิบตำรวจเอก",
  "สิบตำรวจโท",
  "สิบตำรวจตรี",
  "จ่าสิบตำรวจ",
  "พ\\.?ต\\.?อ\\.?",
  "พ\\.?ต\\.?ท\\.?",
  "พ\\.?ต\\.?ต\\.?",
  "ร\\.?ต\\.?อ\\.?",
  "ร\\.?ต\\.?ท\\.?",
  "ร\\.?ต\\.?ต\\.?",

  // Army
  "พลเอก",
  "พลโท",
  "พลตรี",
  "พันเอก",
  "พันโท",
  "พันตรี",
  "ร้อยเอก",
  "ร้อยโท",
  "ร้อยตรี",
  "จ่าสิบเอก",
  "จ่าสิบโท",
  "จ่าสิบตรี",
  "สิบเอก",
  "สิบโท",
  "สิบตรี",

  // Medical & Titles
  "นายหมวดโท",
  "นายหมวดเอก",
  "นายแพทย์",
  "แพทย์หญิง",
  "ทันตแพทย์",
  "คุณหญิง",
  "หม่อมหลวง",
  "หม่อมราชวงศ์",
  "ท่านผู้หญิง",
  "ม\\.?ล\\.?",
  "ม\\.?ร\\.?ว\\.?",

  // Academic
  "ผศ\\.?\\s*ดร\\.?",
  "รศ\\.?\\s*ดร\\.?",
  "ศ\\.?\\s*ดร\\.?",
  "ดร\\.?\\s*ทนพ\\.?",
  "ผศ\\.?",
  "รศ\\.?",
  "ศ\\.?",
  "ดร\\.?",
  "อาจารย์",
  "อ\\.?",

  // Civilian
  "นางสาว",
  "น\\.?ส\\.?",
  "นาย",
  "นาง",
] as const;

export const PREFIX_REGEX = new RegExp(`^(${THAI_PREFIX_PATTERNS.join("|")})\\s*`, "i");

export interface ParsedThaiName {
  original: string;
  prefix: string;
  firstName: string;
  lastName: string;
  coreNameKey: string;
  cleanFullName: string;
  hasPrefix: boolean;
}

/**
 * Standardize and canonicalize common prefix variations
 */
export function canonicalizePrefix(prefix: string): string {
  const clean = prefix.trim();
  if (/^น\.?ส\.?$/i.test(clean)) return "นางสาว";
  if (/^ว่าที่\s*ร\.?ต\.?$/i.test(clean)) return "ว่าที่ร้อยตรี";
  if (/^ว่าที่\s*ร\.?ต\.?หญิง$/i.test(clean)) return "ว่าที่ร้อยตรีหญิง";
  if (/^ผศ\.?\s*ดร\.?$/i.test(clean)) return "ผศ.ดร.";
  if (/^รศ\.?\s*ดร\.?$/i.test(clean)) return "รศ.ดร.";
  if (/^ศ\.?\s*ดร\.?$/i.test(clean)) return "ศ.ดร.";
  if (/^ดร\.?$/i.test(clean)) return "ดร.";
  return clean;
}

/**
 * Parse a full Thai name string, extracting prefix, first name, and surname.
 * Supports noble surnames (e.g., ณ นคร, ณ สงขลา).
 */
export function parseThaiFullName(rawName: string, knownPrefix?: string): ParsedThaiName {
  let text = (rawName || "").trim().replace(/\s+/g, " ");
  let prefix = (knownPrefix || "").trim();

  // 1. Detect prefix from beginning of text
  const match = text.match(PREFIX_REGEX);
  if (match) {
    if (!prefix) prefix = match[1].trim();
    text = text.slice(match[0].length).trim();
  } else if (prefix && text.startsWith(prefix)) {
    text = text.slice(prefix.length).trim();
  }

  prefix = canonicalizePrefix(prefix);

  // 2. Separate first name and last name
  const parts = text.split(" ").filter(Boolean);
  let firstName = "";
  let lastName = "";

  // Surnames with "ณ" (e.g., ณัฏฐณิชา ณ นคร, ณัฐ ณ สงขลา)
  if (parts.length >= 3 && parts[1] === "ณ") {
    firstName = parts[0];
    lastName = parts.slice(1).join(" ");
  } else if (parts.length >= 2) {
    firstName = parts[0];
    lastName = parts.slice(1).join(" ");
  } else if (parts.length === 1) {
    firstName = parts[0];
    lastName = "";
  }

  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();
  const cleanFullName = `${prefix ? prefix + " " : ""}${cleanFirstName}${cleanLastName ? " " + cleanLastName : ""}`.trim();
  const coreNameKey = `${cleanFirstName}_${cleanLastName}`.toLowerCase().replace(/\s+/g, "_");

  return {
    original: rawName,
    prefix,
    firstName: cleanFirstName,
    lastName: cleanLastName,
    coreNameKey,
    cleanFullName,
    hasPrefix: Boolean(prefix),
  };
}

/**
 * Core Name Key for matching without prefix
 */
export function getCoreNameKey(name: string): string {
  const parsed = parseThaiFullName(name);
  return parsed.coreNameKey;
}

export type NameMatchConfidence =
  | "EXACT_MATCH"              // Both prefix and first+last match 100%
  | "SAME_PERSON_DIFF_PREFIX"  // Same first+last name, but prefix changed/evolved (e.g., นางสาว -> นาง, or นาย -> ดร.)
  | "PARTIAL_MATCH"            // First name matches but surname differs
  | "NEW_PERSON";              // Completely new person

export interface NameMatchResult {
  confidence: NameMatchConfidence;
  matchedTrainee?: HistoricalTrainee;
  parsedIncoming: ParsedThaiName;
  parsedMatched?: ParsedThaiName;
  similarityScore: number;
  reason: string;
}

/**
 * Compare an incoming name against existing trainees and determine identity match
 */
export function evaluateNameMatch(
  incomingName: string,
  incomingPrefix: string | undefined,
  existingTrainees: HistoricalTrainee[]
): NameMatchResult {
  const parsedIncoming = parseThaiFullName(incomingName, incomingPrefix);

  if (!parsedIncoming.firstName) {
    return {
      confidence: "NEW_PERSON",
      parsedIncoming,
      similarityScore: 0,
      reason: "ไม่พบข้อมูลชื่อ-นามสกุล",
    };
  }

  // 1. Check Exact Match (Core key + Prefix)
  for (const t of existingTrainees) {
    const parsedT = parseThaiFullName(t.name, t.prefix);
    if (parsedT.coreNameKey && parsedT.coreNameKey === parsedIncoming.coreNameKey) {
      if (parsedT.prefix === parsedIncoming.prefix || (!parsedIncoming.prefix && parsedT.prefix)) {
        return {
          confidence: "EXACT_MATCH",
          matchedTrainee: t,
          parsedIncoming,
          parsedMatched: parsedT,
          similarityScore: 100,
          reason: `ตรงกับ ${t.name} (รหัส ${t.personnelId || t.id}) ทั้งชื่อ-นามสกุลและคำนำหน้า`,
        };
      }
    }
  }

  // 2. Check Same Person with Different / Evolved Prefix
  for (const t of existingTrainees) {
    const parsedT = parseThaiFullName(t.name, t.prefix);
    if (parsedT.coreNameKey && parsedT.coreNameKey === parsedIncoming.coreNameKey) {
      return {
        confidence: "SAME_PERSON_DIFF_PREFIX",
        matchedTrainee: t,
        parsedIncoming,
        parsedMatched: parsedT,
        similarityScore: 95,
        reason: `พบชื่อ-นามสกุล '${parsedIncoming.firstName} ${parsedIncoming.lastName}' ตรงกับ ${t.name} (รหัส ${t.personnelId || t.id}) แต่คำนำหน้าเปลี่ยนจาก '${parsedT.prefix || "-"}' เป็น '${parsedIncoming.prefix || "-"}'`,
      };
    }
  }

  // 3. Check partial first name match if applicable
  const partialMatch = existingTrainees.find((t) => {
    const parsedT = parseThaiFullName(t.name, t.prefix);
    return parsedT.firstName === parsedIncoming.firstName && parsedIncoming.firstName.length >= 4;
  });

  if (partialMatch) {
    const parsedT = parseThaiFullName(partialMatch.name, partialMatch.prefix);
    return {
      confidence: "PARTIAL_MATCH",
      matchedTrainee: partialMatch,
      parsedIncoming,
      parsedMatched: parsedT,
      similarityScore: 60,
      reason: `ชื่อ '${parsedIncoming.firstName}' ตรงกัน แต่นามสกุลต่างกัน ('${parsedIncoming.lastName}' vs '${parsedT.lastName}')`,
    };
  }

  return {
    confidence: "NEW_PERSON",
    parsedIncoming,
    similarityScore: 0,
    reason: "ไม่พบชื่อ-นามสกุลนี้ในระบบฐานข้อมูล (เป็นบุคลากรท่านใหม่)",
  };
}

/**
 * Real-time instant search candidates as the user types
 */
export function searchExistingCandidates(
  query: string,
  existingTrainees: HistoricalTrainee[],
  limit = 5
): Array<{
  trainee: HistoricalTrainee;
  parsed: ParsedThaiName;
  confidence: NameMatchConfidence;
  matchReason: string;
}> {
  const cleanQ = query.trim().replace(/\s+/g, " ");
  if (cleanQ.length < 2) return [];

  const parsedQuery = parseThaiFullName(cleanQ);
  const qCore = parsedQuery.coreNameKey;
  const qFirst = parsedQuery.firstName.toLowerCase();
  const qLast = parsedQuery.lastName.toLowerCase();

  const results: Array<{
    trainee: HistoricalTrainee;
    parsed: ParsedThaiName;
    confidence: NameMatchConfidence;
    matchReason: string;
    score: number;
  }> = [];

  const seenPids = new Set<string>();

  for (const t of existingTrainees) {
    const pid = t.personnelId || t.idCard || t.id;
    if (seenPids.has(pid)) continue;

    const parsedT = parseThaiFullName(t.name, t.prefix);

    // Exact Core Key Match
    if (qCore && parsedT.coreNameKey === qCore) {
      const isExactPrefix = parsedT.prefix === parsedQuery.prefix;
      results.push({
        trainee: t,
        parsed: parsedT,
        confidence: isExactPrefix ? "EXACT_MATCH" : "SAME_PERSON_DIFF_PREFIX",
        matchReason: isExactPrefix
          ? "ตรงกันสมบูรณ์ 100%"
          : `ชื่อตรงกัน (คำนำหน้าเดิม: ${parsedT.prefix || "-"})`,
        score: isExactPrefix ? 100 : 95,
      });
      seenPids.add(pid);
      continue;
    }

    // Prefix + First Name matches
    if (qFirst && parsedT.firstName.toLowerCase().startsWith(qFirst)) {
      const isLastMatch = qLast && parsedT.lastName.toLowerCase().includes(qLast);
      results.push({
        trainee: t,
        parsed: parsedT,
        confidence: isLastMatch ? "SAME_PERSON_DIFF_PREFIX" : "PARTIAL_MATCH",
        matchReason: isLastMatch ? "ชื่อและนามสกุลตรงกัน" : `ชื่อตรงกัน: ${parsedT.firstName}`,
        score: isLastMatch ? 85 : 50,
      });
      seenPids.add(pid);
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Standardize an entire list of trainees:
 * - Separates firstName and lastName
 * - Standardizes prefix and cleanFullName
 * - Fixes any double spaces
 */
export interface AffiliationMatchResult {
  group: "การกีฬาแห่งประเทศไทย" | "กองทุนพัฒนาการกีฬาแห่งชาติ" | "สมาคมกีฬาแห่งประเทศไทย" | "สมาคมกีฬาแห่งจังหวัด" | "หน่วยงานภายนอก";
  reason: string;
  confidence: number;
}

/**
 * Smart Affiliation Classifier based on Linguistic Patterns and Legal Establishment of Sports Authority of Thailand
 */
export function smartInferAffiliationGroup(orgName: string): AffiliationMatchResult {
  const clean = (orgName || "").trim();
  if (!clean) {
    return {
      group: "หน่วยงานภายนอก",
      reason: "ไม่ระบุชื่อสังกัด",
      confidence: 100,
    };
  }

  // 1. Special academic & external exclusions
  if (clean.includes("มหาวิทยาลัยการกีฬาแห่งชาติ")) {
    return {
      group: "หน่วยงานภายนอก",
      reason: "มหาวิทยาลัยการกีฬาแห่งชาติ (มกช.) สังกัดกระทรวงการท่องเที่ยวและกีฬา",
      confidence: 100,
    };
  }
  if (clean.includes("คณะกรรมการโอลิมปิคแห่งประเทศไทย")) {
    return {
      group: "หน่วยงานภายนอก",
      reason: "คณะกรรมการโอลิมปิคแห่งประเทศไทยฯ เป็นองค์กรกีฬาอิสระ",
      confidence: 100,
    };
  }

  // 2. Fund (NSDF)
  if (clean.includes("กองทุน")) {
    return {
      group: "กองทุนพัฒนาการกีฬาแห่งชาติ",
      reason: "พบคีย์เวิร์ด 'กองทุน' (กองทุนพัฒนาการกีฬาแห่งชาติ)",
      confidence: 100,
    };
  }

  // 3. Sports Authority of Thailand (กกท. - SAT)
  if (
    clean.includes("การกีฬาแห่งประเทศไทย") ||
    clean === "กกท" ||
    clean === "กกท." ||
    clean.startsWith("ฝ่ายกีฬา") ||
    clean.includes("สำนักงานคณะกรรมการกีฬามวย") ||
    clean.includes("ศูนย์การกีฬาแห่งประเทศไทย")
  ) {
    return {
      group: "การกีฬาแห่งประเทศไทย",
      reason: "พบคีย์เวิร์ดหน่วยงานในสังกัดการกีฬาแห่งประเทศไทย (กกท.)",
      confidence: 100,
    };
  }

  // 4. Provincial Sports Associations
  if (
    clean.includes("สมาคมกีฬาแห่งจังหวัด") ||
    clean.includes("สมาคมกีฬาจังหวัด") ||
    clean.includes("สมาคมกีฬาคนพิการจังหวัด")
  ) {
    return {
      group: "สมาคมกีฬาแห่งจังหวัด",
      reason: "พบคีย์เวิร์ดสมาคมกีฬาประจำจังหวัด",
      confidence: 100,
    };
  }

  // 5. National Sports Associations
  if (
    (clean.includes("สมาคมกีฬา") || clean.includes("ราชยานยนต์สมาคม") || clean.includes("สมาคมปัญจกีฬา")) &&
    (clean.includes("แห่งประเทศไทย") || clean.includes("แห่งประเทศไทยฯ") || clean.includes("แห่งชาติ"))
  ) {
    return {
      group: "สมาคมกีฬาแห่งประเทศไทย",
      reason: "พบคีย์เวิร์ดสมาคมกีฬาแห่งประเทศไทย",
      confidence: 100,
    };
  }

  return {
    group: "หน่วยงานภายนอก",
    reason: "สถาบันการศึกษา, สโมสร หรือหน่วยงานภายนอก",
    confidence: 85,
  };
}

/**
 * Standardize an entire list of trainees:
 * - Separates firstName and lastName
 * - Standardizes prefix and cleanFullName
 * - Fixes any double spaces
 * - Reclassifies affiliation groups intelligently
 */
export function standardizeAllTrainees(
  trainees: HistoricalTrainee[],
  options?: { reclassifyGroups?: boolean }
): {
  cleaned: HistoricalTrainee[];
  changedCount: number;
  fixedNameCount: number;
  fixedGroupCount: number;
} {
  let changedCount = 0;
  let fixedNameCount = 0;
  let fixedGroupCount = 0;
  const doReclassify = options?.reclassifyGroups ?? true;

  const cleaned = trainees.map((t) => {
    const parsed = parseThaiFullName(t.name, t.prefix);
    const hasNameDiff = t.name !== parsed.cleanFullName;
    const hasPrefixDiff = t.prefix !== parsed.prefix;
    const hasMissingFields = !t.firstName || !t.lastName;

    // Check affiliation group using smartInferAffiliationGroup
    let nextAffiliationGroup = t.affiliationGroup;
    let hasGroupDiff = false;
    if (doReclassify) {
      const match = smartInferAffiliationGroup(t.affiliation);
      if (match.group !== t.affiliationGroup) {
        nextAffiliationGroup = match.group;
        hasGroupDiff = true;
      }
    }

    if (hasNameDiff || hasPrefixDiff || hasMissingFields || hasGroupDiff) {
      changedCount++;
      if (hasNameDiff || hasPrefixDiff || hasMissingFields) {
        fixedNameCount++;
      }
      if (hasGroupDiff) {
        fixedGroupCount++;
      }

      return {
        ...t,
        prefix: parsed.prefix,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        name: parsed.cleanFullName,
        affiliationGroup: nextAffiliationGroup,
      };
    }
    return t;
  });

  return { cleaned, changedCount, fixedNameCount, fixedGroupCount };
}
