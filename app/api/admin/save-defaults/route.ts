import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { isAdminRequestAuthorized } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const isAuth = await isAdminRequestAuthorized(request);
    if (!isAuth) {
      return NextResponse.json(
        { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      courses,
      sportsEvents,
      timelineSettings,
      alumni,
      partialUpdate,
      deleteCourseIds,
    } = body as {
      courses?: unknown[];
      sportsEvents?: unknown[];
      timelineSettings?: Record<string, unknown>;
      alumni?: unknown[];
      partialUpdate?: boolean;
      deleteCourseIds?: number[];
    };

    const isServerlessReadOnly = Boolean(process.env.VERCEL);
    const dataDir = path.join(process.cwd(), "data");
    if (!isServerlessReadOnly) {
      try {
        await fs.mkdir(dataDir, { recursive: true });
      } catch {
        // Ignore read-only filesystem errors
      }
    }

    let coursesCount = 0;
    let sportsEventsCount = 0;
    let alumniCount = 0;

    if (Array.isArray(deleteCourseIds) && deleteCourseIds.length > 0) {
      if (!isServerlessReadOnly) {
        try {
          const coursesPath = path.join(dataDir, "courses.json");
          const rawExisting = await fs.readFile(coursesPath, "utf-8");
          const existingList = JSON.parse(rawExisting) as Record<string, unknown>[];
          if (Array.isArray(existingList)) {
            const filtered = existingList.filter(
              (item) => typeof item.id !== "number" || !deleteCourseIds.includes(item.id)
            );
            await fs.writeFile(
              coursesPath,
              JSON.stringify(filtered, null, 2) + "\n",
              "utf-8"
            );
          }
        } catch {
          // Ignore file read/write issues
        }
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase.from("courses").delete().in("id", deleteCourseIds);
        } catch (delErr) {
          console.warn("Server Supabase course delete warning:", delErr);
        }
      }
    }

    if (Array.isArray(courses)) {
      coursesCount = courses.length;
      const courseList = courses as Record<string, unknown>[];
      if (!isServerlessReadOnly && courseList.length > 0) {
        try {
          const coursesPath = path.join(dataDir, "courses.json");
          if (partialUpdate) {
            let existingList: Record<string, unknown>[] = [];
            try {
              const rawExisting = await fs.readFile(coursesPath, "utf-8");
              const parsed = JSON.parse(rawExisting);
              if (Array.isArray(parsed)) {
                existingList = parsed as Record<string, unknown>[];
              }
            } catch {
              existingList = [];
            }
            const patchById = new Map<number, Record<string, unknown>>();
            for (const c of courseList) {
              if (typeof c.id === "number") {
                patchById.set(c.id, c);
              }
            }
            const mergedIds = new Set<number>();
            const mergedList = existingList.map((item) => {
              if (typeof item.id === "number" && patchById.has(item.id)) {
                mergedIds.add(item.id);
                return patchById.get(item.id)!;
              }
              return item;
            });
            for (const c of courseList) {
              if (typeof c.id === "number" && !mergedIds.has(c.id)) {
                mergedList.push(c);
              }
            }
            await fs.writeFile(
              coursesPath,
              JSON.stringify(mergedList, null, 2) + "\n",
              "utf-8"
            );
          } else {
            await fs.writeFile(
              coursesPath,
              JSON.stringify(courses, null, 2) + "\n",
              "utf-8"
            );
          }
        } catch {
          // Ignore on read-only filesystem
        }
      }

      // Sync updated courses directly to Supabase with service role key if available
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey && courseList.length > 0) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(supabaseUrl, supabaseKey);

          const activeCourseIds = courseList
            .map((c) => c.id)
            .filter((id): id is number => typeof id === "number");

          // 1. Fetch existing target_quotas metadata; only delete missing rows on full sync (!partialUpdate)
          const existingQuery = partialUpdate && activeCourseIds.length > 0
            ? supabase.from("courses").select("id, target_quotas").in("id", activeCourseIds)
            : supabase.from("courses").select("id, target_quotas");
          const { data: existingRows } = await existingQuery;
          const existingMap = new Map<number, Record<string, unknown>>();
          if (existingRows && existingRows.length > 0) {
            for (const row of existingRows) {
              if (typeof row.id === "number" && row.target_quotas && typeof row.target_quotas === "object") {
                existingMap.set(row.id, row.target_quotas as Record<string, unknown>);
              }
            }
            if (!partialUpdate) {
              const idsToDelete = existingRows
                .map((r) => r.id)
                .filter((id) => !activeCourseIds.includes(id));
              if (idsToDelete.length > 0) {
                await supabase.from("courses").delete().in("id", idsToDelete);
              }
            }
          }

          // 2. Upsert active courses so new courses are inserted and existing courses are updated
          for (const c of courseList) {
            if (typeof c.id === "number") {
              const prevQuotas = existingMap.get(c.id) || {};
              const prevMeta =
                prevQuotas._metadata && typeof prevQuotas._metadata === "object"
                  ? (prevQuotas._metadata as Record<string, unknown>)
                  : {};
              const warningText =
                typeof c.warningMessage === "string" ? c.warningMessage.trim() : "";
              const targetQ =
                (c.targetQuotas as Record<string, unknown>) ?? {
                  sat: typeof prevQuotas.sat === "number" ? prevQuotas.sat : 5,
                  nationalAssoc:
                    typeof prevQuotas.nationalAssoc === "number"
                      ? prevQuotas.nationalAssoc
                      : 15,
                  provincialAssoc:
                    typeof prevQuotas.provincialAssoc === "number"
                      ? prevQuotas.provincialAssoc
                      : 15,
                  nsdf: typeof prevQuotas.nsdf === "number" ? prevQuotas.nsdf : 0,
                  external:
                    typeof prevQuotas.external === "number" ? prevQuotas.external : 5,
                };
              const quotasPayload = {
                ...targetQ,
                ...(prevQuotas._globalTimeline
                  ? { _globalTimeline: prevQuotas._globalTimeline }
                  : {}),
                ...(prevQuotas._reviews
                  ? { _reviews: prevQuotas._reviews }
                  : {}),
                _schedule: {
                  registrationDate:
                    typeof c.registrationDate === "string" && c.registrationDate.trim()
                      ? c.registrationDate.trim()
                      : "9 พ.ย. - 31 ม.ค. 2570",
                  resultDate:
                    typeof c.resultDate === "string" && c.resultDate.trim()
                      ? c.resultDate.trim()
                      : "1 ก.พ. 2570",
                  useCustomSchedule: Boolean(c.useCustomSchedule),
                  updatedAt:
                    typeof c.updatedAt === "string"
                      ? c.updatedAt
                      : new Date().toISOString(),
                },
                _metadata: {
                  ...prevMeta,
                  ...(c.courseObjective !== undefined
                    ? { courseObjective: c.courseObjective }
                    : {}),
                  ...(c.qualifications !== undefined
                    ? { qualifications: c.qualifications }
                    : {}),
                  ...(c.requiredDocuments !== undefined
                    ? { requiredDocuments: c.requiredDocuments }
                    : {}),
                  ...(c.evaluationCriteria !== undefined
                    ? { evaluationCriteria: c.evaluationCriteria }
                    : {}),
                  ...(c.satSupport !== undefined ? { satSupport: c.satSupport } : {}),
                  ...(c.expensesPolicy !== undefined
                    ? { expensesPolicy: c.expensesPolicy }
                    : {}),
                  ...(c.documentConfig !== undefined
                    ? { documentConfig: c.documentConfig }
                    : {}),
                  ...(typeof c.seatsLeft === "number"
                    ? { seatsLeft: c.seatsLeft }
                    : {}),
                  ...(c.budget !== undefined ? { budget: c.budget } : {}),
                  ...(c.province !== undefined ? { province: c.province } : {}),
                  ...(c.fiscalYear !== undefined ? { fiscalYear: c.fiscalYear } : {}),
                  ...(c.isHistorical !== undefined ? { isHistorical: c.isHistorical } : {}),
                  ...(c.historicalCompleted !== undefined ? { historicalCompleted: c.historicalCompleted } : {}),
                  ...(c.historicalApplicants !== undefined ? { historicalApplicants: c.historicalApplicants } : {}),
                  ...(c.announcementFile !== undefined ? { announcementFile: c.announcementFile } : {}),
                  ...(c.status !== undefined ? { status: c.status } : {}),
                },
              };

              await supabase
                .from("courses")
                .upsert(
                  {
                    id: c.id,
                    title: c.title,
                    short_title: c.shortTitle ?? null,
                    date: c.date,
                    location: c.location,
                    seats: c.seats,
                    seats_left: typeof c.seatsLeft === "number" ? c.seatsLeft : 0,
                    status: c.status === "completed" ? "closed" : c.status,
                    image: c.image,
                    warning_message: warningText ? warningText : null,
                    target_quotas: quotasPayload,
                    updated_at:
                      typeof c.updatedAt === "string"
                        ? c.updatedAt
                        : new Date().toISOString(),
                  },
                  { onConflict: "id" }
                );
            }
          }
        } catch (syncErr) {
          console.warn("Server Supabase course sync warning:", syncErr);
        }
      }
    }

    if (Array.isArray(sportsEvents)) {
      sportsEventsCount = sportsEvents.length;
      if (!isServerlessReadOnly) {
        try {
          const sportsEventsPath = path.join(dataDir, "sports-events.json");
          await fs.writeFile(
            sportsEventsPath,
            JSON.stringify(sportsEvents, null, 2) + "\n",
            "utf-8"
          );
        } catch {
          // Ignore on read-only filesystem
        }
      }
    }

    if (
      (Array.isArray(sportsEvents) ||
        (timelineSettings && typeof timelineSettings === "object")) &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          (process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
        );
        const { data: firstCourse } = await supabase
          .from("courses")
          .select("id, target_quotas")
          .order("id")
          .limit(1)
          .maybeSingle();
        if (firstCourse) {
          const prevQ =
            firstCourse.target_quotas &&
            typeof firstCourse.target_quotas === "object"
              ? (firstCourse.target_quotas as Record<string, unknown>)
              : {};
          const prevGlobal =
            prevQ._globalTimeline && typeof prevQ._globalTimeline === "object"
              ? (prevQ._globalTimeline as Record<string, unknown>)
              : {};
          const nextQ = {
            ...prevQ,
            _globalTimeline: {
              ...prevGlobal,
              ...(Array.isArray(sportsEvents) ? { sportsEvents } : {}),
              ...(timelineSettings && typeof timelineSettings === "object"
                ? { timelineSettings }
                : {}),
              updatedAt: new Date().toISOString(),
            },
          };
          await supabase
            .from("courses")
            .update({ target_quotas: nextQ })
            .eq("id", firstCourse.id);
        }
      } catch (timelineSyncErr) {
        console.warn("Server Supabase timeline sync warning:", timelineSyncErr);
      }
    }

    if (Array.isArray(alumni)) {
      alumniCount = alumni.length;
      if (!isServerlessReadOnly) {
        try {
          const alumniPath = path.join(dataDir, "alumni.json");
          await fs.writeFile(
            alumniPath,
            JSON.stringify(alumni, null, 2) + "\n",
            "utf-8"
          );
        } catch {
          // Ignore on read-only filesystem
        }
      }

      // Sync updated alumni to Supabase if configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(supabaseUrl, supabaseKey);

          // Upsert in batches of 100 to avoid payload size and rate limits
          const chunkSize = 100;
          const traineeList = alumni as Record<string, unknown>[];
          for (let i = 0; i < traineeList.length; i += chunkSize) {
            const chunk = traineeList.slice(i, i + chunkSize);
            const rows = chunk.map((t) => ({
              id: String(t.id),
              personnel_id: typeof t.personnelId === "string" ? t.personnelId : null,
              id_card: String(t.idCard || t.personnelId || t.id),
              name: String(t.name || ""),
              prefix: typeof t.prefix === "string" ? t.prefix : null,
              first_name: typeof t.firstName === "string" ? t.firstName : null,
              last_name: typeof t.lastName === "string" ? t.lastName : null,
              gender: typeof t.gender === "string" ? t.gender : null,
              phone: typeof t.phone === "string" ? t.phone : null,
              email: typeof t.email === "string" ? t.email : null,
              affiliation: typeof t.affiliation === "string" ? t.affiliation : "",
              affiliation_group: typeof t.affiliationGroup === "string" ? t.affiliationGroup : "หน่วยงานภายนอก",
              sports_type: typeof t.sportsType === "string" ? t.sportsType : (typeof t.affiliation === "string" ? t.affiliation : ""),
              year_be: typeof t.yearBE === "number" ? t.yearBE : 2566,
              course_id: typeof t.courseId === "number" ? t.courseId : null,
              course_title: typeof t.courseTitle === "string" ? t.courseTitle : "",
              course_category: typeof t.courseCategory === "string" ? t.courseCategory : null,
              batch: typeof t.batch === "string" ? t.batch : null,
              cert_no: typeof t.certNo === "string" ? t.certNo : null,
              passed_date: typeof t.passedDate === "string" ? t.passedDate : null,
              status: typeof t.status === "string" ? t.status : "active",
              avatar_url: typeof t.avatarUrl === "string" ? t.avatarUrl : null,
              duties: Array.isArray(t.duties) ? t.duties : [],
              created_at: typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
              updated_at: typeof t.updatedAt === "string" ? t.updatedAt : new Date().toISOString(),
            }));

            await supabase.from("alumni").upsert(rows, { onConflict: "id" });
          }
        } catch (alumniSyncErr) {
          console.warn("Server Supabase alumni sync warning:", alumniSyncErr);
        }
      }
    }

    if (timelineSettings && typeof timelineSettings === "object" && !isServerlessReadOnly) {
      try {
        const settingsPath = path.join(dataDir, "timeline-settings.json");
        await fs.writeFile(
          settingsPath,
          JSON.stringify(timelineSettings, null, 2) + "\n",
          "utf-8"
        );
      } catch {
        // Ignore on read-only filesystem
      }
    }

    return NextResponse.json({
      ok: true,
      coursesCount,
      sportsEventsCount,
      alumniCount,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "ไม่สามารถบันทึกข้อมูลลงไฟล์ระบบได้",
      },
      { status: 500 }
    );
  }
}
