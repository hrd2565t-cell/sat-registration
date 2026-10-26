"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { adminCourseOptions, statusLabel } from "@/lib/admin-data";
import {
  formatThaiDate,
  reviewApplication,
  useApplications,
} from "@/lib/applications-store";
import { AiVerdictBadge } from "@/components/admin/ai-verdict-badge";
import { ReviewDecisionDialog } from "@/components/admin/review-decision-dialog";
import { StatusBadge } from "@/components/admin/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";

const DEFAULT_PAGE_SIZE = 5;

const courseOptions = [
  { value: "", label: "ทุกหลักสูตร" },
  ...adminCourseOptions.map((course) => ({
    value: String(course.id),
    label: course.label,
  })),
];

const statusOptions = [
  { value: "all", label: "แสดง: ทั้งหมด" },
  { value: "pending", label: "แสดง: รอตรวจสอบ" },
  { value: "approved", label: "แสดง: อนุมัติแล้ว (ตัวจริง)" },
  { value: "reserve", label: "แสดง: บัญชีสำรอง" },
  { value: "rejected", label: "แสดง: ไม่ผ่าน" },
];

function FileIcon() {
  return (
    <svg
      className="h-2.5 w-2.5 shrink-0"
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
      <path strokeLinejoin="round" strokeWidth="1.8" d="M11 2.5v4h4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-2.5 w-2.5 shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        d="M4 10.5l4 4 8-8"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="h-2.5 w-2.5 shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeWidth="2.2"
        d="M5 5l10 10M15 5L5 15"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M8 5l5 5-5 5"
      />
    </svg>
  );
}

interface ApplicantsTableProps {
  title?: string;
  description?: string;
  initialStatus?: string;
  initialCourse?: string;
  pageSize?: number;
  showFilters?: boolean;
  showExport?: boolean;
  showTitle?: boolean;
}

