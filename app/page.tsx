"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { AppHeaderNav } from "@/components/layout/app-header-nav";
import { useAlumniStore, searchTrainees, type TraineeSearchResult } from "@/lib/alumni-store";
import { useCourses } from "@/lib/courses-store";
import { useIsAdmin } from "@/lib/admin-auth";
import { PersonnelPassportModal } from "@/components/alumni/personnel-passport-modal";
import { DigitalPassModal } from "@/components/alumni/digital-pass-modal";
import { TraineePortalModal } from "@/components/alumni/trainee-portal-modal";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const isAdmin = useIsAdmin();
  const { trainees } = useAlumniStore();
  const { courses } = useCourses();

  // Search state inside the Alumni card
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<TraineeSearchResult[] | null>(null);
  const [passportIdCard, setPassportIdCard] = useState<string | null>(null);
  const [digitalPassIdCard, setDigitalPassIdCard] = useState<string | null>(null);
  const [isTraineePortalOpen, setIsTraineePortalOpen] = useState(false);

  // Active courses count
  const openCoursesCount = useMemo(() => {
    return courses.filter((c) => c.status === "open").length;
  }, [courses]);

  // Distinct certified personnel count
  const distinctTraineesCount = useMemo(() => {
    const set = new Set<string>();
    trainees.forEach((t) => {
      if (t.idCard) set.add(t.idCard.trim());
      else if (t.name) set.add(t.name.trim());
    });
    return set.size;
  }, [trainees]);

  // Handle Quick Search in the Alumni Card
  const handleAlumniSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchError("กรุณากรอกเลขประจำตัวประชาชน หรือ ชื่อ-นามสกุล");
      setSearchResults(null);
      return;
    }

    const matches = searchTrainees(q, trainees);
    if (matches.length === 0) {
      setSearchError(`ไม่พบข้อมูลบุคลากรที่ตรงกับ "${q}" (โปรดตรวจสอบการสะกดชื่อ หรือค้นหาด้วยเลขประจำตัวประชาชน)`);
      setSearchResults(null);
      return;
    }

    setSearchError("");
    if (matches.length === 1) {
      setPassportIdCard(matches[0].idCard || matches[0].uniqueKey);
      setSearchResults(null);
    } else {
      setSearchResults(matches);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 flex flex-col justify-between">
      {/* Top Header */}
      <Header rightSlot={<AppHeaderNav page="home" />} />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* ================= 1. HERO PRESTIGE BANNER ================= */}
        <div className="relative rounded-3xl bg-gradient-to-br from-[#071330] via-[#0d1b3e] to-[#16265E] text-white p-7 sm:p-12 shadow-2xl overflow-hidden border border-blue-900/40">
          {/* Subtle Ambient Glowing Orbs */}
          <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
          <div className="absolute right-1/3 -bottom-28 w-80 h-80 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-400/20 border border-amber-300/30 px-3.5 py-1 text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-2xs">
                  <span>🏛️</span>
                  <span>การกีฬาแห่งประเทศไทย (กกท.) · ฝ่ายพัฒนาบุคลากรกีฬา</span>
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-200 backdrop-blur-xs">
                  National Sports Personnel Gateway
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
                ระบบบริการและฐานข้อมูล<br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-amber-200">
                  บุคลากรกีฬาแห่งชาติ
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-2xl font-light">
                แพลตฟอร์มดิจิทัลกลางเพื่อการพัฒนา ยกระดับคุณวุฒิ และติดตามการปฏิบัติหน้าที่บุคลากรกีฬาไทย
                ทั้งผู้บริหารกีฬา ผู้ฝึกสอน ผู้ตัดสิน และเจ้าหน้าที่เทคนิค สู่มาตรฐานสากลอย่างยั่งยืน
              </p>
            </div>

            {/* Official Impact Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-xs">
                <p className="text-[11px] font-medium text-blue-200">บุคลากรเดี่ยวแท้จริง</p>
                <p className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
                  {distinctTraineesCount.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-amber-200">ท่าน</span>
                </p>
                <p className="text-[10px] text-blue-300/70 mt-0.5">ตัดการนับซ้ำ</p>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-xs">
                <p className="text-[11px] font-medium text-blue-200">ประวัติการอบรมในระบบ</p>
                <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {trainees.length.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-blue-300">คน-ครั้ง</span>
                </p>
                <p className="text-[10px] text-blue-300/70 mt-0.5">พ.ศ. 2547–2569</p>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-xs">
                <p className="text-[11px] font-medium text-blue-200">หลักสูตรมาตรฐาน กกท.</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
                  17 <span className="text-xs font-normal text-emerald-200">หลักสูตร</span>
                </p>
                <p className="text-[10px] text-blue-300/70 mt-0.5">ครอบคลุมทุกสายงาน</p>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-xs">
                <p className="text-[11px] font-medium text-blue-200">เปิดรับสมัครขณะนี้</p>
                <p className="text-xl sm:text-2xl font-black text-cyan-300 mt-0.5">
                  {openCoursesCount}{" "}
                  <span className="text-xs font-normal text-cyan-200">หลักสูตร</span>
                </p>
                <p className="text-[10px] text-blue-300/70 mt-0.5">ปี พ.ศ. 2569</p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 2. PERSONA DUAL-TRACK CARDS ================= */}
        <div>
          <div className="text-center sm:text-left mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#16265E] flex items-center justify-center sm:justify-start gap-2">
              <span>🎯</span>
              <span>เลือกเส้นทางการเข้าใช้งานตามสถานะของคุณ</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              ระบบแบ่งบริการอย่างชัดเจนระหว่างผู้ที่ต้องการสมัครใหม่ และบุคลากรที่เคยผ่านการอบรมแล้ว
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ---------------- TRACK 1: FOR NEW USERS & APPLICANTS ---------------- */}
            <div className="group rounded-3xl bg-white border-2 border-blue-100 hover:border-blue-500 shadow-md hover:shadow-xl transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-bl-full pointer-events-none" />

              <div className="space-y-5">
                {/* Persona Header Pill */}
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-800">
                    <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                    <span>กลุ่มที่ 1: สำหรับผู้สนใจเข้ารับการอบรม (ผู้สมัครใหม่)</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    เปิดรับสมัคร {openCoursesCount} หลักสูตร
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 group-hover:text-blue-700 transition-colors">
                    สมัครเข้ารับการอบรมหลักสูตร กกท.
                  </h3>
                  <p className="text-xs text-gray-500 font-sans">
                    Course Catalog, Online Registration & Application Tracking
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  สำหรับผู้บริหารสมาคมกีฬา ผู้ฝึกสอน ผู้ตัดสิน หรือบุคลากรทั่วไปที่ต้องการเพิ่มพูนทักษะ
                  ท่านสามารถเลือกหลักสูตรที่เปิดรับ สมัครออนไลน์ และตรวจสอบสถานะได้ทันที
                </p>

                {/* Feature Bullet Points */}
                <div className="rounded-2xl bg-blue-50/50 border border-blue-100 p-4 space-y-2.5 text-xs text-gray-700">
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-bold text-sm leading-none mt-0.5">✓</span>
                    <span><strong>เลือกหลักสูตรตรงสาย:</strong> ผู้บริหารองค์กรกีฬา, ผู้ฝึกสอน, ผู้ตัดสิน และสนับสนุน</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-bold text-sm leading-none mt-0.5">✓</span>
                    <span><strong>สมัครและส่งเอกสารออนไลน์:</strong> บีบอัดรูปถ่ายและตรวจเอกสารประกอบได้ในขั้นตอนเดียว</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-bold text-sm leading-none mt-0.5">✓</span>
                    <span><strong>ออกใบตอบรับดิจิทัล:</strong> บันทึกประวัติและดาวน์โหลดใบตอบรับเป็นหลักฐานทันที</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/courses"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white py-3.5 px-5 text-sm font-extrabold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>📝</span>
                  <span>ดูหลักสูตรและสมัครออนไลน์</span>
                  <span>→</span>
                </Link>

                <Link
                  href="/timeline"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 hover:border-blue-400 bg-blue-50/70 hover:bg-blue-100/70 text-[#16265E] py-3.5 px-4 text-xs font-bold transition-colors shrink-0 shadow-2xs"
                  title="ดูแผนกำหนดการและปฏิทินการจัดอบรม 16 เดือน"
                >
                  <span>📅</span>
                  <span>ปฏิทิน Timeline</span>
                </Link>

                <Link
                  href="/status"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 py-3.5 px-4 text-xs font-bold transition-colors shrink-0 shadow-2xs"
                >
                  <span>📄</span>
                  <span>ตรวจสอบสถานะ</span>
                </Link>
              </div>
            </div>

            {/* ---------------- TRACK 2: FOR EXISTING CERTIFIED ALUMNI ---------------- */}
            <div className="group rounded-3xl bg-white border-2 border-purple-100 hover:border-purple-500 shadow-md hover:shadow-xl transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/5 rounded-bl-full pointer-events-none" />

              <div className="space-y-5">
                {/* Persona Header Pill */}
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-900">
                    <span>🏅</span>
                    <span>กลุ่มที่ 2: สำหรับบุคลากรที่มีชื่อในระบบ (ศิษย์เก่า กกท.)</span>
                  </span>
                  <span className="text-xs font-bold text-purple-900 bg-purple-100/70 border border-purple-200 px-2.5 py-0.5 rounded-full">
                    {distinctTraineesCount.toLocaleString()} บุคลากรรับรอง
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 group-hover:text-purple-900 transition-colors">
                    ทำเนียบบุคลากร & พาสปอร์ตดิจิทัล
                  </h3>
                  <p className="text-xs text-gray-500 font-sans">
                    Alumni Roster, Digital Pass, Duty Tracking & Project KPIs
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  สำหรับสมาคมกีฬา สโมสร หรือผู้ผ่านการอบรมที่ต้องการตรวจสอบประวัติวุฒิบัตร 23 ปีย้อนหลัง
                  แสดงบัตรประจำตัวดิจิทัล (Digital Pass) และรายงานการปฏิบัติหน้าที่
                </p>

                {/* Embedded Quick Search Box inside Alumni Card */}
                <div className="rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/40 border border-purple-200 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-950 flex items-center gap-1.5">
                      <span>🔍</span>
                      <span>ค้นหาพาสปอร์ตและบัตรดิจิทัลของคุณทันที:</span>
                    </span>
                    <span className="text-[11px] text-purple-700">เลขบัตร ปชช. / ชื่อ</span>
                  </div>

                  <form onSubmit={handleAlumniSearch} className="space-y-1.5">
                    <div className="flex items-center gap-2 rounded-xl bg-white p-1 border border-purple-300 focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-600/15 transition-all shadow-2xs">
                      <input
                        type="text"
                        placeholder="พิมพ์ชื่อ-นามสกุล หรือเลขประจำตัวประชาชน 13 หลัก..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (searchError) setSearchError("");
                        }}
                        className="w-full bg-transparent px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden"
                      />
                      <button
                        type="submit"
                        className="shrink-0 rounded-lg bg-[#16265E] hover:bg-[#1e3a8a] text-white px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        ค้นหาทันที
                      </button>
                    </div>

                    {searchError && (
                      <p className="text-[11px] text-red-600 font-medium pl-1">⚠️ {searchError}</p>
                    )}
                  </form>

                  {/* Multiple Search Results Candidate Drawer */}
                  {searchResults && searchResults.length > 1 && (
                    <div className="rounded-xl border border-purple-200 bg-white p-3 space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between font-bold text-purple-900 border-b border-gray-100 pb-1">
                        <span>พบข้อมูล {searchResults.length} ท่าน (โปรดเลือก):</span>
                        <button
                          type="button"
                          onClick={() => setSearchResults(null)}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          ✕ ปิด
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                        {searchResults.map((person) => (
                          <button
                            key={person.uniqueKey}
                            type="button"
                            onClick={() => {
                              setPassportIdCard(person.idCard || person.uniqueKey);
                              setSearchResults(null);
                            }}
                            className="text-left rounded-lg border border-gray-200 p-2 hover:bg-purple-50 transition-colors"
                          >
                            <p className="font-bold text-gray-900 truncate">{person.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{person.affiliation}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sports Personnel Portal Entry */}
                  <div className="flex items-center justify-between pt-1 text-xs border-t border-purple-200/60">
                    <span className="text-[11px] text-gray-500">
                      มีเลขบัตร 13 หลักในระบบแล้ว?
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsTraineePortalOpen(true)}
                      className="text-xs font-bold text-purple-900 hover:text-purple-700 underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>🪪</span>
                      <span>พอร์ทัลบุคลากร (เข้าสู่ระบบด้วยเลข 13 หลัก) →</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/alumni"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white py-3.5 px-5 text-sm font-extrabold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>📜</span>
                  <span>เข้าสู่ทำเนียบบุคลากรฉบับเต็ม</span>
                  <span>→</span>
                </Link>

                <Link
                  href="/verify"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-3.5 px-4 text-xs font-bold transition-colors shrink-0 shadow-2xs"
                >
                  <span>📷</span>
                  <span>สแกนบัตรหน้างาน</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 3. SHARED COMMUNITY DISCOVERY BANNER ================= */}
        <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-slate-950 p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/15 border border-slate-950/20 px-3 py-1 text-xs font-extrabold text-slate-950 shadow-2xs">
                <span>🗳️</span>
                <span>ร่วมกำหนดอนาคต (Future Skills Poll 2570–2572)</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-snug">
                คุณอยากให้ กกท. เปิดสอนหลักสูตรใดเพิ่มเติมในอนาคต?
              </h3>

              <p className="text-xs sm:text-sm text-slate-950/85 leading-relaxed font-medium">
                ไม่ว่าท่านจะเป็นผู้สมัครใหม่หรือผู้มีชื่อในทำเนียบ เสียงสะท้อนของท่านคือหลักฐานสำคัญ
                ที่ฝ่ายพัฒนาบุคลากรกีฬาจะนำไปสังเคราะห์เพื่อขอรับการจัดสรรงบประมาณเปิดสอนหลักสูตรจริง
              </p>
            </div>

            <Link
              href="/survey"
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold px-6 py-4 text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              <span>💡</span>
              <span>ร่วมโหวตและเสนอหัวข้อ</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Pop-up Windows (Modals) when searching from Alumni Card */}
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
          isAdmin={isAdmin}
        />
      )}

      {digitalPassIdCard && (
        <DigitalPassModal
          idCard={digitalPassIdCard}
          allTrainees={trainees}
          onClose={() => setDigitalPassIdCard(null)}
        />
      )}

      {/* Trainee Self-Service Portal Modal */}
      {isTraineePortalOpen && (
        <TraineePortalModal
          onClose={() => setIsTraineePortalOpen(false)}
          onOpenDigitalPass={(id) => {
            setIsTraineePortalOpen(false);
            setDigitalPassIdCard(id);
          }}
          onOpenPassport={(id) => {
            setIsTraineePortalOpen(false);
            setPassportIdCard(id);
          }}
        />
      )}

      {/* ================= FOOTER ================= */}
      <footer className="mt-12 border-t border-gray-200 bg-white/80 backdrop-blur-xs py-6 text-xs text-gray-500">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="font-bold text-gray-800">
              การกีฬาแห่งประเทศไทย (กกท.) · ฝ่ายพัฒนาบุคลากรกีฬา
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              286 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-gray-600">
            <Link href="/courses" className="hover:text-[#16265E] transition-colors">
              หลักสูตรอบรม
            </Link>
            <span>·</span>
            <Link href="/timeline" className="hover:text-[#16265E] transition-colors">
              แผนกำหนดการ (Timeline)
            </Link>
            <span>·</span>
            <Link href="/status" className="hover:text-[#16265E] transition-colors">
              ตรวจสอบสถานะ
            </Link>
            <span>·</span>
            <Link href="/alumni" className="hover:text-[#16265E] transition-colors">
              ทำเนียบบุคลากร
            </Link>
            <span>·</span>
            <Link href="/survey" className="hover:text-[#16265E] transition-colors">
              โหวตหลักสูตรอนาคต
            </Link>
            <span>·</span>
            <Link href="/verify" className="hover:text-[#16265E] transition-colors">
              สแกนหน้างาน
            </Link>
            <span>·</span>
            <Link href="/admin" className="font-semibold text-[#16265E] hover:underline">
              🔐 สำหรับเจ้าหน้าที่ (Admin)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
