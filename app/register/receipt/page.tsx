"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { DownloadIcon } from "@/components/ui/icons";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusTracker } from "@/components/status/status-tracker";
import { getCourseById, getDefaultCourse } from "@/lib/courses";
import { useCourses } from "@/lib/courses-store";
import {
  getApplicationByIdCard,
  getLatestApplication,
  useApplications,
} from "@/lib/applications-store";
import { MOCK_ID_CARD } from "@/lib/registration";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[82px] shrink-0 font-medium text-[#4b5563]">{label}</dt>
      <dd className="min-w-0 flex-1 text-[#1f2937]">{value}</dd>
    </div>
  );
}

function SuccessIcon() {
  return (
    <svg
      className="h-[30px] w-[30px] shrink-0 text-[#2f9e57]"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const headerActions = (
  <>
    <Link
      href="/status"
      className="inline-flex h-7 items-center whitespace-nowrap rounded-[4px] border border-white/80 px-3 text-[12px] font-medium text-white transition-colors hover:bg-white/10"
    >
      ตรวจสอบสถานะ
    </Link>
    <Link
      href="/admin"
      className="inline-flex h-7 items-center whitespace-nowrap rounded-[4px] bg-white px-3 text-[12px] font-semibold text-[#183875] transition-colors hover:bg-[#f1f5f9]"
    >
      เข้าสู่ระบบ (Admin)
    </Link>
  </>
);

function ReceiptFallback() {
  return (
    <div className="min-h-screen bg-[#F3F7FA]">
      <Header variant="dark" rightSlot={headerActions} />
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<ReceiptFallback />}>
      <ReceiptContent />
    </Suspense>
  );
}

function ReceiptContent() {
  const searchParams = useSearchParams();
  const { applications } = useApplications();
  const { courses } = useCourses();
  const mounted = useMounted();
  const ref = searchParams.get("ref");
  const courseParam = searchParams.get("course");
  const record = ref
    ? applications.find((item) => item.ref === ref)
    : getApplicationByIdCard(applications, MOCK_ID_CARD) ??
      getLatestApplication(applications);
  const course =
    (record ? getCourseById(record.courseId, courses) : undefined) ??
    getCourseById(courseParam, courses) ??
    getDefaultCourse(courses);

  if (!record && !mounted) {
    return <ReceiptFallback />;
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-[#F3F7FA]">
        <Header variant="dark" rightSlot={headerActions} />
        <main className="mx-auto w-full max-w-[520px] px-5 pb-10 pt-16 text-center">
          <p className="text-[18px] font-semibold text-[#111827]">
            ไม่พบข้อมูลใบสมัคร
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#4b5563]">
            กรุณาตรวจสอบลิงก์หรือกลับไปเริ่มสมัครใหม่ ข้อมูลอาจถูกลบออกจากเครื่องนี้
          </p>
          <Link
            href={`/register?course=${course.id}`}
            className="mt-4 inline-flex h-9 items-center rounded-[5px] bg-[#1e3a8a] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#1e40af]"
          >
            กลับไปหน้าสมัคร
          </Link>
        </main>
      </div>
    );
  }

  const steps = [
    { label: "1. เลือกหลักสูตร", href: `/?course=${record.courseId}` },
    {
      label: "2. กรอกข้อมูลและส่งเอกสาร",
      href: `/register?course=${record.courseId}`,
    },
    { label: "3. ส่งข้อมูลสมัคร" },
  ];
  const reviewed = record.status !== "pending";
  const headline =
    record.status === "approved"
      ? "การสมัครได้รับอนุมัติแล้ว!"
      : record.status === "rejected"
        ? "ผลการตรวจสอบ: ไม่ผ่าน"
        : "ส่งข้อมูลการสมัครแล้ว!";
  const subtitle =
    record.status === "approved"
      ? "คุณผ่านการตรวจสอบคุณสมบัติแล้ว กรุณาดาวน์โหลดใบยืนยันและเตรียมตัวเข้ารับการอบรม"
      : record.status === "rejected"
        ? "เอกสารหรือคุณสมบัติยังไม่ผ่านเกณฑ์ กรุณาตรวจสอบเหตุผลและยื่นสมัครใหม่"
        : "อยู่ระหว่างการตรวจสอบคุณสมบัติและเอกสารโดยเจ้าหน้าที่ (3-5 วันทำการ)";

  return (
    <div className="min-h-screen bg-[#F3F7FA]">
      <Header variant="dark" rightSlot={headerActions} />

      <div className="mx-auto max-w-[1160px] px-5">
        <div className="flex justify-end py-2.5">
          <Breadcrumb
            variant="check"
            steps={steps}
            currentStep={3}
            completedSteps={[1, 2]}
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[520px] px-5 pb-10 pt-7">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2.5">
            <SuccessIcon />
            <h1 className="text-[21px] font-bold leading-tight text-[#111827] sm:text-[23px]">
              {headline}
            </h1>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#4b5563]">
            {subtitle}
          </p>
        </div>

        <StatusTracker
          className="mt-4"
          steps={[
            { label: "ส่งข้อมูลแล้ว", state: "done" },
            {
              label: "กำลังตรวจสอบคุณสมบัติ",
              state: reviewed ? "done" : "active",
            },
            {
              label:
                record.status === "rejected"
                  ? "ประกาศผล: ไม่ผ่าน"
                  : "ประกาศผลการสมัคร",
              state: reviewed ? "done" : "pending",
            },
          ]}
        />

        <Card
          padding="none"
          radius="md"
          className="mt-4 w-full shadow-[0_1px_3px_rgba(16,24,40,0.06)]"
        >
          <div className="flex flex-col sm:flex-row">
            <div className="min-w-0 flex-1 p-3">
              <div className="flex items-center justify-between gap-2 rounded-[4px] bg-[#1a3f83] px-2.5 py-[5px] text-[12px] font-semibold leading-snug text-white">
                <span>รหัสอ้างอิงการสมัคร: {record.receiptNo}</span>
                <CopyButton
                  text={record.receiptNo}
                  label="คัดลอก"
                  size="xs"
                  variant="ghost"
                  className="bg-white/10 text-white hover:bg-white/25 hover:text-white"
                />
              </div>

              <dl className="mt-2 space-y-[3px] text-[12.5px] leading-[1.6]">
                <ReceiptRow label="ชื่อ - นามสกุล" value={record.name} />
                <div className="flex items-center justify-between gap-1 py-0.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <dt className="w-[82px] shrink-0 font-medium text-[#4b5563]">เลขบัตร ปชช.</dt>
                    <dd className="min-w-0 truncate font-mono text-[12px] font-semibold text-[#1e3a8a]">
                      {record.idCard.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, "$1-$2-$3-$4-$5")}
                    </dd>
                  </div>
                  <CopyButton
                    text={record.idCard}
                    label="คัดลอก"
                    size="xs"
                    variant="badge"
                    title="คัดลอกเลขบัตรประชาชน 13 หลักเพื่อใช้ตรวจสอบสถานะ"
                  />
                </div>
                <ReceiptRow label="หลักสูตร" value={record.courseTitle} />
                <ReceiptRow
                  label="วันที่อบรม"
                  value={`วันที่ ${course.date}`}
                />
                <ReceiptRow
                  label="สถานที่อบรม"
                  value={`ณ ${course.location}`}
                />
                <ReceiptRow label="สังกัด" value={record.affiliation} />
                <ReceiptRow label="ตำแหน่ง" value={record.position} />
              </dl>
            </div>

            <div className="relative flex flex-col items-center border-t border-dashed border-[#cfd5de] p-3 sm:w-[122px] sm:shrink-0 sm:border-l sm:border-t-0">
              <span className="absolute -left-[7px] -top-[7px] hidden h-3.5 w-3.5 rounded-full bg-[#F3F7FA] sm:block" />
              <span className="absolute -bottom-[7px] -left-[7px] hidden h-3.5 w-3.5 rounded-full bg-[#F3F7FA] sm:block" />

              <Image
                src="/assets/applicant-photo.png"
                alt="รูปถ่ายผู้สมัคร"
                width={72}
                height={68}
                className="h-[68px] w-[72px] rounded-[4px] object-cover"
              />
              <Image
                src="/assets/qr-receipt.png"
                alt="QR Code สำหรับใช้ติดต่อกลับ"
                width={58}
                height={59}
                className="mt-3 h-[58px] w-[58px] object-contain"
              />
              <p className="mt-1 text-center text-[10px] leading-snug text-[#4b5563]">
                QR Code สำหรับใช้ติดต่อกลับ
              </p>
            </div>
          </div>
        </Card>

        <p className="mt-3 text-center text-[11px] font-medium leading-relaxed text-[#dc2626]">
          * กรุณาเก็บรหัสอ้างอิงหรือดาวน์โหลดเอกสารไว้
          เพื่อใช้เป็นหลักฐานในการติดตามผล
        </p>
        <p className="mx-auto mt-1.5 max-w-[470px] text-center text-[11.5px] leading-relaxed text-[#4b5563]">
          คุณสามารถกลับมาเช็คสถานะการสมัครได้ที่หน้าเว็บไซต์ ตรวจสอบสถานะ
          โดยใช้หมายเลขบัตรประชาชน 13 หลัก
        </p>

        <div className="mt-4 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          {record.status !== "rejected" && (
            <a
              href={`/print/receipt?ref=${encodeURIComponent(record.ref)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] bg-[#1e3a8a] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#1e40af] sm:w-auto"
            >
              <DownloadIcon className="h-3.5 w-3.5 shrink-0" />
              พิมพ์ / ดาวน์โหลดใบสมัคร (A4 PDF)
            </a>
          )}
          {record.status === "approved" && (
            <a
              href={`/print/pass?ref=${encodeURIComponent(record.ref)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] bg-[#059669] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#047857] sm:w-auto"
            >
              <DownloadIcon className="h-3.5 w-3.5 shrink-0" />
              พิมพ์ใบยืนยันการเข้าร่วม (Pass PDF)
            </a>
          )}
          <Link
            href={`/status?id=${record.idCard}`}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[4px] border border-[#16265E] bg-white px-3 text-[11px] font-medium text-[#16265E] transition-colors hover:bg-[#eff6ff] sm:w-auto"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7 7-7M3 12h18"
              />
            </svg>
            ตรวจสอบสถานะการสมัคร
          </Link>
        </div>

        <p className="mt-5 text-center text-[10.5px] text-[#6b7280]">
          ข้อมูลส่วนบุคคลของท่านจะถูกเก็บรักษาความลับตามกฎหมาย PDPA
        </p>
      </main>
    </div>
  );
}
