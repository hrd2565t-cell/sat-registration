"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AiVerdictBadge } from "@/components/admin/ai-verdict-badge";
import { DocumentPreviewDialog } from "@/components/admin/document-preview-dialog";
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
  type ApplicantDocument,
} from "@/lib/applications-store";
import { adminUser } from "@/lib/admin-data";
import { getDocumentFromStorage } from "@/lib/document-storage";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

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

function DocumentIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinejoin="round"
        strokeWidth="1.7"
        d="M6 3.5h8l4 4v13H6z"
      />
      <path strokeLinejoin="round" strokeWidth="1.7" d="M14 3.5v4h4" />
      <path
        strokeLinecap="round"
        strokeWidth="1.7"
        d="M9 12h6M9 15.5h6"
      />
    </svg>
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

export function ApplicantDetail({
  refId,
  mode,
}: {
  refId: string;
  mode: "review" | "list";
}) {
  const applicant = useApplication(refId);
  const mounted = useMounted();
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [selectedDocument, setSelectedDocument] =
    useState<ApplicantDocument | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const photoDoc = applicant?.documents?.find((d) => d.kind === "photo");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoDoc) {
      setPhotoUrl(null);
      return;
    }
    if (photoDoc.dataUrl) {
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
    if (photoDoc.id) {
      getDocumentFromStorage(photoDoc.id).then((doc) => {
        if (doc?.dataUrl) {
          setPhotoUrl(doc.dataUrl);
        }
      });
    }
  }, [photoDoc?.id, photoDoc?.dataUrl]);

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

  return (
    <div className="mx-auto w-full max-w-[1220px] pb-24 lg:pb-0">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={backHref}
          className="inline-flex h-8 items-center gap-1.5 rounded-[5px] px-1 text-[11.5px] font-medium text-[#1e3a8a] transition-colors hover:text-[#1e40af]"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          {backLabel}
        </Link>

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
          {applicant.status === "approved" && (
            <a
              href={`/print/pass?ref=${encodeURIComponent(applicant.ref)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center rounded-[5px] bg-[#059669] px-3 text-[11px] font-medium text-white transition-colors hover:bg-[#047857]"
            >
              พิมพ์บัตรเข้าร่วม (Pass)
            </a>
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

      <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              photoUrl ||
              photoDoc?.dataUrl ||
              "/assets/avatar-placeholder.svg"
            }
            alt={`รูปถ่าย ${applicant.name}`}
            className="h-[76px] w-16 shrink-0 rounded-[5px] border border-[#d1d5db] object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-semibold leading-tight text-[#111827]">
                {applicant.name}
              </h1>
              <StatusBadge status={applicant.status} reserveOrder={applicant.reserveOrder} />
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

          <div className="hidden shrink-0 flex-wrap gap-2 sm:flex">
            {applicant.status === "reserve" && (
              <button
                type="button"
                onClick={handlePromote}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[6px] bg-[#1e3a8a] px-3.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1e40af] sm:h-9"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                เลื่อนเป็นตัวจริง
              </button>
            )}
            <button
              type="button"
              onClick={() => setDecision("approved")}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[6px] bg-[#078A43] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#067537] sm:h-9"
            >
              <CheckIcon />
              อนุมัติ
            </button>
            <button
              type="button"
              onClick={() => setDecision("reserve")}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[6px] border border-[#93c5fd] bg-[#eff6ff] px-3 text-[12px] font-semibold text-[#1e40af] transition-colors hover:bg-[#dbeafe] sm:h-9"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" d="M12 7v5l3 3" />
              </svg>
              บัญชีสำรอง
            </button>
            <button
              type="button"
              onClick={() => setDecision("action_required")}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[6px] border border-[#fed7aa] bg-[#fff7ed] px-3 text-[12px] font-semibold text-[#c2410c] transition-colors hover:bg-[#ffedd5] sm:h-9"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ขอเอกสารเพิ่ม
            </button>
            <button
              type="button"
              onClick={() => setDecision("rejected")}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[6px] border border-[#d8a0a3] bg-[#fce8e9] px-3 text-[12px] font-semibold text-[#9e2a30] transition-colors hover:bg-[#f8d9da] sm:h-9"
            >
              <XIcon />
              ไม่อนุมัติ
            </button>
          </div>
        </div>
      </section>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
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
              <Field label="โทรศัพท์" value={applicant.phone} />
              <Field label="อีเมล" value={applicant.email || "-"} />
              <Field label="สังกัด" value={applicant.affiliation} />
              <Field label="ตำแหน่ง" value={applicant.position} />
              <Field label="หลักสูตรที่สมัคร" value={applicant.courseTitle} />
              <Field
                label="วันที่สมัคร"
                value={formatThaiDateTime(applicant.submittedAt)}
              />
            </dl>
          </section>

          <section
            id="documents"
            className="scroll-mt-16 rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]"
          >
            <SectionTitle
              title="เอกสารประกอบการสมัคร"
              description={`แนบมา ${applicant.documents.length} รายการ`}
            />
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {applicant.documents.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedDocument(file)}
                  className="flex min-h-[60px] w-full items-center gap-2.5 rounded-[6px] border border-[#e5e7eb] bg-[#fbfcfd] p-2.5 text-left transition-colors hover:border-[#9db9de] hover:bg-[#f5f9ff]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-[#e8f1fc] text-[#1e3a8a]">
                    <DocumentIcon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium text-[#111827]">
                      {getDocumentLabel(file.kind)}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-[#6b7280]">
                      {file.name} · {file.size}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-[#1e3a8a]">
                    เปิดดู
                  </span>
                </button>
              ))}
              {applicant.documents.length === 0 && (
                <p className="rounded-[6px] border border-dashed border-[#d1d5db] px-3 py-6 text-center text-[11px] text-[#6b7280] sm:col-span-2">
                  ไม่มีเอกสารแนบ
                </p>
              )}
            </div>
          </section>

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
              <textarea
                id="applicant-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="เช่น โทรยืนยันเอกสารกับผู้สมัครแล้ว"
                className="mt-1 block w-full resize-y rounded-[6px] border border-[#d1d5db] bg-white px-3 py-2 text-[12px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
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

        <div className="min-w-0 space-y-3">
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

          <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <SectionTitle
              title="ผลการตรวจสอบ"
              description="การเปลี่ยนแปลงจะมีผลกับหน้าสถานะและใบรับสมัครทันที"
            />

            {applicant.status === "pending" ? (
              <div className="mt-3 rounded-[6px] border border-[#e4c58d] bg-[#fffaf0] px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#9a5c00]">
                  <ClockIcon />
                  รอเจ้าหน้าที่ตรวจสอบ
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-[#6b5b3e]">
                  ตรวจสอบเอกสารและคุณสมบัติ แล้วเลือกผลที่ต้องการ
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
          </section>

          <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <h2 className="text-[12px] font-semibold text-[#111827]">
              ข้อมูลอ้างอิง
            </h2>
            <dl className="mt-2.5 space-y-2 text-[10.5px]">
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

      {decision !== null && (
        <ReviewDecisionDialog
          key={`${applicant.ref}-${decision}`}
          open
          decision={decision}
          applicantName={applicant.name}
          onClose={() => setDecision(null)}
          onConfirm={handleDecision}
        />
      )}
      <DocumentPreviewDialog
        file={selectedDocument}
        applicant={applicant}
        onClose={() => setSelectedDocument(null)}
      />
    </div>
  );
}
