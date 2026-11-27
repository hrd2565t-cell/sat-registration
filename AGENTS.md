<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# กฎเหล็กและข้อกำหนดสำคัญของระบบรับสมัคร (SAT Registration System Rules)

## 1. การจัดการไฟล์แนบและการซิงค์ข้อมูลข้ามเครื่อง (Multi-Device File Sync & Safe Replace)
- **Supabase Storage (`sat-documents`) คือ Single Source of Truth สำหรับไฟล์แนบจริง**: ทุกไฟล์ที่ผู้สมัครอัปโหลดต้องขึ้น `sat-documents` และบันทึก `storage_path` หรือ `data_url` ใน `application_documents`
- **ห้ามพึ่งพาเฉพาะ IndexedDB / LocalStorage**: `IndexedDB` เป็นเพียง Cache ประจำเครื่อง และ `persist()` ตัด `dataUrl` ออกจาก `localStorage` ดังนั้น `syncApplicationToSupabase` ต้องดึงไฟล์จาก `getDocumentFromStorage` ขึ้น Cloud เสมอ และหากพบไฟล์ใน Cloud ยังไม่มีเนื้อไฟล์ให้ทำ `backfillDocumentToSupabase` อัตโนมัติเพื่อให้ทุกเครื่องเห็น "ไฟล์จริง" เหมือนกัน
- **Safe Replace & Latest-Wins**: การคัดเลือกไฟล์จาก Cloud ต้องใช้ `selectLatestDocumentsByKind` (แถวมีไฟล์จริงทุกขนาดคะแนนเท่ากัน ยึดฉบับล่าสุดเสมอ) และเมื่อผู้สมัครส่งเอกสารแก้ไขซ้ำต้องใช้ `forceUploadKinds` อัปโหลดไฟล์ใหม่ให้สำเร็จก่อนแล้วจึงลบแถว/ไฟล์เก่าเฉพาะ `kind` นั้นผ่าน `/api/applications/replace-documents`
- **Compression & Zero-Egress Queries**: ภาพที่อัปโหลดต้องผ่าน `compressImageFile` (`photo` / `document`, คง PDF ต้นฉบับ); เมื่อขึ้น `sat-documents` สำเร็จแล้วให้ตั้ง `data_url = null` ใน Postgres และห้าม `.select("*")` ดึง `data_url` ยกตารางใน `fetchApplicationsFromSupabase()` (ใช้ Metadata + `storage_path` คู่ `legacyInlineIds` Fallback)
- **Shared File Reuse & Reference-Safe Delete**: ใช้รูปถ่าย (`photo`) และสำเนาบัตรฯ (`idcard`) เดิมข้ามหลักสูตรด้วยการอ้างอิง `storage_path` เดิมโดยไม่อัปโหลดซ้ำ และทุกการลบไฟล์ใน `sat-documents` (ลบใบสมัคร, แทนที่เอกสาร, ล้างคลังหลักสูตร `/api/admin/archive-course` หลังสำรอง ZIP ขึ้น Google Drive) ต้องผ่าน `removeUnreferencedStorageObjects` (Fail-Closed) เสมอ
- **Archive-Aware Sync**: ใช้ `isArchivedDocument(doc)` ข้าม `backfillDocumentToSupabase` และคงสถานะ `"เก็บถาวรแล้ว"` เมื่อผสานข้อมูล Cloud (ห้ามให้ `localStorage` แคชกลับมาเขียนทับหรืออัปโหลดไฟล์ที่สำรองลง Google Drive แล้ว)

## 2. การคงอยู่ของข้อมูลหลักสูตรและการตั้งค่า (Course Details Persistence)
- **ห้าม Reset ข้อมูลหลักสูตรที่แอดมินแก้ไขแล้ว** ทั้ง 8 ส่วน (เป้าหมาย 5 กลุ่ม, วัตถุประสงค์, คุณสมบัติ, กำหนดเอกสารแนบ, เอกสารประกอบการสมัคร, เกณฑ์สำเร็จการอบรม, สิ่งที่ กกท. สนับสนุน และเงื่อนไขค่าใช้จ่าย/เบิกต้นสังกัด)
- ใช้ฐานข้อมูล Supabase เป็น Single Source of Truth ห้ามใช้ค่าเริ่มต้น Hardcode มาทับเมื่อ deploy, รีเฟรช หรือเปิดข้ามเครื่อง

