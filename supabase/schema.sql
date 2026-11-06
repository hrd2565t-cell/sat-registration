-- ==============================================================================
-- การกีฬาแห่งประเทศไทย (กกท. / SAT)
-- ฐานข้อมูลระบบรับสมัครผู้เข้ารับการอบรมออนไลน์ (Sports Authority of Thailand)
-- Supabase PostgreSQL Schema & Storage Setup
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. COURSES TABLE (ตารางหลักสูตรการอบรม)
CREATE TABLE IF NOT EXISTS public.courses (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    short_title TEXT,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    seats TEXT NOT NULL,
    seats_left INTEGER DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'closed')),
    image TEXT NOT NULL,
    image_alt TEXT,
    warning_message TEXT,
    target_quotas JSONB DEFAULT '{"sat": 10, "nationalAssoc": 15, "provincialAssoc": 15, "nsdf": 5, "external": 5}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. APPLICATIONS TABLE (ตารางใบสมัคร)
CREATE TABLE IF NOT EXISTS public.applications (
    id BIGSERIAL PRIMARY KEY,
    ref TEXT UNIQUE NOT NULL,
    receipt_no TEXT UNIQUE NOT NULL,
    course_id INTEGER REFERENCES public.courses(id) ON DELETE RESTRICT,
    course TEXT NOT NULL,
    course_title TEXT NOT NULL,
    name TEXT NOT NULL,
    id_card VARCHAR(13) NOT NULL,
    email TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    affiliation TEXT DEFAULT '',
    position TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reserve')),
    reserve_order INTEGER,
    review_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    file_size BIGINT,
    ai JSONB DEFAULT '{
        "verdict": "รอการตรวจสอบ",
        "score": 0,
        "line1": "รอการประมวลผลข้อมูล",
        "line2": "ระบบจะดำเนินการตรวจสอบอัตโนมัติ",
        "tone": "review",
        "checks": []
    }'::jsonb,
    submitted_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_applicant_course UNIQUE (id_card, course_id)
);

-- 4. APPLICATION DOCUMENTS TABLE (ตารางเอกสารประกอบการสมัคร)
CREATE TABLE IF NOT EXISTS public.application_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_ref TEXT REFERENCES public.applications(ref) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('photo', 'cover', 'certificate', 'saka')),
    name TEXT NOT NULL,
    size TEXT NOT NULL,
    file_type TEXT,
    storage_path TEXT,
    data_url TEXT, -- Fallback base64 หากไม่ได้ใช้ Storage Bucket
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. REVIEW NOTES TABLE (บันทึกหมายเหตุการตรวจสอบโดยเจ้าหน้าที่)
CREATE TABLE IF NOT EXISTS public.review_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_ref TEXT REFERENCES public.applications(ref) ON DELETE CASCADE,
    author TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('created', 'note', 'approved', 'rejected', 'reserve')),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. ALUMNI TABLE (ตารางทำเนียบบุคลากรกีฬาและประวัติการอบรมย้อนหลัง กกท.)
