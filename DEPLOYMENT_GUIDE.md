# คู่มือการติดตั้งและนำขึ้นระบบ (Deployment Guide)
## ระบบรับสมัครผู้เข้ารับการอบรมออนไลน์ - การกีฬาแห่งประเทศไทย (กกท. / SAT)
### สถาปัตยกรรม: GitHub + Supabase + Vercel

---

## 📌 ภาพรวมสถาปัตยกรรม (Architecture Overview)

```
[ ผู้ใช้งาน / ผู้สมัคร / เจ้าหน้าที่ Admin ]
                    │
                    ▼
          ┌───────────────────┐
          │   Vercel Hosting  │  (Next.js 16 App Router + Turbopack + Tailwind v4)
          └─────────┬─────────┘
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
┌───────────────┐        ┌────────────────┐
│ Supabase DB   │        │ Supabase Store │
│ (PostgreSQL)  │        │ (Storage/PDF)  │
└───────────────┘        └────────────────┘
```

- **Dual-Mode System**: ระบบทำงานได้ทันทีทั้งแบบ **Local Mode** (IndexedDB + Storage ออฟไลน์) และ **Cloud Mode** (Supabase Database + Supabase Storage อัตโนมัติเมื่อใส่ API Key)
- **Zero Lock-in**: หากไม่มี Supabase ระบบจะทำงานผ่าน Browser Storage อัตโนมัติ จึงทดสอบหรือรันบน Vercel ได้ทันที

---

## 🚀 ขั้นตอนที่ 1: นำโค้ดขึ้น GitHub

### 1.1 ตรวจสอบความเรียบร้อยของไฟล์
ระบบได้ตั้งค่า `.gitignore` เพื่อกันไฟล์ขนาดใหญ่ (`opencode-history.md.json`, `.next`, `node_modules`) และไฟล์ Secret (`.env*.local`) เรียบร้อยแล้ว

### 1.2 สั่ง Git บนเครื่องของคุณ (PowerShell หรือ Terminal)
เปิด Terminal ที่โฟลเดอร์โครงการ `รับสมัคร` แล้วรันคำสั่งตามลำดับ:

```bash
# 1. สร้าง Git Repository
git init

# 2. เพิ่มไฟล์ทั้งหมด
git add .

# 3. บันทึก Commit แรก
git commit -m "feat: complete SAT course registration system with official PDF generation and Supabase integration"

# 4. เปลี่ยนชื่อ Branch หลักเป็น main
git branch -M main

# 5. เชื่อมต่อกับ GitHub Repository ของคุณ (นำ URL จาก GitHub ที่คุณสร้างมาใส่แทนที่)
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 6. Push โค้ดขึ้น GitHub
git push -u origin main
```

---

## 🗄️ ขั้นตอนที่ 2: ตั้งค่าฐานข้อมูล Supabase