## 3. ชื่อหน่วยงานและอัตลักษณ์องค์กร (Official Branding)
- ใช้ชื่อทางการเสมอ: **"กองพัฒนาบุคลากรกีฬา ฝ่ายพัฒนากีฬาเป็นเลิศ การกีฬาแห่งประเทศไทย"**
- ห้ามใช้คำว่า "สถาบันพัฒนากีฬาแห่งประเทศไทย" ในทุกหน้าจอ, PDF และ Dialog

## 4. มาตรฐานการพัฒนาและการตรวจสอบคุณภาพ (Verification & Quality Control)
- ก่อน Commit ต้องรัน `node .agents/skills/sat-verify-and-deploy/scripts/check-hooks.cjs`, `npx eslint --max-warnings=0` (เฉพาะไฟล์ที่แก้/สร้าง), `npx tsc --noEmit`, `npm run build` และรัน Node assertion สำหรับลอจิกที่แก้ พร้อมตรวจครบ 4 ด้าน: (1) Bugs/Logic Errors (2) Error Handling/Offline Fallback (3) Performance & Security (4) Client-Server Data Integrity
- **React 19 ESLint Compliance**: ห้ามเรียก `setState` แบบ Synchronous ใน `useEffect` (ใช้ `key` remount หรือคำนวณค่าแทน) และประกาศ `useState` ก่อน `useEffect` ที่อ้างถึง setter เสมอ
- ตรวจ `git status --short` แล้ว `git add` เฉพาะไฟล์โค้ดที่แก้ (ห้าม `git add .` จนติดไฟล์อ้างอิงเช่น `.xlsx`), Push ขึ้น `main` และสรุปรายละเอียดให้ผู้ใช้ชัดเจน

## 5. การส่งอีเมลแจ้งเตือนอัตโนมัติและการแจ้งเตือนบนใบเสร็จ
- ห้ามยิง `/api/send-email` แบบ Fire-and-forget ก่อน `router.push`: ต้องใช้ `await` + `keepalive: true` คู่ `Promise.race` Timeout เสมอ
- ส่งผ่าน **Gmail SMTP (`hrd2565t@gmail.com`)** ก่อน Resend และต้องมีปุ่ม "กดส่งอีเมลอีกครั้ง" บนหน้าใบเสร็จ
- หน้า `/register/receipt` ต้องมี **Popup แจ้งเตือน 1 ครั้ง** (`&submitted=1` + `sessionStorage` ต่อ `ref` ใน `useEffect`) และ **กล่องแจ้งเตือนถาวร** แจ้งรออีเมล 1–2 นาที พร้อมให้ตรวจในกล่องจดหมายขยะ (Spam/Junk)

## 6. การคำนวณและแปลงหน่วยขนาดไฟล์
- แปลงขนาดไฟล์ทุกชนิดเป็น Bytes ก่อนคำนวณผลรวม (ห้ามดึงตัวเลขสตริงแล้วต่อท้าย `"MB"` โดยไม่ดูหน่วย) และแสดงผล Dynamic Unit (`< 1 MB` ใช้ `KB`, `>= 1 MB` ใช้ `MB`)

## 7. เอกสารทางการ, ตรวจคุณสมบัติ และการขอเอกสารเพิ่มเฉพาะรายการ
- หน้า `/status` สถานะผ่านการคัดเลือก (`approved`) ให้แสดงปุ่มสีเขียวเด่นเพียงปุ่มเดียวคือ **"พิมพ์ใบรับการสมัคร (A4)"**
- แอดมินต้องตรวจเอกสารผ่าน `auditApplicantDocuments` (Auto-tick/Auto-fill เหตุผลจากรายการที่ขาด) และซิงก์ `requestedDocKinds` แบบ Dual-Layer (`applications.ai` + `courses._reviews`) เพื่อให้ `ResubmitDocumentsBox` ใช้ `resolveRequestedDocumentKinds` แสดงเฉพาะช่องเอกสารที่เจ้าหน้าที่ขอเพิ่ม

