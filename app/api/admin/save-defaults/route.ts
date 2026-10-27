import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courses, sportsEvents } = body as {
      courses?: unknown[];
      sportsEvents?: unknown[];
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
