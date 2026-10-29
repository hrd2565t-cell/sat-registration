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
import { Button } from "@/components/ui/button";
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
import { isValidThaiIdCard } from "@/lib/validation";

const labelClass = "text-[12.5px] font-medium text-[#1f2937]";

import { saveDocumentToStorage } from "@/lib/document-storage";

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
  const course =
    getCourseById(searchParams.get("course"), courses) ??
    getDefaultCourse(courses);
  const steps = [
    { label: "1. เลือกหลักสูตร", href: `/?course=${course.id}` },
    { label: "2. กรอกข้อมูลและส่งเอกสาร" },
    { label: "3. ส่งข้อมูลสมัคร" },
  ];
  const [name, setName] = useState("");
  const [idCard, setIdCard] = useState("");
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
  const hasAutofilledRef = useRef(false);

  const isCourseFull = course.status === "full";

  // ตรวจสอบความถูกต้องของการสมัคร (ห้ามวิชาเดิม และห้ามวันอบรมซ้อนทับกัน)
  const eligibility = useMemo(() => {
    return checkRegistrationEligibility(
      idCard,
      course.id,
      applications,
      courses
    );
  }, [idCard, course.id, applications, courses]);

  // ดึงข้อมูลส่วนตัวจากการสมัครก่อนหน้ามาเติมให้อัตโนมัติ เพื่ออำนวยความสะดวก
  useEffect(() => {
    const digits = idCard.replace(/\D/g, "");
    if (digits.length === 13 && !hasAutofilledRef.current) {
      const prior = applications.find(
        (a) => a.idCard === digits && a.status !== "rejected"
      );
      if (prior) {
        hasAutofilledRef.current = true;
        const timer = setTimeout(() => {
          if (prior.name) setName(prior.name);
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
      }
    }
  }, [idCard, applications]);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (isCourseFull) {
      setFormError("หลักสูตรนี้เต็มแล้ว กรุณาเลือกหลักสูตรอื่น");
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

    if (name.trim().length < 3) {
      setFormError("กรุณากรอกชื่อ-นามสกุลให้ครบถ้วน");
      return;
    }
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
    if (position.trim() === "") {
      setFormError("กรุณาระบุตำแหน่ง");
      return;
    }
    if (phone.replace(/\D/g, "").length < 9) {
      setFormError("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง");
      return;
    }
    if (!consent || !confirmed) {
      setFormError("กรุณายินยอมข้อตกลงและยืนยันความถูกต้องของข้อมูล");
      return;
    }
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

    const fullAffiliation = subAffiliation.trim()
      ? `${affiliation} (${subAffiliation.trim()})`
      : affiliation;

    setSubmitting(true);
    const record = createApplication({
      name,
      idCard,
      email,
      phone,
      affiliation: fullAffiliation,
      position,
      courseId: course.id,
      documents,
    });

    router.push(
      `/register/receipt?ref=${encodeURIComponent(record.ref)}&course=${record.courseId}`
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        rightSlot={
          <div className="max-w-full overflow-x-auto">
            <Breadcrumb steps={steps} currentStep={2} />
          </div>
        }
      />

      <div className="mx-auto max-w-[1160px] px-5">
        <div className="border-b border-[#b9d3f2] bg-[#dbeafe] px-3 py-1.5">
          <p className="text-[12px] leading-relaxed text-[#1e40af]">
            หลักสูตรที่เลือก:{" "}
            <span className="font-semibold">{course.title}</span>
            <span className="mx-2 text-[#93c5fd]">|</span>
            วันที่ <span className="font-medium">{course.date}</span>
            <span className="mx-2 text-[#93c5fd]">|</span>
            ณ <span className="font-medium">{course.location}</span>
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-[1160px] px-5 pb-10 pt-4">
        {isCourseFull && (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-2 rounded-[6px] border border-[#f0b5b8] bg-[#fff5f5] px-4 py-3 text-[12px] text-[#9e2a30] sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              <strong>หลักสูตรนี้เต็มแล้ว</strong>{" "}
              ไม่สามารถส่งใบสมัครได้ กรุณาเลือกหลักสูตรอื่น
            </span>
            <Link
              href="/"
              className="inline-flex h-8 w-fit shrink-0 items-center justify-center rounded-[5px] bg-[#9e2a30] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#842228]"
            >
              กลับไปเลือกหลักสูตร
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-2">
          {/* ข้อมูลผู้สมัคร */}
          <section className="min-w-0">
            <h2 className="mb-3.5 text-[14.5px] font-bold text-[#16265E]">
              ข้อมูลผู้สมัคร
            </h2>

            <div className="space-y-3.5">
              <Input
                fullWidth
                label="1. ชื่อ - นามสกุล"
                placeholder="ระบุคำนำหน้าและชื่อ-นามสกุล เช่น นายสมศักดิ์ รักกีฬา"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  2. หมายเลขบัตรประจำตัวประชาชน (13 หลัก)
                </label>
                <div className="w-fit">
                  <IdCardInput value={idCard} onChange={setIdCard} showActions={true} />
                </div>

                {idCard.replace(/\D/g, "").length === 13 && !isValidThaiIdCard(idCard) && (
                  <p className="mt-1 text-[11px] font-medium text-[#dc2626]">
                    ⚠️ หมายเลขบัตรประชาชนไม่ถูกต้องตามสูตรคำนวณของกรมการปกครอง (กรุณาตรวจสอบตัวเลขอีกครั้ง)
                  </p>
                )}

                {!eligibility.allowed && eligibility.existingRecord && (
                  <div
                    role="alert"
                    className="mt-1 rounded-lg border border-[#f59e0b] bg-[#fffbeb] p-3 text-[12px] text-[#92400e]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold flex items-center gap-1.5">
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

              <div className="flex flex-col gap-1.5">
                <label htmlFor="affiliation" className={labelClass}>
                  3. กลุ่มเป้าหมาย / สังกัดหลัก
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

              <div className="flex flex-col gap-1.5">
                <Input
                  fullWidth
                  label="3.1 ระบุชื่อหน่วยงาน / ชื่อสมาคมกีฬา (เฉพาะเจาะจง)"
                  placeholder="เช่น สมาคมกีฬาว่ายน้ำแห่งประเทศไทย, สมาคมกีฬาแห่งจังหวัดเชียงใหม่, ฝ่ายวิทยาศาสตร์การกีฬา"
                  value={subAffiliation}
                  onChange={(event) => setSubAffiliation(event.target.value)}
                />
              </div>

              <Input
                fullWidth
                label="4. ตำแหน่ง (หน่วยงาน / สมาคมกีฬา)"
                placeholder="เช่น ผู้ฝึกสอนกีฬา, ผู้บริหารสมาคมกีฬา, เจ้าหน้าที่ปฏิบัติงาน"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
              />

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Input
                  fullWidth
                  label="เบอร์โทรศัพท์"
                  placeholder="เช่น 0812345678"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                />
                <Input
                  fullWidth
                  label="E-mail"
                  type="email"
                  placeholder="เช่น somsak@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
          </section>

          {/* เอกสารและรูปถ่ายผู้สมัคร */}
          <section className="min-w-0">
            <h2 className="mb-3.5 text-[14.5px] font-bold text-[#16265E]">
              เอกสารและรูปถ่ายผู้สมัคร
            </h2>

            <div className="space-y-4">
              {docConfig.photo.enabled && (
                <div>
                  <p className={`mb-1.5 ${labelClass}`}>
                    {docItems.find((i) => i.key === "photo")?.num}. รูปถ่ายหน้าตรง ถ่ายไม่เกิน 6 เดือน (สำหรับพิมพ์บัตรประจำตัว){" "}
                    {docConfig.photo.required ? (
                      <span className="font-semibold text-[#b91c1c]">(บังคับ)</span>
                    ) : (
                      <span className="font-normal text-[#6b7280]">(ไม่บังคับ)</span>
                    )}
                  </p>
                  <div className="flex items-start gap-2.5">
                    <Avatar
                      src={photoFiles[0]?.dataUrl || "/assets/avatar-placeholder.svg"}
                      alt="รูปถ่ายผู้สมัคร"
                      size="portrait"
                    />
                    <div className="min-w-0 flex-1">
                      <FileUpload
                        files={photoFiles}
                        onAdd={async (file) => {
                          const compressed = await compressPhotoFile(file);
                          setPhotoFiles([compressed]);
                        }}
                        onRemove={() => setPhotoFiles([])}
                        emptyText="ยังไม่ได้แนบรูปถ่าย (คลิกเพื่อแนบรูปถ่ายหน้าตรง ระบบบีบอัดให้อัตโนมัติ)"
                        accept=".jpg,.jpeg,.png,.webp"
                      />
                    </div>
                  </div>
                </div>
              )}

              {docConfig.cover.enabled && (
                <div>
                  <p className={`mb-1.5 ${labelClass}`}>
                    {docItems.find((i) => i.key === "cover")?.num}. หนังสือนำส่งจากต้นสังกัดหรือสมาคมกีฬา{" "}
                    {docConfig.cover.required ? (
                      <span className="font-semibold text-[#b91c1c]">(บังคับ)</span>
                    ) : (
                      <span className="font-normal text-[#6b7280]">(ไม่บังคับ)</span>
                    )}
                  </p>
                  <FileUpload
                    files={coverFiles}
                    onAdd={(file) => setCoverFiles([file])}
                    onRemove={() => setCoverFiles([])}
                    emptyText="ยังไม่ได้แนบไฟล์ (คลิกเพื่อแนบหนังสือนำส่ง - ไฟล์ PDF หรือรูปภาพ)"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  />
                </div>
              )}

              {docConfig.certificate.enabled && (
                <div>
                  <p className={`mb-1.5 ${labelClass}`}>
                    {docItems.find((i) => i.key === "certificate")?.num}. หนังสือรับรองการปฏิบัติหน้าที่ให้กับสมาคม/หน่วยงาน{" "}
                    {docConfig.certificate.required ? (
                      <span className="font-semibold text-[#b91c1c]">(บังคับ)</span>
                    ) : (
                      <span className="font-normal text-[#6b7280]">(เฉพาะบางหลักสูตร/ไม่บังคับ)</span>
                    )}
                  </p>
                  <FileUpload
                    files={certFiles}
                    onAdd={(file) => setCertFiles([file])}
                    onRemove={() => setCertFiles([])}
                    emptyText="ยังไม่ได้แนบไฟล์ (คลิกเพื่อแนบหนังสือรับรอง - ไฟล์ PDF หรือรูปภาพ)"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  />
                </div>
              )}

              {docConfig.idcard?.enabled && (
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className={labelClass}>
                      {docItems.find((i) => i.key === "idcard")?.num}. สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง{" "}
                      {docConfig.idcard.required ? (
                        <span className="font-semibold text-[#b91c1c]">(บังคับ)</span>
                      ) : (
                        <span className="font-normal text-[#6b7280]">(ไม่บังคับ)</span>
                      )}
                    </p>
                  </div>
                  <FileUpload
                    files={idCardFiles}
                    onAdd={(file) => setIdCardFiles([file])}
                    onRemove={() => setIdCardFiles([])}
                    emptyText="ยังไม่ได้แนบไฟล์ (คลิกเพื่อแนบสำเนาบัตรประชาชน - ไฟล์ PDF หรือรูปภาพ)"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  />
                  <p className="mt-1 text-[11px] text-[#6b7280]">
                    * สามารถขีดคร่อมข้อความ &quot;ใช้สำหรับการสมัครเข้ารับการอบรม กกท. เท่านั้น&quot; และลงลายมือชื่อรับรองสำเนาถูกต้อง
                  </p>
                </div>
              )}

              {docConfig.saka.enabled && (
                <div>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className={labelClass}>
                      {docItems.find((i) => i.key === "saka")?.num}. สำเนาใบ ส.ฬ. 8{" "}
                      {docConfig.saka.required ? (
                        <span className="font-semibold text-[#b91c1c]">(บังคับ)</span>
                      ) : (
                        <span className="font-normal text-[#6b7280]">(ไม่บังคับ)</span>
                      )}
                    </p>
                    {docConfig.saka.required && (
                      <span className="inline-flex items-center gap-1 rounded-[3px] bg-[#fef3c7] px-1.5 py-[2px] text-[10.5px] font-medium text-[#b45309]">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                          />
                        </svg>
                        หลักสูตรนี้ต้องแนบเอกสารนี้เพื่อการสมัคร
                      </span>
                    )}
                  </div>
                  <FileUpload
                    files={sakaFiles}
                    onAdd={(file) => setSakaFiles([file])}
                    onRemove={() => setSakaFiles([])}
                    emptyText="ยังไม่ได้แนบไฟล์ (คลิกเพื่อแนบสำเนาใบ ส.ฬ. 8 - ไฟล์ PDF หรือรูปภาพ)"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Consent */}
        <div className="mt-4 space-y-3 rounded-[6px] border border-[#e5e7eb] bg-white px-4 py-3.5">
          <Checkbox
            checked={consent}
            onChange={setConsent}
            label="ข้าพเจ้ายินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA Consent)"
            description="ข้าพเจ้าได้รับทราบวัตถุประสงค์ในการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล และได้อ่านนโยบายความเป็นส่วนตัวของบุคลากรกีฬาแห่งประเทศไทยแล้ว"
          />
          <Checkbox
            checked={confirmed}
            onChange={setConfirmed}
            label="ข้าพเจ้าขอรับรองว่า ข้อความดังกล่าวข้างต้นเป็นจริงทุกประการ"
          />
        </div>

        {/* Actions */}
        {formError && (
          <p
            role="alert"
            className="mt-3 rounded-[5px] border border-[#f0b5b8] bg-[#fff5f5] px-3 py-2 text-[11.5px] text-[#9e2a30]"
          >
            {formError}
          </p>
        )}

        <form
          className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
          onSubmit={handleSubmit}
        >
          <Link
            href={`/?course=${course.id}`}
            className="inline-flex h-[34px] items-center justify-center rounded bg-[#d1d5db] px-5 text-[13px] font-semibold text-[#4b5563] transition-colors hover:bg-[#c3c9d1]"
          >
            ย้อนกลับไปหน้าแก้ไข
          </Link>
          <Button
            type="submit"
            variant="danger"
            isDisabled={submitting || isCourseFull}
            className="h-[34px] rounded px-5 text-[13px] font-semibold"
          >
            {submitting ? "กำลังบันทึก..." : "ส่งข้อมูลการสมัคร →"}
          </Button>
        </form>
      </main>

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
