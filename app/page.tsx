"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { AdminNavButton } from "@/components/layout/admin-nav-button";
import { Stepper } from "@/components/stepper/stepper";
import { CourseCard } from "@/components/course/course-card";
import { CourseDetailDialog } from "@/components/course/course-detail-dialog";
import { TimelineSummary } from "@/components/timeline/timeline-summary";
import { getCourseById, getDefaultCourse, type Course } from "@/lib/courses";
import { useCourses } from "@/lib/courses-store";

const steps = [
  { label: "เลือกหลักสูตร" },
  { label: "กรอกข้อมูลและส่งเอกสาร" },
  { label: "ยื่นข้อมูลสมัคร" },
];

export default function CourseCatalogPage() {
  return (
    <Suspense fallback={null}>
      <CourseCatalogContent />
    </Suspense>
  );
}

function CourseCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { courses } = useCourses();
  const initialCourse =
    getCourseById(searchParams.get("course"), courses) ??
    getDefaultCourse(courses);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialCourse.status === "open" ? initialCourse.id : null
  );
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const selectedCourse = courses.find(
    (course) => course.id === selectedId && course.status === "open"
  );
  const activeId = selectedCourse?.id ?? null;

  const handleContinue = () => {
    if (!selectedCourse) return;
    router.push(`/register?course=${selectedCourse.id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        rightSlot={
          <div className="flex items-center gap-3">
            <Link
              href="/status"
              className="whitespace-nowrap rounded-md border border-[#d1d5db] bg-white px-4 py-2 text-[13px] font-semibold text-[#374151] transition-colors hover:bg-[#f8fafc]"
            >
              ตรวจสอบสถานะ
            </Link>
            <AdminNavButton />
          </div>
        }
      />

      <main className="mx-auto max-w-[1440px] px-5 pb-28 pt-5">
        <Stepper currentStep={1} steps={steps} />

        <div className="mb-5 mt-7">
          <h2 className="text-[22px] font-bold leading-snug text-[#16265E]">
            ขั้นตอนที่ 1: เลือกหลักสูตรที่ต้องการสมัคร
          </h2>
          <p className="mt-1 text-[13px] text-[#6b7280]">
            *กรุณาตรวจสอบคุณสมบัติเฉพาะของแต่ละหลักสูตรก่อนตัดสินใจ (สามารถสมัครได้มากกว่า 1 หลักสูตร โดยช่วงเวลาการอบรมต้องไม่ซ้อนทับกัน)
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              {...course}
              selected={course.id === activeId}
              onSelect={setSelectedId}
              onViewDetails={() => setDetailCourse(course)}
            />
          ))}
        </div>

        <TimelineSummary />
      </main>

      <CourseDetailDialog
        course={detailCourse}
        onClose={() => setDetailCourse(null)}
        onSelectRegister={(id) => setSelectedId(id)}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#bfdbfe] bg-[#dbeafe]">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-5">
          <p className="truncate text-[13px] text-[#1e3a8a]">
            หลักสูตรที่เลือก:{" "}
            <span className="font-bold">
              {selectedCourse ? selectedCourse.title : "ยังไม่ได้เลือกหลักสูตร"}
            </span>
          </p>
          <button
            type="button"
            onClick={handleContinue}
            disabled={activeId === null}
            className="h-9 shrink-0 rounded-md border-2 border-[#dc2626] bg-white px-4 text-[13px] font-semibold text-[#dc2626] transition-colors hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:border-[#d1d5db] disabled:text-[#9ca3af] disabled:hover:bg-white"
          >
            ถัดไป: กรอกข้อมูลและส่งเอกสารสมัคร ›
          </button>
        </div>
      </div>
    </div>
  );
}
