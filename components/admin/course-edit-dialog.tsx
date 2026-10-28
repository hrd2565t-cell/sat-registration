"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  DEFAULT_TARGET_QUOTAS,
  TARGET_GROUPS,
  computeDefaultCourseScheduleFields,
  formatCourseDateFields,
  formatCourseDateSessions,
  getGlobalCourseSchedule,
  isCourseDateOverlapping,
  parseCourseDateFields,
  parseCourseDateSessions,
  type Course,
  type CourseDateFields,
  type TargetGroupQuotas,
} from "@/lib/courses";
import { getSeedCourse, useCourses, type CourseUpdate } from "@/lib/courses-store";
import { useSportsEvents } from "@/lib/sports-events-store";
import { ThaiCalendarRangePicker } from "@/components/ui/thai-calendar-picker";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_SOURCE_IMAGE_BYTES,
  estimateDataUrlBytes,
  resizeImageFile,
} from "@/lib/resize-image";

const fieldClass =
  "mt-1 h-9 w-full rounded-[5px] border border-[#d1d5db] bg-white px-3 text-[12.5px] text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20 disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#6b7280]";

const labelClass = "block text-[11.5px] font-medium text-[#374151]";

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeWidth="1.8"
        d="M5 5l10 10M15 5L5 15"
      />
    </svg>
  );
}

