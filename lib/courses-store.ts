"use client";

import { useSyncExternalStore } from "react";
import {
  courses as seedCourses,
  DEFAULT_TARGET_QUOTAS,
  DEFAULT_SAT_SUPPORT,
  DEFAULT_EXPENSES_POLICY,
  type Course,
} from "@/lib/courses";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase/client";

interface CoursesState {
  courses: Course[];
  revision: number;
}

const STORAGE_KEY = "sat-courses-v3";

function cloneSeedCourses() {
  return seedCourses.map((course) => ({ ...course }));
}

const INITIAL_STATE: CoursesState = {
  courses: cloneSeedCourses(),
  revision: 0,
};

let state: CoursesState = INITIAL_STATE;
let hydrateStarted = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.courses));
    return true;
  } catch {
    // Storage may be unavailable in private mode or full; the in-memory store still works.
    return false;
  }
}

/**
 * Accept only images uploaded by an admin (data URLs) or files bundled in
 * `public/assets`. Anything else falls back to the seed image.
 */
export function isAllowedCourseImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("data:image/") || value.startsWith("/assets/"))
  );
}

export function getSeedCourse(id: number) {
  return seedCourses.find((course) => course.id === id);
}

function mergeStoredCourses(stored: Course[]): Course[] {
  return stored.map((saved): Course => {
    const seed = getSeedCourse(saved.id);
    const customImage =
      isAllowedCourseImage(saved.image)
        ? saved.image
        : undefined;

    return {
      ...(seed ?? {}),
      ...saved,
      id: saved.id,
      image: customImage ?? seed?.image ?? "/assets/course-national-coach.png",
      imageAlt: saved.imageAlt || seed?.imageAlt || `${saved.title} - รูปประกอบ`,
      shortTitle:
        saved.shortTitle !== undefined ? saved.shortTitle : seed?.shortTitle,
      targetQuotas: saved.targetQuotas ?? seed?.targetQuotas ?? { ...DEFAULT_TARGET_QUOTAS },
      courseObjective: saved.courseObjective || seed?.courseObjective,
      qualifications:
        saved.qualifications && saved.qualifications.length > 0
          ? saved.qualifications
          : seed?.qualifications,
      requiredDocuments:
        saved.requiredDocuments && saved.requiredDocuments.length > 0
          ? saved.requiredDocuments
          : seed?.requiredDocuments,
      evaluationCriteria:
        saved.evaluationCriteria && saved.evaluationCriteria.length > 0
          ? saved.evaluationCriteria
          : seed?.evaluationCriteria,
      satSupport:
        saved.satSupport && saved.satSupport.length > 0
          ? saved.satSupport
          : (seed?.satSupport ?? [...DEFAULT_SAT_SUPPORT]),
      expensesPolicy: saved.expensesPolicy || seed?.expensesPolicy || DEFAULT_EXPENSES_POLICY,
      status: saved.status === "full" ? "full" : "open",
    };
  });
}

function hydrate() {
  if (hydrateStarted || typeof window === "undefined") return;
  hydrateStarted = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        supabase
          ?.from("courses")
          .select("*")
          .order("id")
          .then(({ data }) => {
            if (data && data.length > 0) {
              const cloudCourses: Course[] = data.map((c) => ({
                id: c.id,
                title: c.title,
                shortTitle:
                  (c as { short_title?: string }).short_title || undefined,
                date: c.date,
                location: c.location,
                seats: c.seats,
                capacity: 50,
                seatsLeft: c.status === "full" ? undefined : c.seats_left,
                status: c.status === "full" ? "full" : "open",
                image: c.image,
                imageAlt: c.image_alt || `${c.title} - รูปประกอบ`,
                warningMessage: c.warning_message || undefined,
                targetQuotas:
                  (c as { target_quotas?: import("@/lib/courses").TargetGroupQuotas })
                    .target_quotas || undefined,
              }));
              state = {
                courses: cloudCourses,
                revision: state.revision + 1,
              };
              emit();
            }
          });
      }
      return;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Course).id === "number" &&
          typeof (item as Course).title === "string"
      )
    ) {
      state = {
        courses: mergeStoredCourses(parsed as Course[]),
        revision: state.revision + 1,
      };
      emit();
    }
  } catch {
    state = {
      courses: cloneSeedCourses(),
      revision: state.revision + 1,
    };
    emit();
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    supabase
      ?.from("courses")
      .select("*")
      .order("id")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const cloudCourses: Course[] = data.map((c) => ({
            id: c.id,
            title: c.title,
            shortTitle:
              (c as { short_title?: string }).short_title || undefined,
            date: c.date,
            location: c.location,
            seats: c.seats,
            capacity: 50,
            seatsLeft: c.status === "full" ? undefined : c.seats_left,
            status: c.status === "full" ? "full" : "open",
            image: c.image,
            imageAlt: c.image_alt || `${c.title} - รูปประกอบ`,
            warningMessage: c.warning_message || undefined,
            targetQuotas:
              (c as { target_quotas?: import("@/lib/courses").TargetGroupQuotas })
                .target_quotas || undefined,
          }));
          state = {
            courses: cloudCourses,
            revision: state.revision + 1,
          };
          emit();
        }
      });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  hydrate();

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    hydrateStarted = false;
    hydrate();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return INITIAL_STATE;
}

