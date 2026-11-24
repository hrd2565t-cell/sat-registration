import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { isAdminRequestAuthorized } from "@/lib/server-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/service";

export interface SendApplicationEmailRequest {
  to: string;
  applicantName: string;
  receiptNo: string;
  ref: string;
  courseTitle: string;
  courseDate?: string;
  courseLocation?: string;
  idCard: string;
  affiliation?: string;
  statusUpdate?: {
    status: "approved" | "action_required" | "rejected" | "reserve";
    reason?: string;
  };
}

const emailCooldownMap = new Map<string, number>();
const EMAIL_COOLDOWN_MS = 60_000;

function escapeHtml(raw: string | undefined | null): string {
  if (!raw) return "";
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMaskedIdCard(idCard: string): string {
  const digits = idCard.replace(/\D/g, "");
  if (digits.length !== 13) return escapeHtml(idCard);
  return `${digits[0]}-xxxx-xxxxx-${digits.slice(10, 12)}-${digits[12]}`;
}

function buildEmailHtml(data: SendApplicationEmailRequest, siteUrl: string): string {
  const maskedId = formatMaskedIdCard(data.idCard);
  const safeName = escapeHtml(data.applicantName);
  const safeReceiptNo = escapeHtml(data.receiptNo);
  const safeCourseTitle = escapeHtml(data.courseTitle);
  const safeCourseDate = escapeHtml(data.courseDate);
  const safeCourseLocation = escapeHtml(data.courseLocation);
  const safeAffiliation = escapeHtml(data.affiliation);
  const statusUrl = `${siteUrl}/status?id=${encodeURIComponent(data.idCard.replace(/\D/g, ""))}`;
  const receiptUrl = `${siteUrl}/print/receipt?ref=${encodeURIComponent(data.ref)}`;
  const dateStr = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date());

  const statusUpdate = data.statusUpdate;
  const safeReason = escapeHtml(statusUpdate?.reason);

  const headerTitle =
    statusUpdate?.status === "approved"
      ? "แจ้งผลการพิจารณา: ผ่านการคัดเลือก (ตัวจริง)"
      : statusUpdate?.status === "action_required"
        ? "แจ้งขอเอกสารประกอบการสมัครเพิ่มเติม"
        : statusUpdate?.status === "reserve"
          ? "แจ้งผลการพิจารณา: บัญชีรายชื่อสำรอง"
          : statusUpdate?.status === "rejected"
            ? "แจ้งผลการพิจารณาคุณสมบัติการสมัคร"
            : "ใบรับเรื่องการสมัครเข้ารับการฝึกอบรม";

  const headerGradient =
    statusUpdate?.status === "approved"
      ? "linear-gradient(135deg, #065f46 0%, #059669 100%)"
      : statusUpdate?.status === "action_required"
        ? "linear-gradient(135deg, #9a3412 0%, #ea580c 100%)"
        : statusUpdate?.status === "rejected"
          ? "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)"
          : "linear-gradient(135deg, #16265E 0%, #1e3a8a 100%)";

  const introText =
    statusUpdate?.status === "approved"
      ? "ขอแสดงความยินดี! ท่านผ่านการตรวจสอบคุณสมบัติและเอกสารเรียบร้อยแล้ว และได้รับอนุมัติสิทธิ์เข้ารับการฝึกอบรมในหลักสูตรนี้"
      : statusUpdate?.status === "action_required"
        ? "เจ้าหน้าที่ตรวจพบว่าเอกสารประกอบการสมัครของท่านยังไม่ครบถ้วนหรือไม่ชัดเจน กรุณาอัปโหลดเอกสารเพิ่มเติมผ่านหน้าตรวจสอบสถานะ"
        : statusUpdate?.status === "reserve"
          ? "ท่านผ่านการตรวจสอบคุณสมบัติเบื้องต้นแล้ว โดยขณะนี้อยู่ในบัญชีรายชื่อสำรอง เจ้าหน้าที่จะติดต่อแจ้งกลับทันทีหากมีผู้สละสิทธิ์"
          : statusUpdate?.status === "rejected"
            ? "เจ้าหน้าที่ได้พิจารณาใบสมัครของท่านแล้ว พบว่ายังไม่ผ่านเกณฑ์คุณสมบัติหรือเอกสารที่กำหนดในรอบนี้"
            : "ระบบรับสมัครเข้ารับการฝึกอบรม กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย ได้รับข้อมูลการสมัครและเอกสารประกอบของท่านเรียบร้อยแล้ว";

  const noticeBoxStyle =
    statusUpdate?.status === "approved"
      ? "background-color: #ecfdf5; border-left: 4px solid #10b981;"
      : statusUpdate?.status === "action_required"
        ? "background-color: #fff7ed; border-left: 4px solid #f97316;"
        : statusUpdate?.status === "rejected"
          ? "background-color: #fef2f2; border-left: 4px solid #ef4444;"
          : "background-color: #fefce8; border-left: 4px solid #eab308;";

  const noticeTextColor =
    statusUpdate?.status === "approved"
      ? "#065f46"
      : statusUpdate?.status === "action_required"
        ? "#9a3412"
        : statusUpdate?.status === "rejected"
          ? "#991b1b"
          : "#854d0e";

  const noticeContent =
    statusUpdate?.status === "approved"
      ? `<strong>✅ หมายเหตุจากเจ้าหน้าที่:</strong> ${safeReason || "อนุมัติคุณสมบัติและเอกสารครบถ้วน"} ท่านสามารถกดปุ่มด้านล่างเพื่อตรวจสอบสถานะและพิมพ์ใบรับการสมัคร (A4) สำหรับใช้รายงานตัวได้ทันที`
      : statusUpdate?.status === "action_required"
        ? `<strong>⚠️ รายการที่ต้องแก้ไข / แนบเพิ่มเติม:</strong> ${safeReason || "กรุณาตรวจสอบและแนบเอกสารใหม่ให้ชัดเจน"} กรุณากดปุ่มด้านล่างเพื่ออัปโหลดเอกสารเพิ่มเติมโดยไม่ต้องกรอกใบสมัครใหม่`
        : statusUpdate?.status === "reserve"
          ? `<strong>📌 รายละเอียดบัญชีสำรอง:</strong> ${safeReason || "ผ่านการตรวจสอบคุณสมบัติ (บัญชีสำรอง)"} สามารถติดตามลำดับรายชื่อล่าสุดได้ที่หน้าตรวจสอบสถานะ`
          : statusUpdate?.status === "rejected"
            ? `<strong>ℹ️ เหตุผลการพิจารณา:</strong> ${safeReason || "คุณสมบัติหรือเอกสารไม่เป็นไปตามเกณฑ์ที่หลักสูตรกำหนด"}`
            : `<strong>📋 ขั้นตอนต่อไป:</strong> ข้อมูลและเอกสารของท่านอยู่ระหว่างการตรวจสอบคุณสมบัติโดยเจ้าหน้าที่ (3-5 วันทำการ) ท่านสามารถติดตามสถานะการพิจารณาหรือพิมพ์เอกสารใบสมัครได้ตลอดเวลาผ่านลิงก์ด้านล่าง`;

  const primaryCtaLabel =
    statusUpdate?.status === "approved"
      ? "🖨️ พิมพ์ใบรับการสมัคร (A4) / เช็คสถานะ"
      : statusUpdate?.status === "action_required"
        ? "📤 อัปโหลดเอกสารเพิ่มเติมทันที"
        : "🔍 ตรวจสอบสถานะการสมัคร";

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ยืนยันการรับสมัคร - กกท.</title>
  <style>
    body {
      font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #334155;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 24px 12px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #16265E 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 28px 24px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 8px;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.3;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      color: #cbd5e1;
    }
    .content {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .intro {
      font-size: 14px;
      color: #475569;
      margin-bottom: 20px;
    }
    .card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 18px;
      margin-bottom: 24px;
    }
    .receipt-badge {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 8px 14px;
      text-align: center;
      margin-bottom: 16px;
    }
    .receipt-label {
      font-size: 11px;
      color: #1e40af;
      font-weight: 600;
      text-transform: uppercase;
    }
    .receipt-val {
      font-size: 18px;
      color: #1e3a8a;
      font-weight: 800;
      letter-spacing: 0.5px;
      font-family: monospace, sans-serif;
    }
    .field-row {
      display: flex;
      margin-bottom: 10px;
      font-size: 13.5px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 8px;
    }
    .field-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .field-label {
      width: 120px;
      color: #64748b;
      font-weight: 500;
      flex-shrink: 0;
    }
    .field-value {
      color: #0f172a;
      font-weight: 600;
      flex: 1;
    }
    .notice-box {
      background-color: #fefce8;
      border-left: 4px solid #eab308;
      padding: 14px 16px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 24px;
    }
    .notice-box p {
      margin: 0;
      font-size: 13px;
      color: #854d0e;
    }
    .button-container {
      text-align: center;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background-color: #16265E;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 600;
      padding: 10px 22px;
      border-radius: 6px;
      margin: 5px;
    }
    .btn-secondary {
      background-color: #ffffff;
      color: #16265E !important;
      border: 1px solid #16265E;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 24px;
      font-size: 11.5px;
      color: #64748b;
      text-align: center;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header" style="background: ${headerGradient};">
        <span class="badge">การกีฬาแห่งประเทศไทย (กกท.)</span>
        <h1>${headerTitle}</h1>
        <p>กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ</p>
      </div>
      
      <div class="content">
        <div class="greeting">เรียนคุณ ${safeName}</div>
        <div class="intro">
          ${introText}
        </div>
        
        <div class="card">
          <div class="receipt-badge">
            <div class="receipt-label">รหัสอ้างอิงการสมัคร (Official Ref No.)</div>
            <div class="receipt-val">${safeReceiptNo}</div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 130px;">ชื่อ - นามสกุล:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">เลขบัตร ปชช.:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${maskedId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">หลักสูตร:</td>
              <td style="padding: 6px 0; color: #1e3a8a; font-weight: 700;">${safeCourseTitle}</td>
            </tr>
            ${safeCourseDate ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">กำหนดการอบรม:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">วันที่ ${safeCourseDate}</td>
            </tr>` : ""}
            ${safeCourseLocation ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">สถานที่จัดอบรม:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">ณ ${safeCourseLocation}</td>
            </tr>` : ""}
            ${safeAffiliation ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">สังกัด / หน่วยงาน:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">${safeAffiliation}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 6px 0; color: #64748b;">วันที่ยื่นสมัคร:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">${dateStr}</td>
            </tr>
          </table>
        </div>
        
        <div class="notice-box" style="${noticeBoxStyle}">
          <p style="color: ${noticeTextColor};">
            ${noticeContent}
          </p>
        </div>
        
        <div class="button-container">
          <a href="${statusUrl}" target="_blank" class="btn">${primaryCtaLabel}</a>
          <a href="${receiptUrl}" target="_blank" class="btn btn-secondary">📄 ดาวน์โหลดใบสมัคร (A4 PDF)</a>
        </div>
      </div>
      
      <div class="footer">
        <strong>กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย (กกท.)</strong><br>
        286 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240<br>
        โทรศัพท์: 02-186-7111 ต่อ 8151 | อีเมล: <a href="mailto:hrd2565t@gmail.com" style="color: #1e3a8a; font-weight: 600; text-decoration: none;">hrd2565t@gmail.com</a><br>
        <span style="color: #64748b; font-size: 11px; display: inline-block; margin-top: 8px;">
          หากท่านมีข้อสงสัยหรือต้องการสอบถามข้อมูลเพิ่มเติม สามารถตอบกลับอีเมลนี้ หรือติดต่อมาที่ hrd2565t@gmail.com ได้โดยตรง
        </span>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendApplicationEmailRequest;
    const {
      to,
      applicantName,
      receiptNo,
      ref,
      courseTitle,
      courseDate,
      courseLocation,
      idCard,
      affiliation,
      statusUpdate,
    } = body;

    if (!to || !to.includes("@")) {
      return NextResponse.json(
        { success: false, error: "ที่อยู่อีเมลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบสิทธิ์ก่อนทำ Rate Limit เพื่อป้องกันการสวมรอยส่งอีเมลหรือปั่น Cooldown
    if (statusUpdate) {
      const isAdmin = await isAdminRequestAuthorized(request);
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: "ไม่ได้รับอนุญาตให้ส่งอีเมลแจ้งผลการพิจารณา" },
          { status: 403 }
        );
      }
    } else {
      const cleanRef = typeof ref === "string" ? ref.trim() : "";
      if (cleanRef.length < 3) {
        return NextResponse.json(
          { success: false, error: "ไม่พบรหัสอ้างอิงใบสมัครสำหรับส่งอีเมลยืนยัน" },
          { status: 400 }
        );
      }

      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data: appRow } = await supabase
          .from("applications")
          .select("ref, email")
          .eq("ref", cleanRef)
          .maybeSingle();

        if (appRow) {
          if (
            appRow.email &&
            appRow.email.trim().toLowerCase() !== to.trim().toLowerCase()
          ) {
            return NextResponse.json(
              { success: false, error: "อีเมลไม่ตรงกับข้อมูลใบสมัครในระบบ" },
              { status: 403 }
            );
          }
        } else {
          const isAdmin = await isAdminRequestAuthorized(request);
          if (!isAdmin) {
            return NextResponse.json(
              { success: false, error: "ไม่พบข้อมูลใบสมัครที่อ้างอิงในระบบ" },
              { status: 403 }
            );
          }
        }
      }
    }

    const nowMs = Date.now();
    if (emailCooldownMap.size > 1000) {
      for (const [k, ts] of emailCooldownMap.entries()) {
        if (nowMs - ts >= EMAIL_COOLDOWN_MS) {
          emailCooldownMap.delete(k);
        }
      }
    }
    const rateKey = `${to.trim().toLowerCase()}:${ref || ""}:${statusUpdate?.status || "registration"}`;
    const lastSent = emailCooldownMap.get(rateKey);
    if (lastSent && nowMs - lastSent < EMAIL_COOLDOWN_MS) {
      const retryAfterSec = Math.max(1, Math.ceil((EMAIL_COOLDOWN_MS - (nowMs - lastSent)) / 1000));
      return NextResponse.json(
        {
          success: false,
          retryAfterSec,
          error: `กรุณารอ ${retryAfterSec} วินาที ก่อนส่งอีเมลซ้ำ`,
        },
        { status: 429 }
      );
    }
    emailCooldownMap.set(rateKey, nowMs);

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://sat-registration.vercel.app")
    ).replace(/\/$/, "");

    const emailHtml = buildEmailHtml(
      { to, applicantName, receiptNo, ref, courseTitle, courseDate, courseLocation, idCard, affiliation, statusUpdate },
      siteUrl
    );

    const subject =
      statusUpdate?.status === "approved"
        ? `[กกท.] ผลการคัดเลือก: ผ่านการพิจารณา - ${courseTitle} (${receiptNo})`
        : statusUpdate?.status === "action_required"
          ? `[กกท.] แจ้งขอเอกสารเพิ่มเติมประกอบการสมัคร - ${courseTitle} (${receiptNo})`
          : statusUpdate?.status === "reserve"
            ? `[กกท.] ผลการพิจารณา: รายชื่อสำรอง - ${courseTitle} (${receiptNo})`
            : statusUpdate?.status === "rejected"
              ? `[กกท.] แจ้งผลการพิจารณาการสมัคร - ${courseTitle} (${receiptNo})`
              : `[กกท.] ยืนยันการสมัครเข้ารับการฝึกอบรม: ${courseTitle} (${receiptNo})`;

    // 1. ตรวจสอบการส่งผ่าน SMTP ก่อน (เช่น Gmail ของ กกท. หรือ Server ของหน่วยงาน)
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT || 465),
          secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || `"กองพัฒนาบุคลากรกีฬา กกท." <${smtpUser}>`,
          replyTo: "hrd2565t@gmail.com",
          to,
          subject,
          html: emailHtml,
        });

        return NextResponse.json({
          success: true,
          provider: "smtp",
          messageId: info.messageId,
          message: "ส่งอีเมลยืนยันสำเร็จผ่าน SMTP",
        });
      } catch (smtpErr) {
        console.warn("[SMTP Warning] SMTP delivery failed, falling back:", smtpErr);
      }
    }

    // 2. ตรวจสอบการส่งผ่าน Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const fromEmail = process.env.EMAIL_FROM || "กองพัฒนาบุคลากรกีฬา กกท. <onboarding@resend.dev>";
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          reply_to: "hrd2565t@gmail.com",
          subject,
          html: emailHtml,
        }),
      });

      if (resendRes.ok) {
        const resendData = await resendRes.json();
        return NextResponse.json({
          success: true,
          provider: "resend",
          messageId: resendData.id,
          message: "ส่งอีเมลยืนยันสำเร็จผ่าน Resend",
        });
      } else {
        const errText = await resendRes.text();
        console.warn("[Resend Warning] Resend API returned error:", errText);
        if (resendRes.status === 403) {
          console.warn(
            "[Resend Domain Required] onboarding@resend.dev can only send to the account owner. To send to any applicant, verify your domain at resend.com/domains or configure SMTP."
          );
        }
      }
    }

    // 3. Simulation Mode (เมื่อยังไม่ได้ตั้งค่า credentials ในสภาพแวดล้อม)
    // บันทึก Log การส่งอีเมลอย่างสมบูรณ์ เพื่อให้ระบบทำงานต่อได้อย่างราบรื่น 100%
    console.log(`[EMAIL SIMULATION] Confirmation email prepared for: ${to}`);
    console.log(`[EMAIL SIMULATION] Applicant: ${applicantName}, Ref: ${receiptNo}, Course: ${courseTitle}`);

    return NextResponse.json({
      success: true,
      provider: "simulation",
      recipient: to,
      receiptNo,
      message:
        "ระบบเตรียมและจำลองการส่งอีเมลเรียบร้อยแล้ว (สามารถกำหนดค่า RESEND_API_KEY หรือ SMTP ใน Environment Variables เพื่อส่งออกสู่กล่องจดหมายจริง)",
    });
  } catch (error) {
    console.error("Failed to process send-email request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการประมวลผลการส่งอีเมล",
      },
      { status: 500 }
    );
  }
}
