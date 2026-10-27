import * as XLSX from "xlsx";
import type { ApplicantRecord } from "@/lib/applications-store";
import { formatThaiDateTime } from "@/lib/applications-store";
import { statusLabel } from "@/lib/admin-data";
import type { Course } from "@/lib/courses";

interface ExportExcelOptions {
  filename?: string;
  sheetName?: string;
  courseTitle?: string;
  courses?: Course[];
}

export function exportApplicantsToExcel(
  applicants: ApplicantRecord[],
  options: ExportExcelOptions = {}
) {
  const {
    filename,
    sheetName = "รายชื่อผู้สมัคร",
    courseTitle,
    courses = [],
  } = options;

  const courseMap = new Map(courses.map((c) => [c.id, c.title]));

  // Header row
  const headers = [
    "ลำดับ",
    "รหัสใบสมัคร",
    "เลขที่ใบรับการสมัคร",
    "ชื่อ-นามสกุล",
    "เลขประจำตัวประชาชน",
    "เบอร์โทรศัพท์",
    "อีเมล",
    "กลุ่มเป้าหมาย / ต้นสังกัด",
    "ตำแหน่ง",
    "หลักสูตรที่สมัคร",
    "สถานะการพิจารณา",
    "วันที่ยื่นสมัคร",
    "วันที่พิจารณา",
    "ผู้พิจารณา",
    "หมายเหตุ / เหตุผลการพิจารณา",
  ];

  // Data rows
  const rows = applicants.map((app, index) => {
    const courseName =
      courseMap.get(app.courseId) || app.courseTitle || app.course || "-";
    const statusText = statusLabel(app.status);
    const submittedText = app.submittedAt
      ? formatThaiDateTime(app.submittedAt)
      : "-";
    const reviewedText = app.reviewedAt
      ? formatThaiDateTime(app.reviewedAt)
      : "-";

    return [
      index + 1,
      app.ref,
      app.receiptNo || app.ref,
      app.name,
      // Format ID card with single quote prefix so Excel treats it as text and doesn't trim leading zeros or format as scientific notation
      `'${app.idCard}`,
      `'${app.phone || "-"}`,
      app.email || "-",
      app.affiliation || "-",
      app.position || "-",
      courseName,
      statusText,
      submittedText,
      reviewedText,
      app.reviewedBy || "-",
      app.reviewReason || "-",
    ];
  });

  // Title rows for official SAT Report
  const todayThai = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const titleRow = [
    "การกีฬาแห่งประเทศไทย (กกท.) - รายงานรายชื่อผู้สมัครเข้ารับการอบรม",
  ];
  const subTitleRow = [
    `หลักสูตร: ${courseTitle || "ทุกหลักสูตร"} | จำนวนทั้งหมด: ${applicants.length} คน | วันที่พิมพ์รายงาน: ${todayThai}`,
  ];
  const emptyRow: string[] = [];

  const worksheetData = [titleRow, subTitleRow, emptyRow, headers, ...rows];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Define column widths for crisp Excel viewing
  ws["!cols"] = [
    { wch: 6 }, // ลำดับ
    { wch: 18 }, // รหัสใบสมัคร
    { wch: 20 }, // เลขที่ใบรับการสมัคร
    { wch: 28 }, // ชื่อ-นามสกุล
    { wch: 18 }, // เลขประจำตัวประชาชน
    { wch: 15 }, // เบอร์โทร
    { wch: 26 }, // อีเมล
    { wch: 34 }, // สังกัด
    { wch: 22 }, // ตำแหน่ง
    { wch: 42 }, // หลักสูตรที่สมัคร
    { wch: 22 }, // สถานะการพิจารณา
    { wch: 22 }, // วันที่ยื่นสมัคร
    { wch: 22 }, // วันที่พิจารณา
    { wch: 18 }, // ผู้พิจารณา
    { wch: 38 }, // หมายเหตุ
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  // Determine filename
  const now = new Date();
  const dateStr = `${now.getFullYear() + 543}${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`;
  const defaultFilename = filename || `รายชื่อผู้สมัคร_กกท_${dateStr}.xlsx`;

  // Write and trigger browser download
  XLSX.writeFile(wb, defaultFilename);
}
