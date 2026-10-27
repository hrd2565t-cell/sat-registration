"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import type { Course } from "@/lib/courses";
import { TARGET_GROUPS } from "@/lib/courses";

interface CourseDetailDialogProps {
  course: Course | null;
  onClose: () => void;
  onSelectRegister?: (courseId: number) => void;
}

export function CourseDetailDialog({
  course,
  onClose,
  onSelectRegister,
}: CourseDetailDialogProps) {
  useEffect(() => {
    if (!course) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [course, onClose]);

  if (!course) return null;

  const isFull = course.status === "full" || course.seatsLeft === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        onClick={onClose}
        className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-[2px] transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative flex max-h-[92dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="relative border-b border-[#e2e8f0] bg-gradient-to-r from-[#0f1f4b] via-[#16265E] to-[#1e3a8a] px-5 py-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 pr-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-sm">
                  กกท. • SAT Course #{course.id}
                </span>
                {isFull ? (
                  <span className="inline-flex items-center rounded-full bg-[#ef4444] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    ● ปิดรับสมัคร (เต็มแล้ว)
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-[#10b981] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    ● เปิดรับสมัคร {course.seatsLeft !== undefined ? `(เหลือ ${course.seatsLeft} ที่นั่ง)` : ""}
                  </span>
                )}
              </div>
              <h2
                id="course-detail-title"
                className="mt-2 text-[17px] font-bold leading-snug sm:text-[19px]"
              >
                {course.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-6 text-[#1f2937]">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3.5 text-[12.5px] sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe] text-[#1e40af]">
                📅
              </span>
              <div>
                <p className="text-[11px] font-medium text-[#6b7280]">ช่วงเวลาอบรม</p>
                <p className="font-semibold text-[#1e293b]">{course.date}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe] text-[#1e40af]">
                📍
              </span>
              <div>
                <p className="text-[11px] font-medium text-[#6b7280]">สถานที่จัดอบรม</p>
                <p className="font-semibold text-[#1e293b]">{course.location}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe] text-[#1e40af]">
                👥
              </span>
              <div>
                <p className="text-[11px] font-medium text-[#6b7280]">จำนวนที่เปิดรับ</p>
                <p className="font-semibold text-[#1e293b]">{course.seats}</p>
              </div>
            </div>
          </div>

          {course.warningMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#fed7aa] bg-[#fffbeb] p-3 text-[12.5px] text-[#9a3412]">
              <span className="text-base shrink-0">⚠️</span>
              <div>
                <span className="font-bold">ข้อกำหนดเฉพาะ: </span>
                {course.warningMessage}
              </div>
            </div>
          )}

          {/* Section: วัตถุประสงค์หลักสูตร */}
          {course.courseObjective && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#e0e7ff] text-[#4338ca] text-xs">
                  🎯
                </span>
                <h3 className="text-[14.5px] font-bold text-[#16265E]">
                  วัตถุประสงค์ของหลักสูตร
                </h3>
              </div>
              <p className="text-[13px] leading-relaxed text-[#374151] pl-1">
                {course.courseObjective}
              </p>
            </section>
          )}

          {/* Section: คุณสมบัติของผู้สมัคร */}
          {course.qualifications && course.qualifications.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#dcfce7] text-[#15803d] text-xs">
                  📋
                </span>
                <h3 className="text-[14.5px] font-bold text-[#16265E]">
                  คุณสมบัติของผู้สมัครเข้ารับการอบรม
                </h3>
              </div>
              <ul className="space-y-2 pl-1">
                {course.qualifications.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#374151]">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#10b981]/15 text-[#059669]">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Section: สิทธิประโยชน์และสิ่งที่ กกท. สนับสนุน */}
          {(course.satSupport || course.expensesPolicy) && (
            <section className="space-y-2.5 rounded-xl border border-[#bae6fd] bg-gradient-to-br from-[#f0f9ff] to-[#f8fafc] p-3.5">
              <div className="flex items-center gap-2 border-b border-[#e0f2fe] pb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0284c7] text-white text-xs">
                  🎁
                </span>
                <h3 className="text-[14.5px] font-bold text-[#0369a1]">
                  สิทธิประโยชน์และสิ่งที่ กกท. ให้การสนับสนุน
                </h3>
              </div>

              {course.satSupport && course.satSupport.length > 0 && (
                <ul className="space-y-2 pl-1">
                  {course.satSupport.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#334155]">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0284c7]/15 text-[#0284c7]">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {course.expensesPolicy && (
                <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-2.5 text-[12px] text-[#92400e]">
                  <span className="text-sm shrink-0">ℹ️</span>
                  <div className="leading-relaxed">
                    <span className="font-bold">ค่าใช้จ่ายนอกเหนือการสนับสนุน: </span>
                    {course.expensesPolicy}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Section: สัดส่วนกลุ่มเป้าหมาย (5 กลุ่ม) */}
          {course.targetQuotas && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#fef3c7] text-[#b45309] text-xs">
                    📊
                  </span>
                  <h3 className="text-[14.5px] font-bold text-[#16265E]">
                    สัดส่วนเป้าหมายผู้เข้ารับการอบรม (5 กลุ่มเป้าหมาย)
                  </h3>
                </div>
                <span className="text-[11px] text-[#6b7280]">
                  รวมเป้าหมาย {Object.values(course.targetQuotas).reduce((a, b) => a + b, 0)} คน
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                {TARGET_GROUPS.map((tg) => {
                  const quota = course.targetQuotas?.[tg.key] ?? 0;
                  return (
                    <div
                      key={tg.key}
                      className="flex items-center justify-between rounded-lg border border-[#f1f5f9] bg-[#f8fafc] px-3 py-2"
                    >
                      <span className="text-[#334155] font-medium truncate pr-2">
                        {tg.label}
                      </span>
                      <span className="shrink-0 font-bold text-[#1e3a8a] bg-[#dbeafe] px-2 py-0.5 rounded-full text-[11px]">
                        {quota} คน
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#94a3b8] italic">
                *หมายเหตุ: สัดส่วนเป็นเป้าหมายเชิงแนวทาง คณะกรรมการอาจพิจารณาปรับเกลี่ยตามความเหมาะสมของผู้สมัครจริง
              </p>
            </section>
          )}

          {/* Section: เอกสารประกอบการสมัคร */}
          {course.requiredDocuments && course.requiredDocuments.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f3e8ff] text-[#7e22ce] text-xs">
                  📂
                </span>
                <h3 className="text-[14.5px] font-bold text-[#16265E]">
                  เอกสารและหลักฐานประกอบการสมัคร
                </h3>
              </div>
              <ul className="space-y-2 pl-1">
                {course.requiredDocuments.map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#374151]">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[#7e22ce]">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </span>
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Section: เกณฑ์การสำเร็จการอบรม */}
          {course.evaluationCriteria && course.evaluationCriteria.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#fef9c3] text-[#854d0e] text-xs">
                  🏆
                </span>
                <h3 className="text-[14.5px] font-bold text-[#16265E]">
                  เกณฑ์การสำเร็จการอบรมและการรับวุฒิบัตร
                </h3>
              </div>
              <ul className="space-y-2 pl-1">
                {course.evaluationCriteria.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#374151]">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[#d97706]">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[#e2e8f0] bg-[#f8fafc] px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-[#cbd5e1] bg-white px-4 text-[13px] font-semibold text-[#475569] transition-colors hover:bg-[#f1f5f9]"
          >
            ปิดหน้าต่าง
          </button>

          {isFull ? (
            <button
              type="button"
              disabled
              className="h-9 cursor-not-allowed rounded-md bg-[#cbd5e1] px-5 text-[13px] font-semibold text-[#64748b]"
            >
              หลักสูตรนี้เต็มแล้ว
            </button>
          ) : (
            <Link
              href={`/register?course=${course.id}`}
              onClick={() => {
                onSelectRegister?.(course.id);
                onClose();
              }}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#dc2626] px-5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#b91c1c] active:scale-[0.99]"
            >
              <span>สมัครเข้ารับการอบรมนี้</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
