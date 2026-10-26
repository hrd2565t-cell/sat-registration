"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CourseEditDialog } from "@/components/admin/course-edit-dialog";
import { useApplications } from "@/lib/applications-store";
import {
  updateCourse,
  useCourses,
  type CourseUpdate,
} from "@/lib/courses-store";

function CalendarIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" strokeWidth="1.7" />
      <path strokeLinecap="round" strokeWidth="1.7" d="M7.5 3v4M16.5 3v4M3.5 9.5h17" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinejoin="round"
        strokeWidth="1.7"
        d="M12 21s6.5-5.4 6.5-11a6.5 6.5 0 10-13 0c0 5.6 6.5 11 6.5 11z"
      />
      <circle cx="12" cy="10" r="2.2" strokeWidth="1.7" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
        d="M13.7 3.3l3 3-9.2 9.2-3.6.6.6-3.6 9.2-9.2z"
      />
      <path strokeLinecap="round" strokeWidth="1.7" d="M12.1 4.9l3 3" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3" strokeWidth="1.7" />
      <path
        strokeLinecap="round"
        strokeWidth="1.7"
        d="M3.5 19c.4-3.3 2.7-5.2 5.5-5.2s5.1 1.9 5.5 5.2"
      />
      <circle cx="17" cy="9" r="2.3" strokeWidth="1.7" />
      <path strokeLinecap="round" strokeWidth="1.7" d="M16 14.2c2.3.2 4 1.9 4.4 4.8" />
    </svg>
  );
}

