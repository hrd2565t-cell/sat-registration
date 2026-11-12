<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# กฎเหล็กและข้อกำหนดสำคัญของระบบรับสมัคร (SAT Registration System Rules)

## 1. การจัดการไฟล์แนบและการซิงค์ข้อมูลข้ามเครื่อง (Multi-Device File & Data Sync)
- **Supabase Storage คือ Single Source of Truth สำหรับไฟล์แนบจริง**: ไฟล์แนบทุกชนิด (PDF, รูปถ่าย ฯลฯ) ที่ผู้สมัครอัปโหลด ต้องถูกอัปโหลดขึ้น Supabase Storage (`sat-documents`) และบันทึก `storage_path` หรือ `data_url` ในตาราง `application_documents` เสมอ
- **ห้ามพึ่งพาเฉพาะ IndexedDB / LocalStorage**:
  - `IndexedDB` เป็นเพียง Local Cache ประจำเครื่องนั้นๆ เท่านั้น เครื่องอื่นจะมองไม่เห็น
  - ฟังก์ชัน `persist()` ตัด `dataUrl` ออกจาก `localStorage` เพื่อป้องกันโควตาเต็ม ดังนั้นการซิงค์ (`syncApplicationToSupabase`) จะต้องดึงไฟล์จริงจาก `IndexedDB` (`getDocumentFromStorage`) มาแปลงและอัปโหลดขึ้น Supabase Storage เสมอ
  - หากตรวจพบว่าไฟล์ใน Cloud ยังไม่มี `dataUrl` หรือ `storage_path` แต่เครื่องมีไฟล์จริงใน `IndexedDB` ต้องทำการ `backfillDocumentToSupabase` ขึ้น Cloud ทันทีอัตโนมัติ
- **การแสดงผลต้องเหมือนกันทุกเครื่อง**: ทั้งมุมมองผู้สมัคร (หน้าติดตามสถานะ `app/status/page.tsx`) และมุมมองแอดมินที่เปิดจากเครื่องใดก็ตาม ต้องเห็นเอกสารแนบจริง (ป้าย "ไฟล์จริง") และดาวน์โหลด/เปิดดูได้สมบูรณ์ ไม่หลุดไปเป็น "เอกสารตัวอย่าง" หรือจอขาว

## 2. การคงอยู่ของข้อมูลหลักสูตรและการตั้งค่า (Course Details Persistence)
- **ห้าม Reset ข้อมูลหลักสูตรที่แอดมินแก้ไขแล้ว**: ข้อมูลที่แอดมินแก้ไขในหน้า "แก้ไขรายละเอียดหลักสูตร" ประกอบด้วย:
  1. เป้าหมายเชิงสัดส่วน 5 กลุ่มเป้าหมาย (คน)
  2. วัตถุประสงค์ของหลักสูตร
  3. คุณสมบัติของผู้สมัคร (ขึ้นบรรทัดใหม่แยกข้อ)
  4. กำหนดเอกสารแนบในหน้าสมัครเรียน
  5. เอกสารและหลักฐานประกอบการสมัคร (ขึ้นบรรทัดใหม่แยกรายการ)
  6. เกณฑ์การสำเร็จการอบรม (ขึ้นบรรทัดใหม่แยกข้อ)
  7. สิ่งที่ กกท. สนับสนุน & เงื่อนไขค่าใช้จ่าย
  8. เงื่อนไขค่าใช้จ่ายนอกเหนือการสนับสนุน / การเบิกต้นสังกัด
- **Single Source of Truth ใน Supabase**: ข้อมูลเหล่านี้ต้องจัดเก็บและอ่านจากฐานข้อมูล Supabase เป็นหลัก ห้ามใช้ค่าเริ่มต้น Hardcode มาทับข้อมูลจริงที่แก้ไขแล้วเมื่อมีการ deploy, รีเฟรชหน้าเว็บ หรือเปิดจากเครื่องอื่น

## 3. ชื่อหน่วยงานและอัตลักษณ์องค์กร (Official Branding)
- ต้องใช้ชื่อหน่วยงานที่ถูกต้องอย่างเป็นทางการเสมอ:
  **"กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย"**
- ห้ามใช้ชื่อเดิม "สถาบันพัฒนากีฬาแห่งประเทศไทย" เด็ดขาด ในทุกหน้าจอ เอกสาร PDF ใบรับสมัคร และ Dialog

