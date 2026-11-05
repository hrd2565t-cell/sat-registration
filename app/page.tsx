"use client";

import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { AppHeaderNav } from "@/components/layout/app-header-nav";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex flex-col justify-between text-gray-900">
      {/* Header */}
      <Header rightSlot={<AppHeaderNav page="home" />} />

      {/* Main Centered Gateway Container */}
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-14 space-y-8 flex-1 flex flex-col justify-center">
        {/* Title & Introduction */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 border border-blue-200 px-4 py-1 text-xs font-bold text-[#16265E]">
            <span>🏛️</span>
            <span>การกีฬาแห่งประเทศไทย (กกท.) · ฝ่ายพัฒนาบุคลากรกีฬา</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-[#16265E] tracking-tight">
            ระบบบริการบุคลากรกีฬาแห่งชาติ
          </h1>

          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
            กรุณาเลือกบริการที่คุณต้องการเข้าใช้งาน
          </p>
        </div>

        {/* 3 Main Direct Entrance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. สมัครอบรมหลักสูตร */}
          <Link
            href="/courses"
            className="group relative rounded-3xl bg-white border-2 border-transparent hover:border-blue-600 p-7 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between text-center hover:-translate-y-1.5 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

            <div className="space-y-4 pt-2">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-4xl border border-blue-100 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                📝
              </div>

              <div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                  สำหรับผู้สนใจเข้าอบรม
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-2 group-hover:text-blue-700 transition-colors">
                  หลักสูตรที่ต้องการสมัคร
                </h2>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                เลือกหลักสูตรที่เปิดรับสมัคร กรอกข้อมูล ยื่นเอกสารออนไลน์ และตรวจสอบสถานะการสมัคร
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100">
              <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 group-hover:bg-blue-700 py-3 text-xs font-bold text-white transition-colors shadow-xs">
                <span>เข้าสู่ระบบรับสมัคร</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </Link>

          {/* 2. ทำเนียบบุคลากร */}
          <Link
            href="/alumni"
            className="group relative rounded-3xl bg-white border-2 border-transparent hover:border-purple-600 p-7 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between text-center hover:-translate-y-1.5 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-purple-600 to-indigo-700"></div>

            <div className="space-y-4 pt-2">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-50 text-4xl border border-purple-100 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
                🏅
              </div>

              <div>
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
                  สำหรับผู้ผ่านการอบรม / สมาคม
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-2 group-hover:text-purple-700 transition-colors">
                  ทำเนียบบุคลากรกีฬา
                </h2>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                ค้นหาประวัติวุฒิบัตร ตรวจสอบพาสปอร์ต ออกบัตรดิจิทัลบุคลากร และแดชบอร์ดประเมินโครงการ
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100">
              <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 group-hover:bg-purple-700 py-3 text-xs font-bold text-white transition-colors shadow-xs">
                <span>เข้าสู่ทำเนียบบุคลากร</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </Link>

          {/* 3. โหวตหลักสูตร */}
          <Link
            href="/survey"
            className="group relative rounded-3xl bg-white border-2 border-transparent hover:border-amber-500 p-7 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between text-center hover:-translate-y-1.5 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 to-orange-500"></div>

            <div className="space-y-4 pt-2">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-4xl border border-amber-100 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-sm">
                💡
              </div>

              <div>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  เสียงสะท้อนจากบุคลากร
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-2 group-hover:text-amber-800 transition-colors">
                  โหวตหลักสูตรที่อยากเรียน
                </h2>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                ร่วมโหวตและเสนอหัวข้อหลักสูตรกีฬาแห่งอนาคต เพื่อเป็นข้อมูลในการจัดสรรงบประมาณเปิดสอนจริง
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100">
              <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 group-hover:bg-amber-600 py-3 text-xs font-bold text-slate-950 transition-colors shadow-xs">
                <span>เข้าสู่หน้าโหวตหลักสูตร</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Clean Secondary Navigation Bar */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
          <Link
            href="/status"
            className="hover:text-[#16265E] hover:underline flex items-center gap-1"
          >
            <span>📄</span>
            <span>ตรวจสอบสถานะการสมัคร</span>
          </Link>
          <span>·</span>
          <Link
            href="/verify"
            className="hover:text-[#16265E] hover:underline flex items-center gap-1"
          >
            <span>📷</span>
            <span>สแกนตรวจสอบวุฒิบัตรหน้างาน</span>
          </Link>
          <span>·</span>
          <Link
            href="/timeline"
            className="hover:text-[#16265E] hover:underline flex items-center gap-1"
          >
            <span>📈</span>
            <span>Timeline 17 หลักสูตร กกท.</span>
          </Link>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-gray-200 bg-white/70 backdrop-blur-xs py-4 text-center text-xs text-gray-500">
        <p className="font-semibold text-gray-700">
          การกีฬาแห่งประเทศไทย (กกท.) · ฝ่ายพัฒนาบุคลากรกีฬา
        </p>
      </footer>
    </div>
  );
}
