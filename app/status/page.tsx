"use client";

import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { AppHeaderNav } from "@/components/layout/app-header-nav";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, DownloadIcon } from "@/components/ui/icons";
import { IdCardInput } from "@/components/ui/id-card-input";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusPanel } from "@/components/status/status-panel";
import { ResubmitDocumentsBox } from "@/components/status/resubmit-documents-box";
import { getCourseById, getDefaultCourse, type Course } from "@/lib/courses";
import { useCourses } from "@/lib/courses-store";
import {
  formatThaiDateTime,
  getApplicationsByIdCard,
  getDocumentLabel,
  refreshApplicationsFromCloud,
  useApplications,
  type ApplicantDocument,
  type ApplicantRecord,
} from "@/lib/applications-store";
import { getDocumentFromStorage } from "@/lib/document-storage";
import { resolveSupabaseDocumentUrl } from "@/lib/supabase/sync";
import { formatThaiIdCard, isValidThaiIdCard } from "@/lib/validation";
import { useAlumniStore } from "@/lib/alumni-store";
import { DigitalPassModal } from "@/components/alumni/digital-pass-modal";

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 ${className ?? ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 12h14M13 6l6 6-6 6"
      />
    </svg>
  );
}

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function StatusHeader() {
  return <Header rightSlot={<AppHeaderNav page="status" />} />;
}

function SearchIcon() {
  return (
    <Image
      src="/assets/icon-search-emoji.png"
      alt=""
      width={22}
      height={22}
      className="shrink-0"
      aria-hidden="true"
      priority
    />
  );
}

function StatusStepper({ status }: { status: ApplicantRecord["status"] }) {
  const step2Done =
    status === "approved" || status === "reserve" || status === "rejected";
  const step2ActionRequired = status === "action_required";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-[11px]">
      {/* Step 1 */}
      <div className="flex items-center gap-1.5 font-semibold text-[#15803d]">
        <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#16a34a] text-[10px] font-bold text-white">
          ✓
        </span>
        <span>1. ส่งใบสมัครแล้ว</span>
      </div>

      <span className="hidden h-[1px] flex-1 bg-[#cbd5e1] sm:block" />

      {/* Step 2 */}
      <div
        className={`flex items-center gap-1.5 font-semibold ${
          step2Done
            ? "text-[#15803d]"
            : step2ActionRequired
              ? "text-[#c2410c]"
              : "text-[#b45309]"
        }`}
      >
        <span
          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
            step2Done
              ? "bg-[#16a34a]"
              : step2ActionRequired
                ? "bg-[#ea580c]"
                : "bg-[#d97706]"
          }`}
        >
          {step2Done ? "✓" : step2ActionRequired ? "!" : "2"}
        </span>
        <span>
          {step2Done
            ? "2. ตรวจเอกสารเรียบร้อย"
            : step2ActionRequired
              ? "2. รอส่งเอกสารแก้ไข"
              : "2. กำลังตรวจสอบคุณสมบัติ"}
        </span>
      </div>

      <span className="hidden h-[1px] flex-1 bg-[#cbd5e1] sm:block" />

      {/* Step 3 */}
      <div
        className={`flex items-center gap-1.5 font-semibold ${
          status === "approved"
            ? "text-[#15803d]"
            : status === "reserve"
              ? "text-[#1d4ed8]"
              : status === "rejected"
                ? "text-[#b91c1c]"
                : "text-[#64748b]"
        }`}
      >
        <span
          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            status === "approved"
              ? "bg-[#16a34a] text-white"
              : status === "reserve"
                ? "bg-[#1d4ed8] text-white"
                : status === "rejected"
                  ? "bg-[#dc2626] text-white"
                  : "border border-[#cbd5e1] bg-white text-[#64748b]"
          }`}
        >
          {status === "approved"
            ? "✓"
            : status === "reserve"
              ? "R"
              : status === "rejected"
                ? "✕"
                : "3"}
        </span>
        <span>
          {status === "approved"
            ? "3. ผ่านการคัดเลือก (ตัวจริง)"
            : status === "reserve"
              ? "3. บัญชีรายชื่อสำรอง"
              : status === "rejected"
                ? "3. ไม่ผ่านการพิจารณา"
                : "3. ประกาศผลการสมัคร"}
        </span>
      </div>
    </div>
  );
}

