"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { AiVerdictBadge } from "@/components/admin/ai-verdict-badge";
import { DocumentPreviewDialog } from "@/components/admin/document-preview-dialog";
import { DeleteApplicantDialog } from "@/components/admin/delete-applicant-dialog";
import {
  ReviewDecisionDialog,
  type ReviewDecision,
} from "@/components/admin/review-decision-dialog";
import { StatusBadge } from "@/components/admin/status-badge";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { CopyButton } from "@/components/ui/copy-button";
import {
  addApplicationNote,
  formatThaiDate,
  formatThaiDateTime,
  getDocumentLabel,
  promoteReserveToApproved,
  reviewApplication,
  useApplication,
  useApplications,
  type ApplicantDocument,
} from "@/lib/applications-store";
import { adminUser } from "@/lib/admin-data";
import { getDocumentFromStorage } from "@/lib/document-storage";
import { resolveSupabaseDocumentUrl } from "@/lib/supabase/sync";
import { useAlumniStore, addTrainee } from "@/lib/alumni-store";
import { useCourses } from "@/lib/courses-store";
import { TARGET_GROUPS, getTargetGroupKey } from "@/lib/courses";
import { auditApplicantDocuments } from "@/lib/document-checklist";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const aiPriority = { fail: 0, review: 1, pass: 2 } as const;

const aiToneStyles = {
  pass: {
    wrapper: "border-[#9bcfb0] bg-[#f0fbf4]",
    label: "text-[#176c3a]",
    icon: "bg-[#dff5e6] text-[#176c3a]",
  },
  review: {
    wrapper: "border-[#e4c58d] bg-[#fffaf0]",
    label: "text-[#9a5c00]",
    icon: "bg-[#fce7ca] text-[#9a5c00]",
  },
  fail: {
    wrapper: "border-[#d8a0a3] bg-[#fff5f5]",
    label: "text-[#9e2a30]",
    icon: "bg-[#fce8e9] text-[#9e2a30]",
  },
} as const;

function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#eef0f3] pb-3">
      <div>
        <h2 className="text-[14px] font-semibold text-[#111827]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#6b7280]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium text-[#6b7280]">{label}</dt>
      <dd className="mt-0.5 break-words text-[12px] font-medium leading-relaxed text-[#111827]">
        {value}
      </dd>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="11" height="12" rx="2" strokeWidth="1.7" />
      <path
        strokeLinecap="round"
        strokeWidth="1.7"
        d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v9a2 2 0 002 2h2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        d="M5 12.5l4.2 4.2L19 7"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeWidth="2.2"
        d="M6 6l12 12M18 6L6 18"
      />
    </svg>
  );
}

function TrashIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" strokeWidth="1.7" />
      <path
        strokeLinecap="round"
        strokeWidth="1.7"
        d="M12 7.5V12l3 2"
      />
    </svg>
  );
}

const quickNoteTemplates = [
  "เอกสารครบถ้วนสมบูรณ์ ตรงตามเกณฑ์",
  "หนังสือนำส่งไม่ระบุวันที่ หรือตราประทับไม่ชัดเจน",
  "รูปถ่ายไม่ถูกต้องตามระเบียบ",
  "โทรประสานงานแจ้งผู้สมัครเรียบร้อยแล้ว",
  "คุณสมบัติตรงตามเกณฑ์การพิจารณา",
];

