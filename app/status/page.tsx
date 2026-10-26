"use client";

import { Suspense, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, DownloadIcon } from "@/components/ui/icons";
import { IdCardInput } from "@/components/ui/id-card-input";
import { StatusPanel } from "@/components/status/status-panel";
import { getCourseById, getDefaultCourse } from "@/lib/courses";
import { useCourses } from "@/lib/courses-store";
import {
  formatThaiDateTime,
  getApplicationByIdCard,
  useApplications,
} from "@/lib/applications-store";
import { MOCK_ID_CARD } from "@/lib/registration";

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 ${className ?? ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 12h14M13 6l6 6-6 6"
      />
    </svg>
  );
}

const navLinkClass =
  "inline-flex h-7 items-center whitespace-nowrap rounded-[4px] px-3 text-[12px] font-medium transition-colors";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function StatusHeader() {
  return (
    <Header
      rightSlot={
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/status"
            aria-current="page"
            className={`${navLinkClass} bg-[#0b3c92] text-white hover:bg-[#09327a]`}
          >
            ตรวจสอบสถานะ
          </Link>
          <Link
            href="/admin"
            className={`${navLinkClass} border border-[#d1d5db] bg-white text-[#1f2937] hover:bg-[#f8fafc]`}
          >
            เข้าสู่ระบบ (Admin)
          </Link>
        </div>
      }
    />
  );
}

function SearchIcon() {
  return (
    <Image
      src="/assets/icon-search-emoji.png"
      alt=""
      width={22}
      height={22}
      className="shrink-0"
      aria-hidden="true"
      priority
    />
  );
}

export default function StatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F9FA]">
          <StatusHeader />
        </div>
      }
    >
      <StatusContent />
    </Suspense>
  );
}