## 8. มาตรฐาน Cloud-First, Atomic Registration และ Anti-Overwrite Guard
- **Cloud-First**: ทุกฟีเจอร์/Store ใหม่ต้องซิงก์ Supabase ตั้งแต่วันแรก (ห้ามเก็บเฉพาะ LocalStorage/JSON), ดึงล่าสุดเมื่อเปิดหน้าและ `focus`/`visibilitychange`, เปิด `postgres_changes` Realtime และใช้ `hasLoadedFromCloud` Guard
- **Anti-Overwrite**: แยก `saveToLocalStorage()` ออกจาก `persist(syncToServer)` ให้การคำนวณอัตโนมัติใช้เฉพาะ Local และบันทึกสถานะหลักสูตรประวัติศาสตร์ `"completed"` ใน `_metadata.status` คู่กับคอลัมน์ `status: "closed"`
- **Granular Sync & Atomic Registration**: การบันทึกหลักสูตรใช้ Granular Cloud Sync พร้อม edit lock รายหลักสูตรและรีเซ็ต `useRef` lock (`finally` + open/close Dialog); การสมัครใหม่ต้องออกเลข `SAT-XXXXX` ผ่าน `POST /api/applications/register` (ส่งเฉพาะ metadata < 4.5 MB, retry `23505`) และ `await syncApplicationDocumentsToSupabase` ก่อนส่งอีเมลและเปลี่ยนหน้า
- **F5 Safe Hooks & Cloud Loading Guard**: ห้ามเรียก React Hooks (`use*`) หลัง `if (...) return` หรือในเงื่อนไข/ลูปเด็ดขาด; หน้าแสดงรายละเอียด/ใบเสร็จ/พิมพ์เอกสารจาก Cloud Store ต้องเช็ก `!mounted || !cloudLoaded` (`useApplicationsCloudLoaded` หรือ `hasLoadedFromCloud`) แสดงสถานะรอโหลดก่อนขึ้นข้อความ "ไม่พบข้อมูล"
- **Store Snapshot Stability**: ติดตาม `hasLoadedFromCloud` ในตัวแปรระดับโมดูลแบบ Primitive แยกจาก Snapshot หลัก (ไม่ `persist` ลง `localStorage` และไม่คืน Reference ใหม่ทุกเรนเดอร์ใน `useSyncExternalStore`)

## 9. การแยกหลักสูตรปัจจุบันกับประวัติย้อนหลังและการซิงก์จังหวัด
- กรอง `!c.isHistorical` เสมอในหน้าเปิดรับสมัคร, Timeline, `GlobalScheduleCard`, `/admin/courses`, กราฟ และตารางผู้สมัคร
- ยึดปีงบประมาณ พ.ศ. ไทย (ต.ค.–ก.ย.), อ่านชื่อหลักสูตรล่าสุดแบบ Live จาก `useCourses()`, และเรียก `detectProvinceFromLocation()` เมื่อแก้ไข `location`

## 10. ความปลอดภัยฝั่ง Server, PDPA คำร้อง และการป้องกันการส่งซ้ำ
- **ห้ามเปิดเผยความลับ/PIN ในฝั่ง Client**: ห้ามมี PIN Hardcoded หรือ `NEXT_PUBLIC_ADMIN_PIN` ใน Client; ตรวจผ่าน `ADMIN_PIN`/`ADMIN_AUTH_SECRET`, `isPinMatch` (`timingSafeEqual`), ล็อก brute-force ต่อ IP (`429`) และคุกกี้ `HttpOnly` (`HMAC-SHA256`) รวมถึงห้าม `export` helper function จากไฟล์ `app/api/**/route.ts`
- **API Guard & Click Lock**: ทุกฟอร์มบันทึก/ส่งข้อมูลใช้ `useRef` ล็อกบรรทัดแรก, `/api/send-email` ต้องตรวจสิทธิ์แอดมิน (เมื่อมี `statusUpdate`) หรือ `(ref, email)` จาก DB ก่อนตรวจ Cooldown 60 วินาที (`429`)
- **PDPA คำร้องยืนยันตัวตน (`profileClaims`)**: ห้ามเก็บเลขบัตร 13 หลัก/รูปถ่ายคำร้องในตารางสาธารณะ `courses`; ให้เข้ารหัส `AES-256-GCM` ใน `sat-documents/_private/profile-claims.enc.json` (`lib/server-claims.ts`) ผ่าน Admin API `/api/claims` (และ `/api/claims/status` คืนเฉพาะ boolean) พร้อมล้างแคช non-admin ทันที

