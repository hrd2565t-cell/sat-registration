"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AiVerdictBadge } from "@/components/admin/ai-verdict-badge";
import { DocumentPreviewDialog } from "@/components/admin/document-preview-dialog";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { getCourseKeyword } from "@/lib/courses";
import { useCourses } from "@/lib/courses-store";
import { auditApplicantDocuments } from "@/lib/document-checklist";
import {
  formatThaiDateTime,
  getDocumentLabel,
  useApplications,
  type ApplicantDocument,
  type ApplicantRecord,
} from "@/lib/applications-store";
import { exportApplicantsToExcel } from "@/lib/export-excel";

const PAGE_SIZE = 8;

const aiPriority = { fail: 0, review: 1, pass: 2 } as const;

type AiFilterType = "all" | "fail" | "review" | "pass";

function ClipboardIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinejoin="round"
        strokeWidth="1.7"
        d="M8 5H6.5A1.5 1.5 0 005 6.5v13A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0017.5 5H16"
      />
      <rect x="8" y="3" width="8" height="4" rx="1.2" strokeWidth="1.7" />
      <path
        strokeLinecap="round"
        strokeWidth="1.7"
        d="M8.5 11h7M8.5 14.5h7M8.5 18h4"
      />
    </svg>
  );
}

function AlertIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinejoin="round"
        strokeWidth="1.7"
        d="M12 3.5l9 16H3z"
      />
      <path
        strokeLinecap="round"
        strokeWidth="1.7"
        d="M12 9v4.5"
      />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
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

function CheckCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" strokeWidth="1.7" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M8.5 12l2.5 2.5 5-5"
      />
    </svg>
  );
}

function HourglassIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
        d="M6 3h12M6 21h12M7 3v4.5a5 5 0 002.5 4.33L12 13.5l2.5-1.67A5 5 0 0017 7.5V3M7 21v-4.5a5 5 0 012.5-4.33L12 10.5l2.5 1.67A5 5 0 0117 16.5V21"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M4 10h12M11 5l5 5-5 5"
      />
    </svg>
  );
}

