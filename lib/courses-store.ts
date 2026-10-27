"use client";

import { useSyncExternalStore } from "react";
import { courses as seedCourses, type Course } from "@/lib/courses";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase/client";

interface CoursesState {
  courses: Course[];
  revision: number;
}

const STORAGE_KEY = "sat-courses-v2";

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

function mergeStoredCourses(stored: Course[]) {
  const storedById = new Map(stored.map((course) => [course.id, course]));

  return seedCourses.map((seed): Course => {
    const saved = storedById.get(seed.id);
    if (!saved) return { ...seed };

    // Only keep data-URL images; bundled paths always follow the seed so that
    // replacing files in `public/assets` takes effect for every browser.
    const customImage =
      isAllowedCourseImage(saved.image) && saved.image.startsWith("data:image/")
        ? saved.image
        : undefined;

    return {
      ...seed,
      ...saved,
      id: seed.id,
      image: customImage ?? seed.image,
      imageAlt: seed.imageAlt,
      shortTitle:
        saved.shortTitle !== undefined ? saved.shortTitle : seed.shortTitle,
      targetQuotas: saved.targetQuotas ?? seed.targetQuotas,
      courseObjective: saved.courseObjective || seed.courseObjective,
      qualifications:
        saved.qualifications && saved.qualifications.length > 0
          ? saved.qualifications
          : seed.qualifications,
      requiredDocuments:
        saved.requiredDocuments && saved.requiredDocuments.length > 0
          ? saved.requiredDocuments
          : seed.requiredDocuments,
      evaluationCriteria:
        saved.evaluationCriteria && saved.evaluationCriteria.length > 0
          ? saved.evaluationCriteria
          : seed.evaluationCriteria,
      satSupport:
        saved.satSupport && saved.satSupport.length > 0
          ? saved.satSupport
          : seed.satSupport,
      expensesPolicy: saved.expensesPolicy || seed.expensesPolicy,
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
