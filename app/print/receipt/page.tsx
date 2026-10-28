"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { useApplications, formatThaiDate, getDocumentLabel } from "@/lib/applications-store";
import { useCourses } from "@/lib/courses-store";

function ReceiptPrintView() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const { applications } = useApplications();
  const { courses } = useCourses();
  const autoPrintTriggeredRef = useRef(false);

  const record = applications.find(
    (app) => app.ref === ref || app.receiptNo === ref
  ) || applications[0]; // fallback to first record if not found

  const course = courses.find((c) => c.id === record?.courseId);
  const photoDoc = record?.documents?.find((d) => d.kind === "photo");
  const photoSrc = photoDoc?.dataUrl || "/assets/applicant-photo.png";

  useEffect(() => {
    if (record && !autoPrintTriggeredRef.current) {
      autoPrintTriggeredRef.current = true;
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [record]);

  if (!record) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-[14px] font-semibold text-[#111827]">ไม่พบข้อมูลใบสมัคร</p>
          <Link href="/" className="mt-2 text-[12px] text-[#1e3a8a] underline">
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#525659] py-0 sm:py-8 print:bg-white print:py-0">
      {/* Floating Toolbar (hidden in print) */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-[#323639] bg-[#323639] px-4 py-2.5 text-white shadow-md print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href={`/register/receipt?ref=${record.ref}&course=${record.courseId}`}
            className="inline-flex items-center gap-1 text-[12px] text-[#9ca3af] hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 10H5m0 0l5-5m-5 5l5 5" />
            </svg>
            <span>กลับหน้าใบเสร็จ</span>
          </Link>
          <span className="text-[#6b7280]">|</span>
          <span className="text-[12px] font-medium text-[#e5e7eb]">
            ใบรับเรื่อง {record.receiptNo}
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#2563eb] px-3.5 text-[11.5px] font-semibold text-white transition hover:bg-[#1d4ed8]"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 8V4a1 1 0 011-1h8a1 1 0 011 1v4m-10 4h10m-10 4h10M4 8h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6a2 2 0 012-2z" />
          </svg>
          <span>พิมพ์เอกสาร / บันทึก PDF</span>
        </button>
      </div>

      {/* A4 Sheet Container */}
      <div className="mx-auto w-full max-w-[210mm] bg-white p-8 shadow-2xl sm:my-4 sm:rounded-sm sm:p-12 print:m-0 print:max-w-none print:p-8 print:shadow-none">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b-2 border-[#16265E] pb-5">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <Image
                src="/assets/logo-sat-header.png"
                alt="SAT Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#16265E]">
                การกีฬาแห่งประเทศไทย (กกท.)
              </p>
              <p className="text-[11px] font-medium text-[#374151]">
                กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ
              </p>
              <h1 className="mt-1 text-[17px] font-bold tracking-tight text-[#111827]">
                ใบรับเรื่องการสมัครเข้ารับการฝึกอบรม
              </h1>
              <p className="text-[9.5px] text-[#6b7280]">
                OFFICIAL APPLICATION SUBMISSION RECEIPT
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block rounded-md border border-[#c7d2fe] bg-[#eff6ff] px-3 py-1 text-center">
              <p className="text-[9px] font-semibold uppercase text-[#1e3a8a]">
                เลขที่อ้างอิงใบเสร็จ
              </p>
              <p className="text-[15px] font-bold text-[#1e3a8a]">
                {record.receiptNo}
              </p>
            </div>
            <p className="mt-1.5 text-[9.5px] text-[#6b7280]">
              วันที่ยื่น: {formatThaiDate(record.submittedAt, true)}
            </p>
          </div>
        </div>

        {/* Section 1: ข้อมูลผู้สมัคร */}
        <div className="mt-6">
          <h2 className="border-l-4 border-[#16265E] pl-2 text-[12.5px] font-bold text-[#16265E]">
            1. ข้อมูลผู้สมัครเข้ารับการอบรม
          </h2>
          <div className="mt-2.5 flex items-stretch gap-4 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-4 text-[11.5px]">
            <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2.5">
              <div>
                <span className="text-[#6b7280]">ชื่อ-นามสกุล:</span>{" "}
                <span className="font-semibold text-[#111827]">{record.name}</span>
              </div>
              <div>
                <span className="text-[#6b7280]">หมายเลขบัตรประชาชน:</span>{" "}
                <span className="font-mono font-medium text-[#111827]">
                  {record.idCard.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, "$1-$2-$3-$4-$5")}
                </span>
                <span className="ml-1 inline-block align-middle print:hidden">
                  <CopyButton text={record.idCard} size="xs" variant="ghost" />
                </span>
              </div>
              <div>
                <span className="text-[#6b7280]">สังกัด / หน่วยงาน:</span>{" "}
                <span className="font-medium text-[#111827]">{record.affiliation}</span>
              </div>
              <div>
                <span className="text-[#6b7280]">ตำแหน่งหน้าที่:</span>{" "}
                <span className="font-medium text-[#111827]">{record.position}</span>
              </div>
              <div>
                <span className="text-[#6b7280]">เบอร์โทรศัพท์:</span>{" "}
                <span className="font-medium text-[#111827]">{record.phone}</span>
              </div>
              <div>
                <span className="text-[#6b7280]">อีเมล:</span>{" "}
                <span className="font-medium text-[#111827]">{record.email}</span>
              </div>
            </div>

            {/* กรอบรูปถ่ายผู้สมัครขนาดมาตรฐาน */}
            <div className="flex w-[86px] shrink-0 flex-col items-center justify-center rounded-md border border-[#cbd5e1] bg-white p-1 shadow-2xs">
              <div className="relative h-[96px] w-[74px] overflow-hidden rounded-[3px] bg-[#f1f5f9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoSrc}
                  alt={record.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="mt-1 text-[8.5px] font-medium text-[#64748b] print:text-[8px]">
                รูปถ่ายผู้สมัคร
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: ข้อมูลหลักสูตร */}
        <div className="mt-5">
          <h2 className="border-l-4 border-[#16265E] pl-2 text-[12.5px] font-bold text-[#16265E]">
            2. หลักสูตรที่สมัคร
          </h2>
          <div className="mt-2.5 rounded-lg border border-[#e5e7eb] p-4 text-[11.5px]">
            <p className="text-[13px] font-bold text-[#111827]">
              {course?.title || record.courseTitle}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-[#4b5563]">
              <p>
                <span className="text-[#6b7280]">ช่วงเวลาอบรม:</span>{" "}
                <span className="font-medium text-[#111827]">
                  {course?.date || "ตามกำหนดการของสถาบัน"}
                </span>
              </p>
              <p>
                <span className="text-[#6b7280]">สถานที่อบรม:</span>{" "}
                <span className="font-medium text-[#111827]">
                  {course?.location || "ศูนย์ฝึกกีฬาแห่งชาติ"}
                </span>
              </p>
              <p>
                <span className="text-[#6b7280]">สถานะการยื่นสมัคร:</span>{" "}
                <span className="font-semibold text-[#1e3a8a]">
                  {record.status === "approved"
                    ? "ผ่านการตรวจสอบคุณสมบัติแล้ว"
                    : record.status === "rejected"
                    ? "ไม่ผ่านคุณสมบัติ"
                    : "รับเรื่องแล้ว อยู่ระหว่างการตรวจสอบ"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: รายการเอกสารที่แนบ */}
        <div className="mt-5">
          <h2 className="border-l-4 border-[#16265E] pl-2 text-[12.5px] font-bold text-[#16265E]">
            3. รายการเอกสารหลักฐานที่ส่งมอบ
          </h2>
          <div className="mt-2.5 rounded-lg border border-[#e5e7eb] p-3 text-[11px]">
            <div className="space-y-1.5">
              {record.documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-[#f1f5f9] pb-1 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#dcfce7] text-[#15803d]">
                      ✓
                    </span>
                    <span className="font-medium text-[#111827]">
                      {getDocumentLabel(doc.kind)} ({doc.name})
                    </span>
                  </div>
                  <span className="text-[#6b7280]">{doc.size}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: การติดตามสถานะ & ตราประทับ */}
        <div className="mt-6 flex items-end justify-between border-t border-[#e5e7eb] pt-6">
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0 rounded-lg border border-[#e5e7eb] p-1 shadow-sm">
              <Image
                src="/assets/qr-receipt.png"
                alt="QR Code"
                fill
                className="object-contain p-1"
              />
            </div>
            <div className="max-w-[260px] text-[10px] leading-relaxed text-[#6b7280]">
              <p className="font-semibold text-[#111827]">
                สแกน QR เพื่อติดตามสถานะแบบเรียลไทม์
              </p>
              <p className="mt-0.5">
                สามารถตรวจสอบสถานะการพิจารณาได้ตลอด 24 ชั่วโมง โดยใช้หมายเลขบัตรประชาชน 13 หลัก
              </p>
            </div>
          </div>

          <div className="text-center">
            <div className="h-12 w-44 border-b border-dashed border-[#9ca3af]" />
            <p className="mt-1.5 text-[10px] font-semibold text-[#111827]">
              นายทะเบียนระบบสมัครออนไลน์ กกท.
            </p>
            <p className="text-[8.5px] text-[#6b7280]">
              ออกโดยระบบอัตโนมัติ กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#525659] text-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      }
    >
      <ReceiptPrintView />
    </Suspense>
  );
}