function ApplicantStatusCard({
  result,
  course,
  index,
  totalCount,
}: {
  result: ApplicantRecord;
  course: Course;
  index: number;
  totalCount: number;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showResubmitManual, setShowResubmitManual] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    url: string;
    isPdf: boolean;
  } | null>(null);

  const photoDoc = result.documents.find(
    (d) =>
      d.kind === "photo" ||
      (d.type && d.type.startsWith("image/")) ||
      /\.(jpg|jpeg|png|webp)$/i.test(d.name)
  );

  useEffect(() => {
    let active = true;
    async function loadPhoto() {
      if (photoDoc?.dataUrl) {
        if (photoDoc.dataUrl.startsWith("data:")) {
          if (active) setPhotoUrl(photoDoc.dataUrl);
          return;
        }
        const resolved = await resolveSupabaseDocumentUrl(photoDoc.dataUrl);
        if (active && resolved) {
          setPhotoUrl(resolved);
          return;
        }
      }
      if (photoDoc) {
        const stored = await getDocumentFromStorage(photoDoc.id, photoDoc.name);
        if (active && stored?.dataUrl) {
          setPhotoUrl(stored.dataUrl);
          return;
        }
      }
      if (typeof window !== "undefined") {
        const byRef = sessionStorage.getItem(`sat-photo-${result.ref}`);
        if (active && byRef) {
          setPhotoUrl(byRef);
          return;
        }
        const byIdCard = sessionStorage.getItem(
          `sat-photo-idcard-${result.idCard.replace(/\D/g, "")}`
        );
        if (active && byIdCard) {
          setPhotoUrl(byIdCard);
          return;
        }
      }
    }
    void loadPhoto();
    return () => {
      active = false;
    };
  }, [photoDoc, result.ref, result.idCard]);

  const handleOpenDocument = async (doc: ApplicantDocument) => {
    let targetUrl: string | null = null;
    if (doc.dataUrl?.startsWith("data:")) {
      targetUrl = doc.dataUrl;
    } else if (doc.dataUrl) {
      targetUrl = await resolveSupabaseDocumentUrl(doc.dataUrl);
    }
    if (!targetUrl) {
      const stored = await getDocumentFromStorage(doc.id, doc.name);
      if (stored?.dataUrl) targetUrl = stored.dataUrl;
    }
    if (!targetUrl && typeof window !== "undefined") {
      targetUrl = sessionStorage.getItem(`sat-doc-${doc.id}`);
    }
    if (targetUrl) {
      const isPdf =
        doc.type === "application/pdf" ||
        doc.name.toLowerCase().endsWith(".pdf") ||
        targetUrl.startsWith("data:application/pdf");
      setPreviewDoc({ name: doc.name, url: targetUrl, isPdf });
    }
  };

  const displayCourseTitle = result.courseTitle.startsWith("หลักสูตร")
    ? result.courseTitle
    : `หลักสูตร ${result.courseTitle}`;

  return (
    <Card
      padding="none"
      radius="lg"
      className="w-full overflow-hidden border border-[#dce4ec] shadow-[0_2px_8px_rgba(16,24,40,0.06)]"
    >
      {/* Top Banner: Reference & Submission Time */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5eaf0] bg-[#f8fafc] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {totalCount > 1 && (
            <span className="rounded bg-[#1e3a8a] px-2 py-0.5 text-[10px] font-bold text-white">
              ใบสมัครที่ {index + 1}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md bg-[#16265E] px-2.5 py-0.5 text-[11.5px] font-bold text-white">
            รหัสอ้างอิง: {result.ref}
          </span>
          <CopyButton
            text={result.ref}
            size="xs"
            variant="ghost"
            title="คัดลอกรหัสอ้างอิง"
          />
        </div>
        <div className="text-[11px] font-medium text-[#64748b]">
          ยื่นใบสมัครเมื่อ {formatThaiDateTime(result.submittedAt)}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Course Title & Schedule */}
        <div>
          <h2 className="text-[15px] font-bold leading-snug text-[#0f172a] sm:text-[16px]">
            {displayCourseTitle}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#334155]">
            <span className="inline-flex items-center gap-1 font-medium text-[#1e3a8a]">
              <span>📅</span>
              <span>รุ่นวันที่อบรม: {course.date}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[#475569]">
              <span>📍</span>
              <span>สถานที่: {course.location}</span>
            </span>
          </div>
        </div>

        {/* 3-Step Progress Stepper */}
        <StatusStepper status={result.status} />

        {/* Applicant Profile Summary + Photo */}
        <div className="flex flex-col gap-3.5 rounded-xl border border-[#e2e8f0] bg-[#fcfdfe] p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="relative flex h-[76px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#cbd5e1] bg-[#f1f5f9] shadow-2xs">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={`รูปถ่ายของ ${result.name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-[#94a3b8]">
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
                  </svg>
                  <span className="mt-0.5 text-[8.5px]">รูปผู้สมัคร</span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1 text-[11.5px]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[13.5px] font-bold text-[#0f172a]">
                  {result.name}
                </span>
                <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 font-mono text-[10.5px] text-[#475569]">
                  เลขบัตร: {formatThaiIdCard(result.idCard)}
                </span>
              </div>
              <p className="text-[#334155]">
                <span className="font-semibold text-[#64748b]">สังกัด:</span>{" "}
                {result.affiliation || "-"}
                {result.position ? ` · ตำแหน่ง: ${result.position}` : ""}
              </p>
              <p className="text-[#475569]">
                <span className="font-semibold text-[#64748b]">ติดต่อ:</span>{" "}
                โทร. {result.phone || "-"}
                {result.email ? ` · อีเมล: ${result.email}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div>
          {result.status === "pending" && (
            <StatusPanel
              tone="pending"
              title="อยู่ระหว่างการตรวจสอบคุณสมบัติและเอกสาร"
              description="ระบบได้รับใบสมัครและเอกสารประกอบของท่านครบถ้วนแล้ว เจ้าหน้าที่กำลังดำเนินการตรวจสอบ (ใช้เวลา 3-5 วันทำการ) ท่านสามารถพิมพ์ใบรับการสมัครเก็บไว้เป็นหลักฐานได้ทันที"
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href={`/print/receipt?ref=${encodeURIComponent(result.ref)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-[#0b3c92] px-3 text-[11.5px] font-semibold text-white shadow-2xs transition-colors hover:bg-[#1e3a8a]"
                  >
                    <DownloadIcon />
                    พิมพ์ / ดาวน์โหลดใบรับการสมัคร (A4 PDF)
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowResubmitManual((prev) => !prev)}
                    className="flex h-8 items-center justify-center gap-1.5 rounded-[5px] border border-[#cbd5e1] bg-white px-3 text-[11.5px] font-semibold text-[#334155] transition-colors hover:bg-[#f8fafc]"
                  >
                    <span>📎</span>
                    <span>
                      {showResubmitManual
                        ? "ซ่อนกล่องส่งเอกสารแก้ไข"
                        : "ส่งเอกสารแก้ไขเพิ่มเติม"}
                    </span>
                  </button>
                </div>
              }
            />
          )}

          {result.status === "pending" && showResubmitManual && (
            <ResubmitDocumentsBox
              application={result}
              onSuccess={() => setShowResubmitManual(false)}
            />
          )}

          {result.status === "approved" && (
            <StatusPanel
              tone="approved"
              title="ผ่านการตรวจสอบคุณสมบัติแล้ว"
              description="ยินดีด้วย! ท่านได้รับการอนุมัติเป็นผู้มีสิทธิ์เข้ารับการอบรม (ตัวจริง) กรุณาพิมพ์บัตรเข้าร่วมอบรมเพื่อนำมาแสดงในวันรายงานตัว"
              action={
                <div className="flex w-full flex-col gap-2 sm:flex-row">
                  <a
                    href={`/print/pass?ref=${encodeURIComponent(result.ref)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-[#059669] text-[11.5px] font-semibold text-white transition-colors hover:bg-[#047857]"
                  >
                    <DownloadIcon />
                    พิมพ์บัตรเข้าร่วมอบรม (Pass PDF)
                  </a>
                  <a
                    href={`/print/receipt?ref=${encodeURIComponent(result.ref)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[5px] border border-[#0b3c92] bg-white text-[11.5px] font-semibold text-[#0b3c92] transition-colors hover:bg-[#eff6ff]"
                  >
                    <DownloadIcon />
                    พิมพ์ใบรับการสมัคร (A4)
                  </a>
                </div>
              }
            />
          )}

          {result.status === "reserve" && (
            <StatusPanel
              tone="reserve"
              title={`ผ่านการตรวจสอบคุณสมบัติ (รายชื่อสำรอง ลำดับที่ ${
                result.reserveOrder ?? 1
              })`}
              description={`คุณสมบัติของท่านผ่านเกณฑ์การพิจารณา และได้รับการจัดให้อยู่ในบัญชีรายชื่อสำรองลำดับที่ ${
                result.reserveOrder ?? 1
              } หากมีผู้สละสิทธิ์ เจ้าหน้าที่จะติดต่อและเลื่อนลำดับให้ท่านตามคิวการคัดเลือก`}
              action={
                <a
                  href={`/print/receipt?ref=${encodeURIComponent(result.ref)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[5px] border border-[#1e3a8a] bg-white text-[11.5px] font-semibold text-[#1e3a8a] transition-colors hover:bg-[#eff6ff]"
                >
                  <DownloadIcon />
                  พิมพ์ใบรับการสมัคร / ยืนยันสถานะสำรอง (A4 PDF)
                </a>
              }
            />
          )}

          {result.status === "action_required" && (
            <div className="space-y-3">
              <StatusPanel
                tone="action_required"
                title="เจ้าหน้าที่ขอให้ส่งเอกสารเพิ่มเติม / แก้ไขเอกสาร"
                description={
                  result.reviewReason
                    ? `ข้อความจากเจ้าหน้าที่: "${result.reviewReason}"`
                    : "เจ้าหน้าที่ตรวจสอบเอกสารแล้วพบว่ามีเอกสารบางรายการยังไม่ครบถ้วนหรือไม่ชัดเจน กรุณาแนบเอกสารใหม่ด้านล่างนี้"
                }
              />
              <ResubmitDocumentsBox application={result} />
            </div>
          )}

          {result.status === "rejected" && (
            <StatusPanel
              tone="rejected"
              title="ไม่ผ่านการตรวจสอบคุณสมบัติ"
              description={`เหตุผล: ${result.reviewReason ?? result.ai.line2}`}
              action={
                <Link
                  href={`/?course=${result.courseId}`}
                  className="mx-auto flex h-8 w-fit items-center justify-center gap-1.5 rounded-[5px] bg-[#6b7280] px-3.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#565e66]"
                >
                  สมัครใหม่อีกครั้ง
                  <ArrowRightIcon className="h-3 w-3" />
                </Link>
              }
            />
          )}
        </div>

        {/* Submitted Documents Checklist */}
        {result.documents.length > 0 && (
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold text-[#1e293b]">
                รายการเอกสารแนบที่ส่งเข้าระบบ ({result.documents.length} รายการ)
              </span>
              {result.notes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTimeline((prev) => !prev)}
                  className="text-[11px] font-semibold text-[#1e3a8a] hover:underline"
                >
                  {showTimeline
                    ? "ซ่อนประวัติการดำเนินการ ▲"
                    : `ดูประวัติการดำเนินการ (${result.notes.length}) ▼`}
                </button>
              )}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {result.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1.5 text-[11px]"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[10px] font-bold text-[#15803d]">
                      ✓
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#1e293b]">
                        {getDocumentLabel(doc.kind)}
                      </p>
                      <p className="truncate text-[10px] text-[#64748b]">
                        {doc.name} ({doc.size})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleOpenDocument(doc)}
                    className="shrink-0 rounded border border-[#cbd5e1] bg-[#f8fafc] px-2 py-0.5 text-[10px] font-semibold text-[#1e3a8a] hover:bg-[#eff6ff]"
                  >
                    ดูไฟล์
                  </button>
                </div>
              ))}
            </div>

            {/* Collapsible Activity Timeline */}
            {showTimeline && result.notes.length > 0 && (
              <div className="mt-3 border-t border-[#e2e8f0] pt-2.5">
                <p className="mb-1.5 text-[11px] font-bold text-[#334155]">
                  ประวัติการดำเนินการ (Timeline)
                </p>
                <div className="space-y-1.5">
                  {result.notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex flex-col gap-0.5 rounded-md bg-white px-2.5 py-1.5 text-[10.5px] border border-[#e2e8f0] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium text-[#1e293b]">
                        • {note.text}
                      </span>
                      <span className="shrink-0 text-[10px] text-[#64748b]">
                        {note.author} · {formatThaiDateTime(note.at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h4 className="truncate text-[13px] font-bold text-gray-900">
                {previewDoc.name}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-lg border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
              >
                ✕ ปิดหน้าต่าง
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {previewDoc.isPdf ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="h-[70vh] w-full rounded border bg-white"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="mx-auto max-h-[70vh] rounded object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function StatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F9FA]">
          <StatusHeader />
        </div>
      }
    >
      <StatusContent />
    </Suspense>
  );
}

function StatusContent() {
  const searchParams = useSearchParams();
  const { applications } = useApplications();
  const { courses } = useCourses();
  const { trainees } = useAlumniStore();
  const mounted = useMounted();
  const initialId = (searchParams.get("id") ?? "").replace(/\D/g, "");
  const initialValid = initialId.length === 13;
  const [idValue, setIdValue] = useState(initialValid ? initialId : "");
  const [searchedId, setSearchedId] = useState(initialValid ? initialId : "");
  const [isSyncing, setIsSyncing] = useState(true);
  const [digitalPassOpen, setDigitalPassOpen] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setIsSyncing(true);
    refreshApplicationsFromCloud().finally(() => {
      if (active) setIsSyncing(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const results = searchedId
    ? getApplicationsByIdCard(applications, searchedId)
    : [];

  const hasAlumniRecord = searchedId
    ? trainees.some((t) => t.idCard.replace(/\D/g, "") === searchedId)
    : false;

  const executeSearch = useCallback((rawInput: string) => {
    const digits = rawInput.replace(/\D/g, "");
    if (digits.length !== 13) {
      setError("กรุณากรอกหมายเลขบัตรประจำตัวประชาชนให้ครบ 13 หลัก");
      return;
    }
    if (!isValidThaiIdCard(digits)) {
      setError(
        "หมายเลขบัตรประชาชนไม่ถูกต้องตามสูตรคำนวณของกรมการปกครอง กรุณาตรวจสอบอีกครั้ง"
      );
      return;
    }
    setError("");
    setSearchedId(digits);
    setIsSyncing(true);
    refreshApplicationsFromCloud().finally(() => {
      setIsSyncing(false);
    });
    resultsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const handleSearch = () => {
    executeSearch(idValue);
  };

  return (
    <div className="min-h-screen bg-[#F5F9FA]">
      <StatusHeader />

      <main className="mx-auto w-full max-w-[780px] px-5 pb-12 pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2">
            <SearchIcon />
            <h1 className="text-[21px] font-bold leading-tight text-[#111827] sm:text-[22px]">
              ตรวจสอบสถานะการสมัครเข้ารับอบรม
            </h1>
          </div>
          <p className="mt-1.5 max-w-[620px] text-[11.5px] leading-relaxed text-[#4b5563]">
            กรุณากรอกหมายเลขบัตรประจำตัวประชาชน 13 หลักที่ใช้ในการสมัคร
            เพื่อตรวจสอบสถานะ รายการเอกสารที่ส่งแล้ว และผลการพิจารณาคุณสมบัติ
          </p>
        </div>

        <div className="mx-auto mt-3.5 w-full max-w-[448px]">
          <IdCardInput
            value={idValue}
            onChange={(val) => {
              setIdValue(val);
              if (error) setError("");
            }}
            onEnter={(val) => executeSearch(val)}
            onComplete={(val) => {
              if (isValidThaiIdCard(val)) {
                executeSearch(val);
              }
            }}
            onClear={() => {
              setSearchedId("");
              setError("");
            }}
            tone="highlight"
            separator={false}
            showActions={true}
            className="justify-center"
          />
          {error && (
            <p className="mt-1.5 text-center text-[11px] font-medium text-[#dc2626]">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSearch}
            className="mt-3 flex h-[34px] w-full items-center justify-center gap-1.5 rounded-[6px] bg-[#c2242c] text-[13px] font-bold text-white shadow-2xs transition-colors hover:bg-[#a91d24]"
          >
            ค้นหาข้อมูลสถานะ
            <ArrowRightIcon />
          </button>
        </div>

        <div ref={resultsRef} className="mt-5 scroll-mt-24 space-y-4">
          {!searchedId && (
            <Card
              padding="none"
              radius="lg"
              className="w-full border border-dashed border-[#cfd9e3] shadow-none"
            >
              <div className="px-4 py-8 text-center">
                <p className="text-[12.5px] font-medium text-[#374151]">
                  กรอกเลขบัตรประชาชนแล้วกด “ค้นหาข้อมูลสถานะ”
                </p>
                <p className="mt-1 text-[11px] text-[#6b7280]">
                  ระบบจะแสดงผลการตรวจสอบข้อมูลการสมัครและรายการเอกสารล่าสุดของคุณ
                </p>
              </div>
            </Card>
          )}

          {/* Digital Badge E-Badge Card if trainee is found in SAT records */}
          {searchedId && hasAlumniRecord && (
            <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-blue-50/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-2xl text-[#1a1438] shadow-xs">
                  🪪
                </div>
                <div>
                  <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    กกท. DIGITAL ACCREDITATION
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 mt-0.5">
                    พบบัตรประจำตัวบุคลากรกีฬาดิจิทัล (E-Badge)
                  </h3>
                  <p className="text-xs text-gray-600">
                    สามารถเปิดแสดงบัตรพร้อม QR Code สแกนหน้างาน หรือบันทึกภาพลงโทรศัพท์มือถือได้ทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDigitalPassOpen(true)}
                className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:from-amber-600 hover:to-amber-700 transition-all cursor-pointer"
              >
                📱 ดูบัตรดิจิทัล / บันทึกภาพ
              </button>
            </div>
          )}

          {/* Loading state while syncing from Supabase Cloud */}
          {searchedId && results.length === 0 && isSyncing && (
            <Card
              padding="none"
              radius="lg"
              className="w-full shadow-[0_1px_4px_rgba(16,24,40,0.08)]"
            >
              <div className="px-4 py-8 text-center space-y-2">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#16265E] border-t-transparent" />
                <p className="text-[12.5px] font-semibold text-[#111827]">
                  กำลังดึงข้อมูลการสมัครจากฐานข้อมูลกลาง...
                </p>
              </div>
            </Card>
          )}

          {searchedId && results.length === 0 && !isSyncing && mounted && (
            <Card
              padding="none"
              radius="lg"
              className="w-full shadow-[0_1px_4px_rgba(16,24,40,0.08)]"
            >
              <div className="px-4 py-8 text-center space-y-2">
                <p className="text-[13px] font-semibold text-[#111827]">
                  ไม่พบข้อมูลการสมัครในรอบปัจจุบันสำหรับเลขบัตรนี้
                </p>
                <p className="text-[11px] leading-relaxed text-[#6b7280] max-w-md mx-auto">
                  หากท่านเป็นผู้ผ่านการอบรมในปีก่อนๆ หรือไม่มีการบันทึกเลขบัตรประชาชนไว้ในอดีต ท่านสามารถค้นหาประวัติจากชื่อ-นามสกุลได้
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    href="/alumni"
                    className="inline-flex h-8 items-center gap-1.5 rounded-[5px] bg-[#16265E] px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#1e3a8a]"
                  >
                    <span>🔍</span>
                    <span>ค้นหาจากชื่อ-นามสกุลในทำเนียบย้อนหลัง</span>
                  </Link>
                  <Link
                    href="/courses"
                    className="inline-flex h-8 items-center rounded-[5px] border border-gray-300 bg-white px-3.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    เลือกหลักสูตรและสมัครใหม่
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              {results.length > 1 && (
                <div className="flex flex-col gap-1 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1e40af] text-[10px] font-bold text-white">
                      {results.length}
                    </span>
                    <span className="text-[12.5px] font-semibold text-[#1e40af]">
                      พบประวัติการสมัครทั้งหมด {results.length} หลักสูตร
                    </span>
                  </div>
                  <span className="text-[11px] text-[#2563eb]">
                    แสดงข้อมูลแยกตามแต่ละหลักสูตร
                  </span>
                </div>
              )}

              {results.map((result, index) => {
                const course =
                  getCourseById(result.courseId, courses) ??
                  getDefaultCourse(courses);

                return (
                  <ApplicantStatusCard
                    key={result.ref}
                    result={result}
                    course={course}
                    index={index}
                    totalCount={results.length}
                  />
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[10.5px] text-[#6b7280]">
          ข้อมูลส่วนบุคคลของท่านจะถูกเก็บรักษาความลับตามกฎหมาย PDPA
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 text-[11.5px] font-medium text-[#4b5563] transition-colors hover:bg-[#f8fafc]"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5 shrink-0" />
            กลับสู่หน้าหลัก
          </Link>
          <Link
            href="/courses"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#16265E] px-3.5 text-[11.5px] font-semibold text-white shadow-xs transition hover:bg-[#1e3a8a]"
          >
            <span>🎓 เลือกดูหลักสูตรที่เปิดรับสมัคร</span>
            <span>→</span>
          </Link>
          <Link
            href="/timeline"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 text-[11.5px] font-medium text-[#16265E] transition hover:bg-[#f1f5f9]"
          >
            <span>📅 แผนกำหนดการ (Timeline)</span>
          </Link>
        </div>
      </main>

      {/* Digital Pass Modal */}
      {digitalPassOpen && searchedId && (
        <DigitalPassModal
          idCard={searchedId}
          allTrainees={trainees}
          onClose={() => setDigitalPassOpen(false)}
        />
      )}
    </div>
  );
}