export function useCourses() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type CourseUpdate = Partial<
  Pick<
    Course,
    | "status"
    | "seatsLeft"
    | "title"
    | "shortTitle"
    | "date"
    | "location"
    | "seats"
    | "warningMessage"
    | "image"
    | "targetQuotas"
    | "courseObjective"
    | "qualifications"
    | "requiredDocuments"
    | "evaluationCriteria"
    | "satSupport"
    | "expensesPolicy"
  >
>;

export interface UpdateCourseResult {
  course: Course;
  /** `false` when the browser refused to save (e.g. storage quota exceeded). */
  persisted: boolean;
}

export function updateCourse(
  id: number,
  patch: CourseUpdate
): UpdateCourseResult | undefined {
  let updated: Course | undefined;

  const nextCourses = state.courses.map((course) => {
    if (course.id !== id) return course;

    const nextImage =
      patch.image === undefined
        ? course.image
        : isAllowedCourseImage(patch.image)
          ? patch.image
          : (getSeedCourse(course.id)?.image ?? course.image);

    updated = {
      ...course,
      ...patch,
      id: course.id,
      image: nextImage,
      imageAlt: course.imageAlt,
      shortTitle:
        patch.shortTitle !== undefined
          ? patch.shortTitle.trim() || undefined
          : course.shortTitle,
      targetQuotas:
        patch.targetQuotas !== undefined
          ? patch.targetQuotas
          : course.targetQuotas,
      seatsLeft:
        patch.status === "full"
          ? undefined
          : patch.seatsLeft !== undefined
            ? patch.seatsLeft
            : course.seatsLeft,
    };

    return updated;
  });

  if (!updated) return undefined;

  const previousState = state;
  state = {
    courses: nextCourses,
    revision: state.revision + 1,
  };
  const persisted = persist();

  if (!persisted && patch.image?.startsWith("data:image/")) {
    // Roll back so the UI never shows an image that will disappear on reload.
    state = previousState;
    return { course: updated, persisted: false };
  }

  emit();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    supabase
      ?.from("courses")
      .update({
        title: updated.title,
        short_title: updated.shortTitle ?? null,
        date: updated.date,
        location: updated.location,
        seats: updated.seats,
        seats_left: updated.seatsLeft ?? 0,
        status: updated.status,
        image: updated.image,
        warning_message: updated.warningMessage ?? null,
        target_quotas: (updated.targetQuotas as unknown as import("@/lib/supabase/types").Json) ?? null,
      })
      .eq("id", id)
      .then();
  }

  return { course: updated, persisted };
}