### 2.1 สร้าง Project บน Supabase
1. เข้าไปที่ [supabase.com](https://supabase.com) แล้วเข้าสู่ระบบ (Sign In with GitHub ได้)
2. กดปุ่ม **"New Project"**
3. ตั้งชื่อโครงการ เช่น `sat-registration`
4. กำหนด Database Password (จดบันทึกไว้) และเลือก Region ใกล้ไทย เช่น **Singapore (`ap-southeast-1`)**
5. กด **"Create new project"** และรอประมาณ 1-2 นาทีจนระบบเตรียมฐานข้อมูลเสร็จ

### 2.2 ติดตั้ง Schema และข้อมูลเริ่มต้น (1-Click SQL)
1. ในหน้าแดชบอร์ด Supabase เมนูด้านซ้าย เลือก **"SQL Editor"**
2. กดปุ่ม **"New query"**
3. เปิดไฟล์ [`supabase/schema.sql`](file:///c:/Users/HRD/Desktop/รับสมัคร/supabase/schema.sql) ในโฟลเดอร์โครงการ แล้วคัดลอกเนื้อหาทั้งหมดมาวางในช่อง SQL Editor
4. กดปุ่ม **"Run"** (หรือกด `Ctrl + Enter`)
5. ระบบจะสร้าง:
   - ตาราง `courses` พร้อมข้อมูล 5 หลักสูตรเริ่มต้นของ กกท.
   - ตาราง `applications` พร้อมดัชนี (Indexes) และความปลอดภัย RLS
   - ตาราง `application_documents` สำหรับเอกสารแนบ (ส.ฬ.๘, วุฒิบัตร, รูปถ่าย)
   - ตาราง `review_notes` สำหรับบันทึกความเห็นของเจ้าหน้าที่ตรวจสอบ
   - Storage Buckets: `sat-documents` (เอกสารผู้สมัคร) และ `course-banners` (รูปภาพหลักสูตร)

### 2.3 คัดลอกค่าการเชื่อมต่อ (API Keys)
1. ไปที่เมนู **Project Settings** (ไอคอนฟันเฟืองด้านซ้ายล่าง) > **API**
2. บันทึกค่า 3 ตัวต่อไปนี้เพื่อนำไปใส่ใน Vercel:
   - **Project URL** (เช่น `https://xyzabc.supabase.co`)
   - **anon / public key** (คีย์สาธารณะสำหรับหน้าเว็บ)
   - **service_role key** (คีย์ลับสำหรับ Admin / Server)

---

## 🌐 ขั้นตอนที่ 3: นำขึ้นโฮสติ้ง Vercel

### 3.1 เชื่อมต่อ Repository
1. เข้าไปที่ [vercel.com](https://vercel.com) แล้วเข้าสู่ระบบ (Continue with GitHub)
2. กดปุ่ม **"Add New..."** > **"Project"**
3. เลือก Repository ที่คุณเพิ่ง push ขึ้นไปในขั้นตอนที่ 1 แล้วกด **"Import"**

### 3.2 ตั้งค่า Environment Variables (ตัวแปรระบบ)
ในหน้า Configure Project ก่อนกด Deploy ให้เลื่อนลงมาที่หัวข้อ **Environment Variables** แล้วเพิ่มค่าดังนี้:

| Key | Value (ตัวอย่าง) | คำอธิบาย |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xyzabc.supabase.co` | URL ของ Supabase Project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Anon Key จาก Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Service Role Key จาก Supabase |
| `NEXT_PUBLIC_ADMIN_PIN` | `336699` | รหัส PIN 6 หลักสำหรับเข้าห้องผู้ดูแลระบบ |
| `NEXT_PUBLIC_SITE_URL` | `https://your-sat-project.vercel.app` | โดเมนของระบบ (อัปเดตหลัง deploy ได้) |

### 3.3 กด Deploy
1. กดปุ่ม **"Deploy"**
2. Vercel จะทำการ Build Next.js 16 ด้วย Turbopack อัตโนมัติ (ใช้เวลาประมาณ 1-2 นาที)
3. เมื่อเสร็จสิ้น คุณจะได้ URL เว็บไซต์พร้อมใช้งานทันที (เช่น `https://sat-registration.vercel.app`)! 🎉

---

## 🔒 การเข้าใช้งานระบบและระบบความปลอดภัย

1. **หน้าสำหรับประชาชน / ผู้สมัคร**:
   - หน้าหลักเลือกหลักสูตร: `/`
   - หน้ากรอกใบสมัครและแนบไฟล์: `/register?course=1`
   - หน้ารับใบเสร็จการสมัคร (Receipt): `/register/receipt?ref=...`
   - หน้าตรวจสอบสถานะ: `/status` (ค้นหาด้วยเลขบัตรประชาชน 13 หลัก)
   - หน้าพิมพ์ใบรับสมัครทางการ (A4 PDF): `/print/receipt?ref=...`
   - หน้าพิมพ์บัตรยืนยันการเข้าร่วมอบรม (Pass PDF): `/print/pass?ref=...`

2. **หน้าสำหรับเจ้าหน้าที่ (Admin)**:
   - ทางเข้า: `/admin/login`
   - รหัส PIN 6 หลัก: **`336699`** (พิมพ์ครบ 6 ตัวเข้าระบบทันที ไม่ต้องกด Enter)
   - Session จะหมดอายุอัตโนมัติเมื่อปิดแท็บเบราว์เซอร์ เพื่อความปลอดภัยของข้อมูล กกท.
   - จัดการหลักสูตร: `/admin/courses` (แก้ไขข้อมูล, อัปโหลดรูปแบนเนอร์ใหม่, สลับสถานะเปิดรับ/เต็ม)
   - คิวตรวจสอบใบสมัคร: `/admin/review` (พรีวิวดูไฟล์ PDF/รูปจริง, อนุมัติ/ปฏิเสธ, พิมพ์เอกสาร A4 และบัตรเข้าร่วม)

---

## 💡 คำแนะนำเพิ่มเติมและการดูแลรักษา

- **การเปลี่ยนรหัส PIN Admin**: สามารถเปลี่ยนได้ตลอดเวลาใน Vercel Settings > Environment Variables แก้ไข `NEXT_PUBLIC_ADMIN_PIN` แล้วกด Redeploy
- **การสำรองข้อมูล (Backup)**: ใน Supabase Dashboard มีระบบ Automated Daily Backups ให้ในตัว
- **Custom Domain**: หากต้องการใช้โดเมนทางการของ กกท. (เช่น `course.sat.or.th`) สามารถนำ Domain มาผูกใน Vercel > Settings > Domains ได้ฟรี พร้อม SSL Certificate อัตโนมัติ