export function ApplicantDetail({
  refId,
  mode,
}: {
  refId: string;
  mode: "review" | "list";
}) {
  const applicant = useApplication(refId);
  const { applications } = useApplications();
  const { courses } = useCourses();
  const router = useRouter();
  const mounted = useMounted();
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<ApplicantDocument | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  // Queue navigation in review mode
  const pendingQueue = useMemo(
    () =>
      applications
        .filter((item) => item.status === "pending")
        .sort((a, b) => {
          const priority = aiPriority[a.ai.tone] - aiPriority[b.ai.tone];
          if (priority !== 0) return priority;
          return (
            new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
          );
        }),
    [applications]
  );

  const currentIndex = useMemo(
    () => pendingQueue.findIndex((a) => a.ref === applicant?.ref),
    [pendingQueue, applicant?.ref]
  );
  const prevApplicant = currentIndex > 0 ? pendingQueue[currentIndex - 1] : null;
  const nextApplicant =
    currentIndex >= 0 && currentIndex < pendingQueue.length - 1
      ? pendingQueue[currentIndex + 1]
      : null;

  // Course & Target Group details
  const currentCourse = useMemo(
    () => courses.find((c) => c.id === applicant?.courseId),
    [courses, applicant?.courseId]
  );

  const docAudit = useMemo(
    () => auditApplicantDocuments(applicant, currentCourse),
    [applicant, currentCourse]
  );

  const targetGroupKey = useMemo(
    () => getTargetGroupKey(applicant?.affiliation),
    [applicant?.affiliation]
  );

  const targetGroupObj = useMemo(
    () => TARGET_GROUPS.find((g) => g.key === targetGroupKey),
    [targetGroupKey]
  );
  const targetGroupName = targetGroupObj?.label ?? "หน่วยงานทั่วไป";

  const quotaAllocated = currentCourse?.targetQuotas?.[targetGroupKey] ?? 0;
  const approvedInGroup = useMemo(() => {
    if (!applicant) return 0;
    return applications.filter(
      (a) =>
        a.courseId === applicant.courseId &&
        a.status === "approved" &&
        getTargetGroupKey(a.affiliation) === targetGroupKey
    ).length;
  }, [applications, applicant, targetGroupKey]);

  const totalApprovedInCourse = useMemo(() => {
    if (!applicant) return 0;
    return applications.filter(
      (a) => a.courseId === applicant.courseId && a.status === "approved"
    ).length;
  }, [applications, applicant]);

  const photoDoc =
    applicant?.documents?.find(
      (d) => d.kind === "photo" && d.dataUrl?.startsWith("data:")
    ) ??
    applicant?.documents?.find((d) => d.kind === "photo" && Boolean(d.dataUrl)) ??
    applicant?.documents?.find((d) => d.kind === "photo");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!photoDoc) {
      setPhotoUrl(null);
      return;
    }
    if (photoDoc.dataUrl?.startsWith("data:")) {
      setPhotoUrl(photoDoc.dataUrl);
      return;
    }
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(`sat-doc-${photoDoc.id}`);
      if (cached) {
        setPhotoUrl(cached);
        return;
      }
    }
    (async () => {
      if (photoDoc.id) {
        const localDoc = await getDocumentFromStorage(photoDoc.id, photoDoc.name);
        if (active && localDoc?.dataUrl) {
          setPhotoUrl(localDoc.dataUrl);
          return;
        }
      }
      if (photoDoc.dataUrl) {
        const resolved = await resolveSupabaseDocumentUrl(photoDoc.dataUrl);
        if (active && resolved) {
          setPhotoUrl(resolved);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [photoDoc?.id, photoDoc?.name, photoDoc?.dataUrl]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!applicant) {
    if (!mounted) {
      return (
        <div className="mx-auto w-full max-w-[1220px] space-y-3">
          <div className="h-24 animate-pulse rounded-lg border border-[#e3e6ea] bg-white" />
          <div className="h-72 animate-pulse rounded-lg border border-[#e3e6ea] bg-white" />
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-[1220px]">
        <div className="rounded-lg border border-[#e3e6ea] bg-white px-5 py-12 text-center">
          <p className="text-[15px] font-semibold text-[#111827]">
            ไม่พบข้อมูลผู้สมัคร
          </p>
          <p className="mt-1 text-[12px] text-[#6b7280]">
            เลขที่อ้างอิง {refId} อาจไม่ถูกต้องหรือถูกลบออกจากระบบ
          </p>
          <Link
            href={
              mode === "review" ? "/admin/review" : "/admin/applicants"
            }
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-[#1e3a8a] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#1e40af]"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            กลับไปหน้ารายการ
          </Link>
        </div>
      </div>
    );
  }

  const styles = aiToneStyles[applicant.ai.tone];
  const backHref =
    mode === "review" ? "/admin/review" : "/admin/applicants";
  const backLabel =
    mode === "review" ? "กลับไปคิวตรวจสอบ" : "กลับไปรายชื่อผู้สมัคร";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(applicant.ref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("ไม่สามารถคัดลอกได้ กรุณาเลือกข้อความด้วยตนเอง");
    }
  };

  const handleDecision = (reason: string) => {
    if (!decision) return;
    reviewApplication(applicant.ref, decision, reason, adminUser.name);
    setNotice(
      decision === "approved"
        ? "อนุมัติผู้สมัครเรียบร้อยแล้ว"
        : decision === "reserve"
          ? "จัดเข้าบัญชีรายชื่อสำรองเรียบร้อยแล้ว"
          : decision === "action_required"
            ? "ส่งคำขอเอกสารเพิ่มเติมให้ผู้สมัครเรียบร้อยแล้ว"
            : "บันทึกผลไม่อนุมัติเรียบร้อยแล้ว"
    );
    setDecision(null);
  };

  const handlePromote = () => {
    if (!applicant) return;
    promoteReserveToApproved(applicant.ref, adminUser.name);
    setNotice(`เลื่อนคุณสมบัติ ${applicant.name} จากรายชื่อสำรองเป็นตัวจริงเรียบร้อยแล้ว`);
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    addApplicationNote(applicant.ref, note, adminUser.name);
    setNote("");
    setNotice("เพิ่มหมายเหตุเรียบร้อยแล้ว");
  };

  const { trainees } = useAlumniStore();
  const isAlreadyAlumni = useMemo(() => {
    if (!applicant) return false;
    return trainees.some(
      (t) =>
        (t.idCard === applicant.idCard || t.name === applicant.name) &&
        t.courseTitle === applicant.courseTitle
    );
  }, [trainees, applicant]);

  const handlePromoteToAlumni = () => {
    if (!applicant) return;
    if (isAlreadyAlumni) {
      setNotice(`"${applicant.name}" ได้รับการบันทึกเข้าสู่ทำเนียบบุคลากรในหลักสูตรนี้เรียบร้อยแล้ว`);
      return;
    }
    const currentYearBE = new Date().getFullYear() + 543;
    const certCode = `SAT-${currentYearBE}-${applicant.ref.replace(/\D/g, "").slice(-4) || Math.floor(1000 + Math.random() * 9000)}`;

    const match = applicant.name.match(
      /^(นาย|นางสาว|นาง|ดร\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|พ\.ต\.อ\.|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.|ว่าที่ ร\.ต\.|ว่าที่ร้อยตรี)\s*(.*)$/
    );
    const detectedPrefix = match ? match[1] : "";
    const nameWithoutPrefix = match ? match[2] : applicant.name;
    const nameParts = nameWithoutPrefix.trim().split(/\s+/);
    const firstName = nameParts[0] || applicant.name;
    const lastName = nameParts.slice(1).join(" ") || "";

    const createdTrainee = addTrainee({
      name: applicant.name,
      prefix: detectedPrefix,
      firstName,
      lastName,
      idCard: applicant.idCard,
      phone: applicant.phone,
      email: applicant.email,
      affiliation: applicant.affiliation || "การกีฬาแห่งประเทศไทย",
      affiliationGroup: applicant.affiliation.includes("สมาคมกีฬาแห่งประเทศไทย")
        ? "สมาคมกีฬาแห่งประเทศไทย"
        : applicant.affiliation.includes("จังหวัด")
        ? "สมาคมกีฬาแห่งจังหวัด"
        : applicant.affiliation.includes("กกท") || applicant.affiliation.includes("การกีฬาแห่งประเทศไทย")
        ? "การกีฬาแห่งประเทศไทย"
        : "หน่วยงานภายนอก",
      sportsType: "ทั่วไป",
      yearBE: currentYearBE,
      courseId: applicant.courseId,
      courseTitle: applicant.courseTitle || applicant.course,
      courseCategory: (applicant.courseTitle || applicant.course).includes("ผู้บริหาร") ? "ผู้บริหารกีฬา" : "ผู้ฝึกสอนกีฬา",
      batch: `รุ่นปี พ.ศ. ${currentYearBE}`,
      certNo: certCode,
      passedDate: new Date().toISOString().split("T")[0],
      status: "active",
    });

    const isExistingPersonnel = trainees.some(
      (t) =>
        t.personnelId === createdTrainee.personnelId &&
        (t.idCard === applicant.idCard || t.name === applicant.name)
    );

    setNotice(
      isExistingPersonnel
        ? `🎉 ออกวุฒิบัตรเลขที่ ${certCode} และผูกเข้ากับรหัสบุคลากรเดิม "${createdTrainee.personnelId}" ของ "${applicant.name}" สำเร็จ!`
        : `🎉 ออกวุฒิบัตรเลขที่ ${certCode} และสร้างรหัสบุคลากรใหม่ "${createdTrainee.personnelId}" ให้กับ "${applicant.name}" เข้าสู่ทำเนียบสำเร็จ!`
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1220px] pb-24 lg:pb-0">
      {/* Top Bar with Queue Navigation */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={backHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-[#d1d5db] bg-white px-2.5 text-[11px] font-medium text-[#374151] transition-colors hover:bg-[#f8fafc]"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </Link>

          {/* Queue Navigation Buttons */}
          {mode === "review" && pendingQueue.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-8 items-center rounded-[5px] bg-[#e0e7ff] px-2.5 text-[10.5px] font-bold text-[#3730a3]">
                คิวที่ {currentIndex >= 0 ? currentIndex + 1 : "-"} จาก {pendingQueue.length}
              </span>
              {prevApplicant ? (
                <Link
                  href={`/admin/applicants/${encodeURIComponent(prevApplicant.ref)}?mode=review`}
                  className="inline-flex h-8 items-center gap-1 rounded-[5px] border border-[#cbd5e1] bg-white px-2.5 text-[11px] font-semibold text-[#1e3a8a] shadow-2xs transition hover:bg-[#eff6ff]"
                  title={`ตรวจคนก่อนหน้า: ${prevApplicant.name}`}
                >
                  <span>← คนก่อนหน้า</span>
                </Link>
              ) : (
                <span className="inline-flex h-8 cursor-not-allowed items-center rounded-[5px] border border-[#e2e8f0] bg-[#f8fafc] px-2.5 text-[11px] font-medium text-[#94a3b8]">
                  ← คนก่อนหน้า
                </span>
              )}

              {nextApplicant ? (
                <Link
                  href={`/admin/applicants/${encodeURIComponent(nextApplicant.ref)}?mode=review`}
                  className="inline-flex h-8 items-center gap-1 rounded-[5px] border border-[#cbd5e1] bg-white px-2.5 text-[11px] font-semibold text-[#1e3a8a] shadow-2xs transition hover:bg-[#eff6ff]"
                  title={`ตรวจคนถัดไป: ${nextApplicant.name}`}
                >
                  <span>คนถัดไป →</span>
                </Link>
              ) : (
                <span className="inline-flex h-8 cursor-not-allowed items-center rounded-[5px] border border-[#e2e8f0] bg-[#f8fafc] px-2.5 text-[11px] font-medium text-[#94a3b8]">
                  คนถัดไป →
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/status?id=${applicant.idCard}`}
            className="inline-flex h-8 items-center rounded-[5px] border border-[#d1d5db] bg-white px-3 text-[11px] font-medium text-[#374151] transition-colors hover:bg-[#f8fafc]"
          >
            ดูมุมมองผู้สมัคร
          </Link>
          <a
            href={`/print/receipt?ref=${encodeURIComponent(applicant.ref)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center rounded-[5px] border border-[#1e3a8a] bg-white px-3 text-[11px] font-medium text-[#1e3a8a] transition-colors hover:bg-[#eff6ff]"
          >
            พิมพ์ใบสมัคร (A4)
          </a>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex h-8 items-center gap-1 rounded-[5px] border border-[#fca5a5] bg-[#fff5f5] px-2.5 text-[11px] font-semibold text-[#dc2626] transition-colors hover:bg-[#fee2e2]"
            title="ลบใบสมัครนี้ออกจากระบบ"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            <span>ลบใบสมัคร</span>
          </button>
          {applicant.status === "approved" && (
            <>
              <a
                href={`/print/pass?ref=${encodeURIComponent(applicant.ref)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center rounded-[5px] bg-[#059669] px-3 text-[11px] font-medium text-white transition-colors hover:bg-[#047857]"
              >
                พิมพ์บัตรเข้าร่วม (Pass)
              </a>
              <button
                type="button"
                onClick={handlePromoteToAlumni}
                disabled={isAlreadyAlumni}
                className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-[11px] font-bold shadow-xs transition-colors cursor-pointer ${
                  isAlreadyAlumni
                    ? "bg-purple-100 text-purple-800 border border-purple-300 cursor-default"
                    : "bg-gradient-to-r from-purple-700 to-indigo-800 text-white hover:from-purple-800 hover:to-indigo-900"
                }`}
                title="ออกวุฒิบัตรและโอนย้ายเข้าทำเนียบบุคลากรกีฬา (Alumni Registry)"
              >
                <span>{isAlreadyAlumni ? "✓ อยู่ในทำเนียบแล้ว" : "🎓 ออกวุฒิบัตร & โอนเข้าทำเนียบ"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="mb-2.5 rounded-[5px] border border-[#b9dbc5] bg-[#eef9f1] px-3 py-2 text-[11.5px] text-[#176c3a]"
        >
          {notice}
        </div>
      )}

      {/* Main Profile Header Card (Cleaned of duplicated action buttons) */}
      <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              photoUrl ||
              (photoDoc?.dataUrl?.startsWith("data:") ? photoDoc.dataUrl : null) ||
              "/assets/avatar-placeholder.svg"
            }
            alt={`รูปถ่าย ${applicant.name}`}
            className="h-[76px] w-16 shrink-0 rounded-[5px] border border-[#d1d5db] object-cover shadow-2xs"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-semibold leading-tight text-[#111827]">
                {applicant.name}
              </h1>
              <StatusBadge status={applicant.status} reserveOrder={applicant.reserveOrder} />
              <span className="inline-flex items-center rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10px] font-semibold text-[#475569]">
                กลุ่ม: {targetGroupName}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#4b5563]">
              {applicant.courseTitle}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-[#6b7280]">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 font-semibold text-[#1e3a8a] hover:underline"
              >
                {applicant.ref}
                <CopyIcon />
                {copied && <span className="text-[#176c3a]">คัดลอกแล้ว</span>}
              </button>
              <span className="hidden text-[#d1d5db] sm:inline">|</span>
              <span>สมัครเมื่อ {formatThaiDateTime(applicant.submittedAt)}</span>
              <span className="hidden text-[#d1d5db] sm:inline">|</span>
              <span>อัปเดตล่าสุด {formatThaiDateTime(applicant.updatedAt)}</span>
            </div>
          </div>

          {/* Right side of profile header card: Status info & anchor link */}
          <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
            {applicant.status === "reserve" && (
              <button
                type="button"
                onClick={handlePromote}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-[5px] bg-[#1e3a8a] px-3 text-[11px] font-semibold text-white shadow-xs transition hover:bg-[#1e40af]"
              >
                เลื่อนเป็นตัวจริง
              </button>
            )}
            <a
              href="#decision-panel"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1e3a8a] hover:underline"
            >
              <span>ไปยังส่วนลงผลการตรวจสอบ ↓</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left Column: Details, Requirements, Documents & Audit Trail */}
        <div className="min-w-0 space-y-3">
          {/* Section 1: ข้อมูลผู้สมัคร */}
          <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <SectionTitle title="ข้อมูลผู้สมัคร" />
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="ชื่อ-นามสกุล" value={applicant.name} />
              <Field
                label="เลขบัตรประจำตัวประชาชน"
                value={
                  <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] font-semibold text-[#1e3a8a]">
                    <span>
                      {applicant.idCard.replace(
                        /(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/,
                        "$1-$2-$3-$4-$5"
                      )}
                    </span>
                    <CopyButton
                      text={applicant.idCard}
                      label="คัดลอก"
                      size="xs"
                      variant="badge"
                    />
                  </span>
                }
              />
              <Field label="โทรศัพท์" value={applicant.phone || "-"} />
              <Field label="อีเมล" value={applicant.email || "-"} />
              <Field label="สังกัด" value={applicant.affiliation} />
              <Field label="ตำแหน่ง" value={applicant.position} />
              <Field
                label="กลุ่มเป้าหมายโควตา"
                value={
                  <span className="font-semibold text-[#1e3a8a]">
                    {targetGroupName}
                  </span>
                }
              />
              <Field label="หลักสูตรที่สมัคร" value={applicant.courseTitle} />
              <Field
                label="วันที่สมัคร"
                value={formatThaiDateTime(applicant.submittedAt)}
              />
            </dl>
          </section>

          {/* Section 2: เกณฑ์คุณสมบัติของผู้สมัครตามหลักสูตร */}
          {currentCourse?.qualifications && currentCourse.qualifications.length > 0 && (
            <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
              <SectionTitle
                title="เกณฑ์คุณสมบัติของผู้สมัครตามหลักสูตร"
                description="รายการคุณสมบัติที่กำหนดไว้ในหลักสูตรนี้ เพื่อใช้ตรวจสอบเทียบกับข้อมูลผู้สมัคร"
              />
              <div className="mt-3 space-y-2">
                {currentCourse.qualifications.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] p-2.5 text-[11.5px] leading-relaxed text-[#334155]"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-[9.5px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{q}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 3: เอกสารประกอบการสมัคร */}
          <section
            id="documents"
            className="scroll-mt-16 rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]"
          >
            <SectionTitle
              title="เอกสารประกอบการสมัคร & การตรวจสอบตามเกณฑ์"
              description={`แนบมา ${applicant.documents.length} รายการ · เกณฑ์บังคับ ${docAudit.attachedRequiredCount}/${docAudit.requiredCount} รายการ`}
            />

            {/* Audit Status Banner */}
            {docAudit.status === "complete" && (
              <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-[#166534]">
                <svg className="h-5 w-5 shrink-0 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12.5px] font-semibold text-[#166534]">
                      เอกสารแนบครบถ้วนตามเกณฑ์บังคับของหลักสูตร ({docAudit.attachedRequiredCount}/{docAudit.requiredCount} รายการ)
                    </p>
                    <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#15803d]">
                      ✓ เอกสารครบถ้วน
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#15803d]">
                    ผู้สมัครแนบเอกสารบังคับครบตามเกณฑ์ที่หลักสูตรกำหนดแล้ว เจ้าหน้าที่สามารถเปิดดูไฟล์จริงเพื่อตรวจความถูกต้อง
                  </p>
                </div>
              </div>
            )}

            {docAudit.status === "incomplete" && (
              <div className="mt-3 flex flex-col gap-2.5 rounded-lg border border-[#fed7aa] bg-[#fffbeb] p-3 sm:flex-row sm:items-center sm:justify-between text-[#9a3412]">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <svg className="h-5 w-5 shrink-0 text-[#ea580c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12.5px] font-semibold text-[#9a3412]">
                        เอกสารแนบยังไม่ครบตามเกณฑ์บังคับ (แนบแล้ว {docAudit.attachedRequiredCount}/{docAudit.requiredCount} รายการ)
                      </p>
                      <span className="rounded-full bg-[#ffedd5] px-2 py-0.5 text-[10px] font-bold text-[#c2410c]">
                        ขาด {docAudit.missingRequiredCount} รายการ
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#c2410c]">
                      ยังขาดเอกสารบังคับ: <span className="font-semibold">{docAudit.missingRequiredLabels.join(", ")}</span>
                    </p>
                  </div>
                </div>
                {applicant.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => setDecision("action_required")}
                    className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#ea580c] px-3.5 text-[11px] font-semibold text-white shadow-xs transition hover:bg-[#c2410c]"
                  >
                    <span>ขอเอกสารเพิ่ม</span>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Course Document Checklist Breakdown */}
            {docAudit.items.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-lg border border-[#e2e8f0]">
                <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-[11px] font-semibold text-[#334155]">
                  รายการตรวจสอบเทียบเกณฑ์ข้อกำหนดของหลักสูตร
                </div>
                <div className="divide-y divide-[#f1f5f9]">
                  {docAudit.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:justify-between text-[11.5px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                            item.isAttached
                              ? "bg-[#dcfce7] text-[#15803d]"
                              : item.required
                              ? "bg-[#fee2e2] text-[#dc2626]"
                              : "bg-[#f1f5f9] text-[#64748b]"
                          }`}
                        >
                          {item.isAttached ? "✓" : item.required ? "✕" : "–"}
                        </span>
                        <span className="font-medium text-[#1e293b]">{item.label}</span>
                        {item.required ? (
                          <span className="rounded bg-[#fee2e2] px-1.5 py-0.2 text-[9px] font-semibold text-[#dc2626]">
                            บังคับ
                          </span>
                        ) : (
                          <span className="rounded bg-[#f1f5f9] px-1.5 py-0.2 text-[9px] text-[#64748b]">
                            ทางเลือก
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pl-7 sm:pl-0">
                        {item.isAttached && item.attachedDoc ? (
                          <>
                            <span className="truncate text-[10.5px] text-[#64748b]" title={item.attachedDoc.name}>
                              {item.attachedDoc.name} ({item.attachedDoc.size})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (item.attachedDoc) setSelectedDocument(item.attachedDoc);
                              }}
                              className="inline-flex h-6 items-center gap-1 rounded border border-[#cbd5e1] bg-white px-2 text-[10px] font-medium text-[#1e3a8a] hover:bg-[#f1f5f9]"
                            >
                              เปิดดู
                            </button>
                          </>
                        ) : (
                          <span
                            className={`text-[10.5px] font-medium ${
                              item.required ? "text-[#dc2626]" : "text-[#94a3b8]"
                            }`}
                          >
                            {item.required ? "ยังไม่พบเอกสารแนบ" : "ไม่ได้แนบ (ไม่บังคับ)"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All uploaded files grid */}
            <div className="mt-4">
              <h3 className="mb-2 text-[12px] font-semibold text-[#475569]">
                ไฟล์แนบทั้งหมดที่บันทึกในระบบ ({applicant.documents.length} รายการ)
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {applicant.documents.map((file) => {
                  const isPhoto = file.kind === "photo";
                  const isPdf =
                    file.name.toLowerCase().endsWith(".pdf") ||
                    file.dataUrl?.startsWith("data:application/pdf");
                  const hasRealFile = Boolean(file.dataUrl);

                  return (
                    <div
                      key={file.id}
                      className="flex flex-col justify-between rounded-[7px] border border-[#e2e8f0] bg-[#fbfcfd] p-3 transition-colors hover:border-[#93c5fd] hover:bg-[#f8fbff]"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] ${
                            isPhoto
                              ? "bg-[#ede9fe] text-[#6d28d9]"
                              : isPdf
                              ? "bg-[#fee2e2] text-[#dc2626]"
                              : "bg-[#e0f2fe] text-[#0284c7]"
                          }`}
                        >
                          {isPhoto ? (
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[12px] font-semibold text-[#111827]">
                              {getDocumentLabel(file.kind)}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-1.5 py-0.2 text-[9px] font-medium ${
                                hasRealFile
                                  ? "bg-[#dcfce7] text-[#15803d]"
                                  : "bg-[#fef3c7] text-[#b45309]"
                              }`}
                            >
                              {hasRealFile ? "ไฟล์จริง" : "ตัวอย่าง"}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-[#64748b]" title={file.name}>
                            {file.name} · {file.size}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-[#f1f5f9] pt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDocument(file)}
                          className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[#cbd5e1] bg-white px-2.5 text-[10.5px] font-medium text-[#1e3a8a] transition hover:bg-[#f1f5f9]"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 10C3.732 7.943 7.523 5 10 5c2.478 0 6.268 2.943 7.542 5-1.274 2.057-5.064 5-7.542 5-2.477 0-6.268-2.943-7.542-5z" />
                          </svg>
                          <span>เปิดดูไฟล์</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {applicant.documents.length === 0 && (
                  <p className="rounded-[6px] border border-dashed border-[#d1d5db] px-3 py-6 text-center text-[11px] text-[#6b7280] sm:col-span-2">
                    ไม่มีเอกสารแนบ
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: ประวัติการดำเนินการ & หมายเหตุ */}
          <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <SectionTitle
              title="ประวัติการดำเนินการ"
              description="บันทึกการตรวจสอบและหมายเหตุภายใน"
            />
            <div className="mt-3">
              <label
                htmlFor="applicant-note"
                className="text-[11px] font-medium text-[#374151]"
              >
                เพิ่มหมายเหตุ
              </label>

              {/* Quick Note Tag Buttons */}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-[#64748b]">ข้อความด่วน:</span>
                {quickNoteTemplates.map((text, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setNote((prev) => (prev ? `${prev} · ${text}` : text))
                    }
                    className="rounded-[4px] border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 text-[9.5px] text-[#475569] transition hover:border-[#93c5fd] hover:bg-[#eff6ff] hover:text-[#1e3a8a]"
                  >
                    + {text}
                  </button>
                ))}
              </div>

              <textarea
                id="applicant-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="เช่น โทรยืนยันเอกสารกับผู้สมัครแล้ว"
                className="mt-2 block w-full resize-y rounded-[6px] border border-[#d1d5db] bg-white px-3 py-2 text-[12px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!note.trim()}
                  className="inline-flex h-9 items-center justify-center rounded-[6px] bg-[#1e3a8a] px-3.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  บันทึกหมายเหตุ
                </button>
              </div>
            </div>

            <ol className="mt-3 space-y-0">
              {[...applicant.notes].reverse().map((entry, index, list) => (
                <li key={entry.id} className="relative flex gap-2.5 pb-4 last:pb-0">
                  {index < list.length - 1 && (
                    <span className="absolute bottom-0 left-[7px] top-4 w-px bg-[#e5e7eb]" />
                  )}
                  <span
                    className={`relative mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-white ${
                      entry.kind === "approved"
                        ? "bg-[#2f9e57]"
                        : entry.kind === "rejected"
                          ? "bg-[#cf3d45]"
                          : entry.kind === "created"
                            ? "bg-[#2386d3]"
                            : "bg-[#9ca3af]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] leading-relaxed text-[#1f2937]">
                      {entry.text}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-[#6b7280]">
                      {entry.author} · {formatThaiDateTime(entry.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right Column: AI Verdict, Decision Panel & Quotas Status */}
        <div className="min-w-0 space-y-3">
          {/* Section 1: ผลประเมินโดย AI */}
          <section
            className={`rounded-lg border p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)] ${styles.wrapper}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${styles.icon}`}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeWidth="1.8" d="M12 3v3" />
                  <rect
                    x="4.5"
                    y="6"
                    width="15"
                    height="12"
                    rx="3"
                    strokeWidth="1.7"
                  />
                  <path
                    strokeLinecap="round"
                    strokeWidth="1.7"
                    d="M2 10.5v3M22 10.5v3M9.5 15h5"
                  />
                  <circle cx="9" cy="11.5" r="1" fill="currentColor" />
                  <circle cx="15" cy="11.5" r="1" fill="currentColor" />
                </svg>
              </span>
              <h2 className="text-[13px] font-semibold text-[#111827]">
                ผลประเมินโดย AI
              </h2>
            </div>
            <div className="mt-3">
              <AiVerdictBadge verdict={applicant.ai} size="md" />
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#4b5563]">
              ผลประเมินนี้เป็นข้อมูลประกอบการตัดสินใจ
              เจ้าหน้าที่ต้องตรวจสอบเอกสารและคุณสมบัติจริงก่อนยืนยันผล
            </p>
          </section>

          {/* Section 2: ผลการตรวจสอบ (Primary Decision Panel) */}
          <section
            id="decision-panel"
            className="scroll-mt-16 rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]"
          >
            <SectionTitle
              title="ผลการตรวจสอบคุณสมบัติ"
              description="การเปลี่ยนแปลงจะมีผลกับหน้าสถานะและใบรับสมัครทันที"
            />

            {applicant.status === "pending" ? (
              <div className="mt-3 rounded-[6px] border border-[#e4c58d] bg-[#fffaf0] px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#9a5c00]">
                  <ClockIcon />
                  รอเจ้าหน้าที่ตรวจสอบ
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-[#6b5b3e]">
                  ตรวจสอบเอกสารและคุณสมบัติ แล้วกดเลือกผลการพิจารณาด้านล่าง
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] text-[#6b7280]">
                    ผลปัจจุบัน
                  </span>
                  <StatusBadge status={applicant.status} />
                </div>
                <dl className="space-y-1.5 text-[10.5px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#6b7280]">ผู้ตรวจสอบ</dt>
                    <dd className="text-right font-medium text-[#111827]">
                      {applicant.reviewedBy ?? "-"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#6b7280]">วันที่ตรวจสอบ</dt>
                    <dd className="text-right font-medium text-[#111827]">
                      {applicant.reviewedAt
                        ? formatThaiDateTime(applicant.reviewedAt)
                        : "-"}
                    </dd>
                  </div>
                </dl>
                {applicant.reviewReason && (
                  <p className="rounded-[5px] bg-[#fff5f5] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#9e2a30]">
                    เหตุผล: {applicant.reviewReason}
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision("approved")}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-[6px] bg-[#078A43] px-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#067537]"
              >
                <CheckIcon />
                อนุมัติ
              </button>
              <button
                type="button"
                onClick={() => setDecision("reserve")}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-[6px] border border-[#93c5fd] bg-[#eff6ff] px-2 text-[11px] font-semibold text-[#1e40af] transition-colors hover:bg-[#dbeafe]"
              >
                สำรอง
              </button>
              <button
                type="button"
                onClick={() => setDecision("action_required")}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-[6px] border border-[#fed7aa] bg-[#fff7ed] px-2 text-[11px] font-semibold text-[#c2410c] transition-colors hover:bg-[#ffedd5]"
              >
                ขอเอกสารเพิ่ม
              </button>
              <button
                type="button"
                onClick={() => setDecision("rejected")}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-[6px] border border-[#d8a0a3] bg-[#fce8e9] px-2 text-[11px] font-semibold text-[#9e2a30] transition-colors hover:bg-[#f8d9da]"
              >
                <XIcon />
                ไม่อนุมัติ
              </button>
            </div>

            <div className="mt-3 border-t border-[#f1f5f9] pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[6px] border border-[#fca5a5] bg-[#fff5f5] text-[11px] font-semibold text-[#b91c1c] transition-colors hover:bg-[#fee2e2]"
                title="ลบใบสมัครนี้ออกจากระบบ"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                <span>ลบใบสมัครนี้ออกจากระบบ</span>
              </button>
            </div>
          </section>

          {/* Section 3: ข้อมูลโควตาและสถานะที่นั่งหลักสูตร */}
          <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <h2 className="text-[12px] font-semibold text-[#111827]">
              สถานะโควตาและที่นั่งของหลักสูตร
            </h2>

            {/* Target Group Quota Tracking */}
            <div className="mt-3 rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] p-3 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#334155]">{targetGroupName}</span>
                <span className="font-bold text-[#1e3a8a]">
                  {approvedInGroup} / {quotaAllocated > 0 ? quotaAllocated : "-"} คน
                </span>
              </div>
              <p className="mt-0.5 text-[9.5px] text-[#64748b]">
                โควตาเฉพาะกลุ่มเป้าหมายของผู้สมัครรายนี้
              </p>

              {quotaAllocated > 0 && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      approvedInGroup >= quotaAllocated ? "bg-[#dc2626]" : "bg-[#1e3a8a]"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((approvedInGroup / quotaAllocated) * 100)
                      )}%`,
                    }}
                  />
                </div>
              )}

              {quotaAllocated > 0 && approvedInGroup >= quotaAllocated && (
                <p className="mt-2 rounded bg-[#fee2e2] px-2 py-1 text-[9.5px] font-medium text-[#b91c1c]">
                  ⚠️ โควตากลุ่มนี้เต็มแล้ว (แนะนำพิจารณาเข้าสู่บัญชีสำรอง)
                </p>
              )}
            </div>

            {/* Total Course Seats */}
            <dl className="mt-3 space-y-2 text-[10.5px]">
              <div className="flex justify-between gap-3 border-b border-[#f1f5f9] pb-1.5">
                <dt className="text-[#6b7280]">ที่นั่งรวมของหลักสูตร</dt>
                <dd className="font-semibold text-[#111827]">
                  อนุมัติแล้ว {totalApprovedInCourse} / {currentCourse?.capacity ?? 40} ที่นั่ง
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6b7280]">เลขที่อ้างอิง</dt>
                <dd className="font-semibold text-[#1e3a8a]">
                  {applicant.ref}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6b7280]">เลขใบรับสมัคร</dt>
                <dd className="text-right font-medium text-[#111827]">
                  {applicant.receiptNo}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6b7280]">วันที่ยื่นเอกสาร</dt>
                <dd className="text-right font-medium text-[#111827]">
                  {formatThaiDate(applicant.submittedAt)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dbe2ea] bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden print:hidden">
        <div className="flex gap-2">
          {applicant.status === "reserve" && (
            <button
              type="button"
              onClick={handlePromote}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[7px] bg-[#1e3a8a] text-[12px] font-semibold text-white"
            >
              เลื่อนตัวจริง
            </button>
          )}
          <button
            type="button"
            onClick={() => setDecision("approved")}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[7px] bg-[#078A43] text-[12px] font-semibold text-white"
          >
            <CheckIcon />
            อนุมัติ
          </button>
          <button
            type="button"
            onClick={() => setDecision("reserve")}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[7px] border border-[#93c5fd] bg-[#eff6ff] text-[12px] font-semibold text-[#1e40af]"
          >
            สำรอง
          </button>
          <button
            type="button"
            onClick={() => setDecision("action_required")}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[7px] border border-[#fed7aa] bg-[#fff7ed] text-[12px] font-semibold text-[#c2410c]"
          >
            ขอเอกสารเพิ่ม
          </button>
          <button
            type="button"
            onClick={() => setDecision("rejected")}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[7px] border border-[#d8a0a3] bg-[#fce8e9] text-[12px] font-semibold text-[#9e2a30]"
          >
            <XIcon />
            ไม่อนุมัติ
          </button>
        </div>
      </div>

      {/* Decision Dialog Modal */}
      {decision !== null && (
        <ReviewDecisionDialog
          key={`${applicant.ref}-${decision}`}
          open
          decision={decision}
          applicantName={applicant.name}
          defaultReason={
            decision === "action_required" && docAudit.missingRequiredLabels.length > 0
              ? `ขอความกรุณาแนบเอกสารเพิ่มเติม: ${docAudit.missingRequiredLabels.join(", ")}`
              : undefined
          }
          onClose={() => setDecision(null)}
          onConfirm={handleDecision}
        />
      )}

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        file={selectedDocument}
        applicant={applicant}
        onClose={() => setSelectedDocument(null)}
      />

      {/* Delete Applicant Dialog Modal */}
      {showDeleteModal && (
        <DeleteApplicantDialog
          open
          applicantRef={applicant.ref}
          applicantName={applicant.name}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => {
            setShowDeleteModal(false);
            router.push(backHref);
          }}
        />
      )}
    </div>
  );
}
