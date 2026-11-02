import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courses, sportsEvents, timelineSettings } = body as {
      courses?: unknown[];
      sportsEvents?: unknown[];
      timelineSettings?: Record<string, unknown>;
    };

    const dataDir = path.join(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });

    let coursesCount = 0;
    let sportsEventsCount = 0;

    if (Array.isArray(courses)) {
      const coursesPath = path.join(dataDir, "courses.json");
      await fs.writeFile(
        coursesPath,
        JSON.stringify(courses, null, 2) + "\n",
        "utf-8"
      );
      coursesCount = courses.length;

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
          const { data: existingRows } = await supabase.from("courses").select("id");
          if (existingRows && existingRows.length > 0) {
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
              const warningText =
                typeof c.warningMessage === "string" ? c.warningMessage.trim() : "";
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
                    target_quotas: c.targetQuotas ?? null,
                    document_config: c.documentConfig ?? null,
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
      const sportsEventsPath = path.join(dataDir, "sports-events.json");
      await fs.writeFile(
        sportsEventsPath,
        JSON.stringify(sportsEvents, null, 2) + "\n",
        "utf-8"
      );
      sportsEventsCount = sportsEvents.length;
    }

    if (timelineSettings && typeof timelineSettings === "object") {
      const settingsPath = path.join(dataDir, "timeline-settings.json");
      await fs.writeFile(
        settingsPath,
        JSON.stringify(timelineSettings, null, 2) + "\n",
        "utf-8"
      );
    }

    return NextResponse.json({
      ok: true,
      coursesCount,
      sportsEventsCount,
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
