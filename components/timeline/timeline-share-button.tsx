"use client";

import { DownloadIcon } from "@/components/ui/icons";
import { useCourses } from "@/lib/courses-store";
import { parseCourseDateSessions } from "@/lib/courses";
import {
  useSportsEvents,
  getEventYear,
  getFiscalQuarter,
  dateToTimelinePercent,
} from "@/lib/sports-events-store";

const FISCAL_MONTH_LABELS = [
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function TimelineExportButtons() {
  const { courses } = useCourses();
  const { events } = useSportsEvents();

  // 1. Export as Official Printable PDF (A4 Landscape with Live Data)
  const handleDownloadPdf = () => {
    const printWin = window.open("", "_blank", "width=1200,height=850");
    if (!printWin) {
      alert("กรุณาอนุญาตให้เปิดหน้าต่างป๊อปอัป (Pop-up) เพื่อสร้างไฟล์ PDF");
      return;
    }

    const courseRowsHtml = courses
      .map((course, idx) => {
        const sessions = parseCourseDateSessions(course.date);
        const first = sessions[0];
        const quarter = first ? getFiscalQuarter(first.startMonth + 1) : 2;
        const totalDays = sessions.reduce((acc, s) => {
          const yearCE = s.yearBE - 543;
          const start = new Date(yearCE, s.startMonth, s.startDay);
          const end = new Date(yearCE, s.endMonth, s.endDay);
          const diff =
            Math.round(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;
          return acc + Math.max(1, diff);
        }, 0);

        const barsHtml = sessions
          .map((s) => {
            const left = dateToTimelinePercent(s.startDay, s.startMonth + 1);
            const right = dateToTimelinePercent(s.endDay + 1, s.endMonth + 1);
            const width = Math.max(1.8, right - left);
            return `<div style="position:absolute;top:50%;transform:translateY(-50%);left:${left.toFixed(
              1
            )}%;width:${width.toFixed(
              1
            )}%;height:18px;background:#16803c;border-radius:999px;"></div>`;
          })
          .join("");

        const lastSession = sessions[sessions.length - 1] ?? first;
        const endPct = lastSession
          ? dateToTimelinePercent(lastSession.endDay + 1, lastSession.endMonth + 1)
          : 50;
        const labelStyle =
          endPct > 70
            ? `right:${(100 - dateToTimelinePercent(first.startDay, first.startMonth + 1) + 1).toFixed(1)}%`
            : `left:${(endPct + 1).toFixed(1)}%`;

        return `
          <tr>
            <td class="item-cell">
              <div class="badge-row">
                <span class="badge-course">หลักสูตรที่ ${idx + 1}</span>
                <span class="badge-q">ไตรมาส ${quarter}</span>
                <span class="days-text">${
                  sessions.length > 1
                    ? `${sessions.length} ช่วง · รวม ${totalDays} วัน`
                    : `รวม ${totalDays} วัน`
                }</span>
              </div>
              <div class="item-title">${escapeHtml(course.title)}</div>
              <div class="item-sub">📅 ${escapeHtml(course.date)} • 📍 ${escapeHtml(
          course.location
        )}</div>
            </td>
            <td colspan="12" class="track-cell">
              <div class="track-wrap">
                <div class="grid-12">
                  ${FISCAL_MONTH_LABELS.map(
                    (_, i) =>
                      `<span class="${i % 3 === 2 ? "q-end" : ""}"></span>`
                  ).join("")}
                </div>
                ${barsHtml}
                <div class="outside-label course-label" style="${labelStyle}">
                  ${escapeHtml(course.date.replace(/\s*25\d{2}$/, ""))} (${totalDays} วัน)
                </div>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    const eventRowsHtml = events
      .map((evt) => {
        const quarter = getFiscalQuarter(evt.startMonth);
        const yr = getEventYear(evt);
        const endPct = evt.left + evt.width;
        const labelStyle =
          endPct > 70
            ? `right:${(100 - evt.left + 1).toFixed(1)}%`
            : `left:${(endPct + 1).toFixed(1)}%`;

        return `
          <tr class="event-row">
            <td class="item-cell">
              <div class="badge-row">
                <span class="badge-event">🏆 ${escapeHtml(evt.categoryLabel)}</span>
                <span class="badge-q">ไตรมาส ${quarter} (ปี ${yr})</span>
              </div>
              <div class="item-title">${escapeHtml(evt.title)}</div>
              <div class="item-sub">📅 ${escapeHtml(evt.dateRange)} • 📍 ${escapeHtml(
          evt.location
        )}</div>
            </td>
            <td colspan="12" class="track-cell">
              <div class="track-wrap">
                <div class="grid-12">
                  ${FISCAL_MONTH_LABELS.map(
                    (_, i) =>
                      `<span class="${i % 3 === 2 ? "q-end" : ""}"></span>`
                  ).join("")}
                </div>
                <div style="position:absolute;top:50%;transform:translateY(-50%);left:${evt.left.toFixed(
                  1
                )}%;width:${evt.width.toFixed(
          1
        )}%;height:18px;background:#6d28d9;border-radius:999px;"></div>
                <div class="outside-label event-label" style="${labelStyle}">
                  🏆 ${escapeHtml(evt.dateRange)} • ${escapeHtml(evt.location)}
                </div>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>ปฏิทินแผนการฝึกอบรมและการแข่งขันกีฬา กกท. (พ.ศ. 2570–2571)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Sarabun', sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 16px;
      background: #fff;
    }
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #16265E;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .top-bar h1 {
      font-size: 18px;
      margin: 0;
      color: #16265E;
    }
    .top-bar p {
      font-size: 12px;
      margin: 3px 0 0;
      color: #475569;
    }
    .print-actions {
      display: flex;
      gap: 8px;
    }
    .btn-print {
      background: #16265E;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      .print-actions { display: none !important; }
      body { padding: 0; }
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #cbd5e1;
    }
    .q-header th {
      background: #16265E;
      color: #fff;
      font-size: 11px;
      padding: 6px 4px;
    }
    .m-header th {
      background: #f1f5f9;
      color: #334155;
      font-size: 10.5px;
      padding: 4px 2px;
      text-align: center;
    }
    .sec-course th {
      background: #f0fdf4;
      color: #166534;
      font-size: 11px;
      text-align: left;
      padding: 5px 10px;
    }
    .sec-event th {
      background: #f5f3ff;
      color: #6d28d9;
      font-size: 11px;
      text-align: left;
      padding: 5px 10px;
    }
    .item-cell {
      padding: 6px 8px;
      vertical-align: middle;
    }
    .badge-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 2px;
    }
    .badge-course {
      background: #16265E;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .badge-event {
      background: #ede9fe;
      color: #6d28d9;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .badge-q {
      background: #e2e8f0;
      color: #334155;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .days-text {
      font-size: 9px;
      font-weight: 700;
      color: #15803d;
    }
    .item-title {
      font-size: 11px;
      font-weight: 700;
      line-height: 1.25;
      color: #0f172a;
    }
    .item-sub {
      font-size: 9.5px;
      color: #475569;
      margin-top: 2px;
    }
    .track-cell {
      padding: 0;
      position: relative;
      height: 46px;
    }
    .track-wrap {
      position: relative;
      width: 100%;
      height: 46px;
      overflow: hidden;
    }
    .grid-12 {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: repeat(12, 1fr);
    }
    .grid-12 span {
      border-right: 1px solid #f1f5f9;
    }
    .grid-12 span.q-end {
      border-right: 1px solid #cbd5e1;
    }
    .outside-label {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      white-space: nowrap;
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .course-label {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .event-label {
      background: #f5f3ff;
      color: #5b21b6;
      border: 1px solid #ddd6fe;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div>
      <h1>Timeline แผนกำหนดการฝึกอบรมและปฏิทินการแข่งขันกีฬา (การกีฬาแห่งประเทศไทย)</h1>
      <p>เรียงตามปีงบประมาณ ไตรมาส 1 (ต.ค. – ธ.ค.) ถึง ไตรมาส 4 (ก.ค. – ก.ย.) • ข้อมูล ณ วันที่ ${new Date().toLocaleDateString(
        "th-TH"
      )}</p>
    </div>
    <div class="print-actions">
      <button class="btn-print" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็นไฟล์ PDF</button>
    </div>
  </div>

  <table>
    <colgroup>
      <col style="width: 30%" />
      ${FISCAL_MONTH_LABELS.map(() => `<col style="width: 5.833%" />`).join("")}
    </colgroup>
    <thead>
      <tr class="q-header">
        <th rowspan="2" style="text-align:left;padding-left:10px;">หลักสูตร / รายการแข่งขันกีฬา</th>
        <th colspan="3">ไตรมาส 1 (ต.ค. – ธ.ค.)</th>
        <th colspan="3">ไตรมาส 2 (ม.ค. – มี.ค.)</th>
        <th colspan="3">ไตรมาส 3 (เม.ย. – มิ.ย.)</th>
        <th colspan="3">ไตรมาส 4 (ก.ค. – ก.ย.)</th>
      </tr>
      <tr class="m-header">
        ${FISCAL_MONTH_LABELS.map((m) => `<th>${m}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      <tr class="sec-course">
        <th colspan="13">🎓 แผนกำหนดการฝึกอบรม (${courses.length} หลักสูตร)</th>
      </tr>
      ${courseRowsHtml}
      <tr class="sec-event">
        <th colspan="13">🏆 ปฏิทินการแข่งขันกีฬาสำคัญ (${events.length} รายการ)</th>
      </tr>
      ${eventRowsHtml}
    </tbody>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 350);
    };
  </script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  // 2. Export as Excel-compatible CSV (UTF-8 BOM)
  const handleDownloadCsv = () => {
    const headers = [
      "ประเภท",
      "ไตรมาส (ปีงบประมาณ)",
      "ปี พ.ศ.",
      "หมวดหมู่ / ชื่อย่อ",
      "ชื่อหลักสูตร / รายการแข่งขัน",
      "ช่วงวันที่",
      "สถานที่ / รายละเอียด",
    ];

    const rows: string[][] = [];

    courses.forEach((c) => {
      const sessions = parseCourseDateSessions(c.date);
      const first = sessions[0];
      const q = first ? getFiscalQuarter(first.startMonth + 1) : 2;
      const yr = first?.yearBE ?? 2570;
      rows.push([
        "หลักสูตรอบรม",
        `ไตรมาส ${q}`,
        String(yr),
        c.shortTitle || "-",
        c.title,
        c.date,
        `${c.location} (${c.seats})`,
      ]);
    });

    events.forEach((e) => {
      const q = getFiscalQuarter(e.startMonth);
      const yr = getEventYear(e);
      rows.push([
        "การแข่งขันกีฬา",
        `ไตรมาส ${q}`,
        String(yr),
        e.categoryLabel,
        e.title,
        e.dateRange,
        e.location,
      ]);
    });

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((r) =>
          r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timeline-sat-2570-2571.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleDownloadPdf}
        className="flex h-[28px] w-full items-center justify-center gap-1.5 rounded-[5px] bg-[#122b5c] text-[10.5px] font-semibold text-white transition-colors hover:bg-[#0d2149] xl:h-[clamp(30px,2.2vw,36px)] xl:text-[clamp(11.5px,0.8vw,13px)]"
      >
        <DownloadIcon className="h-[1.2em] w-[1.2em] shrink-0" />
        ดาวน์โหลดปฏิทินอบรมทั้งหมด (PDF)
      </button>

      <button
        type="button"
        onClick={handleDownloadCsv}
        className="flex h-[28px] w-full items-center justify-center gap-1.5 rounded-[5px] border border-[#d5dbe0] bg-[#eef2f5] text-[10.5px] font-medium text-[#374151] transition-colors hover:bg-[#e3e9ed] xl:h-[clamp(30px,2.2vw,36px)] xl:text-[clamp(11.5px,0.8vw,13px)]"
      >
        <DownloadIcon className="h-[1.2em] w-[1.2em] shrink-0" />
        ดาวน์โหลดตารางข้อมูล (Excel / CSV)
      </button>
    </div>
  );
}

export function TimelineShareButton() {
  return <TimelineExportButtons />;
}
