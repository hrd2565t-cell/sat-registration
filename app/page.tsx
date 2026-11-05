"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { useAlumniStore, searchTrainees, type TraineeSearchResult } from "@/lib/alumni-store";
import { useCourses } from "@/lib/courses-store";
import {
  loadSurveyTopics,
  saveSurveyTopics,
  type SurveySkillTopic,
  FUTURE_PILLARS,
} from "@/lib/future-curriculum-store";
import { PersonnelPassportModal } from "@/components/alumni/personnel-passport-modal";
import { DigitalPassModal } from "@/components/alumni/digital-pass-modal";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { trainees } = useAlumniStore();
  const { courses } = useCourses();

  // Trainee search state right on landing
  const [quickQuery, setQuickQuery] = useState("");
  const [quickError, setQuickError] = useState("");
  const [searchResults, setSearchResults] = useState<TraineeSearchResult[] | null>(null);
  const [passportIdCard, setPassportIdCard] = useState<string | null>(null);
  const [digitalPassIdCard, setDigitalPassIdCard] = useState<string | null>(null);

  // Survey topics & interactive live voting state
  const [surveyTopics, setSurveyTopics] = useState<SurveySkillTopic[]>([]);
  const [userVotedIds, setUserVotedIds] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadSurveyTopics();
    setSurveyTopics(loaded);
    try {
      const stored = localStorage.getItem("sat_user_voted_topic_ids");
      if (stored) setUserVotedIds(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Compute live stats
  const activeCoursesCount = useMemo(() => {
    return courses.filter((c) => c.status === "open").length;
  }, [courses]);

  const distinctTraineesCount = useMemo(() => {
    const set = new Set<string>();
    trainees.forEach((t) => {
      if (t.idCard) set.add(t.idCard.trim());
      else if (t.name) set.add(t.name.trim());
    });
    return set.size;
  }, [trainees]);

  // Top voted topic for live spotlight widget
  const topVotedTopic = useMemo(() => {
    if (surveyTopics.length === 0) return null;
    return [...surveyTopics].sort((a, b) => b.votes - a.votes)[0];
  }, [surveyTopics]);

  // Handle Quick Search
  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickQuery.trim();
    if (!q) {
      setQuickError("กรุณากรอกชื่อ-นามสกุล หรือเลขประจำตัวประชาชน");
      setSearchResults(null);
      return;
    }

    const matches = searchTrainees(q, trainees);
    if (matches.length === 0) {
      setQuickError(`ไม่พบข้อมูลบุคลากรที่ตรงกับ "${q}" (โปรดตรวจสอบการสะกดชื่อ หรือค้นหาด้วยเลขประจำตัวประชาชน)`);
      setSearchResults(null);
      return;
    }

    setQuickError("");
    if (matches.length === 1) {
      setPassportIdCard(matches[0].idCard || matches[0].uniqueKey);
      setSearchResults(null);
    } else {
      setSearchResults(matches);
    }
  };

  // Handle Quick Vote on Homepage
  const handleLiveVote = (topicId: string, title: string) => {
    const isVoted = Boolean(userVotedIds[topicId]);
    const delta = isVoted ? -1 : 1;

    const updated = surveyTopics.map((t) =>
      t.id === topicId ? { ...t, votes: Math.max(0, t.votes + delta) } : t
    );

    const newMap = { ...userVotedIds, [topicId]: !isVoted };
    setSurveyTopics(updated);
    setUserVotedIds(newMap);
    saveSurveyTopics(updated);
    try {
      localStorage.setItem("sat_user_voted_topic_ids", JSON.stringify(newMap));
    } catch {
      // ignore
    }

    setToastMessage(isVoted ? `ยกเลิกการโหวต` : `🎉 ร่วมโหวตให้ "${title.slice(0, 24)}..." แล้ว`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 flex flex-col justify-between">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#16265E] text-white px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-blue-400 animate-in fade-in slide-in-from-top-4">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        rightSlot={
          <div className="flex items-center gap-2">
            <Link
              href="/verify"
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5"
              title="เปิดกล้องสแกน QR Code ตรวจสอบคุณวุฒิและบัตรบุคลากรหน้างาน"
            >
              <span>📷</span>
              <span className="hidden sm:inline">สแกนหน้างาน</span>
            </Link>
            <Link
              href="/status"
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ตรวจสอบสถานะ
            </Link>
            <Link
              href="/admin"
              className="rounded-lg bg-[#16265E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3a8a] transition-colors"
            >
              Admin
            </Link>
          </div>
        }
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* ================= HERO PORTAL BANNER ================= */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#16265E] to-[#1e3a8a] text-white p-6 sm:p-10 shadow-xl overflow-hidden border border-blue-900/30">
          {/* Subtle Ambient Glows */}
          <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl pointer-events-none"></div>
          <div className="absolute right-1/3 -bottom-24 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-400/20 border border-amber-300/30 px-3.5 py-1 text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-2xs">
                  <span>🏛️</span>
                  <span>การกีฬาแห่งประเทศไทย (กกท.) · ฝ่ายพัฒนาบุคลากรกีฬา</span>
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-200 backdrop-blur-xs">
                  National Sports Personnel Gateway
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                ศูนย์รวมบริการพัฒนาบุคลากรกีฬาแห่งชาติ
              </h1>

              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-2xl">
                แพลตฟอร์มดิจิทัลครบวงจรสำหรับการสมัครเข้ารับการอบรมบุคลากรกีฬา ตรวจสอบวุฒิบัตรและพาสปอร์ตการปฏิบัติหน้าที่
                ตลอดจนร่วมกำหนดทิศทางหลักสูตรยุคใหม่เพื่อการพัฒนาทรัพยากรมนุษย์วงการกีฬาไทยอย่างยั่งยืน
              </p>
            </div>

            {/* Quick Impact Stats Pill Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
              <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-xs">
                <p className="text-[11px] text-blue-200">ประวัติการอบรมในระบบ</p>
                <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {trainees.length.toLocaleString()} <span className="text-xs font-normal text-blue-300">คน-ครั้ง</span>
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-xs">
                <p className="text-[11px] text-blue-200">บุคลากรเดี่ยวแท้จริง</p>
                <p className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
                  {distinctTraineesCount.toLocaleString()} <span className="text-xs font-normal text-amber-200">คน</span>
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-xs">
                <p className="text-[11px] text-blue-200">หลักสูตรมาตรฐาน กกท.</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
                  17 <span className="text-xs font-normal text-emerald-200">หลักสูตร</span>
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-xs">
                <p className="text-[11px] text-blue-200">เปิดรับสมัครขณะนี้</p>
                <p className="text-xl sm:text-2xl font-black text-cyan-300 mt-0.5">
                  {activeCoursesCount} <span className="text-xs font-normal text-cyan-200">หลักสูตร</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= BENTO GRID CONTAINER ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. SERVICE CARD: สมัครอบรมหลักสูตรบุคลากรกีฬา (Courses) */}
          <Link
            href="/courses"
            className="group relative rounded-3xl bg-white border border-gray-200 p-6 shadow-xs hover:shadow-xl hover:border-blue-400 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-900 text-2xl border border-blue-200 shadow-2xs group-hover:scale-105 transition-transform">
                  📝
                </span>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>เปิดรับสมัคร {activeCoursesCount} หลักสูตร</span>
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-gray-900 group-hover:text-[#16265E] transition-colors">
                  หลักสูตรที่เปิดรับสมัคร
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">Course Catalog & Online Registration</p>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                เลือกสมัครหลักสูตรพัฒนาผู้บริหารกีฬา ผู้ฝึกสอน ผู้ตัดสิน และบุคลากรสนับสนุน พร้อมระบบตรวจสอบคุณสมบัติและออกใบตอบรับทันที
              </p>

              {/* Course highlights preview chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {courses.slice(0, 3).map((c) => (
                  <span
                    key={c.id}
                    className="rounded-lg bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700 truncate max-w-[130px]"
                    title={c.title}
                  >
                    {c.shortTitle || c.title}
                  </span>
                ))}
                {courses.length > 3 && (
                  <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 font-medium">
                    +{courses.length - 3} เพิ่มเติม
                  </span>
                )}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#16265E] group-hover:translate-x-1 transition-transform">
              <span>เข้าสู่หน้ารายการหลักสูตรและสมัครอบรม</span>
              <span className="text-base">→</span>
            </div>
          </Link>

          {/* 2. SERVICE CARD: ทำเนียบบุคลากร & พาสปอร์ตดิจิทัล (Alumni) */}
          <Link
            href="/alumni"
            className="group relative rounded-3xl bg-white border border-gray-200 p-6 shadow-xs hover:shadow-xl hover:border-purple-400 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-900 text-2xl border border-purple-200 shadow-2xs group-hover:scale-105 transition-transform">
                  🏅
                </span>
                <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-900">
                  {distinctTraineesCount.toLocaleString()} บุคลากรรับรอง
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-gray-900 group-hover:text-purple-950 transition-colors">
                  ทำเนียบบุคลากรกีฬา & พาสปอร์ต
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">Alumni Roster, Digital Pass & Evaluation</p>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                สืบค้นประวัติวุฒิบัตรย้อนหลัง 23 ปี (พ.ศ. 2547–2569) ตรวจสอบบันทึกการปฏิบัติหน้าที่ (Duty Tracking) และออกบัตรดิจิทัลบุคลากรกีฬา
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-semibold text-purple-800">
                <span className="rounded-lg bg-purple-50 px-2 py-0.5 border border-purple-100">
                  🪪 พาสปอร์ตคุณวุฒิ
                </span>
                <span className="rounded-lg bg-purple-50 px-2 py-0.5 border border-purple-100">
                  📱 บัตรดิจิทัล
                </span>
                <span className="rounded-lg bg-purple-50 px-2 py-0.5 border border-purple-100">
                  📊 แดชบอร์ดประเมินผล
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-900 group-hover:translate-x-1 transition-transform">
              <span>เข้าสู่ทำเนียบและระบบตรวจสอบคุณวุฒิ</span>
              <span className="text-base">→</span>
            </div>
          </Link>

          {/* 3. SERVICE CARD: โหวต & เสนอหลักสูตรอนาคต (Survey) */}
          <Link
            href="/survey"
            className="group relative rounded-3xl bg-white border border-gray-200 p-6 shadow-xs hover:shadow-xl hover:border-amber-400 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-900 text-2xl border border-amber-200 shadow-2xs group-hover:scale-105 transition-transform">
                  🗳️
                </span>
                <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                  พ.ศ. 2570–2572
                </span>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-gray-900 group-hover:text-amber-950 transition-colors">
                  โหวต & เสนอหลักสูตรอนาคต
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">Future Skills Survey & Voice Poll</p>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                ร่วมกำหนดทักษะที่อยากเรียนรู้ (AI, สปอนเซอร์ 4.0, Safe Sport, การจัดแข่งขัน, รากหญ้า) เสียงของคุณคือหลักฐานเพื่อเสนอของบประมาณเปิดสอนจริง
              </p>

              {/* 5 Pillars icon tags */}
              <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-semibold text-amber-900">
                <span className="rounded-lg bg-amber-50 px-2 py-0.5 border border-amber-200">
                  🤖 AI & Tech
                </span>
                <span className="rounded-lg bg-amber-50 px-2 py-0.5 border border-amber-200">
                  💼 สปอนเซอร์ 4.0
                </span>
                <span className="rounded-lg bg-amber-50 px-2 py-0.5 border border-amber-200">
                  ⚖️ Safe Sport
                </span>
                <span className="rounded-lg bg-amber-50 px-2 py-0.5 border border-amber-200">
                  🏟️ Event Ops
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-amber-900 group-hover:translate-x-1 transition-transform">
              <span>ร่วมโหวตและเสนอความต้องการของคุณ</span>
              <span className="text-base">→</span>
            </div>
          </Link>

          {/* 4. INTERACTIVE WIDGET: Quick Trainee Search (Spans 2 columns on lg) */}
          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-xs lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-[#16265E]">
                  สืบค้นด่วนหน้างาน
                </span>
                <h4 className="text-base font-extrabold text-gray-900 mt-1 flex items-center gap-2">
                  <span>🔍</span>
                  <span>ค้นหาพาสปอร์ตและวุฒิบัตรบุคลากร</span>
                </h4>
              </div>
              <p className="text-xs text-gray-400">ค้นหาได้ทั้งชื่อ-นามสกุล หรือเลขประจำตัวประชาชน</p>
            </div>

            <form onSubmit={handleQuickSearch} className="space-y-2">
              <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-1.5 border border-gray-300 focus-within:border-[#16265E] focus-within:ring-2 focus-within:ring-[#16265E]/15 transition-all">
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อ-นามสกุล หรือเลขประจำตัวประชาชน 13 หลัก..."
                  value={quickQuery}
                  onChange={(e) => {
                    setQuickQuery(e.target.value);
                    if (quickError) setQuickError("");
                  }}
                  className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-[#16265E] hover:bg-[#1e3a8a] text-white px-5 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
                >
                  ค้นหาพาสปอร์ต
                </button>
              </div>

              {quickError && (
                <p className="text-xs text-red-600 pl-1 font-medium">⚠️ {quickError}</p>
              )}
            </form>

            {/* Candidates Drawer if multiple matches */}
            {searchResults && searchResults.length > 1 && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-[#16265E]">
                  <span>พบข้อมูลบุคลากร {searchResults.length} ท่านที่ตรงกับคำค้นหา</span>
                  <button
                    type="button"
                    onClick={() => setSearchResults(null)}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    ✕ ปิด
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {searchResults.map((p) => (
                    <div
                      key={p.uniqueKey}
                      className="rounded-xl border border-gray-200 bg-white p-3 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{p.affiliation}</p>
                        <p className="text-[10px] text-gray-400">{p.records.length} หลักสูตร (ปี {p.latestYearBE})</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPassportIdCard(p.idCard || p.uniqueKey);
                          setSearchResults(null);
                        }}
                        className="shrink-0 rounded-lg bg-[#16265E] text-white px-3 py-1 text-xs font-bold hover:bg-[#1e3a8a] transition-colors"
                      >
                        🪪 พาสปอร์ต
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. INTERACTIVE WIDGET: Live Top Voted Topic Spotlight (1 col) */}
          <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black text-slate-950 uppercase tracking-wider">
                  🔥 โหวตสูงสุดอันดับ 1
                </span>
                <span className="text-xs font-bold text-amber-900">
                  {topVotedTopic ? `${topVotedTopic.votes} เสียง` : ""}
                </span>
              </div>

              {topVotedTopic ? (
                <>
                  <h4 className="text-sm font-extrabold text-gray-900 leading-snug line-clamp-2">
                    {topVotedTopic.title}
                  </h4>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {topVotedTopic.keyProblemsSolved}
                  </p>
                  <p className="text-[11px] text-amber-800 font-medium">
                    กลุ่มเป้าหมาย: {topVotedTopic.targetAudience}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400">กำลังโหลดหัวข้อยอดนิยม...</p>
              )}
            </div>

            <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between gap-2">
              {topVotedTopic && (
                <button
                  type="button"
                  onClick={() => handleLiveVote(topVotedTopic.id, topVotedTopic.title)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    userVotedIds[topVotedTopic.id]
                      ? "bg-emerald-600 text-white"
                      : "bg-[#16265E] hover:bg-[#1e3a8a] text-white"
                  }`}
                >
                  <span>{userVotedIds[topVotedTopic.id] ? "✓ โหวตแล้ว" : "👍 โหวต"}</span>
                  <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-bold">
                    {topVotedTopic.votes}
                  </span>
                </button>
              )}

              <Link
                href="/survey"
                className="text-xs font-bold text-amber-900 hover:text-amber-700 transition-colors flex items-center gap-1"
              >
                <span>ดูทุกหัวข้อ</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ================= FAST-TRACK UTILITY TOOLBAR ================= */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xl">
              ⚡
            </span>
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                บริการและเครื่องมือด่วน (Fast-Track Utilities)
              </h4>
              <p className="text-xs text-gray-500">
                เข้าถึงฟังก์ชันตรวจสอบสถานะ สแกนหน้างาน หรือเข้าสู่ระบบจัดการข้อมูล
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/verify"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              <span>📷</span>
              <span>สแกน QR หน้างาน</span>
            </Link>

            <Link
              href="/status"
              className="flex items-center gap-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors"
            >
              <span>📄</span>
              <span>ตรวจสอบสถานะการสมัคร</span>
            </Link>

            <Link
              href="/timeline"
              className="flex items-center gap-1.5 rounded-xl bg-purple-50 border border-purple-200 px-3.5 py-2 text-xs font-semibold text-purple-900 hover:bg-purple-100 transition-colors"
            >
              <span>📈</span>
              <span>Timeline 17 หลักสูตร</span>
            </Link>

            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-xl bg-[#16265E] hover:bg-[#1e3a8a] px-3.5 py-2 text-xs font-semibold text-white transition-colors"
            >
              <span>⚙️</span>
              <span>ระบบหลังบ้าน Admin</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Pop-up Modals for Quick Search */}
      {passportIdCard && (
        <PersonnelPassportModal
          idCard={passportIdCard}
          allTrainees={trainees}
          onClose={() => setPassportIdCard(null)}
          onAddDuty={() => {}}
          onOpenDigitalPass={(id) => {
            setPassportIdCard(null);
            setDigitalPassIdCard(id);
          }}
          isAdmin={false}
        />
      )}

      {digitalPassIdCard && (
        <DigitalPassModal
          idCard={digitalPassIdCard}
          allTrainees={trainees}
          onClose={() => setDigitalPassIdCard(null)}
        />
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <p className="font-semibold text-gray-700">
          การกีฬาแห่งประเทศไทย (กกท.) · ฝ่ายพัฒนาบุคลากรกีฬา
        </p>
        <p className="mt-1 text-[11px] text-gray-400">
          ศูนย์รวมบริการพัฒนาบุคลากรกีฬาแห่งชาติ (National Sports Personnel Gateway)
        </p>
      </footer>
    </div>
  );
}