## 4. มาตรฐานการพัฒนาและการตรวจสอบคุณภาพ (Rigorous Verification & Quality Control)
- **"ทุกครั้งที่มีการแก้ไขโปรแกรม ต้องตรวจสอบบั๊กให้รอบคอบ"**:
  - ต้องรัน `npx tsc --noEmit` เพื่อตรวจจับข้อผิดพลาดของ Type ทั้งหมดก่อน Commit
  - ตรวจสอบทั้ง 4 ด้านอย่างละเอียด:
    1. Bugs / Logic Errors
    2. Error Handling (จัดการกรณี Offline / Cloud Error / Fallback ที่เหมาะสม)
    3. Performance & Security (ป้องกัน Memory Leak, การยกเลิกดาวน์โหลดไฟล์ใหญ่ใน useEffect, RLS policies)
    4. Client-Server Data Integrity (การรับส่งข้อมูลระหว่างหน้าเว็บกับ Supabase ต้องครบถ้วน ไม่ตกหล่น)
- **การ Deploy**: เมื่อแก้ไขและผ่านการทดสอบแล้ว ต้อง Commit และ Push ขึ้นรีโมต (`main`) ทันที พร้อมอธิบายรายละเอียดและสาเหตุให้ผู้ใช้งานทราบอย่างชัดเจน

## 5. การส่งอีเมลแจ้งเตือนอัตโนมัติ (Automated Email Dispatch Invariants)
- **ห้ามเรียก fetch ส่งอีเมลแบบ Fire-and-forget ก่อนการเปลี่ยนหน้า (router.push)**:
  - ในเบราว์เซอร์ การนำทางเปลี่ยนหน้าจะตัดการเชื่อมต่อคำสั่ง `fetch` ที่ยังส่งไม่เสร็จทันที (Request Aborted)
  - ต้องใช้ `await` และกำหนด `keepalive: true` ในการเรียก `/api/send-email` พร้อมใช้ `Promise.race` ร่วมกับ Timeout เพื่อให้มั่นใจว่าสัญญาณส่งออกจากเบราว์เซอร์สำเร็จแน่นอนก่อนเปลี่ยนหน้า
- **ลำดับความสำคัญของ Email Provider**:
  - ตรวจสอบและส่งผ่าน **Gmail SMTP (`hrd2565t@gmail.com`)** เป็นลำดับแรก เพื่อหลีกเลี่ยงข้อจำกัด Domain Verification (HTTP 403) ของ Resend
  - จัดเตรียมปุ่ม "กดส่งอีเมลอีกครั้ง" (Resend Email) บนหน้าใบเสร็จรับเงินเสมอ

## 6. การคำนวณและแปลงหน่วยขนาดไฟล์ (File Size Calculation & Dynamic Formatting)
- **ห้ามรวมขนาดไฟล์ด้วยการดึงตัวเลขสตริงแล้วต่อท้ายด้วย "MB" โดยไม่ตรวจสอบหน่วย**:
  - เอกสารแนบของผู้สมัครอาจมีหน่วยเป็น Bytes, KB หรือ MB การใช้ `parseFloat` บวกกันตรงๆ จะทำให้หน่วยผิดพลาดอย่างร้ายแรง (เช่น 247 KB กลายเป็น 247 MB)
  - ต้องแปลงทุกไฟล์เป็นหน่วย Bytes มาตรฐานก่อนคำนวณผลรวม
  - การแสดงผลต้องใช้ Dynamic Unit เสมอ: หากขนาดน้อยกว่า 1 MB ให้แสดงหน่วยเป็น `KB` (เช่น `247 KB`) หากตั้งแต่ 1 MB ขึ้นไปจึงแสดงเป็น `MB` (เช่น `2.4 MB`)

## 7. ความชัดเจนของ UI เอกสารทางการและการตรวจสอบคุณสมบัติ (Action Clarity & Document Checklist)
- **หน้าติดตามสถานะเมื่อผ่านการคัดเลือก (Approved Status)**:
  - ให้แสดงปุ่มสีเขียวเด่นชัดเพียงปุ่มเดียวสำหรับ **"พิมพ์ใบรับการสมัคร (A4)"** เพื่อหลีกเลี่ยงความสับสนของผู้สมัคร (Decision Paralysis)
- **การตรวจสอบเอกสารของผู้สมัครในมุมมองแอดมิน**:
  - ต้องตรวจสอบผ่านเอนจิน `auditApplicantDocuments` เพื่อเทียบเอกสารที่แนบจริงกับข้อกำหนดของหลักสูตร (`Course.documentConfig`) เสมอ เพื่อแสดงสถานะว่าครบถ้วนหรือขาดเอกสารบังคับรายการใด พร้อมระบบ Auto-fill เหตุผลเมื่อขอเอกสารเพิ่ม