export function addCourse(
  data: CourseUpdate & { title: string }
): UpdateCourseResult {
  const maxId = state.courses.reduce(
    (max, course) => Math.max(max, course.id),
    0
  );
  const newId = maxId + 1;
  const capacity = 50;
  const seatsLeft = data.status === "full" ? undefined : (data.seatsLeft ?? capacity);

  const newCourse: Course = {
    id: newId,
    title: data.title.trim(),
    shortTitle: data.shortTitle?.trim() || data.title.trim().slice(0, 20),
    date: data.date?.trim() || "1 - 5 พ.ย. 2570",
    location: data.location?.trim() || "สนามกีฬาสถาบันการกีฬาแห่งชาติ กทม.",
    seats: data.seats?.trim() || "จำนวนที่นั่ง 50 คน",
    capacity,
    seatsLeft,
    status: data.status === "full" ? "full" : "open",
    image:
      data.image && isAllowedCourseImage(data.image)
        ? data.image
        : "/assets/course-national-coach.png",
    imageAlt: `${data.title.trim()} - รูปประกอบหลักสูตร`,
    warningMessage: data.warningMessage?.trim() || undefined,
    targetQuotas: data.targetQuotas ?? { ...DEFAULT_TARGET_QUOTAS },
    courseObjective:
      data.courseObjective ||
      "เพื่อพัฒนาความรู้และทักษะวิชาชีพบุคลากรทางการกีฬาตามมาตรฐานการกีฬาแห่งประเทศไทย",
    qualifications:
      data.qualifications && data.qualifications.length > 0
        ? data.qualifications
        : [
            "มีสัญชาติไทย อายุ 20 ปีบริบูรณ์ขึ้นไป",
            "สังกัดหน่วยงานใน 5 กลุ่มเป้าหมาย กกท. (มีหนังสือนำส่งรับรองจากต้นสังกัด)",
          ],
    requiredDocuments:
      data.requiredDocuments && data.requiredDocuments.length > 0
        ? data.requiredDocuments
        : [
            "รูปถ่ายหน้าตรงขนาด 1.5 - 2 นิ้ว ถ่ายไม่เกิน 6 เดือน (ไฟล์ JPG/PNG)",
            "หนังสือนำส่งรับรองจากต้นสังกัดหรือสมาคมกีฬา (ไฟล์ PDF)",
            "สำเนาบัตรประจำตัวประชาชน พร้อมลงนามรับรองสำเนาถูกต้อง",
          ],
    evaluationCriteria:
      data.evaluationCriteria && data.evaluationCriteria.length > 0
        ? data.evaluationCriteria
        : [
            "มีเวลาเข้าร่วมการอบรมไม่น้อยกว่าร้อยละ 80 ของเวลาทั้งหมด",
            "ผ่านการประเมินผลภาคทฤษฎีและภาคปฏิบัติตามเกณฑ์ที่กำหนด",
            "ได้รับวุฒิบัตรรับรองจากการกีฬาแห่งประเทศไทย (กกท.)",
          ],
    satSupport:
      data.satSupport && data.satSupport.length > 0
        ? data.satSupport
        : [...DEFAULT_SAT_SUPPORT],
    expensesPolicy: data.expensesPolicy || DEFAULT_EXPENSES_POLICY,
  };

  state = {
    courses: [...state.courses, newCourse],
    revision: state.revision + 1,
  };
  const persisted = persist();
  emit();

  return { course: newCourse, persisted };
}

export function deleteCourse(id: number): boolean {
  const exists = state.courses.some((course) => course.id === id);
  if (!exists) return false;

  state = {
    courses: state.courses.filter((course) => course.id !== id),
    revision: state.revision + 1,
  };
  persist();
  emit();
  return true;
}

export function resetCourses() {
  state = {
    courses: cloneSeedCourses(),
    revision: state.revision + 1,
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore unavailable storage.
    }
  }

  emit();
}

export function getCoursesSnapshot() {
  return state.courses;
}

export function syncCourseSeatsWithApprovedCounts(
  countsByCourseId: Record<number, number>
) {
  let changed = false;
  const nextCourses = state.courses.map((course) => {
    const approvedCount = countsByCourseId[course.id] ?? 0;
    const capacity = course.capacity || 50;
    const computedSeatsLeft = Math.max(0, capacity - approvedCount);
    const computedStatus: "open" | "full" =
      computedSeatsLeft === 0 ? "full" : "open";

    if (
      course.seatsLeft !== computedSeatsLeft ||
      course.status !== computedStatus
    ) {
      changed = true;
      return {
        ...course,
        seatsLeft: computedSeatsLeft,
        status: computedStatus,
      };
    }
    return course;
  });

  if (changed) {
    state = {
      courses: nextCourses,
      revision: state.revision + 1,
    };
    persist();
    emit();
  }
}
