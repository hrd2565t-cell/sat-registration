"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  type ApplicantRecord,
  type ApplicantDocument,
  updateApplicantRankings,
} from "@/lib/applications-store";
import type { Course } from "@/lib/courses";
import { auditApplicantDocuments } from "@/lib/document-checklist";
import { getDocumentFromStorage } from "@/lib/document-storage";
import { resolveSupabaseDocumentUrl } from "@/lib/supabase/sync";

interface ApplicantExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicants: ApplicantRecord[];
  course?: Course;
  courses: Course[];
  statusFilter?: string;
}

/**
 * จำแนกกลุ่มเป้าหมาย / สังกัดหลัก ทั้ง 5 กลุ่มของ กกท.
 */
function classifyTargetGroup(affiliation: string = ""): {
  key: "sat" | "nsdf" | "nationalAssoc" | "provincialAssoc" | "external";
  label: string;
  shortLabel: string;
  badgeClass: string;
} {
  const text = (affiliation || "").toLowerCase();
  if (text.includes("การกีฬาแห่งประเทศไทย") || text.includes("กกท")) {
    return {
      key: "sat",
      label: "การกีฬาแห่งประเทศไทย",
      shortLabel: "กกท.",
      badgeClass: "bg-blue-100 text-blue-900 border-blue-200",
    };
  }
  if (text.includes("กองทุน") || text.includes("nsdf")) {
    return {
      key: "nsdf",
      label: "กองทุนพัฒนาการกีฬาแห่งชาติ",
      shortLabel: "กองทุนกีฬาฯ",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
    };
  }
  if (text.includes("จังหวัด")) {
    return {
      key: "provincialAssoc",
      label: "สมาคมกีฬาแห่งจังหวัด",
      shortLabel: "สมาคมกีฬาจังหวัด",
      badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-200",
    };
  }
  if (text.includes("สมาคมกีฬา")) {
    return {
      key: "nationalAssoc",
      label: "สมาคมกีฬาแห่งประเทศไทย",
      shortLabel: "สมาคมกีฬาแห่งประเทศไทย",
      badgeClass: "bg-purple-100 text-purple-900 border-purple-200",
    };
  }
  return {
    key: "external",
    label: "หน่วยงานภายนอก",
    shortLabel: "หน่วยงานภายนอก",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
  };
}

/**
 * คอมโพเนนต์แสดงรูปถ่ายหน้าตรงของผู้สมัครในขนาด Passport
 */
