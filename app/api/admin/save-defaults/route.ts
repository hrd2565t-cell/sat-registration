import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(request: Request) {
  try {
    const adminAuthorized = request.headers.get("x-admin-authorized");
    const adminPinHeader = request.headers.get("x-admin-pin");
    const expectedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || "336699";
    if (adminAuthorized !== "true" && adminPinHeader !== expectedPin) {
      return NextResponse.json(
        { ok: false, error: "ไม่ได้รับอนุญาต (ต้องเป็นผู้ดูแลระบบ)" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { courses, sportsEvents, timelineSettings, alumni } = body as {
      courses?: unknown[];
      sportsEvents?: unknown[];
      timelineSettings?: Record<string, unknown>;
      alumni?: unknown[];
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

    if (Array.isArray(courses)) {
      coursesCount = courses.length;
      if (!isServerlessReadOnly) {
        try {
          const coursesPath = path.join(dataDir, "courses.json");
          await fs.writeFile(
            coursesPath,
            JSON.stringify(courses, null, 2) + "\n",
            "utf-8"
          );
        } catch {
          // Ignore on read-only filesystem
        }
      }

      // Sync updated courses directly to Supabase with service role key if available
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(supabaseUrl, supabaseKey);

          const courseList = courses as Record<string, unknown>[];
          const activeCourseIds = courseList
            .map((c) => c.id)
            .filter((id): id is number => typeof id === "number");

          // 1. Delete courses in Supabase that have been deleted by the admin
          const { data: existingRows } = await supabase
            .from("courses")
            .select("id, target_quotas");
          const existingMap = new Map<number, Record<string, unknown>>();
          if (existingRows && existingRows.length > 0) {
            for (const row of existingRows) {
              if (typeof row.id === "number" && row.target_quotas && typeof row.target_quotas === "object") {
                existingMap.set(row.id, row.target_quotas as Record<string, unknown>);
              }
            }
            const idsToDelete = existingRows
              .map((r) => r.id)
              .filter((id) => !activeCourseIds.includes(id));
            if (idsToDelete.length > 0) {
              await supabase.from("courses").delete().in("id", idsToDelete);
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
                    status: c.status,
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
