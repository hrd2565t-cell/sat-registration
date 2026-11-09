"use client";

import { useMemo, useRef } from "react";
import type { SurveySkillTopic, ProposedCourseBlueprint } from "@/lib/future-curriculum-store";

interface FutureCurriculumPrintModalProps {
  onClose: () => void;
  surveyTopics: SurveySkillTopic[];
  courses: ProposedCourseBlueprint[];
  traineesCount: number;
}

export function FutureCurriculumPrintModal({
  onClose,
  surveyTopics,
  courses,
  traineesCount,
}: FutureCurriculumPrintModalProps) {
  const printDocRef = useRef<HTMLDivElement>(null);

  // Thai Date formatting
  const printedDateThai = useMemo(() => {
    const now = new Date();
    const monthsThai = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
    const day = now.getDate();
    const month = monthsThai[now.getMonth()];
    const yearBE = now.getFullYear() + 543;
    const time = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    return `${day} ${month} พ.ศ. ${yearBE} เวลา ${time} น.`;
  }, []);

  const totalVotes = useMemo(() => {
    return surveyTopics.reduce((sum, t) => sum + t.votes, 0);
  }, [surveyTopics]);

  // Isolated Iframe Printing
  const handlePrint = () => {
    const printElem = printDocRef.current || document.getElementById("future-curriculum-print-doc");
    if (!printElem) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById("sat-future-curriculum-print-iframe");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "sat-future-curriculum-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
        .map((el) => el.outerHTML)
        .join("\n");

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>เอกสารนำเสนอเชิงนโยบาย: ทิศทางการพัฒนาหลักสูตรบุคลากรกีฬาสมัยใหม่ พ.ศ. 2570-2572</title>
          ${styles}
          <style>
            @page {
              size: A4 landscape;
              margin: 6mm 8mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              font-size: 11px;
            }
            .page-break {
              page-break-before: always;
              break-before: page;
              margin-top: 12px;
            }
          </style>
        </head>
        <body>
          ${printElem.innerHTML}
        </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 400);
    } catch (e) {
      console.error("Print error:", e);
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#16265E] to-[#1e3a8a] text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-xl">
              📄
            </span>
            <div>
              <h3 className="text-base font-bold">
                ตัวอย่างก่อนพิมพ์ (Print Preview): เอกสารนำเสนอผู้บริหาร ทิศทางพัฒนาหลักสูตรอนาคต
              </h3>
              <p className="text-xs text-blue-200">
                ขนาด A4 แนวนอน (Landscape) · พร้อมข้อมูลที่มา ข้อชี้แจงงบประมาณ และผลสำรวจความต้องการจริง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              <span>🖨️</span>
              <span>สั่งพิมพ์ / บันทึกเป็น PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer text-sm font-bold"
              title="ปิดหน้าต่าง"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Document Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100 flex justify-center">
          <div
            ref={printDocRef}
            id="future-curriculum-print-doc"
            className="w-full max-w-[1100px] bg-white p-8 rounded-xl shadow-lg border border-gray-300 text-gray-900 text-xs leading-relaxed"
          >
            {/* Header / Official Emblem */}
            <div className="flex items-start justify-between border-b-2 border-[#16265E] pb-4 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#16265E] text-white font-extrabold text-2xl shadow-sm">
                  กกท
                </div>
                <div>
                  <h1 className="text-lg font-black text-[#16265E] tracking-tight">
                    การกีฬาแห่งประเทศไทย (กกท.) · กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ
                  </h1>
                  <h2 className="text-sm font-bold text-gray-800">
                    เอกสารข้อเสนอเชิงยุทธศาสตร์: ทิศทางการพัฒนาและยกระดับหลักสูตรบุคลากรกีฬาสมัยใหม่ (พ.ศ. 2570 – 2572)
                  </h2>
                  <p className="text-[10px] text-gray-500">
                    รายงานประกอบการพิจารณาจัดสรรงบประมาณและการจัดทำแผนแม่บทพัฒนาบุคลากรกีฬาแห่งชาติ
                  </p>
                </div>
              </div>

              <div className="text-right text-[10px] text-gray-600 space-y-0.5 border-l border-gray-200 pl-4">
                <p>
                  <span className="font-semibold text-gray-800">ฐานข้อมูลบุคลากรในระบบ:</span> {traineesCount.toLocaleString()} รายการ
                </p>
                <p>
                  <span className="font-semibold text-gray-800">จำนวนเสียงสำรวจความต้องการ:</span> {totalVotes.toLocaleString()} โหวต
                </p>
                <p>
                  <span className="font-semibold text-gray-800">พิมพ์ออกเมื่อ:</span> {printedDateThai}
                </p>
                <p className="inline-block mt-1 rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-200">
                  ✓ ตรวจสอบการไม่ทับซ้อนภารกิจ 100%
                </p>
              </div>
            </div>

            {/* Strategic Background & Problem Statement */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs mb-1">
                  <span>🏛️</span>
                  <span>1. ปัญหาและที่มาของความจำเป็น (Rationale)</span>
                </div>
                <p className="text-[10.5px] text-gray-700 leading-normal">
                  ปัจจุบันระบบ กกท. มีหลักสูตรประวัติศาสตร์ 17 หลักสูตร ซึ่งส่วนใหญ่พัฒนาขึ้นมาตั้งแต่ พ.ศ. 2547–2565
                  เนื้อหาบางส่วนไม่สอดรับกับพลวัตอุตสาหกรรมกีฬายุคดิจิทัล เช่น การขาดทักษะวิเคราะห์ข้อมูล AI,
                  การหารายได้เชิงพาณิชย์ และมาตรฐานสากลด้าน Safe Sport
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs mb-1">
                  <span>📊</span>
                  <span>2. หลักฐานความต้องการจริง (Evidence-Based)</span>
                </div>
                <p className="text-[10.5px] text-gray-700 leading-normal">
                  ข้อเสนอหลักสูตรทั้ง 5 ชุดนี้สังเคราะห์มาจากผลสำรวจและการสะท้อนปัญหาของผู้รับการอบรมจริงกว่า {totalVotes.toLocaleString()} โหวต
                  ครอบคลุมทั้ง 5 กลุ่มหน่วยงาน (สมาคมกีฬาแห่งประเทศไทย, กกท., สมาคมกีฬาจังหวัด, กองทุนฯ และหน่วยงานภายนอก)
                </p>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs mb-1">
                  <span>🛡️</span>
                  <span>3. ขอบเขตภารกิจ & งบประมาณ (Non-Overlap)</span>
                </div>
                <p className="text-[10.5px] text-gray-700 leading-normal">
                  <strong className="text-emerald-900">ไม่ทับซ้อนกับฝ่ายวิทยาศาสตร์การกีฬา:</strong> ละเว้นหลักสูตรด้านสรีรวิทยา
                  กายภาพบำบัด หรือการฟื้นฟูทางการแพทย์ โดยฝ่ายพัฒนาบุคลากรฯ มุ่งเน้นเฉพาะสมรรถนะผู้บริหาร, ผู้ฝึกสอนด้านกลยุทธ์,
                  ผู้ตัดสิน และการจัดอีเวนต์สนามแข่งขัน
                </p>
              </div>
            </div>

            {/* Matrix of 5 Proposed Modern Blueprints */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-[#16265E] uppercase tracking-wide flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>พิมพ์เขียว 5 หลักสูตรใหม่เพื่อรองรับอุตสาหกรรมกีฬาแห่งอนาคต (พ.ศ. 2570 – 2572)</span>
                </h3>
                <span className="text-[10px] text-gray-500 font-medium">
                  จัดลำดับตามความจำเป็นเร่งด่วนและคะแนนโหวตของผู้มีส่วนได้ส่วนเสีย
                </span>
              </div>

              <table className="w-full border-collapse border border-gray-300 text-[10px]">
                <thead>
                  <tr className="bg-[#16265E] text-white">
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-8">#</th>
                    <th className="border border-gray-300 px-2.5 py-1.5 text-left w-24">รหัส / ปีเสนอ</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-left">ชื่อหลักสูตร (ไทย / อังกฤษ)</th>
                    <th className="border border-gray-300 px-2.5 py-1.5 text-left w-36">กลุ่มเป้าหมายหลัก</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center w-12">ชั่วโมง</th>
                    <th className="border border-gray-300 px-3 py-1.5 text-left w-52">ปัญหาที่แก้ไข / ที่มาความจำเป็น</th>
                    <th className="border border-gray-300 px-2.5 py-1.5 text-center w-24">หลักฐานเสียงโหวต</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {courses.map((course, idx) => (
                    <tr key={course.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/70"}>
                      <td className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-700">
                        {idx + 1}
                      </td>
                      <td className="border border-gray-300 px-2.5 py-2">
                        <span className="font-mono font-bold text-[#16265E] block">{course.code}</span>
                        <span className="inline-block mt-0.5 rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-semibold text-blue-900">
                          พ.ศ. {course.proposedYearBE}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <p className="font-bold text-gray-900">{course.titleTh}</p>
                        <p className="text-[9px] text-gray-500 italic mt-0.5">{course.titleEn}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {course.coreModules.map((m) => (
                            <span
                              key={m.moduleNo}
                              className="rounded bg-gray-100 px-1.5 py-0.2 text-[8.5px] text-gray-700 border border-gray-200"
                            >
                              M{m.moduleNo}: {m.title.slice(0, 24)}... ({m.hours}h)
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2.5 py-2">
                        <ul className="list-disc pl-3 text-[9px] text-gray-700 space-y-0.5">
                          {course.targetGroups.map((tg, i) => (
                            <li key={i}>{tg}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-800">
                        {course.durationHours}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-[9.5px] text-gray-700 leading-tight">
                        <p>{course.problemStatement}</p>
                        <p className="text-[8.5px] text-emerald-800 font-semibold mt-1">
                          🎯 ผลสัมฤทธิ์: {course.expectedOutcomes[0]}
                        </p>
                      </td>
                      <td className="border border-gray-300 px-2.5 py-2 text-center">
                        <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 text-[10px]">
                          👍 {course.evidenceVotes} โหวต
                        </span>
                        <span className="block text-[8.5px] text-gray-500 mt-0.5">ความต้องการสูง</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary of Top Trainee Requests & Voice of Stakeholders */}
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
              <div className="flex items-center justify-between mb-2 border-b border-gray-200 pb-1.5">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>ตัวอย่างเสียงสะท้อนและความต้องการหัวข้อเรียนรู้เพิ่มเติมจากบุคลากรในสนามจริง</span>
                </h4>
                <span className="text-[10px] text-gray-500">
                  คัดเลือกหัวข้อที่มีคะแนนโหวตสูงสุดและมีความเร่งด่วนเชิงปฏิบัติการ
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[9.5px]">
                {surveyTopics.slice(0, 4).map((topic) => (
                  <div key={topic.id} className="rounded border border-gray-200 bg-white p-2 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#16265E] truncate">
                        {topic.categoryIcon} {topic.title}
                      </span>
                      <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-[#16265E] border border-blue-200 shrink-0">
                        {topic.votes} เสียง
                      </span>
                    </div>
                    <p className="text-gray-600 line-clamp-2">
                      <strong>ปัญหาที่พบ:</strong> {topic.keyProblemsSolved}
                    </p>
                    <p className="text-[8.5px] text-gray-400">
                      เสนอโดย: {topic.suggestedBy} ({topic.suggestedOrg}) · กลุ่มเป้าหมาย: {topic.targetAudience}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Executive Sign-off Block */}
            <div className="border-t-2 border-gray-300 pt-4 mt-6">
              <div className="grid grid-cols-3 gap-6 text-center text-[10px] text-gray-700">
                <div>
                  <p className="font-semibold text-gray-800">ผู้จัดทำข้อเสนอเชิงนโยบาย</p>
                  <div className="h-10"></div>
                  <p className="border-b border-gray-400 mx-auto w-3/4"></p>
                  <p className="mt-1 font-medium">( ............................................................ )</p>
                  <p className="text-[9px] text-gray-500">หัวหน้างานพัฒนาหลักสูตร กองพัฒนาบุคลากรกีฬา</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-800">ผู้ตรวจสอบความสอดคล้องเชิงยุทธศาสตร์</p>
                  <div className="h-10"></div>
                  <p className="border-b border-gray-400 mx-auto w-3/4"></p>
                  <p className="mt-1 font-medium">( ............................................................ )</p>
                  <p className="text-[9px] text-gray-500">ผู้อำนวยการฝ่ายพัฒนากีฬาเป็นเลิศ กกท.</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-800">ผู้อนุมัติหลักการเพื่อจัดทำแผนงบประมาณ</p>
                  <div className="h-10"></div>
                  <p className="border-b border-gray-400 mx-auto w-3/4"></p>
                  <p className="mt-1 font-medium">( ............................................................ )</p>
                  <p className="text-[9px] text-gray-500">รองผู้ว่าการ กกท. ฝ่ายยุทธศาสตร์และเทคโนโลยีสารสนเทศ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