function ApplicantPhotoCell({
  documents,
  name,
}: {
  documents?: ApplicantDocument[];
  name: string;
}) {
  const photoDoc = documents?.find((d) => d.kind === "photo");
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    photoDoc?.dataUrl?.startsWith("data:") ? photoDoc.dataUrl : null
  );

  useEffect(() => {
    let active = true;
    if (!photoDoc) {
      setPhotoUrl(null);
      return;
    }
    if (photoDoc.dataUrl?.startsWith("data:")) {
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
    (async () => {
      if (photoDoc.id) {
        const localDoc = await getDocumentFromStorage(photoDoc.id, photoDoc.name);
        if (active && localDoc?.dataUrl) {
          setPhotoUrl(localDoc.dataUrl);
          return;
        }
      }
      if (photoDoc.dataUrl) {
        const resolved = await resolveSupabaseDocumentUrl(photoDoc.dataUrl);
        if (active && resolved) {
          setPhotoUrl(resolved);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [photoDoc?.id, photoDoc?.name, photoDoc?.dataUrl]);

  return (
    <div className="relative mx-auto h-12 w-10 shrink-0 overflow-hidden rounded-[4px] border border-gray-300 bg-gray-100 shadow-2xs print:border-gray-400">
      {photoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photoUrl}
          alt={`รูปถ่าย ${name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function ApplicantExecutiveReportModal({
  isOpen,
  onClose,
  applicants,
  course,
  courses,
}: ApplicantExecutiveReportModalProps) {
  const printDocRef = useRef<HTMLDivElement>(null);
  const [savedNotice, setSavedNotice] = useState<string>("");

  // Map เก็บตัวเลขลำดับของผู้สมัครแต่ละคน (แก้ไขตัวเลขได้โดยตรง)
  const [orderMap, setOrderMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    applicants.forEach((app, idx) => {
      initial[app.ref] = app.candidateOrder ?? idx + 1;
    });
    return initial;
  });

  // รายชื่อผู้สมัครที่เรียงตามลำดับที่ผู้บริหารกำหนด
  const [sortedApplicants, setSortedApplicants] = useState<ApplicantRecord[]>(() => {
    return [...applicants].sort((a, b) => {
      const ordA = a.candidateOrder ?? 999999;
      const ordB = b.candidateOrder ?? 999999;
      if (ordA !== ordB) return ordA - ordB;
      return Date.parse(a.submittedAt) - Date.parse(b.submittedAt);
    });
  });

  // Sync state เมื่อ applicants prop เปลี่ยน
  useEffect(() => {
    const nextMap: Record<string, number> = {};
    applicants.forEach((app, idx) => {
      nextMap[app.ref] = app.candidateOrder ?? idx + 1;
    });
    setOrderMap(nextMap);

    const nextSorted = [...applicants].sort((a, b) => {
      const ordA = a.candidateOrder ?? 999999;
      const ordB = b.candidateOrder ?? 999999;
      if (ordA !== ordB) return ordA - ordB;
      return Date.parse(a.submittedAt) - Date.parse(b.submittedAt);
    });
    setSortedApplicants(nextSorted);
  }, [applicants]);

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

  // การคำนวณสถิติความจุ และ 5 กลุ่มเป้าหมาย
  const capacity = course?.capacity || Number(course?.seats?.match(/\d+/)?.[0]) || 40;
  const targetQuotas = course?.targetQuotas || {
    sat: 5,
    nationalAssoc: 15,
    provincialAssoc: 15,
    nsdf: 0,
    external: 5,
  };

  const executiveStats = useMemo(() => {
    let docsReady = 0;
    let docsPending = 0;
    const groupCounts = {
      sat: 0,
      nsdf: 0,
      nationalAssoc: 0,
      provincialAssoc: 0,
      external: 0,
    };

    for (const app of sortedApplicants) {
      const courseObj = courses.find((c) => c.id === app.courseId);
      const audit = auditApplicantDocuments(app, courseObj);
      if (audit.status === "complete") {
        docsReady++;
      } else {
        docsPending++;
      }

      const grp = classifyTargetGroup(app.affiliation);
      groupCounts[grp.key]++;
    }

    // คำนวณจำนวนตัวจริง vs สำรอง ตามลำดับที่ระบุ
    let candidateApproved = 0;
    let candidateReserve = 0;
    sortedApplicants.forEach((app) => {
      const currentOrder = orderMap[app.ref] ?? 999;
      if (currentOrder <= capacity) {
        candidateApproved++;
      } else {
        candidateReserve++;
      }
    });

    const occupancyRate = capacity > 0 ? Math.round((sortedApplicants.length / capacity) * 100) : 0;

    return {
      total: sortedApplicants.length,
      capacity,
      occupancyRate,
      groupCounts,
      docsReady,
      docsPending,
      candidateApproved,
      candidateReserve,
    };
  }, [capacity, courses, orderMap, sortedApplicants]);

  if (!isOpen) return null;

  // จัดการการเปลี่ยนตัวเลขลำดับในช่อง Input
  const handleOrderChange = (ref: string, val: string) => {
    const num = parseInt(val, 10);
    const newOrder = Number.isFinite(num) && num > 0 ? num : 0;
    setOrderMap((prev) => ({
      ...prev,
      [ref]: newOrder,
    }));
  };

  // บันทึกลำดับลงระบบ Store และ Supabase Cloud
  const persistRankings = (
    mapping: Record<string, number>,
    applicantsList: ApplicantRecord[]
  ) => {
    const payload = applicantsList.map((app, idx) => ({
      ref: app.ref,
      candidateOrder: mapping[app.ref] || idx + 1,
    }));
    updateApplicantRankings(payload);
  };

  // จัดเรียงรายการใหม่ตามตัวเลขที่พิมพ์ และบันทึกถาวรทันที
  const handleReorder = () => {
    const nextSorted = [...sortedApplicants].sort((a, b) => {
      const ordA = orderMap[a.ref] || 999999;
      const ordB = orderMap[b.ref] || 999999;
      if (ordA !== ordB) return ordA - ordB;
      return Date.parse(a.submittedAt) - Date.parse(b.submittedAt);
    });
    setSortedApplicants(nextSorted);
    persistRankings(orderMap, nextSorted);
    setSavedNotice("✓ จัดเรียงและบันทึกลำดับขึ้น Cloud เรียบร้อยแล้ว (เปิดครั้งต่อไปจะแสดงตามลำดับนี้เสมอ)");
    setTimeout(() => setSavedNotice(""), 4500);
  };

  // บันทึกลำดับเมื่อออกจากช่อง input (onBlur)
  const handleAutoSave = () => {
    persistRankings(orderMap, sortedApplicants);
  };

  // รีเซ็ตลำดับกลับไปตามเวลาที่ยื่นใบสมัครเดิม
  const handleResetOrder = () => {
    if (!confirm("คุณต้องการรีเซ็ตลำดับผู้สมัครกลับไปตามเวลาที่ยื่นใบสมัครเดิมใช่หรือไม่?")) {
      return;
    }
    const defaultSorted = [...sortedApplicants].sort(
      (a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt)
    );
    const newMap: Record<string, number> = {};
    defaultSorted.forEach((app, idx) => {
      newMap[app.ref] = idx + 1;
    });
    setOrderMap(newMap);
    setSortedApplicants(defaultSorted);
    persistRankings(newMap, defaultSorted);
    setSavedNotice("✓ รีเซ็ตลำดับกลับตามเวลาที่ยื่นสมัครเรียบร้อยแล้ว");
    setTimeout(() => setSavedNotice(""), 4500);
  };

  const handlePrint = () => {
    window.print();
  };

  const courseTitleDisplay = course?.title || (applicants[0]?.courseTitle ?? "ทุกหลักสูตรการฝึกอบรม");
  const courseScheduleDisplay = course?.date ? `วันที่ ${course.date}` : "";
  const courseLocationDisplay = course?.location ? `ณ ${course.location}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 backdrop-blur-xs print:static print:inset-auto print:block print:bg-white print:p-0">
      {/* Print CSS Rules */}
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
              thead {
                display: table-header-group;
              }
              tbody {
                display: table-row-group;
              }
              tr {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .executive-signoff-section {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          `,
        }}
      />

      {/* Modal Dialog Card */}
      <div className="relative my-auto flex max-h-[96vh] w-full max-w-[1280px] flex-col rounded-2xl bg-white shadow-2xl print:my-0 print:max-h-none print:w-full print:rounded-none print:shadow-none">
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
                พิมพ์รายงานสรุปรายชื่อผู้สมัครเสนอผู้บริหาร (Executive Report & Ranking)
              </h3>
              <p className="text-[11px] text-gray-500">
                พิมพ์ตัวเลขลำดับ (1, 2, 3...) ได้โดยตรง พร้อมรูปถ่ายหน้าตรง และ 5 กลุ่มเป้าหมาย/สังกัดหลัก กกท.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Action 1: Re-order & Save button */}
            <button
              type="button"
              onClick={handleReorder}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#16265E] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#111e4a] active:scale-[0.98] cursor-pointer"
              title="จัดเรียงแถวตามตัวเลขลำดับที่พิมพ์ และบันทึกขึ้นระบบคลาวด์ถาวร"
            >
              <span>🔄 จัดเรียงและบันทึกลำดับ</span>
            </button>

            {/* Action 2: Reset to original submission order */}
            <button
              type="button"
              onClick={handleResetOrder}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs transition hover:bg-gray-50 active:scale-[0.98] cursor-pointer"
              title="รีเซ็ตลำดับกลับไปตามเวลาที่ยื่นสมัครเดิม"
            >
              <span>↺ คืนค่าเดิม</span>
            </button>

            {/* Action 3: Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 active:scale-[0.98] cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>🖨️ พิมพ์เอกสาร / บันทึก PDF</span>
            </button>

            {/* Action 4: Close button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 cursor-pointer"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* Saved Toast Notification */}
        {savedNotice && (
          <div className="bg-emerald-600 px-6 py-2 text-xs font-semibold text-white print:hidden">
            {savedNotice}
          </div>
        )}

        {/* Scrollable Preview Container */}
        <div className="overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
          {/* Document Sheet */}
          <div
            ref={printDocRef}
            className="executive-print-container mx-auto w-full max-w-[1180px] bg-white p-6 text-gray-900 border border-gray-200 shadow-xs print:border-0 print:shadow-none print:p-0"
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
                <p className="mt-1 text-gray-600">
                  วันที่พิมพ์รายงาน: <strong className="text-gray-900">{printedDateThai}</strong>
                </p>
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
                    ความจุเปิดรับ: <strong className="text-blue-900">{course.seats}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Strategic KPI Summary Cards (3 Cards) */}
            <div className="mt-2.5 grid grid-cols-3 gap-3 text-xs">
              {/* Card 1: Total Applicants vs Capacity */}
              <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-2.5">
                <p className="text-[10px] font-semibold text-gray-500 uppercase">1. ผู้สมัครทั้งหมด / ความจุ</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-gray-900">{executiveStats.total}</span>
                  <span className="text-xs text-gray-500 font-medium">/ {capacity} ที่นั่ง</span>
                </div>
                <p className="mt-0.5 text-[10px] text-gray-600">
                  คิดเป็น <strong>{executiveStats.occupancyRate}%</strong>{" "}
                  {executiveStats.total > capacity ? (
                    <span className="font-bold text-rose-600">(เกินโควตา {executiveStats.total - capacity} คน)</span>
                  ) : (
                    <span className="text-emerald-700 font-medium">(อยู่ในเกณฑ์ความจุ)</span>
                  )}
                </p>
              </div>

              {/* Card 2: 5 Target Groups Breakdown */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-blue-900 uppercase">2. กลุ่มเป้าหมาย / สังกัดหลัก</p>
                  <span className="text-[9px] text-blue-700 font-semibold">(5 กลุ่มสังกัด)</span>
                </div>
                <div className="mt-1 space-y-0.5 text-[9.5px] leading-tight text-gray-700">
                  <div className="flex justify-between">
                    <span>🏛️ กกท.:</span>
                    <strong>{executiveStats.groupCounts.sat} <span className="font-normal text-gray-500">(เป้า {targetQuotas.sat})</span></strong>
                  </div>
                  <div className="flex justify-between">
                    <span>💰 กองทุนกีฬาฯ:</span>
                    <strong>{executiveStats.groupCounts.nsdf} <span className="font-normal text-gray-500">(เป้า {targetQuotas.nsdf})</span></strong>
                  </div>
                  <div className="flex justify-between">
                    <span>🏅 สมาคมแห่งประเทศ:</span>
                    <strong>{executiveStats.groupCounts.nationalAssoc} <span className="font-normal text-gray-500">(เป้า {targetQuotas.nationalAssoc})</span></strong>
                  </div>
                  <div className="flex justify-between">
                    <span>🗺️ สมาคมจังหวัด:</span>
                    <strong>{executiveStats.groupCounts.provincialAssoc} <span className="font-normal text-gray-500">(เป้า {targetQuotas.provincialAssoc})</span></strong>
                  </div>
                  <div className="flex justify-between">
                    <span>🏢 หน่วยงานภายนอก:</span>
                    <strong>{executiveStats.groupCounts.external} <span className="font-normal text-gray-500">(เป้า {targetQuotas.external})</span></strong>
                  </div>
                </div>
              </div>

              {/* Card 3: Ranking & Quota Allocation */}
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-2.5">
                <p className="text-[10px] font-semibold text-purple-900 uppercase">3. ผลจัดสรรตามลำดับผู้บริหาร</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-purple-800">🌟 ตัวจริง (ลำดับ 1-{capacity})</p>
                    <p className="text-base font-black text-purple-900">{executiveStats.candidateApproved} คน</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-600">⏳ บัญชีสำรอง</p>
                    <p className="text-base font-black text-gray-700">{executiveStats.candidateReserve} คน</p>
                  </div>
                </div>
                <p className="mt-1 text-[9.5px] text-gray-500">
                  จัดลำดับตามตัวเลขที่กำหนดในตาราง
                </p>
              </div>
            </div>

            {/* Screen Helper Banner */}
            <div className="mt-2.5 flex items-center justify-between rounded-md bg-blue-50/80 px-3 py-1.5 text-[10.5px] text-blue-900 border border-blue-200 print:hidden">
              <span className="flex items-center gap-1.5">
                <span>💡</span>
                <span>
                  <strong>การจัดลำดับ:</strong> สามารถพิมพ์ตัวเลขในช่อง <strong>"ลำดับ"</strong> ได้โดยตรง (ระบบจะบันทึกอัตโนมัติ) และกดปุ่ม <strong>"🔄 จัดเรียงและบันทึกลำดับ"</strong> เพื่อสลับแถว เมื่อเปิดเข้ามาใหม่ครั้งต่อไปจะจดจำลำดับนี้เสมอ
                </span>
              </span>
            </div>

            {/* Applicants Table (6 Main Columns) */}
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-300">
              <table className="w-full table-fixed border-collapse text-left text-[11px]">
                <colgroup>
                  <col className="w-[8%]" />
                  <col className="w-[9%]" />
                  <col className="w-[24%]" />
                  <col className="w-[33%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-100 text-[10.5px] font-bold text-gray-900">
                    <th className="border-r border-gray-300 px-1 py-1.5 text-center">ลำดับ</th>
                    <th className="border-r border-gray-300 px-1 py-1.5 text-center">รูปผู้สมัคร</th>
                    <th className="border-r border-gray-300 px-2 py-1.5">ชื่อ-นามสกุล</th>
                    <th className="border-r border-gray-300 px-2 py-1.5">ตำแหน่ง / หน่วยงานต้นสังกัด</th>
                    <th className="border-r border-gray-300 px-1.5 py-1.5 text-center">เบอร์โทรศัพท์</th>
                    <th className="px-1.5 py-1.5 text-center">ตรวจเอกสาร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedApplicants.map((app, index) => {
                    const courseObj = courses.find((c) => c.id === app.courseId);
                    const audit = auditApplicantDocuments(app, courseObj);
                    const group = classifyTargetGroup(app.affiliation);
                    const currentOrderNum = orderMap[app.ref] ?? index + 1;
                    const isWithinCapacity = currentOrderNum <= capacity && currentOrderNum > 0;

                    const formattedIdCard = app.idCard?.replace(
                      /(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/,
                      "$1-$2-$3-$4-$5"
                    ) || "-";

                    return (
                      <tr key={app.ref} className="text-[10px] text-gray-800 hover:bg-gray-50/50">
                        {/* 1. ลำดับ (ช่องพิมพ์ตัวเลขโดยตรงบนหน้าจอ / ตัวเลขข้อความคมชัดตอนพิมพ์) */}
                        <td className="border-r border-gray-300 px-1 py-1.5 text-center align-middle">
                          {/* Print Mode: Plain bold text */}
                          <div className="hidden print:block font-black text-sm text-gray-900">
                            {currentOrderNum}
                          </div>

                          {/* Screen Mode: Interactive number input */}
                          <div className="flex flex-col items-center justify-center print:hidden">
                            <input
                              type="number"
                              min="1"
                              value={orderMap[app.ref] !== undefined ? (orderMap[app.ref] === 0 ? "" : orderMap[app.ref]) : index + 1}
                              onChange={(e) => handleOrderChange(app.ref, e.target.value)}
                              onBlur={handleAutoSave}
                              className="h-7 w-12 rounded border border-gray-300 bg-white text-center font-bold text-gray-900 shadow-2xs focus:border-[#16265E] focus:bg-blue-50/40 focus:outline-none"
                              title="พิมพ์เปลี่ยนลำดับที่นี่ (บันทึกอัตโนมัติ)"
                            />
                            {isWithinCapacity ? (
                              <span className="mt-0.5 text-[8px] font-semibold text-emerald-700">ตัวจริง</span>
                            ) : (
                              <span className="mt-0.5 text-[8px] font-semibold text-blue-700">สำรอง</span>
                            )}
                          </div>
                        </td>

                        {/* 2. รูปผู้สมัคร (ขนาด Passport คมชัด) */}
                        <td className="border-r border-gray-300 px-1 py-1.5 text-center align-middle">
                          <ApplicantPhotoCell documents={app.documents} name={app.name} />
                        </td>

                        {/* 3. ชื่อ-นามสกุล และ เลขบัตร ปชช. */}
                        <td className="border-r border-gray-300 px-2 py-1.5 leading-tight align-middle">
                          <p className="font-bold text-gray-900 text-[11px]">{app.name}</p>
                          <p className="mt-0.5 font-mono text-[9px] text-gray-500">
                            {formattedIdCard}
                          </p>
                          <p className="text-[8.5px] font-mono text-gray-400">
                            รหัส: {app.ref}
                          </p>
                        </td>

                        {/* 4. ตำแหน่ง / หน่วยงานต้นสังกัด และ 5 กลุ่มเป้าหมายหลัก */}
                        <td className="border-r border-gray-300 px-2 py-1.5 leading-snug align-middle">
                          <p className="font-semibold text-gray-900 text-[10.5px]">
                            {app.position || "-"}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1">
                            <span className={`inline-block rounded px-1.5 py-0.2 text-[8.5px] font-bold border ${group.badgeClass}`}>
                              {group.label}
                            </span>
                          </div>
                          {app.affiliation && app.affiliation !== group.label && (
                            <p className="mt-0.5 text-[9px] text-gray-600 line-clamp-1">
                              {app.affiliation}
                            </p>
                          )}
                        </td>

                        {/* 5. เบอร์โทรศัพท์ */}
                        <td className="border-r border-gray-300 px-1.5 py-1.5 text-center font-mono text-[10px] align-middle">
                          {app.phone || "-"}
                        </td>

                        {/* 6. ตรวจเอกสาร */}
                        <td className="px-1.5 py-1.5 text-center align-middle">
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
                      </tr>
                    );
                  })}

                  {sortedApplicants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-gray-500">
                        ไม่พบข้อมูลผู้สมัครตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Executive Sign-off Section */}
            <div className="executive-signoff-section mt-6 border-t-2 border-gray-300 pt-4">
              <div className="grid grid-cols-2 gap-6 text-xs">
                {/* Left: Officer Submission */}
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3.5">
                  <p className="font-bold text-[#16265E]">เรียน ผู้บริหารเพื่อโปรดพิจารณา</p>
                  <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
                    ได้ตรวจสอบคุณสมบัติ เอกสารประกอบ และสัดส่วน 5 กลุ่มเป้าหมายของผู้สมัครเข้ารับการฝึกอบรมเรียบร้อยแล้ว จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ / จัดลำดับผู้มีสิทธิ์เข้ารับการฝึกอบรม
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
                      <span>เห็นชอบโดยมีเงื่อนไข / มอบหมายให้ปรับปรุงลำดับเพิ่มเติม</span>
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
                <span>พิมพ์เมื่อ: {printedDateThai}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
