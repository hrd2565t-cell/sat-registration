"use client";

import { useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import type { ApplicantRecord } from "@/lib/applications-store";
import type { Course } from "@/lib/courses";
import { auditApplicantDocuments } from "@/lib/document-checklist";

interface ApplicantExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicants: ApplicantRecord[];
  course?: Course;
  courses: Course[];
  statusFilter?: string;
}

export function ApplicantExecutiveReportModal({
  isOpen,
  onClose,
  applicants,
  course,
  courses,
  statusFilter = "all",
}: ApplicantExecutiveReportModalProps) {
  const printDocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const printedDateThai = useMemo(() => {
    const now = new Date();
    const monthsThai = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
    ];
    const d = now.getDate();
    const m = monthsThai[now.getMonth()];
    const y = now.getFullYear() + 543;
    return `${d} ${m} พ.ศ. ${y}`;
  }, []);

  const stats = useMemo(() => {
    let approved = 0;
    let reserve = 0;
    let pending = 0;
    let actionRequired = 0;
    let rejected = 0;

    for (const app of applicants) {
      if (app.status === "approved") approved++;
      else if (app.status === "reserve") reserve++;
      else if (app.status === "action_required") actionRequired++;
      else if (app.status === "rejected") rejected++;
      else pending++;
    }

    return {
      total: applicants.length,
      approved,
      reserve,
      pending,
      actionRequired,
      rejected,
    };
  }, [applicants]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const courseTitleDisplay = course?.title || (applicants[0]?.courseTitle ?? "ทุกหลักสูตรการฝึกอบรม");
  const courseScheduleDisplay = course?.date ? `วันที่ ${course.date}` : "";
  const courseLocationDisplay = course?.location ? `ณ ${course.location}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 backdrop-blur-xs print:static print:inset-auto print:block print:bg-white print:p-0">
      {/* Dynamic Print CSS to ensure only the report prints cleanly in landscape */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 landscape;
                margin: 8mm 8mm 8mm 8mm;
              }
              body * {
                visibility: hidden;
              }
              .executive-print-container, .executive-print-container * {
                visibility: visible;
              }
              .executive-print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                box-shadow: none !important;
                border: none !important;
              }
              tr {
                page-break-inside: avoid;
              }
            }
          `,
        }}
      />

      {/* Modal Dialog Card */}
      <div className="relative my-auto flex max-h-[96vh] w-full max-w-[1240px] flex-col rounded-2xl bg-white shadow-2xl print:my-0 print:max-h-none print:w-full print:rounded-none print:shadow-none">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/90 px-6 py-3.5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16265E] text-white shadow-xs">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#16265E] sm:text-base">
                พิมพ์รายงานสรุปรายชื่อผู้สมัครเสนอผู้บริหารพิจารณา (Executive Report)
              </h3>
              <p className="text-[11px] text-gray-500">
                เอกสารทางการ A4 แนวนอน (Landscape) พร้อมช่องหมายเหตุสำหรับผู้บริหารพิจารณาสลับตำแหน่ง และช่องลงนาม
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#111e4a] active:scale-[0.98] cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>🖨️ พิมพ์เอกสาร / บันทึก PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 cursor-pointer"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* Scrollable Preview Wrapper */}
        <div className="overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
          {/* Document Sheet */}
          <div
            ref={printDocRef}
            className="executive-print-container mx-auto w-full max-w-[1150px] bg-white p-6 text-gray-900 border border-gray-200 shadow-xs print:border-0 print:shadow-none print:p-0"
            style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif" }}
          >
            {/* Header: Official SAT Branding & Emblem */}
            <div className="flex items-start justify-between border-b-2 border-[#16265E] pb-3.5">
              <div className="flex items-center gap-3.5">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white p-0.5">
                  <Image
                    src="/assets/logo-sat-header.png"
                    alt="ตราสัญลักษณ์ กกท."
                    width={56}
                    height={56}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-base font-black text-[#16265E] tracking-tight sm:text-lg">
                    การกีฬาแห่งประเทศไทย (กกท.)
                  </h1>
                  <p className="text-xs font-bold text-gray-800 sm:text-sm">
                    กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ
                  </p>
                  <p className="text-[11px] font-semibold text-[#1e3a8a]">
                    บัญชีรายชื่อผู้สมัครเข้ารับการฝึกอบรม (เสนอผู้บริหารเพื่อโปรดพิจารณา)
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px]">
                <span className="inline-block rounded-md bg-blue-50 px-2.5 py-0.5 font-bold text-[#16265E] border border-blue-200">
                  เอกสารเสนอผู้บริหาร
                </span>
                <p className="mt-1 text-gray-600">วันที่พิมพ์รายงาน: <strong className="text-gray-900">{printedDateThai}</strong></p>
                <p className="text-[10px] text-gray-500">ระบบรับสมัครบุคลากรกีฬา กกท. ออนไลน์</p>
              </div>
            </div>

            {/* Course Information Banner */}
            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5 text-xs text-gray-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-[#16265E]">หลักสูตร:</span>{" "}
                  <strong className="text-sm font-black text-[#16265E]">{courseTitleDisplay}</strong>
                  {courseScheduleDisplay && (
                    <span className="ml-3 text-gray-700">
                      | <strong>กำหนดการ:</strong> {courseScheduleDisplay}
                    </span>
                  )}
                  {courseLocationDisplay && (
                    <span className="ml-2 text-gray-700">
                      | <strong>สถานที่:</strong> {courseLocationDisplay}
                    </span>
                  )}
                </div>
                {course?.seats && (
                  <div className="text-right font-medium text-gray-600">
                    ความจุที่เปิดรับ: <strong className="text-blue-900">{course.seats}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Summary KPI Strip */}
            <div className="mt-2.5 grid grid-cols-5 gap-2 text-center text-xs">
              <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                <p className="text-[10px] text-gray-500">ผู้สมัครในรายงาน</p>
                <p className="text-sm font-black text-gray-800">{stats.total} <span className="text-[10px] font-normal">คน</span></p>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-2 py-1.5">
                <p className="text-[10px] text-emerald-800">ผ่านคุณสมบัติ (ตัวจริง)</p>
                <p className="text-sm font-black text-emerald-700">{stats.approved} <span className="text-[10px] font-normal">คน</span></p>
              </div>
              <div className="rounded-md border border-blue-200 bg-blue-50/60 px-2 py-1.5">
                <p className="text-[10px] text-blue-800">บัญชีสำรอง</p>
                <p className="text-sm font-black text-blue-700">{stats.reserve} <span className="text-[10px] font-normal">คน</span></p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50/60 px-2 py-1.5">
                <p className="text-[10px] text-amber-800">รอการตรวจสอบ</p>
                <p className="text-sm font-black text-amber-700">{stats.pending + stats.actionRequired} <span className="text-[10px] font-normal">คน</span></p>
              </div>
              <div className="rounded-md border border-rose-200 bg-rose-50/60 px-2 py-1.5">
                <p className="text-[10px] text-rose-800">ไม่ผ่านคุณสมบัติ</p>
                <p className="text-sm font-black text-rose-700">{stats.rejected} <span className="text-[10px] font-normal">คน</span></p>
              </div>
            </div>

            {/* Applicants Executive Table */}
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-300">
              <table className="w-full table-fixed border-collapse text-left text-[11px]">
                <colgroup>
                  <col className="w-[4%]" />
                  <col className="w-[10%]" />
                  <col className="w-[15%]" />
                  <col className="w-[13%]" />
                  <col className="w-[18%]" />
                  <col className="w-[11%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-100 text-[10.5px] font-bold text-gray-900">
                    <th className="border-r border-gray-300 px-1.5 py-1.5 text-center">ลำดับ</th>
                    <th className="border-r border-gray-300 px-1.5 py-1.5 text-center">รหัสใบสมัคร</th>
                    <th className="border-r border-gray-300 px-2 py-1.5">ชื่อ-นามสกุล</th>
                    <th className="border-r border-gray-300 px-1.5 py-1.5 text-center">เลขบัตรประชาชน</th>
                    <th className="border-r border-gray-300 px-2 py-1.5">ตำแหน่ง / หน่วยงานต้นสังกัด</th>
                    <th className="border-r border-gray-300 px-1.5 py-1.5 text-center">เบอร์โทรศัพท์</th>
                    <th className="border-r border-gray-300 px-1.5 py-1.5 text-center">ตรวจเอกสาร</th>
                    <th className="border-r border-gray-300 px-1.5 py-1.5 text-center">สถานะการพิจารณา</th>
                    <th className="px-2 py-1.5 text-center bg-amber-50/50">หมายเหตุผู้บริหาร (สลับตำแหน่ง)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applicants.map((app, index) => {
                    const courseObj = courses.find((c) => c.id === app.courseId);
                    const audit = auditApplicantDocuments(app, courseObj);
                    const formattedIdCard = app.idCard?.replace(
                      /(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/,
                      "$1-$2-$3-$4-$5"
                    ) || "-";

                    let statusBadge = (
                      <span className="font-semibold text-amber-700">รอตรวจสอบ</span>
                    );
                    if (app.status === "approved") {
                      statusBadge = (
                        <span className="font-bold text-emerald-700">✓ ผ่านคุณสมบัติ</span>
                      );
                    } else if (app.status === "reserve") {
                      statusBadge = (
                        <span className="font-bold text-blue-700">
                          สำรอง {app.reserveOrder ? `#${app.reserveOrder}` : ""}
                        </span>
                      );
                    } else if (app.status === "action_required") {
                      statusBadge = (
                        <span className="font-semibold text-orange-700">ขอเอกสารเพิ่ม</span>
                      );
                    } else if (app.status === "rejected") {
                      statusBadge = (
                        <span className="font-semibold text-rose-700">ไม่ผ่าน</span>
                      );
                    }

                    return (
                      <tr key={app.ref} className="text-[10px] text-gray-800 hover:bg-gray-50/50">
                        {/* 1. ลำดับ (Index) */}
                        <td className="border-r border-gray-300 px-1.5 py-1.5 text-center font-bold text-gray-900">
                          {index + 1}
                        </td>

                        {/* 2. รหัสใบสมัคร */}
                        <td className="border-r border-gray-300 px-1.5 py-1.5 text-center font-mono font-bold text-[#16265E]">
                          {app.ref}
                        </td>

                        {/* 3. ชื่อ-นามสกุล */}
                        <td className="border-r border-gray-300 px-2 py-1.5 font-bold text-gray-900 leading-snug">
                          {app.name}
                        </td>

                        {/* 4. เลขบัตรประชาชน */}
                        <td className="border-r border-gray-300 px-1.5 py-1.5 text-center font-mono text-[9.5px]">
                          {formattedIdCard}
                        </td>

                        {/* 5. ตำแหน่ง และ สังกัด */}
                        <td className="border-r border-gray-300 px-2 py-1.5 leading-tight">
                          <p className="font-semibold text-gray-900">{app.position || "-"}</p>
                          <p className="text-[9px] text-gray-600">{app.affiliation || "-"}</p>
                        </td>

                        {/* 6. เบอร์โทรศัพท์ */}
                        <td className="border-r border-gray-300 px-1.5 py-1.5 text-center font-mono text-[9.5px]">
                          {app.phone || "-"}
                        </td>

                        {/* 7. ตรวจเอกสาร */}
                        <td className="border-r border-gray-300 px-1.5 py-1.5 text-center">
                          {audit.status === "complete" ? (
                            <span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                              ✓ ครบ ({audit.attachedRequiredCount}/{audit.requiredCount})
                            </span>
                          ) : audit.status === "incomplete" ? (
                            <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                              ⚠️ ไม่ครบ ({audit.attachedRequiredCount}/{audit.requiredCount})
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-500">
                              {app.documents?.length || 0} ไฟล์
                            </span>
                          )}
                        </td>

                        {/* 8. สถานะการพิจารณา */}
                        <td className="border-r border-gray-300 px-1.5 py-1.5 text-center text-[9.5px]">
                          {statusBadge}
                        </td>

                        {/* 9. หมายเหตุ (สำหรับผู้บริหารบันทึกความเห็น / สลับตำแหน่ง) */}
                        <td className="px-2 py-1.5 bg-amber-50/20 align-top">
                          {app.reviewReason ? (
                            <p className="text-[9px] font-medium text-gray-700 leading-tight mb-1">
                              • {app.reviewReason}
                            </p>
                          ) : null}
                          <div className="h-6 w-full border-b border-dashed border-gray-300" />
                        </td>
                      </tr>
                    );
                  })}

                  {applicants.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-gray-500">
                        ไม่พบข้อมูลผู้สมัครตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Executive Sign-off Section */}
            <div className="mt-6 border-t-2 border-gray-300 pt-4">
              <div className="grid grid-cols-2 gap-6 text-xs">
                {/* Left: Officer Submission */}
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3.5">
                  <p className="font-bold text-[#16265E]">เรียน ผู้บริหารเพื่อโปรดพิจารณา</p>
                  <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
                    ได้ตรวจสอบคุณสมบัติและเอกสารประกอบการสมัครเข้ารับการฝึกอบรมของรายชื่อข้างต้นถูกต้องตามเกณฑ์ระเบียบเรียบร้อยแล้ว จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ / จัดลำดับ
                  </p>

                  <div className="mt-6 text-center">
                    <div className="mx-auto w-48 border-b border-gray-400 border-dashed" />
                    <p className="mt-1.5 font-bold text-gray-800">( ............................................................ )</p>
                    <p className="text-[10px] text-gray-600">เจ้าหน้าที่ประสานงานหลักสูตร</p>
                    <p className="text-[10px] text-gray-500">วันที่ ........ / ........ / ................</p>
                  </div>
                </div>

                {/* Right: Executive Decision & Sign-off */}
                <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3.5">
                  <p className="font-bold text-[#16265E]">ความเห็น / ข้อสั่งการของผู้บริหาร</p>
                  
                  <div className="mt-2 space-y-1.5 text-[11px] text-gray-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-400" />
                      <span>เห็นชอบ / อนุมัติตามรายชื่อและลำดับที่เสนอ</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-400" />
                      <span>เห็นชอบโดยมีเงื่อนไข / สลับลำดับตามที่ระบุในช่องหมายเหตุ</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-400" />
                      <span className="shrink-0">อื่นๆ:</span>
                      <div className="flex-1 border-b border-gray-400 border-dashed h-4" />
                    </div>
                  </div>

                  <div className="mt-5 text-center">
                    <div className="mx-auto w-48 border-b border-gray-400 border-dashed" />
                    <p className="mt-1.5 font-bold text-gray-800">( ............................................................ )</p>
                    <p className="text-[10px] text-gray-600">ผู้อำนวยการกองพัฒนาบุคลากรกีฬา</p>
                    <p className="text-[10px] text-gray-500">วันที่ ........ / ........ / ................</p>
                  </div>
                </div>
              </div>

              {/* Legal & System Footnote */}
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-2 text-[9.5px] text-gray-500">
                <span>
                  กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย · ระบบรับสมัครออนไลน์
                </span>
                <span>หน้าที่ 1 จาก 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
