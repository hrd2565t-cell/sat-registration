"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AiVerdictBadge } from "@/components/admin/ai-verdict-badge";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { getCourseKeyword } from "@/lib/courses";
import { useCourses } from "@/lib/courses-store";
import {
  formatThaiDateTime,
  useApplications,
} from "@/lib/applications-store";

const PAGE_SIZE = 8;

const aiPriority = { fail: 0, review: 1, pass: 2 } as const;

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
  const [page, setPage] = useState(1);

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

  const flagged = pending.filter((item) => item.ai.tone !== "pass").length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pending.filter((item) => {
      const matchesCourse = !course || String(item.courseId) === course;
      const courseTitle =
        courses.find((c) => c.id === item.courseId)?.title ?? item.courseTitle;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.ref.toLowerCase().includes(query) ||
        courseTitle.toLowerCase().includes(query) ||
        item.courseTitle.toLowerCase().includes(query);
      return matchesCourse && matchesQuery;
    });
  }, [pending, courses, search, course]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div className="mx-auto w-full max-w-[1220px]">
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
              <p className="mt-1.5 max-w-[560px] text-[11.5px] leading-relaxed text-[#4b5563]">
                ตรวจเอกสารและคุณสมบัติของผู้สมัครที่รอการยืนยัน
                รายการที่ AI พบประเด็นจะถูกจัดไว้ด้านบน
              </p>
            </div>
            <span className="inline-flex h-8 items-center rounded-full border border-[#bfd3eb] bg-white px-3 text-[11px] font-semibold text-[#1e3a8a]">
              เหลือ {pending.length} รายการ
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-[#e5e7eb] border-t border-[#e5e7eb] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff5df] text-[#9a5c00]">
              <ClockIcon />
            </span>
            <div>
              <p className="text-[10px] text-[#6b7280]">รอตรวจสอบทั้งหมด</p>
              <p className="text-[15px] font-semibold leading-tight text-[#111827]">
                {pending.length}{" "}
                <span className="text-[10px] font-normal text-[#6b7280]">
                  รายการ
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fce8e9] text-[#9e2a30]">
              <AlertIcon />
            </span>
            <div>
              <p className="text-[10px] text-[#6b7280]">AI พบประเด็น</p>
              <p className="text-[15px] font-semibold leading-tight text-[#111827]">
                {flagged}{" "}
                <span className="text-[10px] font-normal text-[#6b7280]">
                  รายการ
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f1fc] text-[#1e3a8a]">
              <ClipboardIcon />
            </span>
            <div>
              <p className="text-[10px] text-[#6b7280]">แสดงผลการกรอง</p>
              <p className="text-[15px] font-semibold leading-tight text-[#111827]">
                {filtered.length}{" "}
                <span className="text-[10px] font-normal text-[#6b7280]">
                  รายการ
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-lg border border-[#e3e6ea] bg-white p-3 shadow-[0_1px_3px_rgba(16,24,40,0.05)] sm:p-4">
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
              placeholder="ค้นหาชื่อ เลขที่อ้างอิง หรือหลักสูตร"
            />
          </div>
          <div className="w-full sm:w-[190px]">
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

        <div className="mt-3 space-y-2">
          {rows.map((item) => (
            <Link
              key={item.ref}
              href={`/admin/applicants/${encodeURIComponent(item.ref)}?mode=review`}
              className="group flex flex-col gap-3 rounded-[7px] border border-[#e5e7eb] bg-white p-3 transition-colors hover:border-[#9db9de] hover:bg-[#f9fbff] sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    item.documents?.find((d) => d.kind === "photo")?.dataUrl ||
                    "/assets/applicant-photo.png"
                  }
                  alt=""
                  className="h-12 w-10 shrink-0 rounded-[4px] border border-[#e5e7eb] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="truncate text-[12.5px] font-semibold text-[#111827]">
                      {item.name}
                    </p>
                    <span className="text-[10px] font-medium text-[#1e3a8a]">
                      {item.ref}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-[#4b5563]">
                    {courses.find((c) => c.id === item.courseId)?.title ??
                      item.courseTitle}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-[#6b7280]">
                    <span>ยื่น {formatThaiDateTime(item.submittedAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      <svg
                        className="h-2.5 w-2.5"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M5 2.5h6l4 4v11H5z"
                        />
                        <path
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M11 2.5v4h4"
                        />
                      </svg>
                      เอกสาร {item.documents.length} ไฟล์
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 sm:w-[220px] sm:shrink-0">
                <div className="w-full max-w-[154px]">
                  <AiVerdictBadge verdict={item.ai} />
                </div>
                <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[5px] border border-[#c7d7ea] bg-white px-2.5 text-[10.5px] font-semibold text-[#1e3a8a] transition-colors group-hover:bg-[#1e3a8a] group-hover:text-white">
                  ตรวจสอบ
                  <ArrowIcon />
                </span>
              </div>
            </Link>
          ))}

          {rows.length === 0 && (
            <div className="rounded-[7px] border border-dashed border-[#d1d5db] px-4 py-12 text-center">
              <p className="text-[13px] font-semibold text-[#111827]">
                {pending.length === 0
                  ? "ตรวจครบทุกรายการแล้ว"
                  : "ไม่พบผู้สมัครที่ตรงกับเงื่อนไข"}
              </p>
              <p className="mt-1 text-[11px] text-[#6b7280]">
                {pending.length === 0
                  ? "รายการที่อนุมัติหรือไม่อนุมัติแล้วจะย้ายไปหน้ารายชื่อผู้สมัคร"
                  : "ลองล้างคำค้นหาหรือเปลี่ยนหลักสูตร"}
              </p>
              {pending.length === 0 && (
                <Link
                  href="/admin/applicants"
                  className="mt-3 inline-flex h-9 items-center rounded-[6px] bg-[#1e3a8a] px-4 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#1e40af]"
                >
                  ดูรายชื่อผู้สมัครทั้งหมด
                </Link>
              )}
            </div>
          )}
        </div>

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
    </div>
  );
}