function StatusContent() {
  const searchParams = useSearchParams();
  const { applications } = useApplications();
  const { courses } = useCourses();
  const mounted = useMounted();
  const initialId = (searchParams.get("id") ?? "").replace(/\D/g, "");
  const initialValid = initialId.length === 13;
  const [idValue, setIdValue] = useState(
    initialValid ? initialId : MOCK_ID_CARD
  );
  const [searchedId, setSearchedId] = useState(initialValid ? initialId : "");
  const [error, setError] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);

  const result = searchedId
    ? getApplicationByIdCard(applications, searchedId)
    : undefined;
  const course =
    (result ? getCourseById(result.courseId, courses) : undefined) ??
    getDefaultCourse(courses);

  const handleSearch = () => {
    const digits = idValue.replace(/\D/g, "");
    if (digits.length !== 13) {
      setError("กรุณากรอกหมายเลขบัตรประจำตัวประชาชนให้ครบ 13 หลัก");
      return;
    }
    setError("");
    setSearchedId(digits);
    resultsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F9FA]">
      <StatusHeader />

      <main className="mx-auto w-full max-w-[760px] px-5 pb-10 pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2">
            <SearchIcon />
            <h1 className="text-[21px] font-bold leading-tight text-[#111827] sm:text-[22px]">
              ตรวจสอบสถานะการสมัครเข้ารับอบรม
            </h1>
          </div>
          <p className="mt-1.5 max-w-[620px] text-[11.5px] leading-relaxed text-[#4b5563]">
            กรุณากรอกหมายเลขบัตรประจำตัวประชาชน 13 หลักที่ใช้ในการสมัคร
            เพื่อตรวจสอบสถานะและผลการพิจารณาคุณสมบัติ
          </p>
        </div>

        <div className="mx-auto mt-3.5 w-full max-w-[448px]">
          <IdCardInput
            value={idValue}
            onChange={setIdValue}
            tone="highlight"
            separator={false}
            className="justify-center"
          />
          {error && (
            <p className="mt-1.5 text-center text-[11px] text-[#dc2626]">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSearch}
            className="mt-3 flex h-[30px] w-full items-center justify-center gap-1.5 rounded-[5px] bg-[#c2242c] text-[13px] font-bold text-white transition-colors hover:bg-[#a91d24]"
          >
            ค้นหาข้อมูลสถานะ
            <ArrowRightIcon />
          </button>
        </div>

        <div ref={resultsRef} className="mt-5 scroll-mt-24">
          {!searchedId && (
            <Card
              padding="none"
              radius="lg"
              className="w-full border border-dashed border-[#cfd9e3] shadow-none"
            >
              <div className="px-4 py-8 text-center">
                <p className="text-[12.5px] font-medium text-[#374151]">
                  กรอกเลขบัตรประชาชนแล้วกด “ค้นหาข้อมูลสถานะ”
                </p>
                <p className="mt-1 text-[11px] text-[#6b7280]">
                  ระบบจะแสดงผลการตรวจสอบล่าสุดของคุณ
                </p>
              </div>
            </Card>
          )}

          {searchedId && !result && mounted && (
            <Card
              padding="none"
              radius="lg"
              className="w-full shadow-[0_1px_4px_rgba(16,24,40,0.08)]"
            >
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] font-semibold text-[#111827]">
                  ไม่พบข้อมูลการสมัครสำหรับเลขบัตรนี้
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6b7280]">
                  กรุณาตรวจสอบเลขบัตรประชาชนอีกครั้ง
                  หรือเริ่มสมัครใหม่หากยังไม่เคยส่งข้อมูล
                </p>
                <Link
                  href="/"
                  className="mt-3 inline-flex h-8 items-center rounded-[5px] bg-[#1e3a8a] px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#1e40af]"
                >
                  เลือกหลักสูตรและสมัคร
                </Link>
              </div>
            </Card>
          )}

          {result && (
            <Card
              padding="none"
              radius="lg"
              className="w-full shadow-[0_1px_4px_rgba(16,24,40,0.08)]"
            >
              <div className="p-3.5">
                <div className="flex flex-col gap-1 pt-2.5 text-[12px] leading-[1.5] text-[#1f2937] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                  <span>รหัสอ้างอิง: {result.ref}</span>
                  <span
                    className="hidden text-[#d1d5db] sm:inline"
                    aria-hidden="true"
                  >
                    |
                  </span>
                  <span>ผู้สมัคร: {result.name}</span>
                  <span
                    className="hidden text-[#d1d5db] sm:inline"
                    aria-hidden="true"
                  >
                    |
                  </span>
                  <span>หลักสูตร: {result.courseTitle}</span>
                </div>

                <div className="mt-3.5">
                  {result.status === "pending" && (
                    <StatusPanel
                      tone="pending"
                      title="อยู่ระหว่างการตรวจสอบคุณสมบัติ โดย AI และผู้ดูแลระบบ"
                      description="ระบบได้รับเอกสารของท่านแล้ว กำลังดำเนินการตรวจสอบ (ใช้เวลา 3-5 วันทำการ) กรุณาตรวจสอบสถานะอีกครั้งในภายหลัง"
                      action={
                        <a
                          href={`/print/receipt?ref=${encodeURIComponent(result.ref)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 w-full items-center justify-center gap-1.5 rounded-[4px] border border-[#0b3c92] bg-white text-[11px] font-semibold text-[#0b3c92] transition-colors hover:bg-[#eff6ff]"
                        >
                          <DownloadIcon />
                          พิมพ์ใบรับการสมัคร (A4 PDF)
                        </a>
                      }
                    />
                  )}
                  {result.status === "approved" && (
                    <StatusPanel
                      tone="approved"
                      title="ผ่านการตรวจสอบคุณสมบัติแล้ว"
                      description="ยินดีด้วย! คุณมีสิทธิ์เข้ารับการอบรม"
                      action={
                        <div className="flex flex-col gap-2 sm:flex-row w-full">
                          <a
                            href={`/print/pass?ref=${encodeURIComponent(result.ref)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[4px] bg-[#059669] text-[11px] font-semibold text-white transition-colors hover:bg-[#047857]"
                          >
                            <DownloadIcon />
                            พิมพ์บัตรเข้าร่วมอบรม (Pass PDF)
                          </a>
                          <a
                            href={`/print/receipt?ref=${encodeURIComponent(result.ref)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[4px] border border-[#0b3c92] bg-white text-[11px] font-semibold text-[#0b3c92] transition-colors hover:bg-[#eff6ff]"
                          >
                            <DownloadIcon />
                            พิมพ์ใบสมัคร (A4)
                          </a>
                        </div>
                      }
                    />
                  )}
                  {result.status === "rejected" && (
                    <StatusPanel
                      tone="rejected"
                      title="ไม่ผ่านการตรวจสอบคุณสมบัติ"
                      description={`เหตุผล: ${
                        result.reviewReason ?? result.ai.line2
                      }`}
                      action={
                        <Link
                          href={`/?course=${result.courseId}`}
                          className="mx-auto flex h-7 w-fit items-center justify-center gap-1 rounded-[5px] bg-[#6b7280] px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#565e66]"
                        >
                          สมัครใหม่อีกครั้ง
                          <ArrowRightIcon className="h-3 w-3" />
                        </Link>
                      }
                    />
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#eef0f3] pt-2.5 text-[10.5px] text-[#6b7280]">
                  <span>
                    สมัครเมื่อ {formatThaiDateTime(result.submittedAt)}
                  </span>
                  {result.reviewedAt && (
                    <span>
                      ตรวจสอบเมื่อ {formatThaiDateTime(result.reviewedAt)}
                    </span>
                  )}
                  <span className="text-[#1e3a8a]">
                    หลักสูตร {course.date} · {course.location}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        <p className="mt-5 text-center text-[10.5px] text-[#6b7280]">
          ข้อมูลส่วนบุคคลของท่านจะถูกเก็บรักษาความลับตามกฎหมาย PDPA
        </p>

        <Link
          href="/"
          className="mt-2.5 inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 text-[11px] font-medium text-[#4b5563] transition-colors hover:bg-[#f8fafc]"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5 shrink-0" />
          กลับสู่หน้าหลัก
        </Link>
      </main>
    </div>
  );
}
