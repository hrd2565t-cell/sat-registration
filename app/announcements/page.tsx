"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { AppHeaderNav } from "@/components/layout/app-header-nav";
import { useCourses } from "@/lib/courses-store";
import {
  sortCoursesChronologically,
  getCourseScheduleDates,
  type Course,
  type CourseAnnouncementFile,
} from "@/lib/courses";
import { PdfPreviewModal } from "@/components/ui/pdf-preview-modal";

export default function AnnouncementsPage() {
  return (
    <Suspense fallback={null}>
      <AnnouncementsContent />
    </Suspense>
  );
}

function AnnouncementsContent() {
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("course");
  const { courses } = useCourses();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "pending">("all");
  const [previewFile, setPreviewFile] = useState<{
    file: CourseAnnouncementFile;
    courseTitle: string;
  } | null>(null);

  const sortedCourses = useMemo(() => {
    return sortCoursesChronologically(courses);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedCourses.filter((course) => {
      const hasAnnouncement = Boolean(course.announcementFile?.dataUrl);
      if (statusFilter === "published" && !hasAnnouncement) return false;
      if (statusFilter === "pending" && hasAnnouncement) return false;

      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        (course.shortTitle && course.shortTitle.toLowerCase().includes(q)) ||
        course.location.toLowerCase().includes(q) ||
        course.date.toLowerCase().includes(q) ||
        String(course.id).includes(q)
      );
    });
  }, [search, sortedCourses, statusFilter]);

  const stats = useMemo(() => {
    let publishedCount = 0;
    courses.forEach((c) => {
      if (c.announcementFile?.dataUrl) publishedCount++;
    });
    return {
      total: courses.length,
      published: publishedCount,
      pending: courses.length - publishedCount,
    };
  }, [courses]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 flex flex-col justify-between">
      {/* Top Header */}
      <Header rightSlot={<AppHeaderNav page="announcements" />} />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-[#16265E] transition-colors">
            หน้าแรก
          </Link>
          <span>/</span>
          <span className="font-bold text-[#16265E]">บอร์ดประกาศรายชื่อผู้มีสิทธิ์เข้ารับการฝึกอบรม</span>
        </div>

        {/* Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#071330] via-[#0d1b3e] to-[#16265E] text-white p-6 sm:p-10 shadow-xl overflow-hidden border border-blue-900/40">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
          <div className="absolute right-1/4 -bottom-24 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-400/20 border border-amber-300/30 px-3 py-0.5 text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-2xs">
                  <span>🏛️</span>
                  <span>การกีฬาแห่งประเทศไทย (กกท.) · กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ</span>
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-blue-200">
                  Official Public Announcements
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                ประกาศรายชื่อผู้มีสิทธิ์เข้ารับการฝึกอบรม
              </h1>

              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-light">
                ช่องทางทางการสำหรับเผยแพร่และดาวน์โหลดเอกสารประกาศรายชื่อผู้ผ่านการคัดเลือก (ตัวจริงและสำรอง)
                ฉบับสแกนลงนามโดยผู้ว่าการการกีฬาแห่งประเทศไทย พร้อมระบบติดตามสถานะรายบุคคล
              </p>
            </div>

            {/* Quick KPI Strip */}
            <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
              <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 backdrop-blur-xs min-w-[150px]">
                <p className="text-[11px] font-medium text-blue-200">ประกาศผลแล้ว</p>
                <p className="text-xl font-black text-emerald-300">
                  {stats.published} <span className="text-xs font-normal text-emerald-100">หลักสูตร</span>
                </p>
              </div>

              <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 backdrop-blur-xs min-w-[150px]">
                <p className="text-[11px] font-medium text-blue-200">อยู่ระหว่างพิจารณา / รอประกาศ</p>
                <p className="text-xl font-black text-amber-300">
                  {stats.pending} <span className="text-xs font-normal text-amber-100">หลักสูตร</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl bg-white p-3.5 sm:p-4 shadow-sm border border-gray-200">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหลักสูตร, สถานที่อบรม, รหัส..."
              className="w-full rounded-xl border border-gray-300 pl-9 pr-4 py-2 text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:border-[#16265E] focus:outline-none focus:ring-1 focus:ring-[#16265E]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-[#16265E] text-white shadow-xs"
                  : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === "published"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              <span>✓ ประกาศแล้ว ({stats.published})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              ⏳ รอประกาศ ({stats.pending})
            </button>
          </div>
        </div>

        {/* Course Announcements List */}
        <div className="space-y-4">
          {filteredCourses.map((course) => {
            const hasAnnouncement = Boolean(course.announcementFile?.dataUrl);
            const schedule = getCourseScheduleDates(course, courses);
            const isHighlight = initialCourseId === String(course.id);

            return (
              <div
                key={course.id}
                className={`rounded-2xl bg-white border p-5 transition-all shadow-sm hover:shadow-md ${
                  isHighlight
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : hasAnnouncement
                    ? "border-emerald-200"
                    : "border-gray-200"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Course Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10.5px] font-bold text-[#16265E]">
                        หลักสูตร #{course.id}
                      </span>
                      {hasAnnouncement ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-900">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          <span>✓ ประกาศรายชื่อทางการแล้ว</span>
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-900">
                          ⏳ อยู่ระหว่างการพิจารณาคุณสมบัติ
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-[#16265E] leading-snug">
                      {course.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1 font-medium text-gray-800">
                        <span>🗓️</span>
                        <span>รุ่นวันที่จัดอบรม: {course.date}</span>
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <span>📍</span>
                        <span>สถานที่: {course.location}</span>
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <span>👥</span>
                        <span>ความจุเปิดรับ: {course.seats}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[#1e3a8a] font-medium">
                        <span>📢</span>
                        <span>
                          {hasAnnouncement
                            ? `ประกาศผลเมื่อ: ${new Date(course.announcementFile!.uploadedAt).toLocaleDateString("th-TH")}`
                            : `กำหนดการประกาศผล: ${schedule.resultDate}`}
                        </span>
                      </span>
                    </div>

                    {/* Published PDF Metadata Box */}
                    {hasAnnouncement && (
                      <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-emerald-950">
                        <span className="text-base">📄</span>
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-bold line-clamp-1">
                            เอกสารประกาศ: {course.announcementFile!.name}
                          </p>
                          <p className="text-[10px] text-emerald-800">
                            ฉบับสแกนลงนามโดยผู้ว่าการ กกท. · ขนาดไฟล์ {course.announcementFile!.fileSize || "PDF"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap lg:flex-col items-stretch justify-end gap-2 shrink-0">
                    {hasAnnouncement ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewFile({
                              file: course.announcementFile!,
                              courseTitle: course.title,
                            })
                          }
                          className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#16265E] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#111e4a] active:scale-95 cursor-pointer"
                        >
                          <span>👁️</span>
                          <span>เปิดดูเอกสารประกาศ (PDF)</span>
                        </button>

                        <a
                          href={course.announcementFile!.dataUrl}
                          download={course.announcementFile!.name}
                          className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-2xs transition hover:bg-emerald-100 active:scale-95"
                        >
                          <span>⬇️</span>
                          <span>ดาวน์โหลด PDF ฉบับลงนาม</span>
                        </a>

                        <Link
                          href={`/status?course=${course.id}`}
                          className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                          <span>🔍</span>
                          <span>ตรวจผลรายบุคคล (เลขบัตร ปชช.)</span>
                        </Link>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <Link
                          href={`/status?course=${course.id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50/70 px-4 py-2.5 text-xs font-bold text-[#16265E] hover:bg-blue-100 transition shadow-2xs"
                        >
                          <span>🔍</span>
                          <span>ตรวจสอบสถานะการสมัครรายบุคคล</span>
                        </Link>
                        <p className="text-[10.5px] text-gray-500 text-center lg:text-right">
                          อยู่ระหว่างการตรวจคุณสมบัติและเสนอผู้ว่าการฯ ลงนาม
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCourses.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <span className="text-3xl">📭</span>
              <p className="mt-2 text-sm font-bold text-gray-800">ไม่พบหลักสูตรตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-gray-500">กรุณาลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะเป็น "ทั้งหมด"</p>
            </div>
          )}
        </div>
      </main>

      {/* PDF Viewer Dialog */}
      {previewFile && (
        <PdfPreviewModal
          isOpen={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          pdfUrl={previewFile.file.dataUrl}
          fileName={previewFile.file.name}
          fileSize={previewFile.file.fileSize}
          title={`ประกาศรายชื่อผู้มีสิทธิ์เข้ารับการฝึกอบรม: ${previewFile.courseTitle}`}
          subtitle="การกีฬาแห่งประเทศไทย (กกท.) · กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ"
        />
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <p className="font-semibold text-gray-700">
          กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย (กกท.)
        </p>
        <p className="mt-1 text-[11px] text-gray-400">
          ระบบบริการและฐานข้อมูลบุคลากรกีฬาแห่งชาติ (National Sports Personnel Gateway)
        </p>
      </footer>
    </div>
  );
}
