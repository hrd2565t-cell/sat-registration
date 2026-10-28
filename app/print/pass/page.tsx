"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { useApplications, formatThaiDate } from "@/lib/applications-store";
import { useCourses } from "@/lib/courses-store";

function PassPrintView() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const { applications } = useApplications();
  const { courses } = useCourses();
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);

  const record = applications.find(
    (app) => app.ref === ref || app.receiptNo === ref
  ) || applications[0];

  const course = courses.find((c) => c.id === record?.courseId);

  useEffect(() => {
    if (record && !autoPrintTriggered) {
      setAutoPrintTriggered(true);
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [record, autoPrintTriggered]);

  if (!record) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-[14px] font-semibold text-[#111827]">ไม่พบข้อมูลผู้ผ่านการคัดเลือก</p>
          <Link href="/" className="mt-2 text-[12px] text-[#1e3a8a] underline">
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#525659] py-0 sm:py-8 print:bg-white print:py-0">
      {/* Floating Toolbar */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-[#323639] bg-[#323639] px-4 py-2.5 text-white shadow-md print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={`/status?id=${record.idCard}`}
            className="inline-flex items-center gap-1 text-[12px] text-[#9ca3af] hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 10H5m0 0l5-5m-5 5l5 5" />
            </svg>
            <span>กลับหน้าตรวจสอบสถานะ</span>
          </Link>
          <span className="text-[#6b7280]">|</span>
          <span className="text-[12px] font-medium text-[#e5e7eb]">
            ใบยืนยันสิทธิ์ {record.ref}
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#16a34a] px-3.5 text-[11.5px] font-semibold text-white transition hover:bg-[#15803d]"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 8V4a1 1 0 011-1h8a1 1 0 011 1v4m-10 4h10m-10 4h10M4 8h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6a2 2 0 012-2z" />
          </svg>
          <span>พิมพ์เอกสาร / บันทึก PDF</span>
        </button>
      </div>

      {/* Certificate / Pass Container */}
      <div className="mx-auto w-full max-w-[210mm] border-8 border-double border-[#16265E] bg-white p-8 shadow-2xl sm:my-4 sm:p-12 print:m-0 print:max-w-none print:border-4 print:p-8 print:shadow-none">
        {/* Certificate Header */}
        <div className="text-center">
          <div className="relative mx-auto mb-2 h-16 w-16">
            <Image
              src="/assets/logo-sat-header.png"
              alt="SAT Crest"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-[14px] font-bold text-[#16265E]">
            การกีฬาแห่งประเทศไทย
          </p>
          <p className="text-[11px] font-medium text-[#4b5563]">
            ฝ่ายพัฒนาบุคลากรกีฬา สถาบันวิทยาการกีฬาแห่งประเทศไทย
          </p>
          <div className="my-3 inline-block rounded-md bg-[#16265E] px-4 py-1 text-white">
            <h1 className="text-[15px] font-bold tracking-wide">
              ใบยืนยันสิทธิ์เข้ารับการฝึกอบรม (TRAINING PASS)
            </h1>
          </div>
          <p className="text-[9.5px] text-[#6b7280]">
            เอกสารฉบับนี้ใช้แสดงตัวตนในวันรายงานตัวเข้ารับการฝึกอบรม
          </p>
        </div>

        {/* Candidate & Verification Info */}
        <div className="mt-7 flex items-center justify-between gap-6 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-5">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[10.5px] uppercase tracking-wide text-[#6b7280]">
              ผู้มีสิทธิ์เข้ารับการอบรม (CANDIDATE)
            </p>
            <h2 className="text-[19px] font-bold text-[#111827]">
              {record.name}
            </h2>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#374151]">
              <p className="flex items-center gap-1">
                <span className="text-[#6b7280]">เลขประจำตัวประชาชน:</span>{" "}
                <span className="font-mono font-medium">
                  {record.idCard.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, "$1-$2-$3-$4-$5")}
                </span>
                <span className="print:hidden">
                  <CopyButton text={record.idCard} size="xs" variant="ghost" />
                </span>
              </p>
              <p>
                <span className="text-[#6b7280]">รหัสผู้สมัคร:</span>{" "}
                <span className="font-semibold text-[#16265E]">{record.ref}</span>
              </p>
              <p>
                <span className="text-[#6b7280]">สังกัด / สมาคม:</span>{" "}
                <span>{record.affiliation}</span>
              </p>
              <p>
                <span className="text-[#6b7280]">ตำแหน่ง:</span>{" "}
                <span>{record.position}</span>
              </p>
            </div>
          </div>
          <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-md border border-[#94a3b8] bg-[#e2e8f0] shadow-sm">
            <Image
              src="/assets/applicant-photo.png"
              alt={record.name}
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Course Details Box */}
        <div className="mt-6 rounded-xl border border-[#16265E]/20 bg-[#eff6ff]/60 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1e3a8a]">
            หลักสูตรที่ผ่านการคัดเลือก
          </p>
          <h3 className="mt-1 text-[16px] font-bold text-[#16265E]">
            {course?.title || record.courseTitle}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[11.5px]">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[#1e3a8a]">ช่วงเวลาอบรม:</span>
              <span className="font-medium text-[#111827]">{course?.date || "15-20 พ.ค. 2569"}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[#1e3a8a]">สถานที่อบรม:</span>
              <span className="font-medium text-[#111827]">{course?.location || "ศูนย์ฝึกกีฬาแห่งชาติ"}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-5 rounded-lg border border-[#e2e8f0] p-4 text-[10.5px] leading-relaxed text-[#4b5563]">
          <p className="font-bold text-[#111827]">ข้อปฏิบัติในการรายงานตัว:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>โปรดนำเอกสารฉบับนี้พร้อมบัตรประจำตัวประชาชนฉบับจริงมาแสดงในวันรายงานตัว</li>
            <li>กรุณาแต่งกายด้วยชุดสุภาพหรือเครื่องแบบตามระเบียบของสถาบันวิทยาการกีฬา</li>
            <li>รายงานตัวก่อนเวลาเริ่มการอบรมอย่างน้อย 30 นาที</li>
          </ul>
        </div>

        {/* Verification Footer & Stamp */}
        <div className="mt-7 flex items-end justify-between border-t border-[#e2e8f0] pt-6">
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-24 shrink-0 rounded-lg border border-[#cbd5e1] p-1 shadow-sm">
              <Image
                src="/assets/qr-receipt.png"
                alt="Event Check-in QR"
                fill
                className="object-contain p-1"
              />
            </div>
            <div className="text-[9.5px] leading-relaxed text-[#6b7280]">
              <p className="font-bold text-[#111827]">QR Code เช็กชื่อหน้างาน</p>
              <p>ใช้สแกนลงทะเบียนเข้าร่วมอบรม ณ จุดลงทะเบียน</p>
              <p className="mt-1">ยืนยันผลเมื่อ: {formatThaiDate(record.submittedAt, true)}</p>
            </div>
          </div>

          <div className="text-center">
            <div className="h-12 w-48 border-b border-dashed border-[#94a3b8]" />
            <p className="mt-1.5 text-[10.5px] font-bold text-[#111827]">
              (ผู้อำนวยการฝ่ายพัฒนาบุคลากรกีฬา)
            </p>
            <p className="text-[9px] text-[#6b7280]">
              สถาบันวิทยาการกีฬาแห่งประเทศไทย
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PassPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#525659] text-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      }
    >
      <PassPrintView />
    </Suspense>
  );
}
