import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables without external packages
async function loadEnvFile(fileName) {
  try {
    const filePath = path.join(process.cwd(), fileName);
    const content = await fs.readFile(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {
    // file not found
  }
}

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project-id")) {
  console.error("❌ ไม่พบข้อมูลการเชื่อมต่อ Supabase ใน .env.local");
  console.error("👉 กรุณาระบุค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local ก่อนรันสคริปต์นี้");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log(`🚀 กำลังเชื่อมต่อไปยัง Supabase: ${supabaseUrl}`);

  // 1. Verify connection and table existence
  const { error: testErr } = await supabase
    .from("alumni")
    .select("id")
    .limit(1);

  if (testErr) {
    console.error("❌ ไม่สามารถเข้าถึงตาราง alumni บน Supabase ได้:");
    console.error(`   ข้อผิดพลาด: ${testErr.message}`);
    console.error("👉 โปรดตรวจสอบว่าได้รันคำสั่ง SQL จากไฟล์ supabase/schema.sql บน SQL Editor ของ Supabase แล้ว");
    process.exit(1);
  }

  // 2. Read data/alumni.json
  const alumniPath = path.join(process.cwd(), "data", "alumni.json");
  const raw = await fs.readFile(alumniPath, "utf-8");
  const trainees = JSON.parse(raw);

  console.log(`📦 พบข้อมูลบุคลากรใน data/alumni.json ทั้งหมด ${trainees.length.toLocaleString()} รายการ`);
  console.log("⏳ กำลังเริ่มอัปโหลดข้อมูลขึ้น Supabase Cloud ในชุดละ 100 รายการ...\n");

  const chunkSize = 100;
  let totalUploaded = 0;

  for (let i = 0; i < trainees.length; i += chunkSize) {
    const chunk = trainees.slice(i, i + chunkSize);
    const rows = chunk.map((t) => ({
      id: String(t.id),
      personnel_id: t.personnelId || null,
      id_card: String(t.idCard || t.personnelId || t.id),
      name: String(t.name || ""),
      prefix: t.prefix || null,
      first_name: t.firstName || null,
      last_name: t.lastName || null,
      gender: t.gender || null,
      phone: t.phone || null,
      email: t.email || null,
      affiliation: t.affiliation || "",
      affiliation_group: t.affiliationGroup || "หน่วยงานภายนอก",
      sports_type: t.sportsType || t.affiliation || "",
      year_be: Number(t.yearBE) || 2566,
      course_id: typeof t.courseId === "number" ? t.courseId : null,
      course_title: t.courseTitle || "",
      course_category: t.courseCategory || null,
      batch: t.batch || null,
      cert_no: t.certNo || null,
      passed_date: t.passedDate || null,
      status: t.status || "active",
      avatar_url: t.avatarUrl || null,
      duties: Array.isArray(t.duties) ? t.duties : [],
      created_at: t.createdAt || new Date().toISOString(),
      updated_at: t.updatedAt || new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from("alumni")
      .upsert(rows, { onConflict: "id" });

    if (upsertErr) {
      console.error(`❌ เกิดข้อผิดพลาดในชุดที่ ${i / chunkSize + 1}: ${upsertErr.message}`);
      process.exit(1);
    }

    totalUploaded += chunk.length;
    const percent = Math.round((totalUploaded / trainees.length) * 100);
    console.log(`   [${Math.floor(i / chunkSize) + 1}/${Math.ceil(trainees.length / chunkSize)}] อัปโหลดแล้ว ${totalUploaded.toLocaleString()} / ${trainees.length.toLocaleString()} รายการ (${percent}%)`);
  }

  console.log(`\n🎉 อัปโหลดสำเร็จครบถ้วนทั้ง ${totalUploaded.toLocaleString()} รายการขึ้น Supabase Cloud เรียบร้อยแล้ว!`);
  console.log("✨ ทุกเครื่องที่เปิดระบบจะเห็นข้อมูลชุดนี้ตรงกันทันที");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
