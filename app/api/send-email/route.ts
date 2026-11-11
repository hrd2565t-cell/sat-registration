import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

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
}

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
      <div class="header">
        <span class="badge">การกีฬาแห่งประเทศไทย (กกท.)</span>
        <h1>ใบรับเรื่องการสมัครเข้ารับการฝึกอบรม</h1>
        <p>กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ</p>
      </div>
      
      <div class="content">
        <div class="greeting">เรียนคุณ ${safeName}</div>
        <div class="intro">
          ระบบรับสมัครเข้ารับการฝึกอบรม กองพัฒนาบุคลากรกีฬา การกีฬาแห่งประเทศไทย ได้รับข้อมูลการสมัครและเอกสารประกอบของท่านเรียบร้อยแล้ว
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
        
        <div class="notice-box">
          <p>
            <strong>📋 ขั้นตอนต่อไป:</strong> ข้อมูลและเอกสารของท่านอยู่ระหว่างการตรวจสอบคุณสมบัติโดยเจ้าหน้าที่ (3-5 วันทำการ) ท่านสามารถติดตามสถานะการพิจารณาหรือพิมพ์เอกสารใบสมัครได้ตลอดเวลาผ่านลิงก์ด้านล่าง
          </p>
        </div>
        
        <div class="button-container">
          <a href="${statusUrl}" target="_blank" class="btn">🔍 ตรวจสอบสถานะการสมัคร</a>
          <a href="${receiptUrl}" target="_blank" class="btn btn-secondary">📄 ดาวน์โหลดใบสมัคร (A4 PDF)</a>
        </div>
      </div>
      
      <div class="footer">
        <strong>กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย (กกท.)</strong><br>
        286 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240<br>
        โทรศัพท์: 02-186-7111 ต่อ 8151<br>
        <span style="color: #94a3b8; font-size: 10.5px; display: inline-block; margin-top: 6px;">
          ข้อความนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้
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
    const { to, applicantName, receiptNo, ref, courseTitle, courseDate, courseLocation, idCard, affiliation } = body;

    if (!to || !to.includes("@")) {
      return NextResponse.json(
        { success: false, error: "ที่อยู่อีเมลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://sat-registration.vercel.app")
    ).replace(/\/$/, "");

    const emailHtml = buildEmailHtml(
      { to, applicantName, receiptNo, ref, courseTitle, courseDate, courseLocation, idCard, affiliation },
      siteUrl
    );

    const subject = `[กกท.] ยืนยันการสมัครเข้ารับการฝึกอบรม: ${courseTitle} (${receiptNo})`;

    // 1. ตรวจสอบการส่งผ่าน Resend API
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

    // 2. ตรวจสอบการส่งผ่าน SMTP (เช่น Gmail, Microsoft 365, หรือ Mail Server ของ กกท.)
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"กองพัฒนาบุคลากรกีฬา กกท." <${smtpUser}>`,
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
