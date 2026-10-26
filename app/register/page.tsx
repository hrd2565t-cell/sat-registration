"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { getCourseById, getDefaultCourse } from "@/lib/courses";
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

const labelClass = "text-[12.5px] font-medium text-[#1f2937]";

const affiliations = [
  "สมาคมกีฬาแห่งประเทศไทย",
  "การกีฬาแห่งประเทศไทย",
  "สมาคมกีฬาจังหวัด",
  "อื่น ๆ",
];

import { saveDocumentToStorage } from "@/lib/document-storage";

function toDocument(
  kind: ApplicantDocumentKind,
  file: FileItem,
  index: number
): ApplicantDocument {
  const docId = `${kind}-${Date.now()}-${index}`;
  if (file.dataUrl) {
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
  const [name, setName] = useState("นาย สมชาย สิงห์");
  const [idCard, setIdCard] = useState("1100912345678");
  const [affiliation, setAffiliation] = useState(affiliations[0]);
  const [position, setPosition] = useState("ผู้ฝึกสอนชำนาญการ");
  const [phone, setPhone] = useState("080-267-5323");
  const [email, setEmail] = useState("emsak.info@sat.com");
  const [consent, setConsent] = useState(true);
  const [confirmed, setConfirmed] = useState(true);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [conflictModal, setConflictModal] =
    useState<RegistrationEligibility | null>(null);
  const [hasAutofilled, setHasAutofilled] = useState(false);

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
    if (digits.length === 13 && !hasAutofilled) {
      const prior = applications.find(
        (a) => a.idCard === digits && a.status !== "rejected"
      );
      if (prior) {
        if (prior.name) setName(prior.name);
        if (prior.phone) setPhone(prior.phone);
        if (prior.email) setEmail(prior.email);
        if (prior.affiliation) setAffiliation(prior.affiliation);
        if (prior.position) setPosition(prior.position);
        setHasAutofilled(true);
      }
    }
  }, [idCard, applications, hasAutofilled]);

  const [photoFiles, setPhotoFiles] = useState<FileItem[]>([
    { name: "แนบรูปถ่ายสำเร็จ.jpg", size: "1.1 MB" },
  ]);
  const [coverFiles, setCoverFiles] = useState<FileItem[]>([
    { name: "หนังสือนำส่งจากต้นสังกัด.pdf", size: "2.4 MB" },
  ]);
  const [certFiles, setCertFiles] = useState<FileItem[]>([
    { name: "หนังสือรับรอง.pdf", size: "1.8 MB" },
  ]);
  const [sakaFiles, setSakaFiles] = useState<FileItem[]>([]);

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
    if (idCard.replace(/\D/g, "").length !== 13) {
      setFormError("กรุณากรอกหมายเลขบัตรประจำตัวประชาชนให้ครบ 13 หลัก");
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
    if (photoFiles.length === 0 || coverFiles.length === 0) {
      setFormError("กรุณาแนบรูปถ่ายหน้าตรงและหนังสือนำส่งจากต้นสังกัด");
      return;
    }

    const documents: ApplicantDocument[] = [
      ...photoFiles.map((file, index) => toDocument("photo", file, index)),
      ...coverFiles.map((file, index) => toDocument("cover", file, index)),
      ...certFiles.map((file, index) =>
        toDocument("certificate", file, index)
      ),
      ...sakaFiles.map((file, index) => toDocument("saka", file, index)),
    ];

    setSubmitting(true);
    const record = createApplication({
      name,
      idCard,
      email,
      phone,
      affiliation,
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
                value={name}
                onChange={(event) => setName(event.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>
                  2. หมายเลขบัตรประจำตัวประชาชน (13 หลัก)
                </label>
                <IdCardInput value={idCard} onChange={setIdCard} />

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
                  3. สังกัด (ชื่อหน่วยงาน / ชื่อสมาคมกีฬา)
                </label>
                <div className="relative">
                  <select
                    id="affiliation"
                    value={affiliation}
                    onChange={(event) => setAffiliation(event.target.value)}
                    className="block h-9 w-full appearance-none rounded-[4px] border border-[#d1d5db] bg-white px-3 pr-8 text-[13px] text-[#1f2937] transition-all focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
                  >
                    {affiliations.map((option) => (
                      <option key={option} value={option}>
                        {option}
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

              <Input
                fullWidth
                label="4. ตำแหน่ง (หน่วยงาน / สมาคมกีฬา)"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
              />

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <Input
                  fullWidth
                  label="เบอร์โทรศัพท์"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                />
                <Input
                  fullWidth
                  label="E-mail"
                  type="email"
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
              <div>
                <p className={`mb-1.5 ${labelClass}`}>
                  1. รูปถ่ายหน้าตรง (สำหรับพิมพ์บัตรประจำตัว)
                </p>
                <div className="flex items-start gap-2.5">
                  <Avatar
                    src="/assets/avatar-placeholder.svg"
                    alt="รูปถ่ายผู้สมัคร"
                    size="portrait"
                  />
                  <div className="min-w-0 flex-1">
                    <FileUpload
                      files={photoFiles}
                      onAdd={(file) => setPhotoFiles([file])}
                      onRemove={() => setPhotoFiles([])}
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className={`mb-1.5 ${labelClass}`}>
                  2. หนังสือนำส่งจากต้นสังกัด / สมาคมกีฬา (บังคับ)
                </p>
                <FileUpload
                  files={coverFiles}
                  onAdd={(file) => setCoverFiles([file])}
                  onRemove={() => setCoverFiles([])}
                  emptyText="ยังไม่ได้แนบไฟล์ (คลิกเพื่อแนบหนังสือนำส่ง)"
                />
              </div>

              <div>
                <p className={`mb-1.5 ${labelClass}`}>
                  3. หนังสือรับรอง (เฉพาะบางหลักสูตร)
                </p>
                <FileUpload
                  files={certFiles}
                  onAdd={(file) => setCertFiles([file])}
                  onRemove={() => setCertFiles([])}
                  emptyText="ยังไม่ได้แนบไฟล์ (คลิกเพื่อแนบหนังสือรับรอง)"
                />
              </div>

              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className={labelClass}>
                    4. เอกสาร ส.ฬ.8 (แนบเฉพาะหลักสูตรที่กำหนด)
                  </p>
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
                </div>
                <FileUpload
                  files={sakaFiles}
                  onAdd={(file) => setSakaFiles([file])}
                  onRemove={() => setSakaFiles([])}
                  emptyText="ยังไม่ได้แนบไฟล์ (คลิกเพื่อแนบไฟล์ ส.ฬ.8)"
                />
              </div>
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
