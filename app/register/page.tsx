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
  getCourseById,
  getDefaultCourse,
  getCourseDocumentConfig,
  TARGET_GROUPS,
} from "@/lib/courses";
import { useCourses } from "@/lib/courses-store";
import {
  checkRegistrationEligibility,
  createApplication,
  useApplications,
  type ApplicantDocument,
  type ApplicantDocumentKind,
  type RegistrationEligibility,
} from "@/lib/applications-store";
import { ConflictDialog } from "@/components/register/conflict-dialog";
import { PdpaModal } from "@/components/register/pdpa-modal";
import { isValidThaiIdCard } from "@/lib/validation";
import { useAlumniStore } from "@/lib/alumni-store";
import { saveDocumentToStorage } from "@/lib/document-storage";

const labelClass = "text-[12.5px] font-medium text-[#1f2937]";

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
  if (file.dataUrl) {
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
    dataUrl: file.dataUrl,
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
  const course =
    getCourseById(searchParams.get("course"), courses) ??
    getDefaultCourse(courses);

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
    if (digits.length !== 13) return [];
    return trainees.filter((t) => t.idCard.replace(/\D/g, "") === digits);
  }, [idCard, trainees]);

  const [affiliation, setAffiliation] = useState<string>(
    TARGET_GROUPS[0].label
  );
  const [subAffiliation, setSubAffiliation] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [conflictModal, setConflictModal] =
    useState<RegistrationEligibility | null>(null);
  const [showPdpaModal, setShowPdpaModal] = useState(false);
  const hasAutofilledRef = useRef(false);

  // คำนวณที่นั่งคงเหลือ
  const courseCapacity = useMemo(() => {
    const match = course.seats.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 40;
  }, [course.seats]);

  const approvedOrPendingCount = useMemo(() => {
    return applications.filter(
      (a) => a.courseId === course.id && a.status !== "rejected"
    ).length;
  }, [applications, course.id]);

  const dynamicSeatsLeft = Math.max(0, courseCapacity - approvedOrPendingCount);
  const isCourseFull = course.status === "full" || dynamicSeatsLeft <= 0;

  // ตรวจสอบความถูกต้องของการสมัคร (ห้ามวิชาเดิม และห้ามวันอบรมซ้อนทับกัน)
  const eligibility = useMemo(() => {
    return checkRegistrationEligibility(
      idCard,
      course.id,
      applications,
      courses
    );
  }, [idCard, course.id, applications, courses]);

  // ดึงข้อมูลส่วนตัวจากการสมัครก่อนหน้าหรือทำเนียบรุ่นมาเติมให้อัตโนมัติ เพื่ออำนวยความสะดวก
  useEffect(() => {
    const digits = idCard.replace(/\D/g, "");
    if (digits.length === 13 && !hasAutofilledRef.current) {
      const prior = applications.find(
        (a) => a.idCard === digits && a.status !== "rejected"
      );
      if (prior) {
        hasAutofilledRef.current = true;
        const timer = setTimeout(() => {
          if (prior.name) {
            const parsed = splitPrefixAndName(prior.name);
            setPrefix(parsed.prefix);
            setName(parsed.name);
          }
          if (prior.phone) setPhone(prior.phone);
          if (prior.email) setEmail(prior.email);
          if (prior.affiliation) {
            const match = prior.affiliation.match(/^(.*?)\s*\((.*?)\)$/);
            if (match) {
              setAffiliation(match[1]);
              setSubAffiliation(match[2]);
            } else {
              setAffiliation(prior.affiliation);
            }
          }
          if (prior.position) setPosition(prior.position);
        }, 0);
        return () => clearTimeout(timer);
      } else if (priorTraineeRecords.length > 0) {
        const alumni = priorTraineeRecords[0];
        hasAutofilledRef.current = true;
        const timer = setTimeout(() => {
          if (alumni.name) {
            const parsed = splitPrefixAndName(alumni.name);
            setPrefix(parsed.prefix);
            setName(parsed.name);
          }
          if (alumni.affiliation) {
            setAffiliation(alumni.affiliation);
          }
          if (alumni.phone) setPhone(alumni.phone);
          if (alumni.email) setEmail(alumni.email);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [idCard, applications, priorTraineeRecords]);

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
          placeholder: "เช่น สมาคมกีฬาว่ายน้ำแห่งประเทศไทย, สมาคมกีฬาเทควันโดแห่งประเทศไทย",
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

  // ฟังก์ชันบีบอัดรูปถ่ายหน้าตรงอัตโนมัติให้ได้สัดส่วนรูปติดบัตร (~100-200KB)
  const compressPhotoFile = async (file: FileItem): Promise<FileItem> => {
    if (!file.dataUrl || !file.dataUrl.startsWith("data:image/")) {
      return file;
    }
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 600;
        const maxHeight = 800;
        const scale = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
        const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
        const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const bytes = Math.round((compressedDataUrl.length * 3) / 4);
        const sizeStr =
          bytes >= 1024 * 1024
            ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(bytes / 1024)} KB`;
        resolve({
          ...file,
          dataUrl: compressedDataUrl,
          size: sizeStr,
          type: "image/jpeg",
        });
      };
      img.onerror = () => resolve(file);
      img.src = file.dataUrl || "";
    });
  };

  const docConfig = useMemo(() => getCourseDocumentConfig(course), [course]);

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
    if (docConfig.saka.enabled) {
      items.push({
        key: "saka",
        num: count++,
        label: docConfig.saka.label || "สำเนาใบ ส.ฬ. 8",
        required: docConfig.saka.required,
        hint: docConfig.saka.hint,
      });
    }
    return items;
  }, [docConfig]);

  const handleNameInput = (val: string) => {
    const parsed = splitPrefixAndName(val);
    if (parsed.prefix !== prefix && val.trim().startsWith(parsed.prefix) && parsed.name.length > 0) {
      setPrefix(parsed.prefix);
      setName(parsed.name);
    } else {
      setName(val);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (isCourseFull) {
      setFormError("หลักสูตรนี้เต็มแล้ว กรุณาเลือกหลักสูตรอื่น");
      return;
    }

    // 1. ตรวจสอบเลขบัตรประชาชน
    const cleanId = idCard.replace(/\D/g, "");
    if (cleanId.length !== 13) {
      setFormError("กรุณากรอกหมายเลขบัตรประจำตัวประชาชนให้ครบ 13 หลัก");
      return;
    }
    if (!isValidThaiIdCard(cleanId)) {
      setFormError(
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
      setConflictModal(check);
      return;
    }

    // 2. ตรวจสอบชื่อ-นามสกุล
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setFormError("กรุณากรอกชื่อและนามสกุลให้ครบถ้วน");
      return;
    }

    // 3. ตรวจสอบหน่วยงาน/สมาคมกีฬา
    if (subAffiliationConfig.required && !subAffiliation.trim()) {
      setFormError(`กรุณาระบุข้อมูลในข้อ ${subAffiliationConfig.label}`);
      return;
    }

    // 4. ตรวจสอบตำแหน่ง
    if (position.trim() === "") {
      setFormError("กรุณาระบุตำแหน่ง (หน่วยงาน / สมาคมกีฬา)");
      return;
    }

    // 5. ตรวจสอบเบอร์โทรศัพท์
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 9 || cleanPhone.length > 10 || !cleanPhone.startsWith("0")) {
      setFormError("กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (เช่น 081-234-5678 หรือ 02-xxx-xxxx)");
      return;
    }

    // 6. ตรวจสอบอีเมล
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("กรุณากรอกที่อยู่อีเมลให้ถูกต้อง (เช่น somsak@email.com) เพื่อใช้แจ้งผลการสมัคร");
      return;
    }

    // 7. ตรวจสอบความยินยอม
    if (!consent || !confirmed) {
      setFormError("กรุณายินยอมข้อตกลง PDPA และรับรองความถูกต้องของข้อมูล");
      return;
    }

    // 8. ตรวจสอบเอกสาร
    if (docConfig.photo.enabled && docConfig.photo.required && photoFiles.length === 0) {
      setFormError("กรุณาแนบรูปถ่ายหน้าตรง");
      return;
    }
    if (docConfig.cover.enabled && docConfig.cover.required && coverFiles.length === 0) {
      setFormError("กรุณาแนบหนังสือนำส่งจากต้นสังกัด / สมาคมกีฬา");
      return;
    }
    if (docConfig.certificate.enabled && docConfig.certificate.required && certFiles.length === 0) {
      setFormError("กรุณาแนบหนังสือรับรองการปฏิบัติหน้าที่ให้กับสมาคม/หน่วยงาน");
      return;
    }
    if (docConfig.idcard?.enabled && docConfig.idcard?.required && idCardFiles.length === 0) {
      setFormError("กรุณาแนบสำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง");
      return;
    }
    if (docConfig.saka.enabled && docConfig.saka.required && sakaFiles.length === 0) {
      setFormError("กรุณาแนบสำเนาใบ ส.ฬ. 8 สำหรับหลักสูตรนี้");
      return;
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
      ...(docConfig.saka.enabled
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
    const record = createApplication({
      name: fullApplicantName,
      idCard,
      email: email.trim(),
      phone: cleanPhone,
      affiliation: fullAffiliation,
      position: position.trim(),
      courseId: course.id,
      documents,
    });

    router.push(
      `/register/receipt?ref=${encodeURIComponent(record.ref)}&course=${record.courseId}`
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
                    isCourseFull
                      ? "border border-red-200 bg-red-100 text-red-700"
                      : dynamicSeatsLeft <= 5
                      ? "border border-amber-200 bg-amber-100 text-amber-800"
                      : "border border-emerald-200 bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isCourseFull
                    ? "เต็มแล้ว"
                    : `เหลือ ${dynamicSeatsLeft} ที่นั่ง (จาก ${courseCapacity} ที่นั่ง)`}
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
        {isCourseFull && (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-2 rounded-xl border border-[#f0b5b8] bg-[#fff5f5] px-4 py-3 text-[12px] text-[#9e2a30] shadow-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>หลักสูตรนี้เต็มแล้ว</strong>{" "}
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
        )}

        {/* Wrap the entire form to support native Enter submission and accessible form semantics */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-2">
            {/* ข้อมูลผู้สมัคร */}
            <section className="min-w-0 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-2xs sm:p-5">
              <div className="mb-4 flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#16265E]">
                  <span>👤</span>
                  <span>ข้อมูลผู้สมัคร</span>
                </h2>
                <span className="text-[11px] font-medium text-[#64748b]">
                  <span className="text-red-500">*</span> จำเป็นต้องกรอก
                </span>
              </div>

              <div className="space-y-4">
                {/* 1. คำนำหน้า + ชื่อ-นามสกุล */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>
                    1. ชื่อ - นามสกุล (พร้อมคำนำหน้าชื่อ) <span className="text-red-500">*</span>
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

                {/* 2. หมายเลขบัตรประชาชน 13 หลัก (1-4-5-2-1) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>
                      2. หมายเลขบัตรประจำตัวประชาชน (13 หลัก) <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10.5px] text-[#64748b]">
                      รูปแบบ: 1-4-5-2-1
                    </span>
                  </div>
                  <div className="w-fit max-w-full overflow-x-auto">
                    <IdCardInput value={idCard} onChange={setIdCard} showActions={true} />
                  </div>

                  {idCard.replace(/\D/g, "").length === 13 && !isValidThaiIdCard(idCard) && (
                    <p className="mt-1 text-[11px] font-medium text-[#dc2626]">
                      ⚠️ หมายเลขบัตรประชาชนไม่ถูกต้องตามสูตรคำนวณของกรมการปกครอง (กรุณาตรวจสอบตัวเลขอีกครั้ง)
                    </p>
                  )}

                  {priorTraineeRecords.length > 0 && (
                    <div className="mt-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 p-2.5 text-xs text-emerald-900 shadow-2xs animate-in fade-in">
                      <p className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span>🎉</span>
                        <span>พบประวัติบุคลากรในทำเนียบ กกท. (สำเร็จการอบรมแล้ว {priorTraineeRecords.length} หลักสูตร)</span>
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {priorTraineeRecords.map((rec) => (
                          <span
                            key={rec.id}
                            className="rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800"
                          >
                            ✓ {rec.courseTitle} ({rec.yearBE})
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-emerald-700">
                        * ระบบดึงข้อมูลส่วนตัวมาเติมให้อัตโนมัติเพื่ออำนวยความสะดวก
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

                {/* 3. กลุ่มเป้าหมาย / สังกัดหลัก */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="affiliation" className={labelClass}>
                    3. กลุ่มเป้าหมาย / สังกัดหลัก <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="affiliation"
                      value={affiliation}
                      onChange={(event) => setAffiliation(event.target.value)}
                      className="block h-9 w-full appearance-none rounded-[4px] border border-[#d1d5db] bg-white px-3 pr-8 text-[13px] text-[#1f2937] transition-all focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
                    >
                      {TARGET_GROUPS.map((option) => (
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
                </div>

                {/* 3.1 ระบุชื่อหน่วยงาน / ชื่อสมาคมกีฬา (Dynamic) */}
                <div className="flex flex-col gap-1">
                  <Input
                    fullWidth
                    label={`${subAffiliationConfig.label} ${
                      subAffiliationConfig.required ? "*" : ""
                    }`}
                    placeholder={subAffiliationConfig.placeholder}
                    value={subAffiliation}
                    onChange={(event) => setSubAffiliation(event.target.value)}
                  />
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
              <div className="mb-4 flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#16265E]">
                  <span>📎</span>
                  <span>เอกสารและรูปถ่ายผู้สมัคร</span>
                </h2>
                <span className="text-[11px] font-medium text-[#64748b]">
                  ไฟล์ภาพ (JPG/PNG) หรือ PDF
                </span>
              </div>

              <div className="space-y-4">
                {/* 1. รูปถ่ายหน้าตรง */}
                {docConfig.photo.enabled && (
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

                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <Avatar
                          src={photoFiles[0]?.dataUrl || "/assets/avatar-placeholder.svg"}
                          alt="รูปถ่ายผู้สมัคร"
                          size="portrait"
                        />
                        {photoFiles.length > 0 && (
                          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white shadow-xs">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <FileUpload
                          files={photoFiles}
                          onAdd={async (file) => {
                            const compressed = await compressPhotoFile(file);
                            setPhotoFiles([compressed]);
                          }}
                          onRemove={() => setPhotoFiles([])}
                          emptyText="คลิกเพื่อแนบรูปถ่ายหน้าตรง (JPG, PNG, WEBP)"
                          accept=".jpg,.jpeg,.png,.webp"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                      onAdd={(file) => setCoverFiles([file])}
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
                      onAdd={(file) => setCertFiles([file])}
                      onRemove={() => setCertFiles([])}
                      emptyText="คลิกเพื่อแนบหนังสือรับรอง (ไฟล์ PDF หรือรูปภาพ)"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                    />
                  </div>
                )}

                {/* 4. สำเนาบัตรประชาชน */}
                {docConfig.idcard?.enabled && (
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
                    <FileUpload
                      files={idCardFiles}
                      onAdd={(file) => setIdCardFiles([file])}
                      onRemove={() => setIdCardFiles([])}
                      emptyText="คลิกเพื่อแนบสำเนาบัตรประชาชน (ไฟล์ PDF หรือรูปภาพ)"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                    />
                    <p className="mt-1 text-[11px] text-[#475569] flex items-center gap-1">
                      <span>🔒</span>
                      <span>
                        <strong>ความปลอดภัยตาม PDPA:</strong> สามารถขีดคร่อมข้อความ &quot;ใช้สำหรับการสมัครเข้ารับการอบรม กกท. เท่านั้น&quot; และลงลายมือชื่อรับรองสำเนาถูกต้อง
                      </span>
                    </p>
                  </div>
                )}

                {/* 5. สำเนาใบ ส.ฬ. 8 */}
                {docConfig.saka.enabled && (
                  <div>
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
                        <span className="inline-flex items-center gap-1 rounded-[3px] bg-[#fef3c7] px-1.5 py-[2px] text-[10.5px] font-medium text-[#b45309]">
                          หลักสูตรนี้ต้องแนบเอกสารนี้เพื่อการสมัคร
                        </span>
                      )}
                    </div>
                    <FileUpload
                      files={sakaFiles}
                      onAdd={(file) => setSakaFiles([file])}
                      onRemove={() => setSakaFiles([])}
                      emptyText="คลิกเพื่อแนบสำเนาใบ ส.ฬ. 8 (ไฟล์ PDF หรือรูปภาพ)"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                    />
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
              disabled={submitting || isCourseFull}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#16265E] px-7 text-[13.5px] font-bold text-white shadow-md transition-all hover:bg-[#1e3a8a] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>กำลังส่งข้อมูลการสมัคร...</span>
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