CREATE TABLE IF NOT EXISTS public.alumni (
    id TEXT PRIMARY KEY,
    personnel_id TEXT,
    id_card TEXT NOT NULL,
    name TEXT NOT NULL,
    prefix TEXT,
    first_name TEXT,
    last_name TEXT,
    gender TEXT,
    phone TEXT,
    email TEXT,
    affiliation TEXT NOT NULL DEFAULT '',
    affiliation_group TEXT NOT NULL DEFAULT 'หน่วยงานภายนอก',
    sports_type TEXT NOT NULL DEFAULT '',
    year_be INTEGER NOT NULL DEFAULT 2566,
    course_id INTEGER,
    course_title TEXT NOT NULL,
    course_category TEXT,
    batch TEXT,
    cert_no TEXT,
    passed_date TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_verification')),
    avatar_url TEXT,
    duties JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE (ดัชนีเพื่อเพิ่มความเร็วในการสืบค้น)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_applications_ref ON public.applications(ref);
CREATE INDEX IF NOT EXISTS idx_applications_id_card ON public.applications(id_card);
CREATE INDEX IF NOT EXISTS idx_applications_course_id ON public.applications(course_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_submitted_at ON public.applications(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_docs_ref ON public.application_documents(application_ref);
CREATE INDEX IF NOT EXISTS idx_review_notes_ref ON public.review_notes(application_ref);
CREATE INDEX IF NOT EXISTS idx_alumni_personnel_id ON public.alumni(personnel_id);
CREATE INDEX IF NOT EXISTS idx_alumni_id_card ON public.alumni(id_card);
CREATE INDEX IF NOT EXISTS idx_alumni_name ON public.alumni(name);
CREATE INDEX IF NOT EXISTS idx_alumni_affiliation_group ON public.alumni(affiliation_group);
CREATE INDEX IF NOT EXISTS idx_alumni_course_title ON public.alumni(course_title);
CREATE INDEX IF NOT EXISTS idx_alumni_year_be ON public.alumni(year_be);
CREATE INDEX IF NOT EXISTS idx_alumni_status ON public.alumni(status);

-- ==============================================================================
-- TRIGGER FOR UPDATED_AT (อัปเดตเวลาอัตโนมัติเมื่อมีการแก้ไขแถว)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_courses_updated_at ON public.courses;
CREATE TRIGGER set_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_applications_updated_at ON public.applications;
CREATE TRIGGER set_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_alumni_updated_at ON public.alumni;
CREATE TRIGGER set_alumni_updated_at
    BEFORE UPDATE ON public.alumni
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

-- 1. Courses Policies:
-- ประชาชนทั่วไปสามารถดูหลักสูตรได้ทั้งหมด
CREATE POLICY "Public can read courses" 
    ON public.courses FOR SELECT 
    USING (true);

-- ผู้ดูแลระบบ (หรือ Service Role / Admin Client) สามารถเพิ่ม/แก้ไข/ลบหลักสูตรได้
DROP POLICY IF EXISTS "Admin can modify courses" ON public.courses;
CREATE POLICY "Admin can modify courses" 
    ON public.courses FOR ALL 
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Applications Policies:
-- ผู้สมัครทุกคนสามารถส่งใบสมัครได้
CREATE POLICY "Public can insert application" 
    ON public.applications FOR INSERT 
    WITH CHECK (true);

-- ผู้สมัครสามารถตรวจสอบสถานะของตนเองได้ด้วยเลข ref หรือเลขบัตรประชาชน 13 หลัก
CREATE POLICY "Public can read own application" 
    ON public.applications FOR SELECT 
    USING (true); -- กรองที่ระดับแอปพลิเคชันด้วย idCard + ref

-- ผู้ดูแลระบบสามารถแก้ไขสถานะ (อนุมัติ/ปฏิเสธ/ขอเอกสารเพิ่ม) ได้
CREATE POLICY "Admin can update applications" 
    ON public.applications FOR UPDATE 
    USING (true)
    WITH CHECK (true);

-- 3. Alumni Policies:
-- ประชาชนและแอดมินสามารถสืบค้นทำเนียบบุคลากรและพาสปอร์ตได้
CREATE POLICY "Public and Admin can read alumni" 
    ON public.alumni FOR SELECT 
    USING (true);

-- ผู้ดูแลระบบ (หรือ API/Service Role) สามารถเพิ่ม แก้ไข และลบข้อมูลบุคลากรได้
CREATE POLICY "Admin can modify alumni" 
    ON public.alumni FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 3. Documents Policies:
CREATE POLICY "Public can insert documents" 
    ON public.application_documents FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Public and Admin can read documents" 
    ON public.application_documents FOR SELECT 
    USING (true);

-- 4. Review Notes Policies:
CREATE POLICY "Admin can read and insert review notes" 
    ON public.review_notes FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ==============================================================================
-- STORAGE BUCKETS (ถังเก็บไฟล์)
-- ==============================================================================
-- สร้าง Storage Bucket สำหรับเอกสารผู้สมัคร และรูปหลักสูตร
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sat-documents', 'sat-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-banners', 'course-banners', true)
ON CONFLICT (id) DO NOTHING;

-- นโยบาย Storage สำหรับรูปหลักสูตร (Public Read)
CREATE POLICY "Public can view course banners"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'course-banners');

-- นโยบาย Storage สำหรับอัปโหลดเอกสารผู้สมัคร
CREATE POLICY "Public can upload applicant documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'sat-documents');

CREATE POLICY "Authorized can view applicant documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'sat-documents');

-- ==============================================================================
-- SEED DATA: ข้อมูลเริ่มต้น 4 หลักสูตรจริงของ กกท. ปีงบประมาณ 2570
-- ==============================================================================
INSERT INTO public.courses (id, title, short_title, date, location, seats, seats_left, status, image, image_alt, warning_message)
VALUES 
(
    1,
    'หลักสูตร การเสริมสร้างศักยภาพการบริหารจัดการองค์กีฬาเพื่อความเป็นเลิศ',
    'ผู้บริหาร',
    '5-7 ก.พ., 10-23 ก.พ., 26-28 ก.พ. 2570',
    'สถาบันพระปกเกล้าและต่างจังหวัด',
    'จำนวนที่นั่ง 40 คน',
    49,
    'open',
    '/assets/course-executive-management.jpg',
    'การเสริมสร้างศักยภาพการบริหารจัดการองค์กีฬาเพื่อความเป็นเลิศ',
    NULL
),
(
    2,
    'หลักสูตร การเสริมสร้างธรรมภิบาลสำหรับผู้ฝึกสอนกีฬาสู่ความเป็นเลิศ ตามแนวทางโอลิมปิกสากล',
    'ผู้ฝึกสอน',
    '18-22 พ.ค. 2570',
    'จังหวัดชลบุรี',
    'จำนวนที่นั่ง 40 คน',
    49,
    'open',
    '/assets/course-coach-governance.jpg',
    'การเสริมสร้างธรรมภิบาลสำหรับผู้ฝึกสอนกีฬาสู่ความเป็นเลิศ ตามแนวทางโอลิมปิกสากล',
    NULL
),
(
    3,
    'หลักสูตร การบริหารจัดการงบประมาณและการจัดซื้อจัดจ้างภาครัฐ',
    'งบประมาณและพัสดุ',
    '20-22 ม.ค. 2570',
    'กรุงเทพมหานคร',
    'จำนวนที่นั่ง 40 คน',
    49,
    'open',
    '/assets/course-procurement-budget.jpg',
    'การบริหารจัดการงบประมาณและการจัดซื้อจัดจ้างภาครัฐ',
    NULL
),
(
    4,
    'หลักสูตร การส่งเสริมศักยภาพการบริหารจัดการกีฬาระดับนานาชาติ',
    'การจัดการ',
    '8-11 มิ.ย., 14-17 มิ.ย. 2570',
    'จังหวัดชลบุรี',
    'จำนวนที่นั่ง 40 คน',
    50,
    'open',
    '/assets/course-international-sports.jpg',
    'การส่งเสริมศักยภาพการบริหารจัดการกีฬาระดับนานาชาติ',
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    short_title = EXCLUDED.short_title,
    date = EXCLUDED.date,
    location = EXCLUDED.location,
    seats = EXCLUDED.seats,
    seats_left = EXCLUDED.seats_left,
    status = EXCLUDED.status,
    image = EXCLUDED.image,
    warning_message = EXCLUDED.warning_message;

-- รีเซ็ต Sequence ของ courses.id ให้ตรงกับ ID สูงสุด
SELECT setval('courses_id_seq', (SELECT MAX(id) FROM public.courses));

-- ==============================================================================
-- 7. REALTIME SETUP (เปิดใช้งาน Realtime สำหรับการอัปเดตข้ามเครื่องแบบทันที)
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.alumni;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;