export function CourseEditDialog({
  course,
  onClose,
  onSave,
}: {
  course: Course;
  onClose: () => void;
  /** Return `true` on success, or an error message to keep the dialog open. */
  onSave: (patch: CourseUpdate) => boolean | string;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { courses: allCourses } = useCourses();
  const { events: sportsEvents } = useSportsEvents();
  const seedImage = getSeedCourse(course.id)?.image ?? course.image;
  const [image, setImage] = useState(course.image);
  const [imageInfo, setImageInfo] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [shortTitle, setShortTitle] = useState(course.shortTitle ?? "");
  const [sessions, setSessions] = useState<CourseDateFields[]>(() =>
    parseCourseDateSessions(course.date)
  );
  const [date, setDate] = useState(() =>
    formatCourseDateSessions(parseCourseDateSessions(course.date))
  );

  // โหมดกำหนดการ: false = ใช้กำหนดการกลางร่วมกันทุกหลักสูตร, true = กำหนดวันแยกเฉพาะหลักสูตรนี้
  const globalSched = getGlobalCourseSchedule(allCourses);
  const [useCustomSchedule, setUseCustomSchedule] = useState<boolean>(() =>
    Boolean(course.useCustomSchedule)
  );

  // วันเปิดรับสมัคร (registrationDate) และ วันประกาศผล (resultDate)
  const [regFields, setRegFields] = useState<CourseDateFields>(() => {
    const initialStr =
      course.registrationDate?.trim() || globalSched.registrationDate;
    return parseCourseDateFields(initialStr);
  });
  const [registrationDate, setRegistrationDate] = useState(() => {
    const initialStr =
      course.registrationDate?.trim() || globalSched.registrationDate;
    return formatCourseDateFields(parseCourseDateFields(initialStr), true);
  });

  const [resultFields, setResultFields] = useState<CourseDateFields>(() => {
    const initialStr = course.resultDate?.trim() || globalSched.resultDate;
    return parseCourseDateFields(initialStr);
  });
  const [resultDate, setResultDate] = useState(() => {
    const initialStr = course.resultDate?.trim() || globalSched.resultDate;
    return formatCourseDateFields(parseCourseDateFields(initialStr), true);
  });
  const [location, setLocation] = useState(course.location);
  const [seats, setSeats] = useState(course.seats);
  const [status, setStatus] = useState<Course["status"]>(course.status);
  const [seatsLeft, setSeatsLeft] = useState(() => {
    const parsedCap = Number(course.seats?.match(/\d+/)?.[0]) || course.capacity || 40;
    const initial = course.seatsLeft ?? (course.status === "open" ? parsedCap : 0);
    return String(Math.min(parsedCap, initial));
  });
  const [warningMessage, setWarningMessage] = useState(
    course.warningMessage ?? ""
  );
  const [courseObjective, setCourseObjective] = useState(
    course.courseObjective ?? ""
  );
  const [qualificationsText, setQualificationsText] = useState(
    (course.qualifications ?? []).join("\n")
  );
  const [requiredDocumentsText, setRequiredDocumentsText] = useState(
    (course.requiredDocuments ?? []).join("\n")
  );
  const [evaluationCriteriaText, setEvaluationCriteriaText] = useState(
    (course.evaluationCriteria ?? []).join("\n")
  );
  const [satSupportText, setSatSupportText] = useState(
    (course.satSupport ?? []).join("\n")
  );
  const [expensesPolicy, setExpensesPolicy] = useState(
    course.expensesPolicy ?? ""
  );
  const [quotas, setQuotas] = useState<TargetGroupQuotas>(
    course.targetQuotas ?? { ...DEFAULT_TARGET_QUOTAS }
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => titleRef.current?.focus(), 60);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (
      !ACCEPTED_IMAGE_TYPES.includes(
        file.type as (typeof ACCEPTED_IMAGE_TYPES)[number]
      )
    ) {
      setError("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP");
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      setError("ไฟล์รูปต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    setImageBusy(true);
    setError("");
    try {
      const result = await resizeImageFile(file);
      setImage(result.dataUrl);
      setImageInfo(
        `${file.name} · ${result.width}×${result.height} px · ${Math.max(
          1,
          Math.round(estimateDataUrlBytes(result.dataUrl) / 1024)
        )} KB`
      );
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "ไม่สามารถอ่านไฟล์รูปภาพได้"
      );
    } finally {
      setImageBusy(false);
    }
  };

  const handleResetImage = () => {
    setImage(seedImage);
    setImageInfo("");
    if (error) setError("");
  };

  const computeDurationDays = (fields: CourseDateFields) => {
    const endYearCE = fields.yearBE - 543;
    const startYearCE =
      fields.startMonth > fields.endMonth ? endYearCE - 1 : endYearCE;
    const s = new Date(startYearCE, fields.startMonth, fields.startDay);
    const e = new Date(endYearCE, fields.endMonth, fields.endDay);
    const diff =
      Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  const syncRegFields = (next: CourseDateFields) => {
    setRegFields(next);
    setRegistrationDate(formatCourseDateFields(next, true));
    if (error) setError("");
  };

  const syncResultFields = (next: CourseDateFields) => {
    setResultFields(next);
    setResultDate(formatCourseDateFields(next, true));
    if (error) setError("");
  };

  const handleAutoCalculateSchedule = () => {
    const { regFields: autoReg, resultFields: autoRes } =
      computeDefaultCourseScheduleFields(sessions);
    syncRegFields(autoReg);
    syncResultFields(autoRes);
  };

  const totalDurationDays = sessions.reduce(
    (sum, s) => sum + computeDurationDays(s),
    0
  );
  const currentYearBE = sessions[0]?.yearBE ?? 2570;

  const syncSessionsState = (nextSessions: CourseDateFields[]) => {
    setSessions(nextSessions);
    setDate(formatCourseDateSessions(nextSessions));
    if (error) setError("");
  };

  const handleUpdateSession = (idx: number, nextField: CourseDateFields) => {
    const next = sessions.map((s, i) => (i === idx ? nextField : s));
    syncSessionsState(next);
  };

  const handleAddSession = () => {
    const last = sessions[sessions.length - 1] ?? {
      startDay: 15,
      startMonth: 4,
      endDay: 19,
      endMonth: 4,
      yearBE: 2570,
    };
    const yearCE = last.yearBE - 543;
    // ตั้งต้นช่วงถัดไปห่างจากวันจบช่วงก่อนหน้า 3 วัน และมีระยะเวลาเริ่มต้น 5 วัน
    const nextStart = new Date(yearCE, last.endMonth, last.endDay + 3);
    const nextEnd = new Date(
      nextStart.getFullYear(),
      nextStart.getMonth(),
      nextStart.getDate() + 4
    );

    const newSession: CourseDateFields = {
      startDay: nextStart.getDate(),
      startMonth: nextStart.getMonth(),
      endDay: nextEnd.getDate(),
      endMonth: nextEnd.getMonth(),
      yearBE: last.yearBE,
    };
    syncSessionsState([...sessions, newSession]);
  };

  const handleRemoveSession = (idx: number) => {
    if (sessions.length <= 1) return;
    syncSessionsState(sessions.filter((_, i) => i !== idx));
  };

  const handleYearChange = (newYearBE: number) => {
    const next = sessions.map((s) => ({
      ...s,
      yearBE: newYearBE,
    }));
    syncSessionsState(next);
  };

  // ตรวจสอบการชนกับตารางการแข่งขันกีฬา กกท. (ตรวจสอบทุกช่วงของการอบรม)
  const overlappingSportsEvents = sportsEvents.filter((evt) => {
    if (currentYearBE !== 2570) return false;
    const yearCE = 2570 - 543;
    const evtStart = new Date(yearCE, evt.startMonth - 1, evt.startDay, 0, 0, 0);
    const evtEnd = new Date(yearCE, evt.endMonth - 1, evt.endDay, 23, 59, 59);

    return sessions.some((s) => {
      const sStart = new Date(yearCE, s.startMonth, s.startDay, 0, 0, 0);
      const sEnd = new Date(yearCE, s.endMonth, s.endDay, 23, 59, 59);
      return sStart <= evtEnd && sEnd >= evtStart;
    });
  });

  // ตรวจสอบการซ้อนทับกับหลักสูตรอื่น
  const overlappingCourses = allCourses.filter(
    (c) => c.id !== course.id && isCourseDateOverlapping(date, c.date)
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (imageBusy) return;

    const trimmedTitle = title.trim();
    const trimmedShortTitle = shortTitle.trim();
    const trimmedDate = date.trim();
    const trimmedLocation = location.trim();
    const trimmedSeats = seats.trim();
    const trimmedWarning = warningMessage.trim();
    const remaining = Number(seatsLeft);
    const capacity = Number(trimmedSeats.match(/\d+/)?.[0] ?? "");

    if (trimmedTitle.length < 3) {
      setError("กรุณากรอกชื่อหลักสูตรอย่างน้อย 3 ตัวอักษร");
      return;
    }
    if (!trimmedDate) {
      setError("กรุณากรอกช่วงวันที่อบรม");
      return;
    }
    if (!trimmedLocation) {
      setError("กรุณากรอกสถานที่อบรม");
      return;
    }
    if (!trimmedSeats) {
      setError("กรุณากรอกจำนวนที่นั่ง");
      return;
    }
    if (!Number.isInteger(remaining) || remaining < 0) {
      setError("ที่นั่งคงเหลือต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป");
      return;
    }
    if (status === "open" && remaining < 1) {
      setError("หลักสูตรที่เปิดรับต้องมีที่นั่งคงเหลืออย่างน้อย 1 ที่");
      return;
    }
    if (Number.isFinite(capacity) && remaining > capacity) {
      setError("ที่นั่งคงเหลือต้องไม่เกินจำนวนที่นั่งทั้งหมด");
      return;
    }

    const quals = qualificationsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const reqDocs = requiredDocumentsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const evalCrit = evaluationCriteriaText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const satSup = satSupportText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = onSave({
      title: trimmedTitle,
      shortTitle: trimmedShortTitle || undefined,
      useCustomSchedule,
      registrationDate: registrationDate.trim() || globalSched.registrationDate,
      resultDate: resultDate.trim() || globalSched.resultDate,
      date: trimmedDate,
      location: trimmedLocation,
      seats: trimmedSeats,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : 40,
      status,
      seatsLeft: status === "full" ? undefined : remaining,
      warningMessage: trimmedWarning || undefined,
      targetQuotas: quotas,
      courseObjective: courseObjective.trim() || undefined,
      qualifications: quals.length > 0 ? quals : undefined,
      requiredDocuments: reqDocs.length > 0 ? reqDocs : undefined,
      evaluationCriteria: evalCrit.length > 0 ? evalCrit : undefined,
      satSupport: satSup.length > 0 ? satSup : undefined,
      expensesPolicy: expensesPolicy.trim() || undefined,
      ...(course.id === 0 || image !== course.image ? { image } : {}),
    });
    if (typeof result === "string") {
      setError(result);
      return;
    }
    if (result) {
      onClose();
    }
  };

  const isCustomImage = image.startsWith("data:image/");

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="ปิดหน้าต่างแก้ไขหลักสูตร"
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/55 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-edit-title"
        className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-[580px] flex-col rounded-t-xl border border-[#e5e7eb] bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eef0f3] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">
              {course.id === 0 ? "หลักสูตรใหม่" : `รหัสหลักสูตร #${course.id}`}
            </p>
            <h2
              id="course-edit-title"
              className="mt-0.5 text-[16px] font-semibold text-[#111827]"
            >
              {course.id === 0 ? "เพิ่มหลักสูตรอบรมใหม่" : "แก้ไขรายละเอียดหลักสูตร"}
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[#6b7280]">
              การเปลี่ยนแปลงจะมีผลกับหน้าเว็บสาธารณะทันที
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#111827]"
          >
            <CloseIcon />
          </button>
        </div>

        <form
          id="course-edit-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
        >
          <div className="space-y-3">
            <div>
              <p className={labelClass}>รูปประกอบหลักสูตร</p>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-[6px] border border-[#e5e7eb] bg-[#e5e7eb] sm:w-[200px]">
                  <Image
                    src={image}
                    alt={`ตัวอย่างรูป ${course.imageAlt}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 200px"
                    className="object-cover"
                  />
                  {imageBusy && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-[11px] font-medium text-[#1e3a8a]">
                      กำลังปรับขนาดรูป…
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    ref={fileInputRef}
                    id="course-image"
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageBusy}
                      className="inline-flex h-9 items-center justify-center rounded-[5px] border border-[#c7d7ea] bg-white px-3 text-[12px] font-semibold text-[#1e3a8a] transition-colors hover:bg-[#eff6ff] disabled:cursor-wait disabled:opacity-60"
                    >
                      เลือกรูปใหม่
                    </button>
                    {image !== seedImage && (
                      <button
                        type="button"
                        onClick={handleResetImage}
                        disabled={imageBusy}
                        className="inline-flex h-9 items-center justify-center rounded-[5px] border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#374151] transition-colors hover:bg-[#f8fafc] disabled:opacity-60"
                      >
                        คืนค่ารูปเดิม
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#6b7280]">
                    {imageInfo ||
                      (isCustomImage
                        ? "ใช้รูปที่อัปโหลดเอง"
                        : "ใช้รูปมาตรฐานของระบบ")}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#6b7280]">
                    JPG, PNG หรือ WebP ไม่เกิน 10 MB · แนะนำสัดส่วน 16:9
                    ระบบจะย่อรูปอัตโนมัติ
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#9a5c00]">
                    รูปที่อัปโหลดจะเก็บไว้ในเบราว์เซอร์นี้เท่านั้น
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="course-title" className={labelClass}>
                ชื่อหลักสูตร (ชื่อเต็ม)
              </label>
              <input
                id="course-title"
                ref={titleRef}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (error) setError("");
                }}
                className={fieldClass}
              />
            </div>

            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="course-short-title" className={labelClass}>
                  🏷️ ป้ายหมวดหมู่ย่อ (แสดงบนตาราง Timeline และตัวกรอง)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const t = title.trim();
                    let suggested = "ทั่วไป";
                    if (t.includes("งบประมาณ") || t.includes("จัดซื้อ")) {
                      suggested = "งบประมาณและพัสดุ";
                    } else if (t.includes("นานาชาติ") || t.includes("ส่งเสริมศักยภาพการบริหาร")) {
                      suggested = "การจัดการ";
                    } else if (t.includes("ผู้บริหาร") || t.includes("บริหารจัดการองค์")) {
                      suggested = "ผู้บริหาร";
                    } else if (t.includes("ผู้ฝึกสอน") || t.includes("โค้ช")) {
                      suggested = "ผู้ฝึกสอน";
                    } else if (t.includes("ผู้ตัดสิน") || t.includes("กรรมการ")) {
                      suggested = "ผู้ตัดสิน";
                    } else if (t.includes("วิทยาศาสตร์")) {
                      suggested = "วิทยาศาสตร์การกีฬา";
                    } else {
                      suggested = t.replace(/^หลักสูตร\s*/, "").slice(0, 18);
                    }
                    setShortTitle(suggested);
                    if (error) setError("");
                  }}
                  className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#16265E] transition hover:bg-[#eef2f9]"
                >
                  ✨ ตั้งอัตโนมัติตามชื่อหลักสูตร
                </button>
              </div>
              <input
                id="course-short-title"
                value={shortTitle}
                onChange={(event) => {
                  setShortTitle(event.target.value);
                  if (error) setError("");
                }}
                placeholder="เช่น ผู้บริหาร, ผู้ฝึกสอน, งบประมาณและพัสดุ, การจัดการ"
                className={fieldClass}
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-medium text-[#64748b]">
                  เลือกด่วน:
                </span>
                {[
                  "ผู้บริหาร",
                  "ผู้ฝึกสอน",
                  "งบประมาณและพัสดุ",
                  "การจัดการ",
                  "วิทยาศาสตร์การกีฬา",
                  "ผู้ตัดสิน",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setShortTitle(preset);
                      if (error) setError("");
                    }}
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition ${
                      shortTitle === preset
                        ? "border-[#16265E] bg-[#16265E] text-white"
                        : "border-[#cbd5e1] bg-white text-[#334155] hover:border-[#16265E] hover:text-[#16265E]"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* ==================== 3-STEP COURSE SCHEDULE PICKER ==================== */}
            <div className="space-y-3 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-3">
              <div className="border-b border-[#e2e8f0] pb-2.5">
                <h3 className="text-[12.5px] font-bold text-[#16265E]">
                  🗓️ กำหนดการหลักสูตร (รับสมัคร • ประกาศผล • จัดอบรม)
                </h3>
                <p className="mt-0.5 text-[10px] text-[#64748b]">
                  เลือกใช้กำหนดการรับสมัครและประกาศผลร่วมกับทุกหลักสูตร หรือปลดล็อกเพื่อปรับแยกเฉพาะหลักสูตรนี้
                </p>

                {/* 2-Option Mode Switcher */}
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setUseCustomSchedule(false)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${
                      !useCustomSchedule
                        ? "border-[#1e3a8a] bg-[#eff6ff] font-bold text-[#1e3a8a] shadow-2xs"
                        : "border-[#cbd5e1] bg-white font-medium text-[#475569] hover:bg-[#f1f5f9]"
                    }`}
                  >
                    <span className="text-sm">
                      {!useCustomSchedule ? "🔘" : "⚪"}
                    </span>
                    <div>
                      <div>🌐 ใช้กำหนดการเดียวกับทุกหลักสูตร</div>
                      <div className="text-[9.5px] font-normal text-[#64748b]">
                        อ้างอิงวันรับสมัคร &amp; วันประกาศผลส่วนกลาง
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseCustomSchedule(true)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${
                      useCustomSchedule
                        ? "border-[#d97706] bg-[#fffbeb] font-bold text-[#92400e] shadow-2xs"
                        : "border-[#cbd5e1] bg-white font-medium text-[#475569] hover:bg-[#f1f5f9]"
                    }`}
                  >
                    <span className="text-sm">
                      {useCustomSchedule ? "🔘" : "⚪"}
                    </span>
                    <div>
                      <div>✏️ กำหนดวันแยกเฉพาะหลักสูตรนี้</div>
                      <div className="text-[9.5px] font-normal text-[#64748b]">
                        ปรับเปลี่ยนวันรับสมัคร/ประกาศผลแยกอิสระ
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div
                className={`space-y-2.5 rounded-lg border p-2.5 ${
                  useCustomSchedule
                    ? "border-[#fde68a] bg-[#fffbeb]/40"
                    : "border-[#bfdbfe] bg-[#eff6ff]/40"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-bold ${
                      useCustomSchedule ? "text-[#92400e]" : "text-[#1e3a8a]"
                    }`}
                  >
                    {useCustomSchedule
                      ? "✏️ กำหนดวันรับสมัครและประกาศผลเฉพาะหลักสูตรนี้:"
                      : "🌐 วันรับสมัครและประกาศผลกลาง (หากเปลี่ยนจะอัปเดตให้ทุกหลักสูตรที่ใช้กำหนดการกลาง):"}
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoCalculateSchedule}
                    className="inline-flex items-center gap-1 rounded-md border border-[#3b82f6] bg-white px-2 py-0.5 text-[10px] font-bold text-[#1d4ed8] transition hover:bg-[#dbeafe]"
                  >
                    <span>⚡ คำนวณล่วงหน้าอัตโนมัติจากวันอบรม</span>
                  </button>
                </div>

                {/* 1. ช่วงวันเปิดรับสมัคร (registrationDate) */}
                <ThaiCalendarRangePicker
                  value={regFields}
                  onChange={syncRegFields}
                  tone="blue"
                  badgeLabel={
                    useCustomSchedule
                      ? "1. 📥 เปิดรับสมัคร (เฉพาะหลักสูตรนี้)"
                      : "1. 📥 เปิดรับสมัครกลาง (ทุกหลักสูตร)"
                  }
                  presets={[
                    { days: 7, label: "7 วัน" },
                    { days: 14, label: "14 วัน" },
                    { days: 17, label: "17 วัน (มาตรฐาน)" },
                    { days: 30, label: "30 วัน" },
                  ]}
                />

                {/* 2. วันประกาศผลผู้มีสิทธิ์เข้าอบรม (resultDate) */}
                <ThaiCalendarRangePicker
                  value={resultFields}
                  onChange={syncResultFields}
                  tone="red"
                  badgeLabel={
                    useCustomSchedule
                      ? "2. 📣 วันประกาศผล (เฉพาะหลักสูตรนี้)"
                      : "2. 📣 วันประกาศผลกลาง (ทุกหลักสูตร)"
                  }
                  presets={[
                    { days: 1, label: "วันเดียว (1 วัน)" },
                    { days: 2, label: "ช่วง 2 วัน" },
                    { days: 3, label: "ช่วง 3 วัน" },
                  ]}
                />
              </div>

              {/* 3. Multi-Session Smart Date Range Picker (ช่วงวันที่อบรม) */}
              <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4]/40 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded bg-[#16803c] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        3. 🎓 ช่วงวันจัดอบรมจริง
                      </span>
                      <label className="text-[11.5px] font-bold text-[#166534]">
                        ปฏิทินเลือกช่วงวันอบรม
                      </label>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#64748b]">
                      รองรับทั้งการอบรมรวดเดียว หรือแบ่งเป็นหลายช่วง (เช่น ช่วงละ 2 วัน และ 5 วัน)
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#bbf7d0] bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#166534]">
                    <span>ผลลัพธ์: {date}</span>
                    <span className="rounded-full bg-[#16803c] px-1.5 py-0.2 text-[9.5px] font-semibold text-white">
                      {sessions.length > 1
                        ? `${sessions.length} ช่วง · รวม ${totalDurationDays} วัน`
                        : `${totalDurationDays} วัน`}
                    </span>
                  </div>
                </div>

                {/* Sessions List */}
                <div className="mt-2.5 space-y-2">
                  {sessions.map((session, idx) => (
                    <ThaiCalendarRangePicker
                      key={idx}
                      value={session}
                      onChange={(nextField) =>
                        handleUpdateSession(idx, nextField)
                      }
                      tone="green"
                      badgeLabel={
                        sessions.length > 1
                          ? `อบรมช่วงที่ ${idx + 1}`
                          : "วันจัดอบรม"
                      }
                      presets={[
                        { days: 1, label: "1 วัน" },
                        { days: 2, label: "2 วัน" },
                        { days: 3, label: "3 วัน" },
                        { days: 5, label: "5 วัน" },
                        { days: 7, label: "7 วัน" },
                        { days: 10, label: "10 วัน" },
                        { days: 14, label: "14 วัน" },
                      ]}
                      allowCustomDaysInput
                      sportsEvents={sportsEvents}
                      onRemoveSession={
                        sessions.length > 1
                          ? () => handleRemoveSession(idx)
                          : undefined
                      }
                    />
                  ))}
                </div>

              {/* Add Session Button */}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={handleAddSession}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[#93c5fd] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#1e40af] transition hover:border-[#3b82f6] hover:bg-[#eff6ff]"
                >
                  <span>+ เพิ่มช่วงเวลาอบรม (เช่น แบ่งอบรมช่วงที่ {sessions.length + 1} / ภาคปฏิบัติ)</span>
                </button>
              </div>

              {/* Year & Status Row */}
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="course-year" className="block text-[10.5px] font-medium text-[#475569]">
                    ปี พ.ศ. (ปีงบประมาณ)
                  </label>
                  <select
                    id="course-year"
                    value={currentYearBE}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className="mt-1 h-8 w-full rounded border border-[#d1d5db] bg-white px-2.5 text-[12px] font-medium text-[#111827] outline-none focus:border-[#1e3a8a]"
                  >
                    <option value={2570}>พ.ศ. 2570 (ปีงบประมาณใหม่ - ค่าเริ่มต้น)</option>
                    <option value={2569}>พ.ศ. 2569</option>
                    <option value={2571}>พ.ศ. 2571</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="course-status" className="block text-[10.5px] font-medium text-[#475569]">
                    สถานะการรับสมัคร
                  </label>
                  <select
                    id="course-status"
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value as Course["status"]);
                      if (error) setError("");
                    }}
                    className="mt-1 h-8 w-full rounded border border-[#d1d5db] bg-white px-2.5 text-[12px] font-medium text-[#111827] outline-none focus:border-[#1e3a8a]"
                  >
                    <option value="open">เปิดรับสมัคร</option>
                    <option value="full">เต็มแล้ว / ปิดรับ</option>
                  </select>
                </div>
              </div>

              {/* Smart Conflict Warnings */}
              {overlappingSportsEvents.length > 0 && (
                <div className="mt-2.5 rounded-md border border-[#fde68a] bg-[#fffbeb] px-2.5 py-2 text-[11px] text-[#92400e]">
                  <p className="font-semibold">
                    ⚠️ แจ้งเตือน: ช่วงวันอบรมนี้ตรงกับปฏิทินการแข่งขันกีฬา กกท.
                  </p>
                  <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-[10.5px]">
                    {overlappingSportsEvents.map((evt) => (
                      <li key={evt.id}>
                        <span className="font-medium">{evt.title}</span> ({evt.dateRange} · {evt.location})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {overlappingCourses.length > 0 && (
                <div className="mt-2 rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1.5 text-[10.5px] text-[#1e40af]">
                  ℹ️ วันอบรมซ้อนทับกับหลักสูตรอื่น ({overlappingCourses.length} หลักสูตร):{" "}
                  {overlappingCourses.map((c) => `${c.title} (${c.date})`).join(", ")}
                </div>
              )}
              </div>
            </div>

            <div>
              <label htmlFor="course-location" className={labelClass}>
                สถานที่อบรม
              </label>
              <input
                id="course-location"
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  if (error) setError("");
                }}
                className={fieldClass}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="course-seats" className={labelClass}>
                  จำนวนที่นั่ง
                </label>
                <input
                  id="course-seats"
                  value={seats}
                  onChange={(event) => {
                    const newSeats = event.target.value;
                    setSeats(newSeats);
                    if (error) setError("");

                    // คำนวณที่นั่งคงเหลือให้อัตโนมัติเมื่อมีการเปลี่ยนจำนวนที่นั่งทั้งหมด
                    const match = newSeats.match(/\d+/);
                    if (match) {
                      const newCap = parseInt(match[0], 10);
                      const prevCap = Number(course.seats?.match(/\d+/)?.[0]) || course.capacity || newCap;
                      const currentApproved = Math.max(0, prevCap - (course.seatsLeft ?? prevCap));
                      const autoSeatsLeft = Math.max(0, newCap - currentApproved);
                      setSeatsLeft(String(autoSeatsLeft));
                    }
                  }}
                  placeholder="เช่น จำนวนที่นั่ง 40 คน"
                  className={fieldClass}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="course-seats-left" className={labelClass}>
                    ที่นั่งคงเหลือ
                  </label>
                  <span className="rounded bg-[#eff6ff] px-1.5 py-0.5 text-[9.5px] font-medium text-[#1e40af]">
                    คำนวณให้อัตโนมัติ
                  </span>
                </div>
                <input
                  id="course-seats-left"
                  type="number"
                  min={0}
                  value={status === "full" ? "0" : seatsLeft}
                  disabled={status === "full"}
                  onChange={(event) => {
                    setSeatsLeft(event.target.value);
                    if (error) setError("");
                  }}
                  className={fieldClass}
                />
              </div>
            </div>

            {/* เป้าหมายสัดส่วนกลุ่มเป้าหมาย (5 กลุ่ม) */}
            <div className="rounded-[7px] border border-[#dbe4ef] bg-[#f8fbff] p-3 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#e2e8f0] pb-2">
                <div>
                  <h3 className="font-semibold text-[#1e3a8a] text-[12.5px]">
                    เป้าหมายเชิงสัดส่วน 5 กลุ่มเป้าหมาย (คน)
                  </h3>
                  <p className="text-[10px] text-[#6b7280]">
                    กำหนดเป้าหมายเพื่อช่วยมองเห็นภาพรวมและกำกับสัดส่วนการอนุมัติตัวจริง
                  </p>
                </div>
                <span className="rounded bg-[#dbeafe] px-2 py-0.5 text-[11px] font-bold text-[#1e40af]">
                  รวมเป้าหมาย:{" "}
                  {quotas.sat +
                    quotas.nationalAssoc +
                    quotas.provincialAssoc +
                    quotas.nsdf +
                    quotas.external}{" "}
                  คน
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TARGET_GROUPS.map((group) => (
                  <div
                    key={group.key}
                    className="flex items-center justify-between gap-2 rounded bg-white px-2.5 py-1.5 border border-[#e5e7eb]"
                  >
                    <label
                      htmlFor={`quota-${group.key}`}
                      className="text-[11px] font-medium text-[#374151]"
                    >
                      {group.label}
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        id={`quota-${group.key}`}
                        type="number"
                        min={0}
                        value={quotas[group.key]}
                        onChange={(e) => {
                          const val = Math.max(
                            0,
                            parseInt(e.target.value, 10) || 0
                          );
                          setQuotas((prev) => ({ ...prev, [group.key]: val }));
                        }}
                        className="h-7 w-16 rounded border border-[#d1d5db] bg-white text-center text-[12px] font-semibold text-[#111827] outline-none focus:border-[#1e3a8a]"
                      />
                      <span className="text-[10px] text-[#6b7280]">คน</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="course-warning" className={labelClass}>
                หมายเหตุ / คำเตือนสั้น
              </label>
              <textarea
                id="course-warning"
                value={warningMessage}
                onChange={(event) => setWarningMessage(event.target.value)}
                rows={2}
                placeholder="เว้นว่างได้หากไม่มีหมายเหตุ"
                className="mt-1 w-full resize-y rounded-[5px] border border-[#d1d5db] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
              />
            </div>

            <div className="border-t border-[#e5e7eb] pt-3">
              <h3 className="text-[12px] font-bold text-[#16265E]">
                ข้อมูลคุณสมบัติและเงื่อนไข (แสดงในหน้าต่างป๊อปอัปให้ผู้สมัครอ่าน)
              </h3>
            </div>

            <div>
              <label htmlFor="course-objective" className={labelClass}>
                วัตถุประสงค์ของหลักสูตร
              </label>
              <textarea
                id="course-objective"
                value={courseObjective}
                onChange={(event) => setCourseObjective(event.target.value)}
                rows={2}
                placeholder="ระบุวัตถุประสงค์ของหลักสูตรนี้..."
                className="mt-1 w-full resize-y rounded-[5px] border border-[#d1d5db] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
              />
            </div>

            <div>
              <label htmlFor="course-quals" className={labelClass}>
                คุณสมบัติของผู้สมัคร (ขึ้นบรรทัดใหม่เพื่อแยกข้อ)
              </label>
              <textarea
                id="course-quals"
                value={qualificationsText}
                onChange={(event) => setQualificationsText(event.target.value)}
                rows={3}
                placeholder="1. มีสัญชาติไทย...&#10;2. มีประสบการณ์..."
                className="mt-1 w-full resize-y rounded-[5px] border border-[#d1d5db] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
              />
            </div>

            <div>
              <label htmlFor="course-docs" className={labelClass}>
                เอกสารและหลักฐานประกอบการสมัคร (ขึ้นบรรทัดใหม่เพื่อแยกรายการ)
              </label>
              <textarea
                id="course-docs"
                value={requiredDocumentsText}
                onChange={(event) => setRequiredDocumentsText(event.target.value)}
                rows={3}
                placeholder="1. รูปถ่าย...&#10;2. สำเนาบัตรประชาชน..."
                className="mt-1 w-full resize-y rounded-[5px] border border-[#d1d5db] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
              />
            </div>

            <div>
              <label htmlFor="course-eval" className={labelClass}>
                เกณฑ์การสำเร็จการอบรม (ขึ้นบรรทัดใหม่เพื่อแยกข้อ)
              </label>
              <textarea
                id="course-eval"
                value={evaluationCriteriaText}
                onChange={(event) => setEvaluationCriteriaText(event.target.value)}
                rows={3}
                placeholder="1. เวลาเข้าอบรมไม่น้อยกว่าร้อยละ 80...&#10;2. ผ่านการทดสอบ..."
                className="mt-1 w-full resize-y rounded-[5px] border border-[#d1d5db] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
              />
            </div>

            <div className="border-t border-[#e5e7eb] pt-3">
              <h3 className="text-[12px] font-bold text-[#0369a1]">
                🎁 สิ่งที่ กกท. สนับสนุน &amp; เงื่อนไขค่าใช้จ่าย
              </h3>
            </div>

            <div>
              <label htmlFor="course-support" className={labelClass}>
                สิ่งที่ กกท. ให้การสนับสนุน (เช่น อาหาร 3 มื้อ / ที่พัก / เอกสาร - ขึ้นบรรทัดใหม่เพื่อแยกข้อ)
              </label>
              <textarea
                id="course-support"
                value={satSupportText}
                onChange={(event) => setSatSupportText(event.target.value)}
                rows={3}
                placeholder="1. ที่พักตลอดระยะเวลาการอบรม...&#10;2. อาหารหลักครบ 3 มื้อ และอาหารว่าง 2 มื้อ..."
                className="mt-1 w-full resize-y rounded-[5px] border border-[#d1d5db] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
              />
            </div>

            <div>
              <label htmlFor="course-expenses" className={labelClass}>
                เงื่อนไขค่าใช้จ่ายนอกเหนือการสนับสนุน / การเบิกต้นสังกัด
              </label>
              <textarea
                id="course-expenses"
                value={expensesPolicy}
                onChange={(event) => setExpensesPolicy(event.target.value)}
                rows={2}
                placeholder="เช่น ค่าเบี้ยเลี้ยงและค่าเดินทาง ให้เบิกจ่ายจากหน่วยงานต้นสังกัด หรือชำระด้วยตนเอง..."
                className="mt-1 w-full resize-y rounded-[5px] border border-[#d1d5db] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#1f2937] outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/20"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-[11px] text-[#dc2626]">
              {error}
            </p>
          )}
        </form>

        <div className="flex flex-col-reverse gap-2 border-t border-[#eef0f3] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5 sm:pb-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-[5px] border border-[#d1d5db] bg-white px-4 text-[12px] font-medium text-[#374151] transition-colors hover:bg-[#f8fafc] sm:h-9"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="course-edit-form"
            className="inline-flex h-10 items-center justify-center rounded-[5px] bg-[#1e3a8a] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#1e40af] sm:h-9"
          >
            บันทึกการแก้ไข
          </button>
        </div>
      </div>
    </div>
  );
}