## 11. กฎกลุ่มเป้าหมายรายหลักสูตร, Autocomplete และแบบ ส.ฬ. 8
- คัดกรอง/ล็อกตัวเลือกข้อ 3 ใน `/register` จาก `targetQuotas > 0` (`getAllowedTargetGroupsForCourse`), ป้องกัน Auto-fill ข้ามกลุ่มด้วย `isAffiliationAllowedForCourse`, และเมื่อผู้สมัครสลับข้อ 3 ให้ล้างช่อง 3.1 (`subAffiliation`) ทันที
- **PDPA Cross-Course Autofill**: `/register` ให้กรอกเลขบัตร 13 หลักเป็นข้อ 1 ก่อนชื่อ; เมื่อพบประวัติเดิม (รองรับทั้งรูปแบบติดกันและมีขีดคั่น) ต้องยืนยันเลขท้ายเบอร์โทร 4 หลักผ่าน `POST /api/applications/lookup-profile` (ล็อก brute-force 5/10 นาที) ก่อนเติมข้อมูลและเสนอเฉพาะ `photo`/`idcard` ที่ไม่ติด `requestedDocKinds`, และต้องล้าง `reusedFromRef` + รีเซ็ตสถานะโหลดทันทีเมื่อเปลี่ยน/ลบเลขบัตร
- ช่อง 3.1 สำหรับ `สมาคมกีฬาแห่งประเทศไทย` / `สมาคมกีฬาแห่งจังหวัด` ใช้ `AssociationAutocompleteInput` (93 สมาคมฯ / 77 จังหวัด) โดยยังพิมพ์เองได้
- แบบ ส.ฬ. 8 (`saka`, `onlyTargetGroups`) ใช้เฉพาะหลักสูตรที่ 1 (`isExecutiveManagementCourse`) เฉพาะกลุ่ม `สมาคมกีฬาแห่งประเทศไทย` และ `สมาคมกีฬาแห่งจังหวัด` ตรวจตรงกันผ่าน `isDocumentApplicableForAffiliation` ทุกหน้า

## 12. มาตรฐานชื่อสมาคม, รายงานผู้บริหาร และ PDPA หน้าสาธารณะ
- คงชื่อ `"สมาคมเพาะกาย กกท."` และ `"สมาคมกีฬาคนพิการจังหวัด..."` ตามจริง ห้าม normalize เข้าฐาน 93 สมาคมกีฬาแห่งประเทศไทย / 77 สมาคมกีฬาแห่งจังหวัด
- รายงาน `/alumni` ต้องรองรับภาพรวมและรายปี/YoY จาก Cloud Store (`annual-outcomes-store.ts`) ห้ามสร้างตัวเลขสมมติ และห้ามแสดงเลขบัตร 13 หลักเต็มหรือ PII บนหน้า/เอกสารพิมพ์สาธารณะ

## 13. ผังขั้นตอนการดำเนินงานแยกส่วน (Isolated Admin Workflow & Private Attachments)
- **Zero-Impact Separation**: โมดูล `/admin/workflow` (`app/admin/workflow/*`, `components/admin/workflow/*`, `lib/workflow*.ts`, `app/api/admin/workflow/*`) ต้อง **Read-only** ต่อตารางหลัก (`courses`, `applications`, `alumni`) ห้ามเขียนทับข้อมูลหลักสูตร/ผู้สมัคร และทุกการเพิ่มฟีเจอร์ใหม่ (เช่น `attachments`, `connections`) ต้องเป็นฟิลด์ Optional แบบ Backward-Compatible 100% เพื่อไม่ให้ข้อมูลปีงบประมาณที่แอดมินกรอกไว้หาย
- **Private Encrypted Storage & File Cleanup**: เก็บผังงานเข้ารหัส `AES-256-GCM` ที่ `sat-documents/_private/operational-workflow.enc.json` และไฟล์แนบส่วนตัวที่ `_private/workflow-files/` (≤ 4 MB, รูปภาพผ่าน `compressImageFile(..., "document")`, เปิดดูผ่าน Admin API เท่านั้น) พร้อมรองรับลิงก์ Google Drive (0 KB), กรองด้วย `isSafeWorkflowStoragePath` / `isSafeWorkflowAttachmentUrl` และลบไฟล์ตกค้างทันทีเมื่อยกเลิก/ลบ/รีเซ็ต