export function CoursesAdmin() {
  const { applications } = useApplications();
  const { courses } = useCourses();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const editingCourse =
    editingId === null
      ? undefined
      : courses.find((course) => course.id === editingId);

  const handleSave = (patch: CourseUpdate) => {
    if (!editingCourse) return false;

    const result = updateCourse(editingCourse.id, patch);
    if (!result) return false;

    if (!result.persisted) {
      if (patch.image?.startsWith("data:image/")) {
        // Keep the dialog open so the admin can pick a smaller image.
        return "รูปมีขนาดใหญ่เกินพื้นที่จัดเก็บของเบราว์เซอร์ กรุณาเลือกรูปที่เล็กลง";
      }
      setNotice(
        `บันทึก ${result.course.title} แล้ว แต่เบราว์เซอร์ไม่อนุญาตให้จัดเก็บถาวร ข้อมูลจะหายเมื่อรีเฟรช`
      );
    } else {
      setNotice(`บันทึกการแก้ไข ${result.course.title} เรียบร้อยแล้ว`);
    }
    setEditingId(null);
    return true;
  };

  const totals = courses.reduce(
    (result, course) => {
      const courseApplications = applications.filter(
        (item) => item.courseId === course.id
      );
      result.applicants += courseApplications.length;
      result.pending += courseApplications.filter(
        (item) => item.status === "pending"
      ).length;
      result.open += course.status === "open" ? 1 : 0;
      return result;
    },
    { applicants: 0, pending: 0, open: 0 }
  );

  return (
    <div className="mx-auto w-full max-w-[1220px]">
      <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-semibold text-[#111827]">
              จัดการหลักสูตร
            </h1>
            <p className="mt-1 max-w-[680px] text-[11.5px] leading-relaxed text-[#4b5563]">
              ภาพรวมหลักสูตรและจำนวนผู้สมัครจากข้อมูลกลาง
              แก้ไขรายละเอียด สถานะ และจำนวนที่นั่งได้จากปุ่มบนการ์ด
              การเปลี่ยนแปลงจะแสดงบนหน้าเว็บสาธารณะทันที
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-8 items-center rounded-[5px] border border-[#c7d7ea] bg-white px-3 text-[11px] font-semibold text-[#1e3a8a] transition-colors hover:bg-[#eff6ff]"
          >
            ดูหน้าหลักสูตรสาธารณะ
          </Link>
        </div>

        {notice && (
          <p
            role="status"
            className="mt-3 rounded-[5px] border border-[#b9dbc5] bg-[#eef9f1] px-3 py-2 text-[11px] text-[#176c3a]"
          >
            {notice}
          </p>
        )}

        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[#eef0f3] pt-3 sm:grid-cols-3">
          <div className="rounded-[6px] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[10px] text-[#6b7280]">หลักสูตรเปิดรับ</p>
            <p className="mt-0.5 text-[16px] font-semibold text-[#111827]">
              {totals.open}{" "}
              <span className="text-[10px] font-normal text-[#6b7280]">
                / {courses.length} หลักสูตร
              </span>
            </p>
          </div>
          <div className="rounded-[6px] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[10px] text-[#6b7280]">ผู้สมัครรวม</p>
            <p className="mt-0.5 text-[16px] font-semibold text-[#111827]">
              {totals.applicants}{" "}
              <span className="text-[10px] font-normal text-[#6b7280]">คน</span>
            </p>
          </div>
          <div className="rounded-[6px] bg-[#fffaf0] px-3 py-2.5">
            <p className="text-[10px] text-[#9a5c00]">รอตรวจสอบรวม</p>
            <p className="mt-0.5 text-[16px] font-semibold text-[#9a5c00]">
              {totals.pending}{" "}
              <span className="text-[10px] font-normal text-[#9a5c00]">
                คน
              </span>
            </p>
          </div>
        </div>
      </section>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const courseApplications = applications.filter(
            (item) => item.courseId === course.id
          );
          const pending = courseApplications.filter(
            (item) => item.status === "pending"
          ).length;
          const approved = courseApplications.filter(
            (item) => item.status === "approved"
          ).length;

          return (
            <section
              key={course.id}
              className="flex flex-col overflow-hidden rounded-lg border border-[#e3e6ea] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.05)]"
            >
              <div className="relative h-[120px] w-full overflow-hidden bg-[#e5e7eb]">
                <Image
                  src={course.image}
                  alt={course.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => setEditingId(course.id)}
                  aria-label={`แก้ไข ${course.title}`}
                  className="absolute left-2 top-2 z-10 inline-flex h-7 items-center gap-1 rounded-[5px] border border-white/90 bg-white/95 px-2.5 text-[10.5px] font-semibold text-[#1e3a8a] shadow-md backdrop-blur transition hover:bg-white hover:shadow-lg"
                >
                  <PencilIcon />
                  แก้ไข
                </button>
                <span
                  className={`absolute right-2 top-2 z-10 min-w-[84px] text-center rounded-[5px] px-2.5 py-1 text-[10.5px] font-semibold text-white shadow-sm ${
                    course.status === "open"
                      ? (course.seatsLeft ?? 0) <= 5
                        ? "bg-[#d97706]"
                        : "bg-[#078A43]"
                      : "bg-[#b42d35]"
                  }`}
                >
                  {course.status === "open"
                    ? `เหลือ ${course.seatsLeft} ที่นั่ง`
                    : "เต็มแล้ว"}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-3">
                <h2 className="text-[13px] font-semibold leading-snug text-[#111827]">
                  {course.title}
                </h2>
                <div className="mt-1.5 space-y-1 text-[10.5px] text-[#4b5563]">
                  <p className="flex items-start gap-1.5">
                    <CalendarIcon />
                    <span>{course.date}</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <PinIcon />
                    <span>{course.location}</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <UsersIcon />
                    <span>{course.seats}</span>
                  </p>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-[5px] bg-[#f8fafc] px-2 py-2 text-center">
                  <div>
                    <p className="text-[14px] font-semibold leading-none text-[#111827]">
                      {courseApplications.length}
                    </p>
                    <p className="mt-1 text-[9px] text-[#6b7280]">ผู้สมัคร</p>
                  </div>
                  <div className="border-x border-[#e5e7eb]">
                    <p className="text-[14px] font-semibold leading-none text-[#9a5c00]">
                      {pending}
                    </p>
                    <p className="mt-1 text-[9px] text-[#6b7280]">รอตรวจ</p>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold leading-none text-[#176c3a]">
                      {approved}
                    </p>
                    <p className="mt-1 text-[9px] text-[#6b7280]">อนุมัติ</p>
                  </div>
                </div>

                {course.warningMessage && (
                  <p className="mt-2 line-clamp-2 text-[9.5px] leading-relaxed text-[#9a5c00]">
                    หมายเหตุ: {course.warningMessage}
                  </p>
                )}

                <div className="mt-auto flex gap-2 pt-3">
                  <Link
                    href={`/admin/applicants?course=${course.id}`}
                    className="inline-flex h-8 flex-1 items-center justify-center rounded-[5px] bg-[#1e3a8a] text-[10.5px] font-semibold text-white transition-colors hover:bg-[#1e40af]"
                  >
                    ดูผู้สมัคร
                  </Link>
                  <Link
                    href={`/?course=${course.id}`}
                    className="inline-flex h-8 flex-1 items-center justify-center rounded-[5px] border border-[#d1d5db] bg-white text-[10.5px] font-medium text-[#374151] transition-colors hover:bg-[#f8fafc]"
                  >
                    หน้าหลักสูตร
                  </Link>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {editingCourse && (
        <CourseEditDialog
          key={editingCourse.id}
          course={editingCourse}
          onClose={() => setEditingId(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