export function ReviewQueue() {
  const { applications } = useApplications();
  const { courses } = useCourses();
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [aiFilter, setAiFilter] = useState<AiFilterType>("all");
  const [page, setPage] = useState(1);

  // Quick document preview modal state
  const [previewApplicant, setPreviewApplicant] = useState<ApplicantRecord | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ApplicantDocument | null>(null);

  const courseOptions = useMemo(
    () => [
      { value: "", label: "ทุกหลักสูตร" },
      ...courses.map((c) => ({
        value: String(c.id),
        label: getCourseKeyword(c),
      })),
    ],
    [courses]
  );

  const pending = useMemo(
    () =>
      applications
        .filter((item) => item.status === "pending")
        .sort((a, b) => {
          const priority =
            aiPriority[a.ai.tone] - aiPriority[b.ai.tone];
          if (priority !== 0) return priority;
          return (
            new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime()
          );
        }),
    [applications]
  );

  // Accurate counts separated by tone
  const failCount = useMemo(
    () => pending.filter((item) => item.ai.tone === "fail").length,
    [pending]
  );
  const reviewCount = useMemo(
    () => pending.filter((item) => item.ai.tone === "review").length,
    [pending]
  );
  const passCount = useMemo(
    () => pending.filter((item) => item.ai.tone === "pass").length,
    [pending]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pending.filter((item) => {
      const matchesCourse = !course || String(item.courseId) === course;
      const matchesAi = aiFilter === "all" || item.ai.tone === aiFilter;
      const courseTitle =
        courses.find((c) => c.id === item.courseId)?.title ?? item.courseTitle;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.ref.toLowerCase().includes(query) ||
        item.affiliation.toLowerCase().includes(query) ||
        item.position.toLowerCase().includes(query) ||
        item.phone.includes(query) ||
        courseTitle.toLowerCase().includes(query) ||
        item.courseTitle.toLowerCase().includes(query);
      return matchesCourse && matchesAi && matchesQuery;
    });
  }, [pending, courses, search, course, aiFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleExportExcel = () => {
    const selectedCourseObj = courses.find((c) => c.id === Number(course));
    exportApplicantsToExcel(filtered, {
      courseTitle: selectedCourseObj?.title,
      sheetName: "คิวรอตรวจสอบ",
      filename: `คิวรอตรวจสอบคุณสมบัติ_${filtered.length}_คน.xlsx`,
      courses,
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1220px]">
      {/* Top Header Card */}
      <section className="overflow-hidden rounded-lg border border-[#dbe4ef] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <div className="bg-gradient-to-r from-[#eff5fc] to-[#f8fbff] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#1e3a8a] text-white">
                  <ClipboardIcon />
                </span>
                <h1 className="text-[17px] font-semibold text-[#111827]">
                  คิวตรวจสอบคุณสมบัติ
                </h1>
              </div>
              <p className="mt-1.5 max-w-[620px] text-[11.5px] leading-relaxed text-[#4b5563]">
                ตรวจเอกสารและคุณสมบัติของผู้สมัครที่รอการยืนยัน คลิกปุ่มบนกล่องสถิติเพื่อกรองตามผลตรวจของ AI ได้ทันที
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[5px] bg-[#107c41] px-3 text-[11px] font-semibold text-white shadow-xs transition hover:bg-[#0d6937] active:scale-[0.98]"
                title="ส่งออกรายการรอตรวจสอบเป็นไฟล์ Excel (.xlsx)"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Export Excel ({filtered.length})</span>
              </button>
              <span className="inline-flex h-8 items-center rounded-full border border-[#bfd3eb] bg-white px-3 text-[11px] font-semibold text-[#1e3a8a]">
                รอตรวจ {pending.length} รายการ
              </span>
            </div>
          </div>
        </div>

        {/* 4 Interactive Filter Stat Cards */}
        <div className="grid grid-cols-2 divide-y divide-[#e5e7eb] border-t border-[#e5e7eb] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {/* Card 1: All */}
          <button
            type="button"
            onClick={() => {
              setAiFilter("all");
              setPage(1);
            }}
            className={`flex items-center gap-2.5 px-4 py-3 text-left transition hover:bg-[#f8fafc] ${
              aiFilter === "all" ? "bg-[#eff6ff] ring-2 ring-inset ring-[#1e3a8a]" : ""
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f1fc] text-[#1e3a8a]">
              <ClockIcon />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-[#6b7280]">รอตรวจทั้งหมด</p>
              <p className="text-[15px] font-bold leading-tight text-[#111827]">
                {pending.length}{" "}
                <span className="text-[10px] font-normal text-[#6b7280]">คน</span>
              </p>
            </div>
          </button>

          {/* Card 2: AI Issues Found */}
          <button
            type="button"
            onClick={() => {
              setAiFilter("fail");
              setPage(1);
            }}
            className={`flex items-center gap-2.5 px-4 py-3 text-left transition hover:bg-[#f8fafc] ${
              aiFilter === "fail" ? "bg-[#fef2f2] ring-2 ring-inset ring-[#dc2626]" : ""
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                failCount > 0 ? "bg-[#fee2e2] text-[#dc2626]" : "bg-[#f1f5f9] text-[#64748b]"
              }`}
            >
              <AlertIcon />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-[#6b7280]">AI พบข้อบกพร่อง</p>
              <p
                className={`text-[15px] font-bold leading-tight ${
                  failCount > 0 ? "text-[#dc2626]" : "text-[#111827]"
                }`}
              >
                {failCount}{" "}
                <span className="text-[10px] font-normal text-[#6b7280]">คน</span>
              </p>
            </div>
          </button>

          {/* Card 3: Pending Manual Review */}
          <button
            type="button"
            onClick={() => {
              setAiFilter("review");
              setPage(1);
            }}
            className={`flex items-center gap-2.5 px-4 py-3 text-left transition hover:bg-[#f8fafc] ${
              aiFilter === "review" ? "bg-[#fffbeb] ring-2 ring-inset ring-[#d97706]" : ""
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-[#b45309]">
              <HourglassIcon />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-[#6b7280]">รอเจ้าหน้าที่ตรวจทาน</p>
              <p className="text-[15px] font-bold leading-tight text-[#111827]">
                {reviewCount}{" "}
                <span className="text-[10px] font-normal text-[#6b7280]">คน</span>
              </p>
            </div>
          </button>

          {/* Card 4: AI Recommended Pass */}
          <button
            type="button"
            onClick={() => {
              setAiFilter("pass");
              setPage(1);
            }}
            className={`flex items-center gap-2.5 px-4 py-3 text-left transition hover:bg-[#f8fafc] ${
              aiFilter === "pass" ? "bg-[#f0fdf4] ring-2 ring-inset ring-[#16a34a]" : ""
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[#15803d]">
              <CheckCircleIcon />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-[#6b7280]">AI แนะนำผ่านเกณฑ์</p>
              <p className="text-[15px] font-bold leading-tight text-[#15803d]">
                {passCount}{" "}
                <span className="text-[10px] font-normal text-[#6b7280]">คน</span>
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Main Filter & Applicant List Section */}
      <section className="mt-3 rounded-lg border border-[#e3e6ea] bg-white p-3 shadow-[0_1px_3px_rgba(16,24,40,0.05)] sm:p-4">
        {/* Search, Course Filter & Filter Tag */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-[340px]">
            <label htmlFor="review-search" className="sr-only">
              ค้นหาผู้สมัครในคิวตรวจสอบ
            </label>
            <SearchInput
              id="review-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อ รหัส สังกัด หรือเบอร์โทร"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {aiFilter !== "all" && (
              <button
                type="button"
                onClick={() => setAiFilter("all")}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[#cbd5e1] bg-[#f8fafc] px-2.5 text-[10.5px] font-medium text-[#475569] transition hover:bg-[#f1f5f9]"
              >
                <span>ตัวกรอง AI: {aiFilter === "fail" ? "พบข้อบกพร่อง" : aiFilter === "review" ? "รอตรวจทาน" : "ผ่านเกณฑ์"}</span>
                <span className="font-bold text-[#64748b]">×</span>
              </button>
            )}
            <div className="w-full sm:w-[200px]">
              <label htmlFor="review-course" className="sr-only">
                กรองตามหลักสูตร
              </label>
              <Select
                id="review-course"
                value={course}
                onValueChange={(value) => {
                  setCourse(value);
                  setPage(1);
                }}
                options={courseOptions}
              />
            </div>
          </div>
        </div>

        {/* Applicant Card Rows */}
        <div className="mt-3 space-y-2.5">
          {rows.map((item) => {
            const courseItem = courses.find((c) => c.id === item.courseId);
            const courseTitle = courseItem?.title ?? item.courseTitle;
            const docAudit = auditApplicantDocuments(item, courseItem);

            return (
              <div
                key={item.ref}
                className="group flex flex-col gap-3 rounded-[8px] border border-[#e5e7eb] bg-white p-3.5 transition-colors hover:border-[#93c5fd] hover:bg-[#fbfdff] sm:flex-row sm:items-center"
              >
                {/* Left side: Photo & Applicant Details */}
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      item.documents?.find((d) => d.kind === "photo")?.dataUrl ||
                      "/assets/avatar-placeholder.svg"
                    }
                    alt=""
                    className="h-14 w-11 shrink-0 rounded-[4px] border border-[#cbd5e1] object-cover shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <Link
                        href={`/admin/applicants/${encodeURIComponent(item.ref)}?mode=review`}
                        className="truncate text-[13px] font-semibold text-[#111827] hover:text-[#1e3a8a] hover:underline"
                      >
                        {item.name}
                      </Link>
                      <span className="inline-flex items-center rounded bg-[#eff6ff] px-2 py-0.5 text-[10.5px] font-bold text-[#1e3a8a]">
                        {item.ref}
                      </span>
                    </div>

                    {/* Affiliation & Position */}
                    <p className="mt-0.5 truncate text-[11px] text-[#475569]">
                      <span className="font-medium text-[#1e293b]">{item.affiliation}</span>
                      {item.position ? ` · ${item.position}` : ""}
                    </p>

                    {/* Course Title */}
                    <p className="mt-0.5 truncate text-[10.5px] text-[#64748b]">
                      <span className="text-[#94a3b8]">หลักสูตร:</span> {courseTitle}
                    </p>

                    {/* Metadata & Quick Document Preview Chips */}
                    <div className="mt-2 flex flex-col gap-1.5 text-[10px] text-[#64748b]">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>ยื่นเมื่อ {formatThaiDateTime(item.submittedAt)}</span>
                        {item.phone && <span>โทร {item.phone}</span>}

                        {/* Document Audit Status Badge */}
                        {docAudit.status === "complete" && (
                          <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#dcfce7] px-2 py-0.5 text-[9.5px] font-semibold text-[#15803d]">
                            <span>✓</span>
                            <span>เอกสารครบ ({docAudit.attachedRequiredCount}/{docAudit.requiredCount})</span>
                          </span>
                        )}
                        {docAudit.status === "incomplete" && (
                          <span
                            title={`ขาดเอกสารบังคับ: ${docAudit.missingRequiredLabels.join(", ")}`}
                            className="inline-flex items-center gap-1 rounded-[4px] bg-[#fef3c7] px-2 py-0.5 text-[9.5px] font-semibold text-[#b45309]"
                          >
                            <span>⚠️</span>
                            <span>ขาดเอกสารบังคับ ({docAudit.attachedRequiredCount}/{docAudit.requiredCount}): ขาด {docAudit.missingRequiredLabels.join(", ")}</span>
                          </span>
                        )}
                        {docAudit.status === "none" && (
                          <span className="inline-flex items-center rounded-[4px] bg-[#f1f5f9] px-2 py-0.5 text-[9.5px] text-[#64748b]">
                            เอกสาร {item.documents?.length || 0} รายการ
                          </span>
                        )}
                      </div>

                      {/* Document Quick Preview Chips */}
                      {item.documents && item.documents.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <span className="text-[#94a3b8]">คลิกเปิดดู:</span>
                          {item.documents.map((doc) => {
                            const isPhoto = doc.kind === "photo";
                            const isId = doc.kind === "idcard" || doc.kind === "certificate";
                            return (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPreviewApplicant(item);
                                  setPreviewDoc(doc);
                                }}
                                title={`คลิกเปิดดูไฟล์จริง ${doc.name}`}
                                className="inline-flex items-center gap-1 rounded-[4px] border border-[#d1d5db] bg-[#f8fafc] px-2 py-0.5 text-[9.5px] font-medium text-[#1e3a8a] transition hover:border-[#93c5fd] hover:bg-[#eff6ff]"
                              >
                                <span>{isPhoto ? "📷" : isId ? "🆔" : "📄"}</span>
                                <span className="max-w-[110px] truncate">{getDocumentLabel(doc.kind)}</span>
                                <span className="text-[8.5px] text-[#94a3b8]">({doc.size})</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: AI Verdict Badge & Review Button */}
                <div className="flex items-center justify-between gap-2.5 sm:w-[250px] sm:shrink-0 sm:flex-col sm:items-end sm:justify-center">
                  <div className="w-full">
                    <AiVerdictBadge verdict={item.ai} size="sm" />
                  </div>
                  <Link
                    href={`/admin/applicants/${encodeURIComponent(item.ref)}?mode=review`}
                    className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[5px] bg-[#1e3a8a] px-3.5 text-[11px] font-semibold text-white shadow-xs transition hover:bg-[#1e40af] active:scale-[0.98]"
                  >
                    <span>ตรวจสอบ</span>
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="rounded-[7px] border border-dashed border-[#d1d5db] px-4 py-12 text-center">
              <p className="text-[13px] font-semibold text-[#111827]">
                {pending.length === 0
                  ? "ตรวจครบทุกรายการแล้ว"
                  : "ไม่พบผู้สมัครที่ตรงกับเงื่อนไขการค้นหา"}
              </p>
              <p className="mt-1 text-[11px] text-[#6b7280]">
                {pending.length === 0
                  ? "รายการที่อนุมัติหรือไม่อนุมัติแล้วจะย้ายไปหน้ารายชื่อผู้สมัคร"
                  : "ลองปรับคำค้นหา หรือล้างตัวกรองสถานะ AI"}
              </p>
              {pending.length === 0 ? (
                <Link
                  href="/admin/applicants"
                  className="mt-3 inline-flex h-9 items-center rounded-[6px] bg-[#1e3a8a] px-4 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#1e40af]"
                >
                  ดูรายชื่อผู้สมัครทั้งหมด
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCourse("");
                    setAiFilter("all");
                  }}
                  className="mt-3 inline-flex h-8 items-center rounded-[5px] border border-[#d1d5db] bg-white px-3 text-[11px] font-semibold text-[#374151] transition hover:bg-[#f8fafc]"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0f3] pt-3">
            <p className="text-[10px] text-[#6b7280]">
              แสดง {Math.min((safePage - 1) * PAGE_SIZE + 1, filtered.length)}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} จาก{" "}
              {filtered.length} รายการ
            </p>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>

      <p className="mt-3 text-center text-[10px] text-[#6b7280]">
        ต้องการดูผู้สมัครที่ตรวจแล้ว?{" "}
        <Link
          href="/admin/applicants"
          className="font-semibold text-[#1e3a8a] hover:underline"
        >
          ไปที่รายชื่อผู้สมัครทั้งหมด
        </Link>
      </p>

      {/* Quick Document Preview Dialog */}
      {previewDoc && previewApplicant && (
        <DocumentPreviewDialog
          file={previewDoc}
          applicant={previewApplicant}
          onClose={() => {
            setPreviewDoc(null);
            setPreviewApplicant(null);
          }}
        />
      )}
    </div>
  );
}
