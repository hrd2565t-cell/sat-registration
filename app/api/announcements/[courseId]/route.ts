import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/service";
import { getSupabaseClient } from "@/lib/supabase/client";

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "1";
    const customPath = searchParams.get("path");

    const supabase = getSupabaseAdminClient() || getSupabaseClient();
    if (!supabase) {
      return new NextResponse("Supabase client is not configured", { status: 500 });
    }

    let storagePath = customPath;
    let fileName = `announcement-course-${courseId}.pdf`;

    // 1. ค้นหาข้อมูล announcementFile จากฐานข้อมูลหลักสูตร
    if (!storagePath) {
      const { data: courseRow, error: courseError } = await supabase
        .from("courses")
        .select("id, title, target_quotas")
        .eq("id", Number(courseId))
        .maybeSingle();

      if (courseError) {
        console.warn("Failed to fetch course announcement:", courseError.message);
      }

      const targetQuotas = courseRow?.target_quotas as Record<string, unknown> | null;
      const metadata = targetQuotas?._metadata as Record<string, unknown> | null;
      const announcement = metadata?.announcementFile as {
        name?: string;
        storagePath?: string;
        dataUrl?: string;
      } | null;

      if (announcement) {
        fileName = announcement.name || fileName;
        if (announcement.storagePath) {
          storagePath = announcement.storagePath;
        } else if (announcement.dataUrl?.includes("/sat-documents/")) {
          const marker = "/sat-documents/";
          const markerIdx = announcement.dataUrl.indexOf(marker);
          storagePath = decodeURIComponent(
            announcement.dataUrl.slice(markerIdx + marker.length).split("?")[0]
          );
        } else if (announcement.dataUrl?.startsWith("data:application/pdf")) {
          // หากเก็บเป็น Base64 DataURL
          const base64Part = announcement.dataUrl.split(",")[1];
          if (base64Part) {
            const buffer = Buffer.from(base64Part, "base64");
            const encodedFilename = encodeURIComponent(fileName);
            const disposition = isDownload ? "attachment" : "inline";

            return new NextResponse(buffer, {
              status: 200,
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `${disposition}; filename*=UTF-8''${encodedFilename}`,
                "Content-Length": String(buffer.length),
                "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
              },
            });
          }
        }
      }
    }

    if (!storagePath) {
      return new NextResponse(
        JSON.stringify({ error: "Announcement PDF not found for this course" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. ดึงไฟล์จริงจาก Supabase Storage Bucket sat-documents (Private Bucket)
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("sat-documents")
      .download(storagePath);

    if (downloadError || !fileBlob) {
      console.warn("Failed to download announcement from Supabase storage:", downloadError?.message);
      return new NextResponse(
        JSON.stringify({
          error: "File not found in storage",
          details: downloadError?.message,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const encodedFilename = encodeURIComponent(fileName);
    const disposition = isDownload ? "attachment" : "inline";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("API announcement handler error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
