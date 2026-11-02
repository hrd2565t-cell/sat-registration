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
          for (const c of courses as Record<string, unknown>[]) {
            if (typeof c.id === "number") {
              const warningText =
                typeof c.warningMessage === "string" ? c.warningMessage.trim() : "";
              await supabase
                .from("courses")
                .update({
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
                })
                .eq("id", c.id);
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
