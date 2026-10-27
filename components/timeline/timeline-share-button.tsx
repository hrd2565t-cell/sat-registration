"use client";

import { DownloadIcon } from "@/components/ui/icons";
import { useCourses } from "@/lib/courses-store";
import {
  getCourseScheduleDates,
  parseCourseDateSessions,
} from "@/lib/courses";
import {
  useSportsEvents,
  TIMELINE_SLOTS,
  getEventYear,
  getFiscalQuarter,
  yearMonthToSlotIndex,
  dateToTimelinePercent,
} from "@/lib/sports-events-store";

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

  // 1. Export as Official Printable PDF (A4 Landscape with Live Data across 16 months)
  const handleDownloadPdf = () => {
    const printWin = window.open("", "_blank", "width=1240,height=860");
    if (!printWin) {
      alert("กรุณาอนุญาตให้เปิดหน้าต่างป๊อปอัป (Pop-up) เพื่อสร้างไฟล์ PDF");
      return;
    }

    const sortedCourses = [...courses].sort((a, b) => {
      const sa = parseCourseDateSessions(a.date)[0];
      const sb = parseCourseDateSessions(b.date)[0];
      const la = sa
        ? dateToTimelinePercent(sa.startDay, sa.startMonth + 1, sa.yearBE)
        : 0;
      const lb = sb
        ? dateToTimelinePercent(sb.startDay, sb.startMonth + 1, sb.yearBE)
        : 0;
      return la - lb;
    });

    const sortedEvents = [...events].sort((a, b) => a.left - b.left);

    const grid16Html = TIMELINE_SLOTS.map(
      (s) =>
        `<span class="m-col ${
          s.index === 11
            ? "fy-end"
            : s.index % 3 === 2 && s.index < 11
            ? "q-end"
            : ""
        } ${
          s.isPostFiscal ? "post-fy" : ""
        }"><i></i><i></i><i></i><i></i></span>`
    ).join("");

    const courseRowsHtml = sortedCourses
      .map((course, idx) => {
        const sched = getCourseScheduleDates(course, courses);
        const sessions = parseCourseDateSessions(course.date);
        const first = sessions[0];
        const firstSlotIdx = first
          ? yearMonthToSlotIndex(first.startMonth + 1, first.yearBE)
          : 4;
        const quarterLabel =
          TIMELINE_SLOTS[firstSlotIdx]?.quarterLabel ?? "ไตรมาส 2";

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

        const lastSession = sessions[sessions.length - 1] ?? first;
        const startPct = first
          ? dateToTimelinePercent(
              first.startDay,
              first.startMonth + 1,
              first.yearBE
            )
          : 25;
        const endPct = lastSession
          ? dateToTimelinePercent(
              lastSession.endDay + 1,
              lastSession.endMonth + 1,
              lastSession.yearBE
            )
          : 50;

        const railHtml =
          sessions.length > 1
            ? `<div style="position:absolute;top:50%;transform:translateY(-50%);left:${startPct.toFixed(
                2
              )}%;width:${Math.max(0.8, endPct - startPct).toFixed(
                2
              )}%;height:7px;background:#bbf7d0;border:1px solid #16a34a;border-radius:2px;"></div>`
            : "";

        const barsHtml = sessions
          .map((s) => {
            const left = dateToTimelinePercent(
              s.startDay,
              s.startMonth + 1,
              s.yearBE
            );
            const right = dateToTimelinePercent(
              s.endDay + 1,
              s.endMonth + 1,
              s.yearBE
            );
            const width = Math.max(0.55, right - left);
            return `<div style="position:absolute;top:50%;transform:translateY(-50%);left:${left.toFixed(
              2
            )}%;width:${width.toFixed(
              2
            )}%;height:18px;background:#16803c;border-radius:4px;border:1px solid #fff;"></div>`;
          })
          .join("");

        const labelStyle =
          endPct > 68
            ? `right:${(100 - startPct + 0.6).toFixed(2)}%`
            : `left:${(endPct + 0.6).toFixed(2)}%`;

        return `
          <tr>
            <td class="item-cell">
              <div class="badge-row">
                <span class="badge-course">หลักสูตรที่ ${idx + 1}</span>
                <span class="badge-q">${escapeHtml(quarterLabel)}</span>
                <span class="days-text">${
                  sessions.length > 1
                    ? `${sessions.length} ช่วง · รวม ${totalDays} วัน`
                    : `รวม ${totalDays} วัน`
                }</span>
              </div>
              <div class="item-title">${escapeHtml(course.title)}</div>
              <div class="item-sub" style="color:#1869bc;font-weight:600;">📥 รับสมัคร: ${escapeHtml(
                sched.registrationDate
              )} • <span style="color:#c4080f;">📣 ประกาศผล: ${escapeHtml(
          sched.resultDate
        )}</span></div>
              <div class="item-sub">🎓 อบรม: ${escapeHtml(course.date)} • 📍 ${escapeHtml(
          course.location
        )} • 👥 ${escapeHtml(
          course.seats.replace(/^จำนวนที่นั่ง\s*/, "")
        )}</div>
            </td>
            <td colspan="16" class="track-cell">
              <div class="track-wrap">
                <div class="grid-16">
                  ${grid16Html}
                </div>
                ${railHtml}
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

    const eventRowsHtml = sortedEvents
      .map((evt) => {
        const yr = getEventYear(evt);
        const slotIdx = yearMonthToSlotIndex(evt.startMonth, yr);
        const quarterLabel =
          TIMELINE_SLOTS[slotIdx]?.quarterLabel ?? `ปี ${yr}`;
        const endPct = evt.left + evt.width;
        const labelStyle =
          endPct > 66
            ? `right:${(100 - evt.left + 0.6).toFixed(2)}%`
            : `left:${(endPct + 0.6).toFixed(2)}%`;

        return `
          <tr class="event-row">
            <td class="item-cell">
              <div class="badge-row">
                <span class="badge-event">🏆 ${escapeHtml(evt.categoryLabel)}</span>
                <span class="badge-q">${escapeHtml(quarterLabel)}</span>
              </div>
              <div class="item-title">${escapeHtml(evt.title)}</div>
              <div class="item-sub">📅 ${escapeHtml(evt.dateRange)} • 📍 ${escapeHtml(
          evt.location
        )}</div>
            </td>
            <td colspan="16" class="track-cell">
              <div class="track-wrap">
                <div class="grid-16">
                  ${grid16Html}
                </div>
                <div style="position:absolute;top:50%;transform:translateY(-50%);left:${evt.left.toFixed(
                  2
                )}%;width:${evt.width.toFixed(
          2
        )}%;height:18px;background:#6d28d9;border-radius:4px;border:1px solid #fff;"></div>
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
  <title>ปฏิทินแผนการฝึกอบรมและการแข่งขันกีฬา กกท. (ปีงบประมาณ พ.ศ. 2570)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 landscape; margin: 9mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Sarabun', sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 14px;
      background: #fff;
    }
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #16265E;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .top-bar h1 {
      font-size: 17px;
      margin: 0;
      color: #16265E;
    }
    .top-bar p {
      font-size: 11.5px;
      margin: 2px 0 0;
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
      padding: 7px 14px;
      font-family: inherit;
      font-size: 12.5px;
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
      font-size: 10.5px;
      padding: 5px 3px;
    }
    .q-header th.post-q {
      background: #4c1d95;
    }
    .m-header th {
      background: #f1f5f9;
      color: #334155;
      font-size: 9.5px;
      padding: 4px 1px;
      text-align: center;
    }
    .m-header th.post-m {
      background: #f5f3ff;
      color: #5b21b6;
    }
    .sec-course th {
      background: #f0fdf4;
      color: #166534;
      font-size: 10.5px;
      text-align: left;
      padding: 4px 8px;
    }
    .sec-event th {
      background: #f5f3ff;
      color: #6d28d9;
      font-size: 10.5px;
      text-align: left;
      padding: 4px 8px;
    }
    .item-cell {
      padding: 5px 8px;
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
      font-size: 8.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .badge-event {
      background: #ede9fe;
      color: #6d28d9;
      font-size: 8.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .badge-q {
      background: #e2e8f0;
      color: #334155;
      font-size: 8.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .days-text {
      font-size: 8.5px;
      font-weight: 700;
      color: #15803d;
    }
    .item-title {
      font-size: 10.5px;
      font-weight: 700;
      line-height: 1.25;
      color: #0f172a;
    }
    .item-sub {
      font-size: 9px;
      color: #475569;
      margin-top: 2px;
    }
    .track-cell {
      padding: 0;
      position: relative;
      height: 44px;
    }
    .track-wrap {
      position: relative;
      width: 100%;
      height: 44px;
      overflow: hidden;
    }
    .grid-16 {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: repeat(16, 1fr);
    }
    .grid-16 span.m-col {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border-right: 1px solid #cbd5e1;
    }
    .grid-16 span.m-col i {
      border-right: 1px dashed rgba(203, 213, 225, 0.55);
    }
    .grid-16 span.m-col i:last-child {
      border-right: none;
    }
    .grid-16 span.q-end {
      border-right: 1px solid #94a3b8;
    }
    .grid-16 span.fy-end {
      border-right: 2px solid #f59e0b;
    }
    .grid-16 span.post-fy {
      background: #faf5ff;
    }
    .outside-label {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      white-space: nowrap;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 5px;
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
      <p>ปีงบประมาณ พ.ศ. 2570 (ต.ค. 2569 – ก.ย. 2570) และช่วงต่อเนื่อง (ต.ค. 2570 – ม.ค. 2571) • ข้อมูล ณ วันที่ ${new Date().toLocaleDateString(
        "th-TH"
      )}</p>
    </div>
    <div class="print-actions">
      <button class="btn-print" onclick="window.print()">🖨️ พิมพ์ / บันทึกเป็นไฟล์ PDF</button>
    </div>
  </div>

  <table>
    <colgroup>
      <col style="width: 26%" />
      ${TIMELINE_SLOTS.map(() => `<col style="width: 4.625%" />`).join("")}
    </colgroup>
    <thead>
      <tr class="q-header">
        <th rowspan="2" style="text-align:left;padding-left:8px;">หลักสูตร / รายการแข่งขันกีฬา</th>
        <th colspan="3">ไตรมาส 1 (ต.ค. – ธ.ค. 69)</th>
        <th colspan="3">ไตรมาส 2 (ม.ค. – มี.ค. 70)</th>
        <th colspan="3">ไตรมาส 3 (เม.ย. – มิ.ย. 70)</th>
        <th colspan="3">ไตรมาส 4 (ก.ค. – ก.ย. 70)</th>
        <th colspan="4" class="post-q">หลังปีงบฯ (ต.ค. 70 – ม.ค. 71)</th>
      </tr>
      <tr class="m-header">
        ${TIMELINE_SLOTS.map(
          (s) =>
            `<th class="${s.isPostFiscal ? "post-m" : ""}">${s.shortLabel}</th>`
        ).join("")}
      </tr>
    </thead>
    <tbody>
      <tr class="sec-course">
        <th colspan="17">🎓 แผนกำหนดการฝึกอบรม (${courses.length} หลักสูตร)</th>
      </tr>
      ${courseRowsHtml}
      <tr class="sec-event">
        <th colspan="17">🏆 ปฏิทินการแข่งขันกีฬาสำคัญ (${events.length} รายการ)</th>
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
      "ช่วงวันเปิดรับสมัคร",
      "วันประกาศผล",
      "ช่วงวันจัดอบรม / แข่งขัน",
      "สถานที่ / รายละเอียด",
    ];

    const rows: string[][] = [];

    courses.forEach((c) => {
      const sched = getCourseScheduleDates(c);
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
        sched.registrationDate,
        sched.resultDate,
        c.date,
        `${c.location} (${c.seats})`,
      ]);
    });

    events.forEach((e) => {
      const yr = getEventYear(e);
      const slotIdx = yearMonthToSlotIndex(e.startMonth, yr);
      const qLabel = TIMELINE_SLOTS[slotIdx]?.quarterLabel ?? `ไตรมาส ${getFiscalQuarter(e.startMonth)}`;
      rows.push([
        "การแข่งขันกีฬา",
        qLabel,
        String(yr),
        e.categoryLabel,
        e.title,
        "-",
        "-",
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
    a.download = "timeline-sat-2570.csv";
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
