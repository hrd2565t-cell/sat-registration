-- ==============================================================================
-- การกีฬาแห่งประเทศไทย (กกท. / SAT)
-- สคริปต์สร้างตารางทำเนียบบุคลากรกีฬา (ALUMNI TABLE) บน Supabase
-- คัดลอกโค้ดทั้งหมดนี้ไปวางใน SQL Editor ของ Supabase แล้วกด "Run"
-- ==============================================================================

-- 1. สร้างตาราง alumni
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

-- 2. สร้างดัชนี (Indexes) เพื่อการสืบค้นที่รวดเร็ว
CREATE INDEX IF NOT EXISTS idx_alumni_personnel_id ON public.alumni(personnel_id);
CREATE INDEX IF NOT EXISTS idx_alumni_id_card ON public.alumni(id_card);
CREATE INDEX IF NOT EXISTS idx_alumni_name ON public.alumni(name);
CREATE INDEX IF NOT EXISTS idx_alumni_affiliation_group ON public.alumni(affiliation_group);
CREATE INDEX IF NOT EXISTS idx_alumni_course_title ON public.alumni(course_title);
CREATE INDEX IF NOT EXISTS idx_alumni_year_be ON public.alumni(year_be);
CREATE INDEX IF NOT EXISTS idx_alumni_status ON public.alumni(status);

-- 3. กำหนด Trigger สำหรับ updated_at
DROP TRIGGER IF EXISTS set_alumni_updated_at ON public.alumni;
CREATE TRIGGER set_alumni_updated_at
    BEFORE UPDATE ON public.alumni
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. กำหนดสิทธิ์ความปลอดภัย (Row Level Security - RLS)
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and Admin can read alumni" ON public.alumni;
CREATE POLICY "Public and Admin can read alumni" 
    ON public.alumni FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Admin can modify alumni" ON public.alumni;
CREATE POLICY "Admin can modify alumni" 
    ON public.alumni FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 5. เปิดใช้งาน Realtime เพื่อให้ทุกเครื่องอัปเดตตรงกันทันที
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.alumni;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;
