"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CourseEditDialog } from "@/components/admin/course-edit-dialog";
import { GlobalScheduleCard } from "@/components/admin/global-schedule-card";
import { SyncDefaultsButton } from "@/components/admin/sync-defaults-button";
import {
  DEFAULT_EXPENSES_POLICY,
  DEFAULT_SAT_SUPPORT,
  DEFAULT_TARGET_QUOTAS,
  TARGET_GROUPS,
  getCourseScheduleDates,
  getTargetGroupKey,
  type Course,
} from "@/lib/courses";
import { useApplications } from "@/lib/applications-store";
import {
  addCourse,
  deleteCourse,
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

const NEW_COURSE_TEMPLATE: Course = {
  id: 0,
  image: "/assets/course-executive-management.jpg",
  imageAlt: "หลักสูตรใหม่ - รูปประกอบ",
  status: "open",
  capacity: 50,
  seatsLeft: 50,
  title: "",
  shortTitle: "",
  date: "1 - 5 พ.ย. 2570",
  location: "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
  seats: "จำนวนที่นั่ง 50 คน",
  targetQuotas: { ...DEFAULT_TARGET_QUOTAS },
  courseObjective:
    "เพื่อพัฒนาความรู้และทักษะวิชาชีพบุคลากรทางการกีฬาตามมาตรฐานการกีฬาแห่งประเทศไทย",
  qualifications: [
    "มีสัญชาติไทย อายุ 20 ปีบริบูรณ์ขึ้นไป",
    "สังกัดหน่วยงานใน 5 กลุ่มเป้าหมาย กกท. (มีหนังสือนำส่งรับรองจากต้นสังกัด)",
  ],
  requiredDocuments: [
    "รูปถ่ายหน้าตรงขนาด 1.5 - 2 นิ้ว ถ่ายไม่เกิน 6 เดือน (ไฟล์ JPG/PNG)",
    "หนังสือนำส่งรับรองจากต้นสังกัดหรือสมาคมกีฬา (ไฟล์ PDF)",
    "สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง",
  ],
  evaluationCriteria: [
    "มีเวลาเข้าร่วมการอบรมไม่น้อยกว่าร้อยละ 80 ของเวลาทั้งหมด",
    "ผ่านการประเมินผลภาคทฤษฎีและภาคปฏิบัติตามเกณฑ์ที่กำหนด",
    "ได้รับวุฒิบัตรรับรองจากการกีฬาแห่งประเทศไทย (กกท.)",
  ],
  satSupport: [...DEFAULT_SAT_SUPPORT],
  expensesPolicy: DEFAULT_EXPENSES_POLICY,
};

export function CoursesAdmin() {
  const { applications } = useApplications();
  const { courses } = useCourses();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [notice, setNotice] = useState("");

  const editingCourse =
    editingId === null
      ? undefined
      : courses.find((course) => course.id === editingId);

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? "" : prev));
    }, 4500);
  };

  const handleSave = (patch: CourseUpdate) => {
    if (!editingCourse) return false;

    const result = updateCourse(editingCourse.id, patch);
    if (!result) return false;

    if (!result.persisted) {
      if (patch.image?.startsWith("data:image/")) {
        // Keep the dialog open so the admin can pick a smaller image.
        return "รูปมีขนาดใหญ่เกินพื้นที่จัดเก็บของเบราว์เซอร์ กรุณาเลือกรูปที่เล็กลง";
      }
      showNotice(
        `บันทึก ${result.course.title} แล้ว แต่เบราว์เซอร์ไม่อนุญาตให้จัดเก็บถาวร ข้อมูลจะหายเมื่อรีเฟรช`
      );
    } else {
      const modeText = patch.useCustomSchedule
        ? "(กำหนดวันแยกเฉพาะหลักสูตรนี้)"
        : "(ซิงก์กำหนดการกลางครบทุกหลักสูตร)";
      showNotice(
        `บันทึกการแก้ไข "${result.course.title}" เรียบร้อยแล้ว ${modeText}`
      );
    }
    setEditingId(null);
    return true;
  };

  const handleCreate = (patch: CourseUpdate) => {
    if (!patch.title?.trim()) {
      return "กรุณาระบุชื่อหลักสูตร";
    }
    const result = addCourse({
      ...patch,
      title: patch.title.trim(),
    });
    if (!result.persisted && patch.image?.startsWith("data:image/")) {
      return "รูปมีขนาดใหญ่เกินพื้นที่จัดเก็บของเบราว์เซอร์ กรุณาเลือกรูปที่เล็กลง";
    }
    showNotice(`เพิ่มหลักสูตร "${result.course.title}" และบันทึกข้อมูลเรียบร้อยแล้ว`);
    setIsCreating(false);
    return true;
  };

  const handleDelete = (course: Course) => {
    if (
      confirm(
        `คุณต้องการลบหลักสูตร "${course.title}" ออกจากระบบใช่หรือไม่?`
      )
    ) {
      deleteCourse(course.id);
      showNotice(`ลบหลักสูตร "${course.title}" เรียบร้อยแล้ว`);
    }
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
      {notice && (
        <div
          role="status"
          className="fixed top-4 left-1/2 z-[90] flex w-[92vw] max-w-[620px] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-[#16a34a] bg-[#15803d] px-4 py-3 text-[12.5px] font-semibold text-white shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-white/25"
          >
            ปิด ✕
          </button>
        </div>
      )}

      <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-semibold text-[#111827]">
              จัดการหลักสูตร
            </h1>
            <p className="mt-1 max-w-[680px] text-[11.5px] leading-relaxed text-[#4b5563]">
              ภาพรวมหลักสูตรและจำนวนผู้สมัครจากข้อมูลกลาง
              แก้ไขรายละเอียด สถานะ และจำนวนที่นั่งได้จากปุ่มบนการ์ด
              เมื่อแก้ไขเสร็จแล้วกดปุ่มสีเขียวเพื่อบันทึกฝังลงไฟล์ระบบถาวร
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex h-8 items-center gap-1 rounded-[5px] bg-[#1e3a8a] px-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#1e40af] active:scale-[0.98]"
            >
              <span>+ เพิ่มหลักสูตรใหม่</span>
            </button>
            <SyncDefaultsButton onSuccess={(msg) => showNotice(msg)} />
            <Link
              href="/"
              className="inline-flex h-8 items-center rounded-[5px] border border-[#c7d7ea] bg-white px-3 text-[11px] font-semibold text-[#1e3a8a] transition-colors hover:bg-[#eff6ff]"
            >
              ดูหน้าหลักสูตรสาธารณะ
            </Link>
          </div>
        </div>

        {notice && (
          <p
            role="status"
            className="mt-3 rounded-[5px] border border-[#b9dbc5] bg-[#eef9f1] px-3 py-2 text-[11px] font-semibold text-[#176c3a]"
          >
            ✅ {notice}
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

      <div className="mt-3">
        <GlobalScheduleCard onSaved={(msg) => showNotice(msg)} />
      </div>

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
          const reserve = courseApplications.filter(
            (item) => item.status === "reserve"
          ).length;

          const quotas = course.targetQuotas ?? DEFAULT_TARGET_QUOTAS;
          const groupStats = TARGET_GROUPS.map((g) => {
            const groupApps = courseApplications.filter(
              (a) => getTargetGroupKey(a.affiliation) === g.key
            );
            const groupApproved = groupApps.filter(
              (a) => a.status === "approved"
            ).length;
            const target = quotas[g.key] ?? 0;
            return {
              ...g,
              target,
              applicants: groupApps.length,
              approved: groupApproved,
            };
          });

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
                <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingId(course.id)}
                    aria-label={`แก้ไข ${course.title}`}
                    className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-white/90 bg-white/95 px-2.5 text-[10.5px] font-semibold text-[#1e3a8a] shadow-md backdrop-blur transition hover:bg-white hover:shadow-lg"
                  >
                    <PencilIcon />
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(course)}
                    aria-label={`ลบ ${course.title}`}
                    title="ลบหลักสูตรนี้"
                    className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-[#fecaca] bg-white/95 px-2 text-[10.5px] font-semibold text-[#b91c1c] shadow-md backdrop-blur transition hover:bg-[#fef2f2] hover:shadow-lg"
                  >
                    🗑️ ลบ
                  </button>
                </div>
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
                    ? `เหลือ ${course.seatsLeft} ที่นั่ง (Auto)`
                    : "เต็มแล้ว"}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-3">
                <h2 className="text-[13px] font-semibold leading-snug text-[#111827]">
                  {course.title}
                </h2>
                {(() => {
                  const sched = getCourseScheduleDates(course, courses);
                  return (
                    <div className="mt-1.5 rounded-[5px] border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1.5 text-[10px] space-y-0.5">
                      <div className="flex items-center justify-between border-b border-[#eef2f6] pb-0.5 mb-0.5">
                        <span className="text-[9px] font-semibold text-[#64748b]">
                          กำหนดการรับสมัคร/ประกาศผล
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[8.5px] font-bold ${
                            sched.isCustom
                              ? "bg-[#fef3c7] text-[#92400e]"
                              : "bg-[#dbeafe] text-[#1e40af]"
                          }`}
                        >
                          {sched.isCustom ? "✏️ กำหนดแยกเฉพาะหลักสูตร" : "🌐 ใช้กำหนดการกลาง"}
                        </span>
                      </div>
                      <p className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[#1869bc]">
                          📥 เปิดรับสมัคร:
                        </span>
                        <span className="font-bold text-[#1e3a8a]">
                          {sched.registrationDate}
                        </span>
                      </p>
                      <p className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[#c4080f]">
                          📣 ประกาศผล:
                        </span>
                        <span className="font-bold text-[#991b1b]">
                          {sched.resultDate}
                        </span>
                      </p>
                    </div>
                  );
                })()}
                <div className="mt-1.5 space-y-1 text-[10.5px] text-[#4b5563]">
                  <p className="flex items-start gap-1.5">
                    <CalendarIcon />
                    <span>
                      <strong className="font-semibold text-[#166534]">
                        อบรม:
                      </strong>{" "}
                      {course.date}
                    </span>
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

                <div className="mt-2.5 grid grid-cols-4 gap-1 rounded-[5px] bg-[#f8fafc] px-2 py-2 text-center">
                  <div>
                    <p className="text-[13px] font-semibold leading-none text-[#111827]">
                      {courseApplications.length}
                    </p>
                    <p className="mt-1 text-[9px] text-[#6b7280]">ผู้สมัคร</p>
                  </div>
                  <div className="border-l border-[#e5e7eb]">
                    <p className="text-[13px] font-semibold leading-none text-[#176c3a]">
                      {approved}
                    </p>
                    <p className="mt-1 text-[9px] font-medium text-[#176c3a]">ตัวจริง</p>
                  </div>
                  <div className="border-l border-[#e5e7eb]">
                    <p className="text-[13px] font-semibold leading-none text-[#1e40af]">
                      {reserve}
                    </p>
                    <p className="mt-1 text-[9px] font-medium text-[#1e40af]">สำรอง</p>
                  </div>
                  <div className="border-l border-[#e5e7eb]">
                    <p className="text-[13px] font-semibold leading-none text-[#d97706]">
                      {course.seatsLeft ?? 0}
                    </p>
                    <p className="mt-1 text-[9px] text-[#6b7280]">ว่าง</p>
                  </div>
                </div>

                {/* สัดส่วน 5 กลุ่มเป้าหมาย (เป้าหมาย vs อนุมัติจริง) */}
                <div className="mt-2.5 rounded-[6px] border border-[#e2e8f0] bg-[#f8fbff] p-2 text-[10px]">
                  <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-1 font-semibold text-[#1e3a8a]">
                    <span className="text-[10.5px]">เป้าหมายสัดส่วน 5 กลุ่ม</span>
                    <span className="text-[9px] text-[#6b7280]">
                      ตัวจริง / เป้า (สมัคร)
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1.5">
                    {groupStats.map((item) => {
                      const pct =
                        item.target > 0
                          ? Math.min(
                              100,
                              Math.round((item.approved / item.target) * 100)
                            )
                          : 0;
                      return (
                        <div key={item.key} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[9.5px]">
                            <span className="max-w-[150px] truncate font-medium text-[#374151]">
                              {item.label}
                            </span>
                            <span className="font-semibold text-[#111827]">
                              {item.approved}/{item.target} คน{" "}
                              <span className="font-normal text-[#6b7280]">
                                ({item.applicants})
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 100
                                  ? "bg-[#10b981]"
                                  : pct >= 60
                                    ? "bg-[#3b82f6]"
                                    : "bg-[#f59e0b]"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
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

      {isCreating && (
        <CourseEditDialog
          key="new-course"
          course={NEW_COURSE_TEMPLATE}
          onClose={() => setIsCreating(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}
