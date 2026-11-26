"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/ui/file-upload";
import type { FileItem } from "@/components/ui/file-upload";
import { Avatar } from "@/components/ui/avatar";
import { IdCardInput } from "@/components/ui/id-card-input";
import {
  getAllowedTargetGroupsForCourse,
  getCourseById,
  getDefaultCourse,
  getCourseDocumentConfig,
  isAffiliationAllowedForCourse,
  isDocumentApplicableForAffiliation,
  resolveTargetGroupKeyFromAffiliation,
  SAKA_ASSOCIATION_HINT,
  TARGET_GROUPS,
} from "@/lib/courses";
import { useNationalAssociationsStore } from "@/lib/associations-store";
import { THAI_PROVINCES } from "@/lib/provinces";
import {
  AssociationAutocompleteInput,
  type AssociationSuggestion,
} from "@/components/register/association-autocomplete-input";
import { useCourses } from "@/lib/courses-store";
import {
  checkRegistrationEligibility,
  createAndSyncApplication,
  formatThaiDate,
  useApplications,
  type ApplicantDocument,
  type ApplicantDocumentKind,
  type RegistrationEligibility,
} from "@/lib/applications-store";
import {
  maskPhoneNumber,
  matchesPhoneLast4,
  pickBestPriorApplication,
  selectReusableDocsFromRows,
  type ReusableDocumentPayload,
} from "@/lib/profile-lookup";
import { ConflictDialog } from "@/components/register/conflict-dialog";
import { PdpaModal } from "@/components/register/pdpa-modal";
import { isValidThaiIdCard } from "@/lib/validation";
import {
  normalizeNameForMatching,
  updatePersonProfile,
  useAlumniStore,
} from "@/lib/alumni-store";
import { saveDocumentToStorage } from "@/lib/document-storage";
import { compressImageFile } from "@/lib/image-compression";

const labelClass = "text-[12.5px] font-medium text-[#1f2937]";

const DROPDOWN_PREFIXES = new Set([
  "นาย",
  "นาง",
  "นางสาว",
  "ว่าที่ ร.ต.",
  "ดร.",
  "ผศ.ดร.",
]);

const KNOWN_PREFIXES = [
  "นาย",
  "นาง",
  "นางสาว",
  "ว่าที่ ร.ต.",
  "ว่าที่ ร.ต.หญิง",
  "ดร.",
  "ผศ.ดร.",
  "รศ.ดร.",
  "ศ.ดร.",
  "พ.ต.อ.",
  "พ.ต.ท.",
  "พ.ต.ต.",
  "ร.ต.อ.",
  "ร.ต.ท.",
  "ร.ต.ต.",
  "น.ส.",
];

function splitPrefixAndName(raw: string): { prefix: string; name: string } {
  const trimmed = raw.trim();
  for (const p of KNOWN_PREFIXES) {
    if (trimmed.startsWith(p)) {
      const rest = trimmed.slice(p.length).trim();
      return {
        prefix: p === "น.ส." ? "นางสาว" : p,
        name: rest,
      };
    }
  }
  return { prefix: "นาย", name: trimmed };
}

function toDocument(
  kind: ApplicantDocumentKind,
  file: FileItem,
  index: number
): ApplicantDocument {
  const docId = `${kind}-${Date.now()}-${index}`;
  const hasInlineBase64 = Boolean(file.dataUrl && file.dataUrl.startsWith("data:"));
  if (hasInlineBase64 && file.dataUrl) {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`sat-doc-${docId}`, file.dataUrl);
      } catch {
        // ignore session storage quota
      }
    }
    saveDocumentToStorage({
      id: docId,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      dataUrl: file.dataUrl,
      savedAt: new Date().toISOString(),
    });
  }

  return {
    id: docId,
    kind,
    name: file.name,
    size: file.size,
    storagePath: file.storagePath,
    dataUrl: hasInlineBase64 ? file.dataUrl : file.storagePath,
    type: file.type,
  };
}

export default function RegistrationPage() {
  return (
    <Suspense fallback={null}>
      <RegistrationContent />
    </Suspense>
  );
}

function RegistrationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { courses } = useCourses();
  const { applications } = useApplications();
  const { trainees } = useAlumniStore();
  const activeCourses = useMemo(() => courses.filter((c) => !c.isHistorical), [courses]);
  const course =
    getCourseById(searchParams.get("course"), activeCourses) ??
    getDefaultCourse(activeCourses);

  const steps = [
    { label: "1. เลือกหลักสูตร", href: `/courses?course=${course.id}` },
    { label: "2. กรอกข้อมูลและส่งเอกสาร" },
    { label: "3. ส่งข้อมูลสมัคร" },
  ];

  const [prefix, setPrefix] = useState<string>("นาย");
  const [name, setName] = useState("");
  const [idCard, setIdCard] = useState("");

  const priorTraineeRecords = useMemo(() => {
    const digits = idCard.replace(/\D/g, "");
    if (digits.length === 13) {
      const byId = trainees.filter((t) => t.idCard.replace(/\D/g, "") === digits);
      if (byId.length > 0) return byId;
    }
    const cleanInputName = name.trim();
    if (cleanInputName.length >= 3) {
      const normInput = normalizeNameForMatching(`${prefix} ${cleanInputName}`);
      const normRaw = normalizeNameForMatching(cleanInputName);
      if (normInput || normRaw) {
        return trainees.filter((t) => {
          const normT = normalizeNameForMatching(t.name);
          return normT && (normT === normInput || normT === normRaw);
        });
      }
    }
    return [];
  }, [idCard, name, prefix, trainees]);

  const { associations: nationalAssociations } = useNationalAssociationsStore();
  const allowedTargetGroups = useMemo(
    () => getAllowedTargetGroupsForCourse(course),
    [course]
  );
  const isSingleTargetGroup = allowedTargetGroups.length === 1;

  const [affiliation, setAffiliation] = useState<string>(
    () => allowedTargetGroups[0]?.label ?? TARGET_GROUPS[0].label
  );
  const [subAffiliation, setSubAffiliation] = useState("");
  const [autofillMismatchNotice, setAutofillMismatchNotice] = useState<
    string | null
  >(null);
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const isSubmittingRef = useRef(false);
  const [conflictModal, setConflictModal] =
    useState<RegistrationEligibility | null>(null);
  const [showPdpaModal, setShowPdpaModal] = useState(false);

  // PDPA-safe Cross-Course Profile Lookup (13-digit ID card + last 4 digits of phone)
  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "checking" | "found_pending" | "found_no_phone" | "verified" | "dismissed"
  >("idle");
  const [lookupMeta, setLookupMeta] = useState<{
    source: "application" | "alumni";
    sourceRef?: string;
    courseTitle?: string;
    submittedAt?: string;
    maskedPhone: string;
    hasPhone: boolean;
    isOfflineFallback?: boolean;
  } | null>(null);
  const [verifyLast4, setVerifyLast4] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [reusableDocs, setReusableDocs] = useState<ReusableDocumentPayload[]>([]);
  const [excludedDocKinds, setExcludedDocKinds] = useState<string[]>([]);
  const lastCheckedIdRef = useRef<string>("");
  const verifiedIdCardRef = useRef<string>("");
  const applicationsRef = useRef(applications);
  const traineesRef = useRef(trainees);

  useEffect(() => {
    applicationsRef.current = applications;
    traineesRef.current = trainees;
  }, [applications, trainees]);

  // รีเซ็ตข้อความแจ้งเตือนสังกัดไม่ตรงเมื่อเปลี่ยนหลักสูตร (หากยืนยันตัวตนแล้วให้คง Reusable Docs ไว้และตรวจสิทธิ์ใหม่)
  useEffect(() => {
    setAutofillMismatchNotice(null);
  }, [course.id]);

  // ตรวจสอบและล็อกกลุ่มเป้าหมาย / สังกัดหลัก ให้สอดคล้องกับโควตาที่หลักสูตรเปิดรับเสมอ
  useEffect(() => {
    if (allowedTargetGroups.length === 0) return;
    if (allowedTargetGroups.length === 1) {
      if (affiliation !== allowedTargetGroups[0].label) {
        setAffiliation(allowedTargetGroups[0].label);
        setSubAffiliation("");
      }
      return;
    }
    const isCurrentAllowed = allowedTargetGroups.some(
      (tg) => tg.label === affiliation
    );
    if (!isCurrentAllowed) {
      setAffiliation(allowedTargetGroups[0].label);
      setSubAffiliation("");
    }
  }, [allowedTargetGroups, affiliation]);

  // เตรียมรายการ Autocomplete สำหรับช่อง 3.1 (สมาคมกีฬาแห่งประเทศไทย / สมาคมกีฬาแห่งจังหวัด)
  const subAffiliationSuggestions = useMemo<AssociationSuggestion[] | null>(() => {
    if (affiliation === "สมาคมกีฬาแห่งประเทศไทย") {
      return [...nationalAssociations]
        .sort((a, b) => a.orderNo - b.orderNo)
        .map((assoc) => ({
          value: assoc.name,
          subtitle: `ลำดับ ${assoc.orderNo}`,
          searchTerms: assoc.aliases,
        }));
    }
    if (affiliation === "สมาคมกีฬาแห่งจังหวัด") {
      return THAI_PROVINCES.map((province) => {
        const cleanProvinceName = province.nameTh.replace(/^จังหวัด/, "").trim();
        const assocName =
          cleanProvinceName === "กรุงเทพมหานคร"
            ? "สมาคมกีฬาแห่งจังหวัดกรุงเทพมหานคร"
            : `สมาคมกีฬาแห่งจังหวัด${cleanProvinceName}`;
        return {
          value: assocName,
          subtitle: province.regionNameTh,
          searchTerms: [
            province.nameTh,
            cleanProvinceName,
            province.nameEn,
            province.regionNameTh,
            ...(cleanProvinceName === "กรุงเทพมหานคร"
              ? ["สมาคมกีฬาแห่งกรุงเทพมหานคร", "กทม", "กรุงเทพ"]
              : []),
          ],
        };
      });
    }
    return null;
  }, [affiliation, nationalAssociations]);

  // คำนวณจำนวนผู้สมัครและสถานะการเปิดรับ (แนวทางที่ 1: เปิดรับตามกำหนดเวลา ไม่ปิดกั้นเมื่อเกินเป้าหมาย)
  const courseCapacity = useMemo(() => {
    const match = course.seats.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 40;
  }, [course.seats]);

  const applicantCount = useMemo(() => {
    return applications.filter(
      (a) => a.courseId === course.id && a.status !== "rejected"
    ).length;
  }, [applications, course.id]);

  const isCourseClosed = course.status === "full";
  const isOverCapacity = applicantCount >= courseCapacity;

  // ตรวจสอบความถูกต้องของการสมัคร (ห้ามวิชาเดิม และห้ามวันอบรมซ้อนทับกัน)
  const eligibility = useMemo(() => {
    return checkRegistrationEligibility(
      idCard,
      course.id,
      applications,
      courses
    );
  }, [idCard, course.id, applications, courses]);

  // ตรวจสอบประวัติเดิมแบบปลอดภัยตาม PDPA เมื่อกรอกเลขบัตรประชาชนครบ 13 หลักและถูกต้อง
  useEffect(() => {
    const digits = idCard.replace(/\D/g, "");
    if (digits.length !== 13 || !isValidThaiIdCard(digits)) {
      if (verifiedIdCardRef.current) {
        setPhotoFiles((prev) => prev.filter((f) => !f.reusedFromRef));
        setIdCardFiles((prev) => prev.filter((f) => !f.reusedFromRef));
      }
      lastCheckedIdRef.current = "";
      verifiedIdCardRef.current = "";
      setLookupStatus("idle");
      setLookupMeta(null);
      setVerifyLast4("");
      setVerifyError("");
      setReusableDocs([]);
      setExcludedDocKinds([]);
      return;
    }

    if (digits === lastCheckedIdRef.current) {
      return;
    }

    // เปลี่ยนเลขบัตรประชาชนใหม่: ล้างผลยืนยันและไฟล์เดิมที่ดึงไว้ของคนก่อนหน้าทันที
    if (verifiedIdCardRef.current && verifiedIdCardRef.current !== digits) {
      setPhotoFiles((prev) => prev.filter((f) => !f.reusedFromRef));
      setIdCardFiles((prev) => prev.filter((f) => !f.reusedFromRef));
    }
    verifiedIdCardRef.current = "";
    setVerifyLast4("");
    setVerifyError("");
    setReusableDocs([]);
    setExcludedDocKinds([]);
    setLookupMeta(null);
    setLookupStatus("checking");

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/applications/lookup-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ action: "check", idCard: digits }),
        });

        if (controller.signal.aborted) return;

        if (res.ok) {
          const data = (await res.json()) as {
            ok?: boolean;
            found?: boolean;
            source?: "application" | "alumni";
            sourceRef?: string;
            courseTitle?: string;
            submittedAt?: string;
            maskedPhone?: string;
            hasPhone?: boolean;
          };
          lastCheckedIdRef.current = digits;
          if (data.found && data.source) {
            setLookupMeta({
              source: data.source,
              sourceRef: data.sourceRef,
              courseTitle: data.courseTitle,
              submittedAt: data.submittedAt,
              maskedPhone: data.maskedPhone || "",
              hasPhone: Boolean(data.hasPhone),
            });
            setLookupStatus(data.hasPhone ? "found_pending" : "found_no_phone");
          } else {
            setLookupStatus("idle");
          }
          return;
        }

        if (res.status === 503) {
          // Offline / local fallback without Supabase configured (still enforces 4-digit phone verification)
          lastCheckedIdRef.current = digits;
          const localBest = pickBestPriorApplication(
            applicationsRef.current.filter((a) => a.idCard === digits)
          );
          if (localBest) {
            const masked = maskPhoneNumber(localBest.record.phone);
            const hasPhone = Boolean(masked);
            setLookupMeta({
              source: "application",
              sourceRef: localBest.record.ref,
              courseTitle: localBest.record.courseTitle,
              submittedAt: localBest.record.submittedAt,
              maskedPhone: masked,
              hasPhone,
              isOfflineFallback: true,
            });
            setLookupStatus(hasPhone ? "found_pending" : "found_no_phone");
            return;
          }
          const localAlumni = traineesRef.current.find(
            (t) => t.idCard.replace(/\D/g, "") === digits
          );
          if (localAlumni) {
            const masked = maskPhoneNumber(localAlumni.phone);
            const hasPhone = Boolean(masked);
            setLookupMeta({
              source: "alumni",
              courseTitle: localAlumni.courseTitle,
              maskedPhone: masked,
              hasPhone,
              isOfflineFallback: true,
            });
            setLookupStatus(hasPhone ? "found_pending" : "found_no_phone");
            return;
          }
          setLookupStatus("idle");
          return;
        }

        // Non-OK, non-503 status: reset spinner so the form never gets stuck in checking
        setLookupStatus("idle");
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          setLookupStatus("idle");
        }
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [idCard]);

  const applyVerifiedProfile = (profile: {
    name: string;
    affiliation: string;
    position: string;
    phone: string;
    email: string;
  }) => {
    if (profile.name) {
      const parsed = splitPrefixAndName(profile.name);
      if (DROPDOWN_PREFIXES.has(parsed.prefix)) {
        setPrefix(parsed.prefix);
        setName(parsed.name);
      } else {
        setPrefix("อื่นๆ");
        setName(profile.name.trim());
      }
    }
    if (profile.phone) setPhone(profile.phone);
    if (profile.email) setEmail(profile.email);
    if (profile.position) setPosition(profile.position);

    if (profile.affiliation) {
      const match = profile.affiliation.match(/^(.*?)\s*\((.*?)\)$/);
      const priorPrimary = match ? match[1].trim() : profile.affiliation.trim();
      const priorSub = match ? match[2].trim() : "";
      const resolvedKey = resolveTargetGroupKeyFromAffiliation(priorPrimary);
      const canonicalGroup = resolvedKey
        ? allowedTargetGroups.find((tg) => tg.key === resolvedKey)
        : allowedTargetGroups.find((tg) => tg.label === priorPrimary);

      if (canonicalGroup && isAffiliationAllowedForCourse(priorPrimary, course)) {
        setAffiliation(canonicalGroup.label);
        if (priorSub) {
          setSubAffiliation(priorSub);
        } else if (priorPrimary !== canonicalGroup.label) {
          setSubAffiliation(priorPrimary);
        } else {
          setSubAffiliation("");
        }
        setAutofillMismatchNotice(null);
      } else {
        setSubAffiliation("");
        setAutofillMismatchNotice(
          `ข้อมูลการสมัครก่อนหน้าของท่านระบุสังกัด "${priorPrimary}" ซึ่งไม่อยู่ในกลุ่มเป้าหมายที่หลักสูตรนี้เปิดรับ กรุณาเลือกกลุ่มเป้าหมายและระบุหน่วยงาน/สมาคมกีฬาใหม่ในข้อ 3.1`
        );
      }
    }
  };

  const handleVerifyPhoneLast4 = async () => {
    const cleanId = idCard.replace(/\D/g, "");
    const cleanLast4 = verifyLast4.replace(/\D/g, "");
    if (cleanId.length !== 13 || verifying) return;
    if (cleanLast4.length !== 4) {
      setVerifyError("กรุณากรอกเลขท้ายเบอร์โทรศัพท์ให้ครบ 4 หลัก");
      return;
    }

    setVerifying(true);
    setVerifyError("");
    try {
      if (lookupMeta?.isOfflineFallback) {
        const localBest = pickBestPriorApplication(
          applications.filter((a) => a.idCard === cleanId)
        );
        const localAlumni = trainees.find(
          (t) => t.idCard.replace(/\D/g, "") === cleanId
        );
        const storedPhone = localBest
          ? localBest.record.phone
          : localAlumni?.phone || "";
        if (!matchesPhoneLast4(storedPhone, cleanLast4)) {
          setVerifyError("เลขท้ายเบอร์โทรศัพท์ 4 หลักไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
          return;
        }
        if (localBest) {
          applyVerifiedProfile({
            name: localBest.record.name,
            affiliation: localBest.record.affiliation,
            position: localBest.record.position,
            phone: localBest.record.phone,
            email: localBest.record.email,
          });
          const excluded = localBest.record.requestedDocKinds || [];
          setExcludedDocKinds(excluded);
          if (!localBest.isRejectedOnly) {
            setReusableDocs(
              selectReusableDocsFromRows(
                localBest.record.documents.map((d) => ({
                  id: d.id,
                  kind: d.kind,
                  name: d.name,
                  size: d.size,
                  file_type: d.type ?? null,
                  storage_path: d.storagePath ?? null,
                  data_url: d.dataUrl?.startsWith("data:") ? d.dataUrl : null,
                })),
                localBest.record.ref,
                excluded
              )
            );
          }
        } else if (localAlumni) {
          applyVerifiedProfile({
            name: localAlumni.name,
            affiliation:
              localAlumni.affiliation &&
              localAlumni.affiliationGroup &&
              localAlumni.affiliation !== localAlumni.affiliationGroup
                ? `${localAlumni.affiliationGroup} (${localAlumni.affiliation})`
                : localAlumni.affiliationGroup || localAlumni.affiliation || "",
            position: "",
            phone: localAlumni.phone || "",
            email: localAlumni.email || "",
          });
        }
        verifiedIdCardRef.current = cleanId;
        setLookupStatus("verified");
        return;
      }

      const res = await fetch("/api/applications/lookup-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          idCard: cleanId,
          last4: cleanLast4,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        verified?: boolean;
        error?: string;
        profile?: {
          name: string;
          affiliation: string;
          position: string;
          phone: string;
          email: string;
        };
        reusableDocs?: ReusableDocumentPayload[];
        excludedDocKinds?: string[];
      };

      if (!res.ok || !data.verified || !data.profile) {
        setVerifyError(
          data.error || "ไม่สามารถยืนยันตัวตนได้ กรุณาตรวจสอบเลขท้าย 4 หลักอีกครั้ง"
        );
        return;
      }

      applyVerifiedProfile(data.profile);
      setReusableDocs(data.reusableDocs || []);
      setExcludedDocKinds(data.excludedDocKinds || []);
      verifiedIdCardRef.current = cleanId;
      setLookupStatus("verified");
    } catch {
      setVerifyError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้งหรือกรอกข้อมูลด้วยตนเอง");
    } finally {
      setVerifying(false);
    }
  };

  const handleResetApplicantForm = () => {
    lastCheckedIdRef.current = "";
    verifiedIdCardRef.current = "";
    setIdCard("");
    setPrefix("นาย");
    setName("");
    setAffiliation(allowedTargetGroups[0]?.label ?? TARGET_GROUPS[0].label);
    setSubAffiliation("");
    setPosition("");
    setPhone("");
    setEmail("");
    setPhotoFiles([]);
    setCoverFiles([]);
    setCertFiles([]);
    setIdCardFiles([]);
    setSakaFiles([]);
    setAutofillMismatchNotice(null);
    setLookupStatus("idle");
    setLookupMeta(null);
    setVerifyLast4("");
    setVerifyError("");
    setReusableDocs([]);
    setExcludedDocKinds([]);
    setFormError("");
  };

  // การตั้งค่าช่อง 3.1 ตามกลุ่มสังกัดที่เลือก
  const subAffiliationConfig = useMemo(() => {
    switch (affiliation) {
      case "การกีฬาแห่งประเทศไทย":
        return {
          label: "3.1 ระบุสำนัก / ฝ่าย / กอง (สังกัด กกท.)",
          placeholder: "เช่น ฝ่ายพัฒนากีฬาเป็นเลิศ, ฝ่ายวิทยาศาสตร์การกีฬา, กองประชาสัมพันธ์",
          required: false,
          helper: "* สำหรับพนักงานหรือลูกจ้าง กกท. ระบุสังกัดฝ่าย/กองที่ปฏิบัติงาน",
        };
      case "กองทุนพัฒนาการกีฬาแห่งชาติ":
        return {
          label: "3.1 ระบุกลุ่มงาน / งาน (สังกัดกองทุนฯ)",
          placeholder: "เช่น งานสนับสนุนสวัสดิการกีฬา, งานบริหารการเงินกองทุน",
          required: false,
          helper: "* ระบุส่วนงานที่ปฏิบัติงานในกองทุนพัฒนาการกีฬาแห่งชาติ",
        };
      case "สมาคมกีฬาแห่งประเทศไทย":
        return {
          label: "3.1 ระบุชื่อสมาคมกีฬาแห่งประเทศไทย (เฉพาะเจาะจง)",
          placeholder: "เช่น สมาคมกีฬาทางน้ำแห่งประเทศไทย, สมาคมกีฬาเทควันโดแห่งประเทศไทย",
          required: true,
          helper: "* จำเป็นต้องระบุชื่อสมาคมกีฬาเพื่อการตรวจสอบสิทธิ์และจัดสรรโควตาสัดส่วน",
        };
      case "สมาคมกีฬาแห่งจังหวัด":
        return {
          label: "3.1 ระบุชื่อสมาคมกีฬาแห่งจังหวัด (เฉพาะเจาะจง)",
          placeholder: "เช่น สมาคมกีฬาแห่งจังหวัดเชียงใหม่, สมาคมกีฬาแห่งจังหวัดขอนแก่น",
          required: true,
          helper: "* จำเป็นต้องระบุจังหวัดของสมาคมกีฬาเพื่อการตรวจสอบสิทธิ์และจัดสรรโควตาสัดส่วน",
        };
      case "หน่วยงานภายนอก":
      default:
        return {
          label: "3.1 ระบุชื่อหน่วยงาน / องค์กร / สถาบัน",
          placeholder: "เช่น กรมพลศึกษา, คณะวิทยาศาสตร์การกีฬา มหาวิทยาลัย..., สโมสร...",
          required: true,
          helper: "* ระบุชื่อองค์กรหรือสถาบันต้นสังกัดของท่าน",
        };
    }
  }, [affiliation]);

  const [photoFiles, setPhotoFiles] = useState<FileItem[]>([]);
  const [coverFiles, setCoverFiles] = useState<FileItem[]>([]);
  const [certFiles, setCertFiles] = useState<FileItem[]>([]);
  const [idCardFiles, setIdCardFiles] = useState<FileItem[]>([]);
  const [sakaFiles, setSakaFiles] = useState<FileItem[]>([]);

  const docConfig = useMemo(() => getCourseDocumentConfig(course), [course]);
  const isSakaApplicable = useMemo(
    () => isDocumentApplicableForAffiliation(docConfig.saka, affiliation),
    [docConfig.saka, affiliation]
  );

  const docItems = useMemo(() => {
    const items: {
      key: "photo" | "cover" | "certificate" | "idcard" | "saka";
      num: number;
      label: string;
      required: boolean;
      hint?: string;
    }[] = [];

    let count = 1;
    if (docConfig.photo.enabled) {
      items.push({
        key: "photo",
        num: count++,
        label: docConfig.photo.label || "รูปถ่ายหน้าตรง ถ่ายไม่เกิน 6 เดือน",
        required: docConfig.photo.required,
        hint: docConfig.photo.hint || "สำหรับพิมพ์บัตรประจำตัว (ไฟล์ JPG/PNG ระบบบีบอัดอัตโนมัติ)",
      });
    }
    if (docConfig.cover.enabled) {
      items.push({
        key: "cover",
        num: count++,
        label: docConfig.cover.label || "หนังสือนำส่งจากต้นสังกัดหรือสมาคมกีฬา",
        required: docConfig.cover.required,
        hint: docConfig.cover.hint,
      });
    }
    if (docConfig.certificate.enabled) {
      items.push({
        key: "certificate",
        num: count++,
        label: docConfig.certificate.label || "หนังสือรับรองการปฏิบัติหน้าที่ให้กับสมาคม/หน่วยงาน",
        required: docConfig.certificate.required,
        hint: docConfig.certificate.hint,
      });
    }
    if (docConfig.idcard?.enabled) {
      items.push({
        key: "idcard",
        num: count++,
        label: docConfig.idcard.label || "สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง",
        required: docConfig.idcard.required,
        hint: docConfig.idcard.hint,
      });
    }
    if (isSakaApplicable) {
      items.push({
        key: "saka",
        num: count++,
        label: docConfig.saka.label || "สำเนาใบ ส.ฬ. 8",
        required: docConfig.saka.required,
        hint: docConfig.saka.hint || SAKA_ASSOCIATION_HINT,
      });
    }
    return items;
  }, [docConfig, isSakaApplicable]);

  const handleNameInput = (val: string) => {
    const parsed = splitPrefixAndName(val);
    if (parsed.prefix !== prefix && val.trim().startsWith(parsed.prefix) && parsed.name.length > 0) {
      setPrefix(parsed.prefix);
      setName(parsed.name);
    } else {
      setName(val);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setFormError("");

    const fail = (msg: string) => {
      isSubmittingRef.current = false;
      setFormError(msg);
    };

    if (isCourseClosed) {
      fail("หลักสูตรนี้ปิดรับสมัครแล้ว กรุณาเลือกหลักสูตรอื่น");
      return;
    }

    // 1. ตรวจสอบเลขบัตรประชาชน
    const cleanId = idCard.replace(/\D/g, "");
    if (cleanId.length !== 13) {
      fail("กรุณากรอกหมายเลขบัตรประจำตัวประชาชนให้ครบ 13 หลัก");
      return;
    }
    if (!isValidThaiIdCard(cleanId)) {
      fail(
        "หมายเลขบัตรประจำตัวประชาชนไม่ถูกต้องตามสูตรคำนวณของกรมการปกครอง (กรุณาตรวจสอบเลข 13 หลักอีกครั้ง)"
      );
      return;
    }

    // ตรวจสอบเงื่อนไขการสมัครซ้ำและเวลาซ้อนทับ
    const check = checkRegistrationEligibility(
      idCard,
      course.id,
      applications,
      courses
    );
    if (!check.allowed && check.existingRecord) {
      isSubmittingRef.current = false;
      setConflictModal(check);
      return;
    }

    // 2. ตรวจสอบชื่อ-นามสกุล
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      fail("กรุณากรอกชื่อและนามสกุลให้ครบถ้วน");
      return;
    }

    // 3. ตรวจสอบกลุ่มเป้าหมาย / สังกัดหลัก และหน่วยงาน/สมาคมกีฬา
    if (!allowedTargetGroups.some((tg) => tg.label === affiliation)) {
      fail("กลุ่มเป้าหมาย / สังกัดหลักที่เลือกไม่ได้เปิดรับในหลักสูตรนี้ กรุณาเลือกใหม่");
      return;
    }
    if (subAffiliationConfig.required && !subAffiliation.trim()) {
      fail(`กรุณาระบุข้อมูลในข้อ ${subAffiliationConfig.label}`);
      return;
    }

    // 4. ตรวจสอบตำแหน่ง
    if (position.trim() === "") {
      fail("กรุณาระบุตำแหน่ง (หน่วยงาน / สมาคมกีฬา)");
      return;
    }

    // 5. ตรวจสอบเบอร์โทรศัพท์
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 9 || cleanPhone.length > 10 || !cleanPhone.startsWith("0")) {
      fail("กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (เช่น 081-234-5678 หรือ 02-xxx-xxxx)");
      return;
    }

    // 6. ตรวจสอบอีเมล
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      fail("กรุณากรอกที่อยู่อีเมลให้ถูกต้อง (เช่น somsak@email.com) เพื่อใช้แจ้งผลการสมัคร");
      return;
    }

    // 7. ตรวจสอบความยินยอม
    if (!consent || !confirmed) {
      fail("กรุณายินยอมข้อตกลง PDPA และรับรองความถูกต้องของข้อมูล");
      return;
    }

    // 8. ตรวจสอบเอกสาร
    if (docConfig.photo.enabled && docConfig.photo.required && photoFiles.length === 0) {
      fail("กรุณาแนบรูปถ่ายหน้าตรง");
      return;
    }
    if (docConfig.cover.enabled && docConfig.cover.required && coverFiles.length === 0) {
      fail("กรุณาแนบหนังสือนำส่งจากต้นสังกัด / สมาคมกีฬา");
      return;
    }
    if (docConfig.certificate.enabled && docConfig.certificate.required && certFiles.length === 0) {
      fail("กรุณาแนบหนังสือรับรองการปฏิบัติหน้าที่ให้กับสมาคม/หน่วยงาน");
      return;
    }
    if (docConfig.idcard?.enabled && docConfig.idcard?.required && idCardFiles.length === 0) {
      fail("กรุณาแนบสำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง");
      return;
    }
    if (isSakaApplicable && docConfig.saka.required && sakaFiles.length === 0) {
      fail(
        docConfig.saka.onlyTargetGroups?.length
          ? "กรุณาแนบสำเนาใบ ส.ฬ. 8 (จำเป็นสำหรับผู้สมัครสังกัดสมาคมกีฬาแห่งประเทศไทย และสมาคมกีฬาแห่งจังหวัด)"
          : "กรุณาแนบสำเนาใบ ส.ฬ. 8 สำหรับหลักสูตรนี้"
      );
      return;
    }

    // ตรวจสอบขนาดไฟล์แนบ (ไม่เกิน 10 MB ต่อไฟล์)
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    const allFiles = [
      ...photoFiles,
      ...coverFiles,
      ...certFiles,
      ...idCardFiles,
      ...(isSakaApplicable ? sakaFiles : []),
    ];
    for (const f of allFiles) {
      if (f.dataUrl && f.dataUrl.startsWith("data:")) {
        const base64Content = f.dataUrl.split(",")[1] || "";
        const byteLength = (base64Content.length * 3) / 4;
        if (byteLength > MAX_FILE_SIZE_BYTES) {
          fail(`ไฟล์ "${f.name}" มีขนาดใหญ่เกินกำหนด (${(byteLength / (1024 * 1024)).toFixed(1)} MB) กรุณาลดขนาดไฟล์ให้ไม่เกิน 10 MB ต่อไฟล์`);
          return;
        }
      }
    }

    const documents: ApplicantDocument[] = [
      ...(docConfig.photo.enabled
        ? photoFiles.map((file, index) => toDocument("photo", file, index))
        : []),
      ...(docConfig.cover.enabled
        ? coverFiles.map((file, index) => toDocument("cover", file, index))
        : []),
      ...(docConfig.certificate.enabled
        ? certFiles.map((file, index) =>
            toDocument("certificate", file, index)
          )
        : []),
      ...(docConfig.idcard?.enabled
        ? idCardFiles.map((file, index) =>
            toDocument("idcard", file, index)
          )
        : []),
      ...(isSakaApplicable
        ? sakaFiles.map((file, index) => toDocument("saka", file, index))
        : []),
    ];

    const fullApplicantName =
      prefix === "อื่นๆ"
        ? cleanName
        : cleanName.startsWith(prefix)
        ? cleanName
        : `${prefix}${cleanName}`;

    const fullAffiliation = subAffiliation.trim()
      ? `${affiliation} (${subAffiliation.trim()})`
      : affiliation;

    setSubmitting(true);
    setSubmitStage("กำลังเตรียมส่งข้อมูลการสมัคร...");

    let record;
    try {
      const result = await createAndSyncApplication(
        {
          name: fullApplicantName,
          idCard: cleanId,
          email: email.trim(),
          phone: cleanPhone,
          affiliation: fullAffiliation,
          position: position.trim(),
          courseId: course.id,
          documents,
        },
        {
          onStageChange: (stage) => setSubmitStage(stage),
        }
      );
      record = result.record;
    } catch (err) {
      isSubmittingRef.current = false;
      setSubmitting(false);
      setSubmitStage("");
      fail(
        err instanceof Error
          ? err.message
          : "ไม่สามารถบันทึกข้อมูลใบสมัครได้ กรุณาลองใหม่อีกครั้ง"
      );
      return;
    }

    // 1. อัปเดตข้อมูลล่าสุดกลับไปยังฐานข้อมูลทำเนียบบุคลากรกีฬา (หากมีชื่อในระบบทำเนียบอยู่แล้ว)
    if (priorTraineeRecords.length > 0) {
      const targetAlumni = priorTraineeRecords[0];
      const nameParts = cleanName.split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      updatePersonProfile(targetAlumni.personnelId || targetAlumni.id, {
        name: fullApplicantName,
        prefix: prefix === "อื่นๆ" ? "" : prefix,
        firstName,
        lastName,
        idCard: cleanId,
        phone: cleanPhone,
        email: email.trim(),
        affiliationGroup: affiliation,
        affiliation: subAffiliation.trim() || affiliation,
        isVerified: true,
      });
    }

    // ส่งอีเมลยืนยันการรับสมัครไปยังอีเมลของผู้สมัครอัตโนมัติ (await + keepalive เพื่อป้องกัน browser ตัดการเชื่อมต่อตอนเปลี่ยนหน้า)
    setSubmitStage("กำลังส่งอีเมลยืนยันการรับสมัคร...");
    try {
      const emailPromise = fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          to: record.email,
          applicantName: record.name,
          receiptNo: record.receiptNo,
          ref: record.ref,
          courseTitle: record.courseTitle,
          courseDate: course.date,
          courseLocation: course.location,
          idCard: record.idCard,
          affiliation: record.affiliation,
        }),
      });

      // รอผลการส่งอีเมลสูงสุด 3.5 วินาที เพื่อให้ส่งสำเร็จแน่นอนก่อนเปลี่ยนหน้า
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));
      await Promise.race([emailPromise, timeoutPromise]);
    } catch (e) {
      console.warn("Failed to initiate email send:", e);
    }

    router.push(
      `/register/receipt?ref=${encodeURIComponent(record.ref)}&course=${record.courseId}&submitted=1`
    );
  };

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      <Header
        rightSlot={
          <div className="max-w-full overflow-x-auto">
            <Breadcrumb steps={steps} currentStep={2} completedSteps={[1]} variant="check" />
          </div>
        }
      />

      {/* Upgraded Course Summary Card */}
      <div className="mx-auto max-w-[1160px] px-4 pt-3 sm:px-5">
        <div className="flex flex-col gap-3 rounded-xl border border-[#bfdbfe] bg-gradient-to-r from-[#eff6ff] via-[#f0f9ff] to-[#f8fafc] p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#16265E] text-lg text-white shadow-xs">
              🎓
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#16265E] px-2 py-0.5 text-[10px] font-bold text-white">
                  หลักสูตรที่เลือก
                </span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                    isCourseClosed
                      ? "border border-red-200 bg-red-100 text-red-700"
                      : isOverCapacity
                      ? "border border-blue-200 bg-blue-100 text-blue-900"
                      : "border border-emerald-200 bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isCourseClosed
                    ? "ปิดรับสมัครแล้ว"
                    : isOverCapacity
                    ? `เปิดรับสมัครตามกำหนดเวลา (สมัครแล้ว ${applicantCount}/${courseCapacity} คน)`
                    : `เปิดรับสมัคร (สมัครแล้ว ${applicantCount}/${courseCapacity} คน)`}
                </span>
              </div>
              <h1 className="mt-1 truncate text-[14.5px] font-bold text-[#16265E] sm:text-[15.5px]">
                {course.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#475569]">
                <span className="flex items-center gap-1">
                  <span>📅</span>
                  <strong className="text-[#1e3a8a]">วันอบรม:</strong> {course.date}
                </span>
                <span className="text-[#cbd5e1]">•</span>
                <span className="flex items-center gap-1">
                  <span>📍</span>
                  <strong className="text-[#1e3a8a]">สถานที่:</strong> {course.location}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/courses"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#93c5fd] bg-white px-3.5 py-1.5 text-[11.5px] font-semibold text-[#1e40af] shadow-2xs transition hover:border-[#60a5fa] hover:bg-[#dbeafe]"
            title="เปลี่ยนไปสมัครหลักสูตรอื่น"
          >
            <span>🔄</span>
            <span>เปลี่ยนหลักสูตร</span>
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-[1160px] px-4 pb-12 pt-4 sm:px-5">
        {isCourseClosed ? (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-2 rounded-xl border border-[#f0b5b8] bg-[#fff5f5] px-4 py-3 text-[12px] text-[#9e2a30] shadow-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>หลักสูตรนี้ปิดรับสมัครแล้ว</strong>{" "}
                ไม่สามารถส่งใบสมัครได้ กรุณาเลือกหลักสูตรอื่น
              </span>
            </span>
            <Link
              href="/courses"
              className="inline-flex h-8 w-fit shrink-0 items-center justify-center rounded-lg bg-[#9e2a30] px-3.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#842228]"
            >
              กลับไปเลือกหลักสูตร
            </Link>
          </div>
        ) : isOverCapacity ? (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white p-3.5 text-xs text-[#16265E] shadow-2xs">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#16265E] text-xs text-white">
              ℹ️
            </span>
            <div className="leading-relaxed">
              <strong>เปิดรับสมัครตามกำหนดเวลา:</strong> ขณะนี้มีผู้สมัครครบตามเป้าหมาย ({courseCapacity} คน) แล้ว แต่ระบบยังเปิดรับสมัครอย่างต่อเนื่องตามกำหนดการ คณะกรรมการจะพิจารณาคัดเลือกผู้มีคุณสมบัติตามเกณฑ์เป็น <strong>&ldquo;ตัวจริง&rdquo;</strong> ({courseCapacity} คน) และจัดลำดับ <strong>&ldquo;ตัวสำรอง&rdquo;</strong> ในวันประกาศผลรายชื่อ
            </div>
          </div>
        ) : null}

        {/* Wrap the entire form to support native Enter submission and accessible form semantics */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-2">
            {/* ข้อมูลผู้สมัคร */}
            <section className="min-w-0 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-2xs sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-3">
                <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#16265E]">
                  <span>👤</span>
                  <span>ข้อมูลผู้สมัคร</span>
                </h2>
                <div className="flex items-center gap-2.5">
                  {(lookupStatus !== "idle" || idCard || name) && (
                    <button
                      type="button"
                      onClick={handleResetApplicantForm}
                      className="inline-flex items-center gap-1 rounded-[5px] border border-[#cbd5e1] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-medium text-[#334155] transition-colors hover:border-[#94a3b8] hover:bg-[#f1f5f9]"
                    >
                      <span>ล้างข้อมูล / กรอกให้ผู้อื่น</span>
                    </button>
                  )}
                  <span className="text-[11px] font-medium text-[#64748b]">
                    <span className="text-red-500">*</span> จำเป็นต้องกรอก
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* 1. หมายเลขบัตรประชาชน 13 หลัก (1-4-5-2-1) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>
                      1. หมายเลขบัตรประจำตัวประชาชน (13 หลัก) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10.5px] text-[#64748b]">
                      รูปแบบ: 1-4-5-2-1
                    </span>
                  </div>
                  <div className="w-fit max-w-full overflow-x-auto">
                    <IdCardInput value={idCard} onChange={setIdCard} showActions={true} />
                  </div>
                  <p className="text-[10.5px] text-[#64748b]">
                    * หากเคยสมัครหลักสูตรอื่นกับ กกท. แล้ว กรอกเลขบัตรประชาชนเพื่อดึงข้อมูลเดิมมาเติมอัตโนมัติ
                  </p>

                  {idCard.replace(/\D/g, "").length === 13 && !isValidThaiIdCard(idCard) && (
                    <p className="mt-1 text-[11px] font-medium text-[#dc2626]">
                      ⚠️ หมายเลขบัตรประชาชนไม่ถูกต้องตามสูตรคำนวณของกรมการปกครอง (กรุณาตรวจสอบตัวเลขอีกครั้ง)
                    </p>
                  )}

                  {lookupStatus === "checking" && (
                    <div className="mt-1 flex items-center gap-2 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-3 py-2 text-[11.5px] text-[#1e40af]">
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1e40af] border-t-transparent" />
                      <span>กำลังตรวจสอบประวัติการสมัครเดิมจากระบบกลาง...</span>
                    </div>
                  )}

                  {lookupStatus === "found_pending" && lookupMeta && (
                    <div className="mt-1.5 rounded-xl border border-[#93c5fd] bg-gradient-to-r from-[#eff6ff] via-[#f8fafc] to-white p-3.5 text-[12px] text-[#1e3a8a] shadow-2xs">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#16265E]">
                            พบประวัติการสมัครเดิมของเลขบัตรนี้
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#334155]">
                            {lookupMeta.source === "application" ? (
                              <>
                                อ้างอิงล่าสุด: <strong>{lookupMeta.sourceRef}</strong>
                                {lookupMeta.courseTitle ? ` (${lookupMeta.courseTitle})` : ""}
                                {lookupMeta.submittedAt
                                  ? ` · สมัครเมื่อ ${formatThaiDate(lookupMeta.submittedAt)}`
                                  : ""}
                              </>
                            ) : (
                              <>พบข้อมูลในทำเนียบบุคลากรกีฬา กกท.</>
                            )}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-[#bfdbfe] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#1d4ed8]">
                          PDPA Protected
                        </span>
                      </div>

                      <div className="mt-2.5 rounded-lg border border-[#dbeafe] bg-white p-2.5">
                        <p className="text-[11.5px] font-medium text-[#1e293b]">
                          กรุณายืนยันตัวตนด้วย <strong>เลขท้ายเบอร์โทรศัพท์ 4 หลัก</strong>{" "}
                          {lookupMeta.maskedPhone ? (
                            <span className="font-mono text-[#1e3a8a]">
                              ({lookupMeta.maskedPhone})
                            </span>
                          ) : null}{" "}
                          เพื่อดึงข้อมูลส่วนตัวและรูปถ่าย/สำเนาบัตรเดิม:
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={verifyLast4}
                            onChange={(e) => {
                              setVerifyLast4(e.target.value.replace(/\D/g, "").slice(0, 4));
                              if (verifyError) setVerifyError("");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleVerifyPhoneLast4();
                              }
                            }}
                            placeholder="XXXX"
                            aria-label="เลขท้ายเบอร์โทรศัพท์ 4 หลัก"
                            className="h-9 w-24 rounded-[5px] border border-[#93c5fd] bg-[#f8fafc] px-2.5 text-center font-mono text-[14px] font-bold tracking-[0.25em] text-[#16265E] outline-none focus:border-[#1e3a8a] focus:bg-white focus:ring-2 focus:ring-[#1e3a8a]/20"
                          />
                          <button
                            type="button"
                            onClick={() => void handleVerifyPhoneLast4()}
                            disabled={verifying || verifyLast4.length !== 4}
                            className="inline-flex h-9 items-center justify-center rounded-[5px] bg-[#16265E] px-3.5 text-[11.5px] font-semibold text-white transition hover:bg-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {verifying ? "กำลังตรวจสอบ..." : "ยืนยันและดึงข้อมูลเดิม"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLookupStatus("dismissed");
                              setVerifyError("");
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-[5px] border border-[#cbd5e1] bg-white px-3 text-[11.5px] font-medium text-[#475569] transition hover:bg-[#f1f5f9]"
                          >
                            กรอกข้อมูลด้วยตนเอง
                          </button>
                        </div>
                        {verifyError && (
                          <p className="mt-1.5 text-[11px] font-medium text-[#dc2626]">
                            ⚠️ {verifyError}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {lookupStatus === "found_no_phone" && (
                    <div className="mt-1.5 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[11px] text-[#92400e]">
                      พบประวัติเดิมในระบบ แต่ไม่มีเบอร์โทรศัพท์สำหรับยืนยันตัวตน (PDPA) กรุณากรอกข้อมูลส่วนตัวด้านล่างด้วยตนเองครับ
                    </div>
                  )}

                  {lookupStatus === "verified" && lookupMeta && (
                    <div className="mt-1.5 rounded-xl border border-[#86efac] bg-gradient-to-r from-[#f0fdf4] via-[#ecfdf5] to-white p-3 text-[11.5px] text-[#14532d] shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-[#166534]">
                          ✓ ยืนยันตัวตนสำเร็จ — ดึงข้อมูลจาก
                          {lookupMeta.source === "application" && lookupMeta.sourceRef
                            ? `ใบสมัคร ${lookupMeta.sourceRef}`
                            : "ทำเนียบบุคลากร กกท."}
                          แล้ว
                        </p>
                        {lookupMeta.courseTitle && (
                          <span className="max-w-full truncate rounded-full border border-[#bbf7d0] bg-white px-2 py-0.5 text-[10px] font-medium text-[#15803d]">
                            {lookupMeta.courseTitle}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#15803d]">
                        กรุณาตรวจสอบข้อมูลให้เป็นปัจจุบัน (หากหลักสูตรนี้เปิดรับเฉพาะกลุ่มเป้าหมายที่ต่างจากเดิม ระบบจะแจ้งให้ระบุสังกัดใหม่ด้านล่าง)
                        {reusableDocs.length > 0
                          ? " · ท่านสามารถกดใช้รูปถ่าย/สำเนาบัตรเดิมในฝั่งขวามือได้ทันทีโดยไม่ต้องอัปโหลดซ้ำ"
                          : ""}
                      </p>
                    </div>
                  )}

                  {!eligibility.allowed && eligibility.existingRecord && (
                    <div
                      role="alert"
                      className="mt-1.5 rounded-lg border border-[#f59e0b] bg-[#fffbeb] p-3 text-[12px] text-[#92400e]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-bold">
                            <span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" />
                            {eligibility.reason === "duplicate_course"
                              ? "ท่านได้ยื่นสมัครในหลักสูตรนี้แล้ว"
                              : "ช่วงเวลาการอบรมซ้อนทับกับหลักสูตรที่เคยสมัคร"}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#b45309]">
                            {eligibility.reason === "duplicate_course"
                              ? `รหัสอ้างอิง: ${eligibility.existingRecord.ref} (อยู่ระหว่างดำเนินการ)`
                              : `ซ้อนทับกับ: ${
                                  eligibility.conflictingCourse?.title ??
                                  eligibility.existingRecord.courseTitle
                                } (${eligibility.conflictingCourse?.date})`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConflictModal(eligibility)}
                          className="shrink-0 rounded-[4px] bg-[#b45309] px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#92400e]"
                        >
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. คำนำหน้า + ชื่อ-นามสกุล */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>
                    2. ชื่อ - นามสกุล (พร้อมคำนำหน้าชื่อ) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="w-[105px] shrink-0">
                      <select
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        className="block h-9 w-full rounded-[4px] border border-[#d1d5db] bg-white px-2.5 text-[13px] font-medium text-[#1f2937] transition-all focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
                        title="เลือกคำนำหน้าชื่อ"
                      >
                        <option value="นาย">นาย</option>
                        <option value="นาง">นาง</option>
                        <option value="นางสาว">นางสาว</option>
                        <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                        <option value="ดร.">ดร.</option>
                        <option value="ผศ.ดร.">ผศ.ดร.</option>
                        <option value="อื่นๆ">อื่นๆ (ระบุ)</option>
                      </select>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Input
                        fullWidth
                        placeholder={
                          prefix === "อื่นๆ"
                            ? "ระบุคำนำหน้า และชื่อ-นามสกุล"
                            : "ชื่อ - นามสกุล (เช่น สมศักดิ์ รักกีฬา)"
                        }
                        value={name}
                        onChange={(event) => handleNameInput(event.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-[10.5px] text-[#64748b]">
                    * ข้อมูลนี้ใช้พิมพ์ในวุฒิบัตรและบัตรประจำตัว กรุณาตรวจสอบตัวสะกดให้ถูกต้อง
                  </p>
                </div>

                {/* 3. กลุ่มเป้าหมาย / สังกัดหลัก */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="affiliation" className={labelClass}>
                    3. กลุ่มเป้าหมาย / สังกัดหลัก <span className="text-red-500">*</span>
                  </label>
                  {isSingleTargetGroup ? (
                    <div className="flex flex-col gap-1">
                      <div
                        id="affiliation"
                        className="flex h-9 w-full items-center justify-between gap-2 rounded-[4px] border border-[#bfdbfe] bg-[#eff6ff] px-3 text-[13px] font-medium text-[#1e3a8a]"
                      >
                        <span className="truncate">
                          {allowedTargetGroups[0]?.label ?? affiliation}
                        </span>
                        <span className="shrink-0 rounded bg-white/90 px-2 py-0.5 text-[10.5px] font-semibold text-[#1d4ed8] border border-[#bfdbfe]">
                          กำหนดตามหลักสูตร
                        </span>
                      </div>
                      <p className="text-[10.5px] text-[#64748b]">
                        หลักสูตรนี้เปิดรับเฉพาะกลุ่มเป้าหมายนี้เท่านั้น (ระบบเลือกให้อัตโนมัติ)
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="relative">
                        <select
                          id="affiliation"
                          value={affiliation}
                          onChange={(event) => {
                            const nextGroup = event.target.value;
                            if (nextGroup !== affiliation) {
                              setAffiliation(nextGroup);
                              setSubAffiliation("");
                            }
                            if (autofillMismatchNotice) {
                              setAutofillMismatchNotice(null);
                            }
                          }}
                          className="block h-9 w-full appearance-none rounded-[4px] border border-[#d1d5db] bg-white px-3 pr-8 text-[13px] text-[#1f2937] transition-all focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
                        >
                          {allowedTargetGroups.map((option) => (
                            <option key={option.key} value={option.label}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                      {allowedTargetGroups.length < TARGET_GROUPS.length && (
                        <p className="text-[10.5px] text-[#64748b]">
                          แสดงเฉพาะกลุ่มเป้าหมายที่หลักสูตรนี้เปิดรับ ({allowedTargetGroups.length} จาก 5 กลุ่ม)
                        </p>
                      )}
                    </div>
                  )}

                  {autofillMismatchNotice && (
                    <div className="flex items-start justify-between gap-2 rounded-md border border-[#fde68a] bg-[#fffbeb] px-2.5 py-2 text-[11px] text-[#92400e]">
                      <span className="leading-relaxed">{autofillMismatchNotice}</span>
                      <button
                        type="button"
                        aria-label="ปิดการแจ้งเตือน"
                        onClick={() => setAutofillMismatchNotice(null)}
                        className="shrink-0 rounded px-1 text-[#b45309] hover:bg-[#fef3c7]"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* 3.1 ระบุชื่อหน่วยงาน / ชื่อสมาคมกีฬา (Dynamic + Autocomplete) */}
                <div className="flex flex-col gap-1">
                  {subAffiliationSuggestions ? (
                    <AssociationAutocompleteInput
                      id="sub-affiliation"
                      label={subAffiliationConfig.label}
                      required={subAffiliationConfig.required}
                      placeholder={subAffiliationConfig.placeholder}
                      value={subAffiliation}
                      onChange={setSubAffiliation}
                      suggestions={subAffiliationSuggestions}
                      listTitle={
                        affiliation === "สมาคมกีฬาแห่งประเทศไทย"
                          ? `รายชื่อสมาคมกีฬาแห่งประเทศไทย (${subAffiliationSuggestions.length} สมาคม)`
                          : `รายชื่อสมาคมกีฬาแห่งจังหวัด (${subAffiliationSuggestions.length} จังหวัด)`
                      }
                    />
                  ) : (
                    <Input
                      fullWidth
                      label={`${subAffiliationConfig.label} ${
                        subAffiliationConfig.required ? "*" : ""
                      }`}
                      placeholder={subAffiliationConfig.placeholder}
                      value={subAffiliation}
                      onChange={(event) => setSubAffiliation(event.target.value)}
                    />
                  )}
                  {subAffiliationConfig.helper && (
                    <p className="text-[10.5px] text-[#64748b]">
                      {subAffiliationConfig.helper}
                    </p>
                  )}
                </div>

                {/* 4. ตำแหน่ง */}
                <div className="flex flex-col gap-1">
                  <Input
                    fullWidth
                    label="4. ตำแหน่ง (หน่วยงาน / สมาคมกีฬา) *"
                    placeholder="เช่น ผู้ฝึกสอนกีฬา, ผู้บริหารสมาคมกีฬา, เจ้าหน้าที่ปฏิบัติงาน"
                    value={position}
                    onChange={(event) => setPosition(event.target.value)}
                  />
                </div>

                {/* เบอร์โทรศัพท์ & อีเมล */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Input
                      fullWidth
                      label="เบอร์โทรศัพท์ *"
                      placeholder="เช่น 081-234-5678"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      inputMode="tel"
                    />
                    <p className="text-[10.5px] text-[#64748b]">
                      * สำหรับรับ SMS และติดต่อประสานงาน
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Input
                      fullWidth
                      label="E-mail *"
                      type="email"
                      placeholder="เช่น somsak@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                    <p className="text-[10.5px] text-[#64748b]">
                      * สำหรับแจ้งผลการสมัคร
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* เอกสารและรูปถ่ายผู้สมัคร */}
            <section className="min-w-0 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-2xs sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-3">
                <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#16265E]">
                  <span>📎</span>
                  <span>เอกสารและรูปถ่ายผู้สมัคร</span>
                </h2>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eff6ff] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#1e40af]">
                    ⚡ บีบอัดรูปภาพอัตโนมัติ (PDF คงต้นฉบับ)
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
                    📁 ไม่เกิน 10 MB / ไฟล์
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* 1. รูปถ่ายหน้าตรง */}
                {docConfig.photo.enabled && (() => {
                  const reusablePhoto =
                    lookupStatus === "verified"
                      ? reusableDocs.find((d) => d.kind === "photo")
                      : undefined;
                  const photoFlagged =
                    lookupStatus === "verified" && excludedDocKinds.includes("photo");
                  const activePhoto = photoFiles[0];
                  const avatarSrc =
                    activePhoto?.previewUrl ||
                    (activePhoto?.dataUrl?.startsWith("data:") ? activePhoto.dataUrl : null) ||
                    "/assets/avatar-placeholder.svg";

                  return (
                    <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc]/50 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
                        <p className={labelClass}>
                          {docItems.find((i) => i.key === "photo")?.num}. รูปถ่ายหน้าตรง ถ่ายไม่เกิน 6 เดือน{" "}
                          {docConfig.photo.required ? (
                            <span className="font-bold text-[#b91c1c]">(บังคับ)</span>
                          ) : (
                            <span className="font-normal text-[#6b7280]">(ไม่บังคับ)</span>
                          )}
                        </p>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-[#1e40af]">
                          ระบบบีบอัดภาพให้อัตโนมัติ
                        </span>
                      </div>

                      <div className="mb-2.5 rounded-md bg-[#eff6ff]/70 p-2 text-[10.5px] text-[#1e40af] border border-blue-100">
                        <span>📸 <strong>คำแนะนำ:</strong> รูปถ่ายไม่เกิน 6 เดือน สวมชุดสุภาพ ไม่สวมหมวก/แว่นตาดำ</span>
                      </div>

                      {photoFlagged && !activePhoto && (
                        <div className="mb-2 rounded-md border border-[#fde68a] bg-[#fffbeb] px-2.5 py-1.5 text-[11px] text-[#92400e]">
                          ⚠️ รูปถ่ายในใบสมัครเดิมเคยได้รับแจ้งให้แก้ไข กรุณาอัปโหลดรูปถ่ายฉบับใหม่
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <Avatar
                            src={avatarSrc}
                            alt="รูปถ่ายผู้สมัคร"
                            size="portrait"
                          />
                          {photoFiles.length > 0 && (
                            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white shadow-xs">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          {activePhoto?.reusedFromRef ? (
                            <div className="rounded-[5px] border border-[#86efac] bg-[#f0fdf4] p-2.5 text-[11.5px]">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-[#166534]">
                                    ✓ {activePhoto.name} ({activePhoto.size})
                                  </p>
                                  <p className="text-[10.5px] text-[#15803d]">
                                    ใช้ไฟล์เดิมจาก {activePhoto.reusedFromRef} (ไม่สร้างไฟล์ซ้ำบนเซิร์ฟเวอร์)
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  {activePhoto.previewUrl && (
                                    <a
                                      href={activePhoto.previewUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex h-7 items-center rounded border border-[#bbf7d0] bg-white px-2 text-[10.5px] font-medium text-[#166534] hover:bg-[#dcfce7]"
                                    >
                                      ดูรูปเดิม
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setPhotoFiles([])}
                                    className="inline-flex h-7 items-center rounded border border-[#fca5a5] bg-white px-2 text-[10.5px] font-semibold text-[#dc2626] hover:bg-[#fee2e2]"
                                  >
                                    เปลี่ยนไฟล์ใหม่
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              {reusablePhoto && (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[5px] border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-2 text-[11px]">
                                  <span className="min-w-0 truncate text-[#1e3a8a]">
                                    พบไฟล์รูปถ่ายเดิม ({reusablePhoto.size})
                                  </span>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    {reusablePhoto.previewUrl && (
                                      <a
                                        href={reusablePhoto.previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-7 items-center rounded border border-[#93c5fd] bg-white px-2 text-[10.5px] font-medium text-[#1e40af] hover:bg-[#dbeafe]"
                                      >
                                        ดูตัวอย่าง
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPhotoFiles([
                                          {
                                            name: reusablePhoto.name,
                                            size: reusablePhoto.size,
                                            type: reusablePhoto.type,
                                            storagePath: reusablePhoto.storagePath,
                                            dataUrl: reusablePhoto.dataUrl,
                                            previewUrl: reusablePhoto.previewUrl,
                                            reusedFromRef: reusablePhoto.sourceRef,
                                          },
                                        ])
                                      }
                                      className="inline-flex h-7 items-center rounded bg-[#1e3a8a] px-2.5 text-[10.5px] font-semibold text-white hover:bg-[#1e40af]"
                                    >
                                      ใช้รูปถ่ายเดิมจาก {reusablePhoto.sourceRef}
                                    </button>
                                  </div>
                                </div>
                              )}
                              <FileUpload
                                files={photoFiles}
                                onAdd={async (file) => {
                                  const compressed = await compressImageFile(file, "photo");
                                  setPhotoFiles([compressed]);
                                }}
                                onRemove={() => setPhotoFiles([])}
                                emptyText="คลิกเพื่อแนบรูปถ่ายหน้าตรง (JPG, PNG, WEBP)"
                                accept=".jpg,.jpeg,.png,.webp"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. หนังสือนำส่ง */}
                {docConfig.cover.enabled && (
                  <div>
                    <p className={`mb-1.5 ${labelClass}`}>
                      {docItems.find((i) => i.key === "cover")?.num}. หนังสือนำส่งจากต้นสังกัดหรือสมาคมกีฬา{" "}
                      {docConfig.cover.required ? (
                        <span className="font-bold text-[#b91c1c]">(บังคับ)</span>
                      ) : (
                        <span className="font-normal text-[#6b7280]">(ไม่บังคับ)</span>
                      )}
                    </p>
                    <FileUpload
                      files={coverFiles}
                      onAdd={async (file) => {
                        const compressed = await compressImageFile(file, "document");
                        setCoverFiles([compressed]);
                      }}
                      onRemove={() => setCoverFiles([])}
                      emptyText="คลิกเพื่อแนบหนังสือนำส่ง (ไฟล์ PDF หรือรูปภาพ)"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                    />
                    <p className="mt-1 text-[10.5px] text-[#64748b]">
                      * หนังสือนำส่งหรือหนังสือรับรองจากสังกัด/สมาคมกีฬาต้นสังกัด
                    </p>
                  </div>
                )}

                {/* 3. หนังสือรับรอง */}
                {docConfig.certificate.enabled && (
                  <div>
                    <p className={`mb-1.5 ${labelClass}`}>
                      {docItems.find((i) => i.key === "certificate")?.num}. หนังสือรับรองการปฏิบัติหน้าที่ให้กับสมาคม/หน่วยงาน{" "}
                      {docConfig.certificate.required ? (
                        <span className="font-bold text-[#b91c1c]">(บังคับ)</span>
                      ) : (
                        <span className="font-normal text-[#6b7280]">(เฉพาะบางหลักสูตร/ไม่บังคับ)</span>
                      )}
                    </p>
                    <FileUpload
                      files={certFiles}
                      onAdd={async (file) => {
                        const compressed = await compressImageFile(file, "document");
                        setCertFiles([compressed]);
                      }}
                      onRemove={() => setCertFiles([])}
                      emptyText="คลิกเพื่อแนบหนังสือรับรอง (ไฟล์ PDF หรือรูปภาพ)"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                    />
                  </div>
                )}

                {/* 4. สำเนาบัตรประชาชน */}
                {docConfig.idcard?.enabled && (() => {
                  const reusableIdCard =
                    lookupStatus === "verified"
                      ? reusableDocs.find((d) => d.kind === "idcard")
                      : undefined;
                  const idCardFlagged =
                    lookupStatus === "verified" && excludedDocKinds.includes("idcard");
                  const activeIdCard = idCardFiles[0];

                  return (
                    <div>
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <p className={labelClass}>
                          {docItems.find((i) => i.key === "idcard")?.num}. สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง{" "}
                          {docConfig.idcard.required ? (
                            <span className="font-bold text-[#b91c1c]">(บังคับ)</span>
                          ) : (
                            <span className="font-normal text-[#6b7280]">(ไม่บังคับ)</span>
                          )}
                        </p>
                      </div>

                      {idCardFlagged && !activeIdCard && (
                        <div className="mb-2 rounded-md border border-[#fde68a] bg-[#fffbeb] px-2.5 py-1.5 text-[11px] text-[#92400e]">
                          ⚠️ สำเนาบัตรประชาชนในใบสมัครเดิมเคยได้รับแจ้งให้แก้ไข กรุณาอัปโหลดไฟล์ฉบับใหม่
                        </div>
                      )}

                      {activeIdCard?.reusedFromRef ? (
                        <div className="rounded-[5px] border border-[#86efac] bg-[#f0fdf4] p-2.5 text-[11.5px]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#166534]">
                                ✓ {activeIdCard.name} ({activeIdCard.size})
                              </p>
                              <p className="text-[10.5px] text-[#15803d]">
                                ใช้ไฟล์เดิมจาก {activeIdCard.reusedFromRef} (ไม่สร้างไฟล์ซ้ำบนเซิร์ฟเวอร์)
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {activeIdCard.previewUrl && (
                                <a
                                  href={activeIdCard.previewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-7 items-center rounded border border-[#bbf7d0] bg-white px-2 text-[10.5px] font-medium text-[#166534] hover:bg-[#dcfce7]"
                                >
                                  ดูไฟล์เดิม
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => setIdCardFiles([])}
                                className="inline-flex h-7 items-center rounded border border-[#fca5a5] bg-white px-2 text-[10.5px] font-semibold text-[#dc2626] hover:bg-[#fee2e2]"
                              >
                                เปลี่ยนไฟล์ใหม่
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reusableIdCard && (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[5px] border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-2 text-[11px]">
                              <span className="min-w-0 truncate text-[#1e3a8a]">
                                พบสำเนาบัตรเดิม: {reusableIdCard.name} ({reusableIdCard.size})
                              </span>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {reusableIdCard.previewUrl && (
                                  <a
                                    href={reusableIdCard.previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-7 items-center rounded border border-[#93c5fd] bg-white px-2 text-[10.5px] font-medium text-[#1e40af] hover:bg-[#dbeafe]"
                                  >
                                    ดูตัวอย่างไฟล์เดิม
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setIdCardFiles([
                                      {
                                        name: reusableIdCard.name,
                                        size: reusableIdCard.size,
                                        type: reusableIdCard.type,
                                        storagePath: reusableIdCard.storagePath,
                                        dataUrl: reusableIdCard.dataUrl,
                                        previewUrl: reusableIdCard.previewUrl,
                                        reusedFromRef: reusableIdCard.sourceRef,
                                      },
                                    ])
                                  }
                                  className="inline-flex h-7 items-center rounded bg-[#1e3a8a] px-2.5 text-[10.5px] font-semibold text-white hover:bg-[#1e40af]"
                                >
                                  ใช้สำเนาบัตรเดิมจาก {reusableIdCard.sourceRef}
                                </button>
                              </div>
                            </div>
                          )}
                          <FileUpload
                            files={idCardFiles}
                            onAdd={async (file) => {
                              const compressed = await compressImageFile(file, "document");
                              setIdCardFiles([compressed]);
                            }}
                            onRemove={() => setIdCardFiles([])}
                            emptyText="คลิกเพื่อแนบสำเนาบัตรประชาชน (ไฟล์ PDF หรือรูปภาพ)"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                          />
                        </div>
                      )}

                      <p className="mt-1 text-[11px] text-[#475569] flex items-center gap-1">
                        <span>🔒</span>
                        <span>
                          <strong>ความปลอดภัยตาม PDPA:</strong> สามารถขีดคร่อมข้อความ &quot;ใช้สำหรับการสมัครเข้ารับการอบรม กกท. เท่านั้น&quot; และลงลายมือชื่อรับรองสำเนาถูกต้อง
                        </span>
                      </p>
                    </div>
                  );
                })()}

                {/* 5. สำเนาใบ ส.ฬ. 8 (แสดงเฉพาะกลุ่มเป้าหมายที่ตรงเงื่อนไข) */}
                {isSakaApplicable && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <p className={labelClass}>
                        {docItems.find((i) => i.key === "saka")?.num}. สำเนาใบ ส.ฬ. 8{" "}
                        {docConfig.saka.required ? (
                          <span className="font-bold text-[#b91c1c]">(บังคับ)</span>
                        ) : (
                          <span className="font-normal text-[#6b7280]">(ไม่บังคับ)</span>
                        )}
                      </p>
                      {docConfig.saka.required && (
                        <span className="inline-flex items-center gap-1 rounded-[3px] bg-[#fef3c7] px-2 py-[2px] text-[10.5px] font-semibold text-[#92400e] border border-[#fde68a]">
                          {docConfig.saka.onlyTargetGroups?.length
                            ? "บังคับเฉพาะสมาคมกีฬาแห่งประเทศไทย / สมาคมกีฬาแห่งจังหวัด"
                            : "หลักสูตรนี้ต้องแนบเอกสารนี้เพื่อการสมัคร"}
                        </span>
                      )}
                    </div>
                    <FileUpload
                      files={sakaFiles}
                      onAdd={async (file) => {
                        const compressed = await compressImageFile(file, "document");
                        setSakaFiles([compressed]);
                      }}
                      onRemove={() => setSakaFiles([])}
                      emptyText="คลิกเพื่อแนบสำเนาใบ ส.ฬ. 8 (ไฟล์ PDF หรือรูปภาพ)"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                    />
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#78350f]">
                      📌 {docConfig.saka.hint || SAKA_ASSOCIATION_HINT}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Consent Section */}
          <div className="mt-6 space-y-3.5 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-2xs sm:p-5">
            <h3 className="text-[13.5px] font-bold text-[#16265E] flex items-center gap-2 border-b border-[#f1f5f9] pb-2">
              <span>⚖️</span>
              <span>การยินยอมข้อมูลส่วนบุคคลและการรับรองความถูกต้อง</span>
            </h3>

            <Checkbox
              checked={consent}
              onChange={setConsent}
              label={
                <span className="font-medium text-[#0f172a]">
                  ข้าพเจ้ายินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA Consent)
                </span>
              }
              description={
                <span className="text-[#475569]">
                  ข้าพเจ้าได้รับทราบวัตถุประสงค์ในการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล และได้อ่าน{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowPdpaModal(true);
                    }}
                    className="font-bold text-[#1869bc] underline transition hover:text-[#1e3a8a]"
                  >
                    นโยบายการคุ้มครองข้อมูลส่วนบุคคลของ กกท. (คลิกอ่าน)
                  </button>{" "}
                  แล้ว
                </span>
              }
            />

            <Checkbox
              checked={confirmed}
              onChange={setConfirmed}
              label={
                <span className="font-medium text-[#0f172a]">
                  ข้าพเจ้าขอรับรองว่า ข้อความและเอกสารหลักฐานดังกล่าวข้างต้นเป็นจริงทุกประการ
                </span>
              }
            />
          </div>

          {/* Actions & Error Display */}
          {formError && (
            <div
              role="alert"
              className="mt-4 flex items-center gap-2 rounded-xl border border-[#f0b5b8] bg-[#fff5f5] p-3.5 text-[12.5px] font-medium text-[#9e2a30] shadow-xs animate-in fade-in"
            >
              <span className="text-base shrink-0">⚠️</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 border-t border-[#e2e8f0] pt-4 sm:flex-row">
            <Link
              href={`/courses?course=${course.id}`}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-5 text-[13px] font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f8fafc] hover:text-[#1e293b] sm:w-auto"
            >
              <span>←</span>
              <span>ย้อนกลับไปเลือกหลักสูตร</span>
            </Link>

            {/* Upgraded Primary Action Button: SAT Navy Blue instead of Red */}
            <button
              type="submit"
              disabled={submitting || isCourseClosed}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#16265E] px-7 text-[13.5px] font-bold text-white shadow-md transition-all hover:bg-[#1e3a8a] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>{submitStage || "กำลังส่งข้อมูลการสมัคร..."}</span>
                </>
              ) : (
                <>
                  <span>ส่งข้อมูลการสมัคร</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* PDPA Privacy Policy Modal */}
      <PdpaModal
        isOpen={showPdpaModal}
        onClose={() => setShowPdpaModal(false)}
        onAccept={() => setConsent(true)}
      />

      {/* Conflict Modal */}
      {conflictModal && conflictModal.existingRecord && (
        <ConflictDialog
          isOpen={true}
          reason={conflictModal.reason || "duplicate_course"}
          existingRecord={conflictModal.existingRecord}
          targetCourse={course}
          conflictingCourse={conflictModal.conflictingCourse}
          onClose={() => setConflictModal(null)}
        />
      )}
    </div>
  );
}