export function ApplicantsTable({
  title = "รายชื่อผู้สมัคร",
  description,
  initialStatus = "all",
  initialCourse = "",
  pageSize = DEFAULT_PAGE_SIZE,
  showFilters = true,
  showExport = true,
  showTitle = true,
}: ApplicantsTableProps) {
  const { applications } = useApplications();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState(initialCourse);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [rejectTarget, setRejectTarget] = useState<{
    ref: string;
    name: string;
  } | null>(null);

  const rows = useMemo(
    () =>
      [...applications].sort(
        (left, right) =>
          Date.parse(right.submittedAt) - Date.parse(left.submittedAt)
      ),
    [applications]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesCourse =
        courseFilter === "" || row.courseId === Number(courseFilter);
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const matchesQuery =
        query === "" ||
        row.name.toLowerCase().includes(query) ||
        row.ref.toLowerCase().includes(query) ||
        row.idCard.includes(query) ||
        row.course.toLowerCase().includes(query);

      return matchesCourse && matchesStatus && matchesQuery;
    });
  }, [courseFilter, rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);

  const handleQuickApprove = (ref: string, name: string) => {
    reviewApplication(ref, "approved", "อนุมัติจากหน้ารายการผู้สมัคร");
    setNotice(`อนุมัติ ${name} เรียบร้อยแล้ว`);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleExport = () => {
    const header = [
      "ลำดับ",
      "รหัสอ้างอิง",
      "ชื่อ-นามสกุล",
      "เลขบัตรประชาชน",
      "หลักสูตรที่สมัคร",
      "เอกสารคุณสมบัติ",
      "ผลการตรวจสอบ AI",
      "สถานะการจัดการ",
      "วันที่สมัคร",
    ];

    const data = filteredRows.map((row, index) => [
      index + 1,
      row.ref,
      row.name,
      row.idCard,
      row.course,
      row.fileSize ? `เปิดไฟล์ (${row.fileSize} MB)` : "ไม่มีไฟล์",
      `${row.ai.line1} ${row.ai.line2}`,
      statusLabel(row.status),
      formatThaiDate(row.submittedAt, true),
    ]);

    const escapeCell = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv =
      "\uFEFF" +
      [header, ...data]
        .map((line) => line.map(escapeCell).join(","))
        .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "applicants-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex h-full flex-col rounded-md border border-[#e3e6ea] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)] print:border-0 print:p-0 print:shadow-none">
      {showTitle && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold leading-[21px] text-[#111827] sm:text-[19px]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[11px] leading-relaxed text-[#6b7280]">
                {description}
              </p>
            )}
          </div>

          {showFilters && (
            <div className="flex w-full items-center gap-2 print:hidden sm:w-auto sm:gap-[10px]">
              <Select
                aria-label="เลือกหลักสูตร"
                className="min-w-0 flex-1 sm:w-[128px] sm:flex-none [&>select]:h-9 sm:[&>select]:h-[21px]"
                value={courseFilter}
                options={courseOptions}
                onValueChange={(value) => {
                  setCourseFilter(value);
                  setPage(1);
                }}
              />
              <Select
                aria-label="กรองสถานะ"
                className="min-w-0 flex-1 sm:w-[118px] sm:flex-none [&>select]:h-9 sm:[&>select]:h-[21px]"
                value={statusFilter}
                options={statusOptions}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {notice && (
        <p
          role="status"
          className="mt-2 rounded-[4px] border border-[#b9dbc5] bg-[#eef9f1] px-2.5 py-1.5 text-[11px] text-[#176c3a]"
        >
          {notice}
        </p>
      )}

      {showFilters && (
        <div className="mt-3 flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <SearchInput
            aria-label="ค้นหารายชื่อ"
            placeholder="ค้นหาชื่อ เลขใบสมัคร หรือเลขบัตร..."
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            className="w-full sm:w-[240px] [&_input]:h-9 sm:[&_input]:h-[24px]"
          />

          {showExport && (
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleExport}
                className="h-9 whitespace-nowrap rounded-[4px] bg-[#078A43] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#067537] sm:h-[25px] sm:px-[13px] sm:text-[9px]"
              >
                ดาวน์โหลดรายงาน (Excel/CSV)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 whitespace-nowrap rounded-[4px] bg-[#D4D7DB] px-3 text-[11px] font-semibold text-[#111827] transition-colors hover:bg-[#c6cad0] sm:h-[25px] sm:text-[9px]"
              >
                พิมพ์รายงาน (PDF)
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[780px] table-fixed border-collapse text-left xl:min-w-0 print:min-w-0">
          <colgroup>
            <col className="w-[4.5%]" />
            <col className="w-[10.5%]" />
            <col className="w-[14%]" />
            <col className="w-[17%]" />
            <col className="w-[16%]" />
            <col className="w-[19%]" />
            <col className="w-[19%]" />
          </colgroup>

          <thead>
            <tr className="border-b border-[#e3e6ea] bg-[#EEF2F7] text-[9.5px] font-semibold text-[#111827]">
              <th scope="col" className="px-1.5 py-[7px] text-center">
                ลำดับ
              </th>
              <th scope="col" className="px-1.5 py-[7px]">
                รหัสอ้างอิง
              </th>
              <th scope="col" className="px-1.5 py-[7px]">
                ชื่อ-นามสกุล
              </th>
              <th scope="col" className="px-1.5 py-[7px]">
                หลักสูตรที่สมัคร
              </th>
              <th scope="col" className="px-1.5 py-[7px]">
                เอกสารคุณสมบัติ
              </th>
              <th scope="col" className="px-1.5 py-[7px]">
                ผลการตรวจสอบ AI
              </th>
              <th scope="col" className="px-1.5 py-[7px]">
                สถานะการจัดการ
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.ref}
                data-testid="applicant-row"
                data-ref={row.ref}
                className="h-[48px] border-b border-[#e7eaee] align-middle text-[9.5px] text-[#1f2937] transition-colors hover:bg-[#f8fafc]"
              >
                <td className="px-1.5 py-1 text-center text-[#374151]">
                  {row.id}
                </td>
                <td className="px-1.5 py-1">
                  <span className="whitespace-nowrap font-medium text-[#1e3a8a]">
                    {row.ref}
                  </span>
                </td>
                <td className="py-1 pl-1.5 pr-1 leading-[1.3]">
                  <Link
                    href={`/admin/applicants/${row.ref}`}
                    className="font-medium text-[#111827] underline-offset-2 hover:text-[#1d4ed8] hover:underline"
                  >
                    {row.name}
                  </Link>
                  <p className="mt-0.5 text-[8px] text-[#6b7280]">
                    {formatThaiDate(row.submittedAt)}
                  </p>
                </td>
                <td className="px-1.5 py-1 pr-1">
                  <div className="line-clamp-2 leading-[1.3]">{row.course}</div>
                </td>
                <td className="py-1 pl-0.5 pr-1.5">
                  {row.fileSize ? (
                    <Link
                      href={`/admin/applicants/${row.ref}#documents`}
                      className="inline-flex min-h-5 items-center gap-1 rounded-[3px] bg-[#1378D0] px-1.5 py-0.5 text-[8.5px] font-semibold text-white transition-colors hover:bg-[#0f68b5]"
                    >
                      <FileIcon />
                      เปิดไฟล์ ({row.fileSize} MB)
                    </Link>
                  ) : (
                    <span className="text-[9px] text-[#6b7280]">
                      ไม่มีไฟล์
                    </span>
                  )}
                </td>
                <td className="px-1 py-1">
                  <AiVerdictBadge verdict={row.ai} />
                </td>
                <td className="px-1 py-1">
                  <div className="flex flex-wrap items-center gap-1 print:hidden">
                    {row.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickApprove(row.ref, row.name)
                          }
                          className="inline-flex min-h-5 items-center gap-1 rounded-[4px] border border-[#7FB394] bg-[#D7F3E1] px-1.5 py-0.5 text-[8px] font-medium text-[#176C3A] transition-colors hover:bg-[#c7eed4]"
                        >
                          <CheckIcon />
                          อนุมัติ
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRejectTarget({ ref: row.ref, name: row.name })
                          }
                          className="inline-flex min-h-5 items-center gap-1 rounded-[4px] border border-[#CA8E90] bg-[#F9D7D8] px-1.5 py-0.5 text-[8px] font-medium text-[#9E2A30] transition-colors hover:bg-[#f4c7c9]"
                        >
                          <XIcon />
                          ไม่อนุมัติ
                        </button>
                      </>
                    ) : (
                      <StatusBadge status={row.status} reserveOrder={row.reserveOrder} className="h-5 text-[8px]" />
                    )}
                    <Link
                      href={`/admin/applicants/${row.ref}`}
                      aria-label={`ดูรายละเอียด ${row.name}`}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] border border-[#d1d5db] bg-white text-[#4b5563] transition-colors hover:bg-[#f3f4f6]"
                    >
                      <ChevronIcon />
                    </Link>
                  </div>
                  <div className="hidden print:block">
                    <StatusBadge status={row.status} reserveOrder={row.reserveOrder} />
                  </div>
                </td>
              </tr>
            ))}

            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="h-32 text-center text-[11px] text-[#6b7280]"
                >
                  ไม่พบข้อมูลผู้สมัคร
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 space-y-2 md:hidden">
        {visibleRows.map((row) => (
          <article
            key={row.ref}
            data-testid="applicant-card"
            className="rounded-lg border border-[#e3e6ea] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/admin/applicants/${row.ref}`}
                  className="block truncate text-[13px] font-semibold text-[#111827]"
                >
                  {row.name}
                </Link>
                <p className="mt-0.5 text-[10px] text-[#6b7280]">
                  {row.ref} · {formatThaiDate(row.submittedAt)}
                </p>
              </div>
              <StatusBadge status={row.status} reserveOrder={row.reserveOrder} />
            </div>

            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[#374151]">
              {row.course}
            </p>

            <div className="mt-2">
              <AiVerdictBadge verdict={row.ai} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/applicants/${row.ref}`}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-[5px] bg-[#1e3a8a] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#1e40af]"
              >
                ดูรายละเอียด
                <ChevronIcon />
              </Link>
              {row.status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickApprove(row.ref, row.name)
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-[5px] border border-[#7FB394] bg-[#D7F3E1] px-3 text-[11px] font-semibold text-[#176C3A]"
                  >
                    <CheckIcon />
                    อนุมัติ
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRejectTarget({ ref: row.ref, name: row.name })
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-[5px] border border-[#CA8E90] bg-[#F9D7D8] px-3 text-[11px] font-semibold text-[#9E2A30]"
                  >
                    <XIcon />
                    ไม่ผ่าน
                  </button>
                </>
              )}
            </div>
          </article>
        ))}

        {visibleRows.length === 0 && (
          <p className="rounded-lg border border-dashed border-[#d1d5db] bg-white px-3 py-10 text-center text-[11px] text-[#6b7280]">
            ไม่พบข้อมูลผู้สมัคร
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#eef0f3] pt-2 text-[10px] text-[#4b5563]">
        <span>
          แสดง {filteredRows.length === 0 ? 0 : startIndex + 1} -{" "}
          {Math.min(startIndex + pageSize, filteredRows.length)} จาก{" "}
          {filteredRows.length} รายการ
        </span>
        <div className="print:hidden">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      {rejectTarget && (
        <ReviewDecisionDialog
          key={rejectTarget.ref}
          open
          decision="rejected"
          applicantName={rejectTarget.name}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => {
            reviewApplication(rejectTarget.ref, "rejected", reason);
            setNotice(`ไม่อนุมัติ ${rejectTarget.name} เรียบร้อยแล้ว`);
            setRejectTarget(null);
          }}
        />
      )}
    </section>
  );
}
