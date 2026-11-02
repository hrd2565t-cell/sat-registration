"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { useAlumniStore, getTraineePassport, searchTrainees, type HistoricalTrainee, type TraineeSearchResult } from "@/lib/alumni-store";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
          <p className="text-xs font-semibold text-gray-500">กำลังโหลดระบบตรวจสอบ...</p>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trainees } = useAlumniStore();

  const searchQuery =
    searchParams.get("q") ||
    searchParams.get("name") ||
    searchParams.get("idCard") ||
    searchParams.get("id") ||
    "";

  const [activeMode, setActiveMode] = useState<"camera" | "upload" | "manual">("camera");
  const [manualInput, setManualInput] = useState("");
  const [scannerError, setScannerError] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);

  // Scanner container ref
  const scannerContainerId = "sat-qr-reader";
  const html5QrCodeRef = useRef<any>(null);

  // Flexible candidate search (by Name, ID card, or Cert No)
  const candidateMatches: TraineeSearchResult[] = searchQuery
    ? searchTrainees(searchQuery, trainees)
    : [];

  // If exactly 1 candidate, or direct ID lookup, get single passport
  const targetId =
    candidateMatches.length === 1
      ? candidateMatches[0].idCard || candidateMatches[0].uniqueKey
      : searchQuery;

  const passport = targetId ? getTraineePassport(targetId, trainees) : null;

  // Cleanup scanner on unmount or mode change
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        // ignore
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Initialize camera scanner when activeMode === 'camera' and not showing a verified dossier
  useEffect(() => {
    if (searchQuery) {
      stopScanner();
      return;
    }

    if (activeMode !== "camera") {
      stopScanner();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!isMounted) return;

        await stopScanner();

        const qrCodeScanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = qrCodeScanner;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await qrCodeScanner.start(
          { facingMode: "environment" }, // prefer rear camera on mobile
          config,
          (decodedText) => {
            // Success callback when QR code detected
            handleQrDecoded(decodedText);
          },
          () => {
            // Scanning in progress...
          }
        );

        if (isMounted) {
          setIsScanning(true);
          setScannerError("");
        }
      } catch (err: any) {
        console.warn("Camera start error:", err);
        if (isMounted) {
          setScannerError(
            "ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องบนเบราว์เซอร์ หรือใช้วิธีอัปโหลดภาพ QR หรือค้นหาด้วยเลขบัตร"
          );
          setIsScanning(false);
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [activeMode, searchQuery]);

  // Handle scanned text
  const handleQrDecoded = (decodedText: string) => {
    stopScanner();

    // Check if decoded text is a URL with idCard parameter
    let targetId = "";
    try {
      if (decodedText.startsWith("http")) {
        const url = new URL(decodedText);
        targetId = url.searchParams.get("idCard") || url.searchParams.get("id") || "";
      }
    } catch {
      // not a full URL
    }

    if (!targetId) {
      // Maybe raw 13 digits or raw ID
      const digits = decodedText.replace(/\D/g, "");
      if (digits.length === 13) {
        targetId = digits;
      } else {
        targetId = decodedText.trim();
      }
    }

    if (targetId) {
      router.push(`/verify?idCard=${encodeURIComponent(targetId)}`);
    } else {
      setScannerError(`QR Code ไม่ถูกต้องหรือไม่ใช่ข้อมูลบุคลากร กกท.: ${decodedText}`);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5Qr = new Html5Qrcode("sat-qr-file-reader");
      const decodedText = await html5Qr.scanFile(file, true);
      handleQrDecoded(decodedText);
    } catch (err) {
      setScannerError("ไม่พบ QR Code ในรูปภาพที่อัปโหลด กรุณาลองใหม่อีกครั้ง");
    }
  };

  // Handle manual submit (Name, Citizen ID, or Cert No)
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = manualInput.trim();
    if (!query) {
      setScannerError("กรุณากรอกชื่อ-นามสกุล, เลขประจำตัวประชาชน หรือเลขวุฒิบัตร");
      return;
    }
    router.push(`/verify?q=${encodeURIComponent(query)}`);
  };

  // Reset to scan another person
  const handleScanNext = () => {
    router.push("/verify");
    setActiveMode("camera");
    setScannerError("");
    setManualInput("");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <Header
        rightSlot={
          <div className="flex items-center gap-2">
            <Link
              href="/alumni"
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              🏅 ทำเนียบ & ประเมินผล
            </Link>
            <Link
              href="/status"
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ตรวจสอบสถานะ
            </Link>
          </div>
        }
      />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-6">
        {/* Verification Title Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#0d1b3e] via-[#16265E] to-[#1e3a8a] p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
          <div className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-amber-400/10 blur-2xl" />

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-1 border border-white/20 shadow-xs">
              <Image
                src="/assets/logo-sat.webp"
                alt="SAT Logo"
                width={38}
                height={38}
                className="object-contain"
              />
            </div>
            <div>
              <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-[#1a1438] uppercase">
                ON-SITE ACCREDITATION VERIFICATION
              </span>
              <h1 className="mt-1 text-xl sm:text-2xl font-black text-white tracking-tight">
                ระบบตรวจสอบคุณวุฒิและบัตรบุคลากรกีฬา กกท.
              </h1>
              <p className="text-xs text-blue-100/80 mt-0.5">
                สำหรับผู้จัดการแข่งขัน, ผู้ควบคุมการแข่งขัน (Match Commissioner), กรรมการ และประชาชนทั่วไป
              </p>
            </div>
          </div>
        </div>

        {/* ================= IF HAS QUERY ID: SHOW OFFICIAL DOSSIER ================= */}
        {searchQuery ? (
          candidateMatches.length > 1 ? (
            /* Multiple Candidates Selection for Organizers */
            <div className="rounded-3xl border border-blue-200 bg-white p-5 sm:p-7 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#16265E] uppercase">
                    CANDIDATE SELECTION
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 mt-1">
                    พบข้อมูลบุคลากร {candidateMatches.length} ท่านที่ตรงกับ &ldquo;{searchQuery}&rdquo;
                  </h2>
                  <p className="text-xs text-gray-500">
                    โปรดเลือกบุคคลที่ต้องการตรวจสอบคุณวุฒิและประวัติการรับรองหน้างาน
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  ✕ ค้นหาใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {candidateMatches.map((person) => (
                  <div
                    key={person.uniqueKey}
                    className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 hover:bg-blue-50/50 hover:border-blue-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{person.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        🏅 กีฬา{person.sportsType} · {person.affiliation}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1 font-mono">
                        {person.records.length} หลักสูตรรับรอง (ปีล่าสุด พ.ศ. {person.latestYearBE})
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/verify?idCard=${encodeURIComponent(person.idCard || person.uniqueKey)}`);
                      }}
                      className="shrink-0 rounded-xl bg-[#16265E] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors cursor-pointer"
                    >
                      🛡️ ตรวจสอบ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : passport ? (
            <div className="rounded-3xl border border-emerald-300 bg-white p-5 sm:p-7 shadow-lg space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Official Verified Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 p-4 text-white shadow-md flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 text-2xl font-black shadow-xs">
                    ✓
                  </div>
                  <div>
                    <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                      OFFICIAL VERIFIED
                    </span>
                    <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight mt-0.5">
                      บัตรแท้ — ได้รับการรับรองอย่างเป็นทางการ
                    </h2>
                    <p className="text-xs text-emerald-100">
                      สังกัดและผ่านการรับรองจาก การกีฬาแห่งประเทศไทย (กกท.)
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block text-right">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800 shadow-xs">
                    🟢 สถานะ: ACTIVE
                  </span>
                </div>
              </div>

              {/* Personnel Core Profile */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16265E] to-[#2563eb] text-2xl font-black text-white shadow-md">
                  {passport.primary.name.replace(/^(นาย|นางสาว|นาง|ดร\.|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.)\s*/, "").slice(0, 2)}
                </div>

                <div className="text-center sm:text-left flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-[#16265E]">
                      กีฬา{passport.primary.sportsType}
                    </span>
                    <span className="rounded-md bg-gray-200/80 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                      {passport.primary.affiliation}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-xl font-black text-gray-900 leading-tight">
                    {passport.primary.name}
                  </h3>

                  <div className="mt-1 text-xs text-gray-500 space-x-3 font-mono">
                    <span>
                      เลขประจำตัวประชาชน:{" "}
                      <strong>
                        {passport.primary.idCard.replace(/\D/g, "").length === 13
                          ? `${passport.primary.idCard.slice(0, 1)}-${passport.primary.idCard.slice(1, 5)}-XXXXX-${passport.primary.idCard.slice(10, 12)}-${passport.primary.idCard.slice(12)}`
                          : passport.primary.idCard}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Certified Courses Passed List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#16265E] flex items-center justify-between border-b border-gray-100 pb-2">
                  <span>📜 ประวัติหลักสูตรและวุฒิบัตรที่ผ่านการรับรอง ({passport.records.length} หลักสูตร)</span>
                  <span className="text-emerald-700 font-semibold">ผ่านการประเมิน กกท.</span>
                </h4>

                <div className="space-y-2.5">
                  {passport.records.map((cert, idx) => (
                    <div
                      key={cert.id || idx}
                      className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs hover:border-blue-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-[#16265E] text-xs font-bold">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-gray-900 text-xs sm:text-sm">
                            {cert.courseTitle}
                          </span>
                        </div>
                        <span className="inline-flex self-start sm:self-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          ✓ สำเร็จการอบรม
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1 text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                        <div>
                          <span className="text-gray-400">เลขที่วุฒิบัตร: </span>
                          <strong className="text-gray-800">{cert.certNo || "-"}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400">รุ่น / ปี: </span>
                          <span>{cert.batch} (พ.ศ. {cert.yearBE})</span>
                        </div>
                        <div>
                          <span className="text-gray-400">วันที่สำเร็จ: </span>
                          <span>{cert.passedDate || "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Duties Summary (if any) */}
              {passport.allDuties.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-[#16265E] flex items-center justify-between border-b border-gray-100 pb-2">
                    <span>🏃 ประวัติการปฏิบัติหน้าที่ในสนามแข่งขัน ({passport.allDuties.length} รายการ)</span>
                    <span className="text-xs text-gray-500">
                      รับรองแล้ว {passport.allDuties.filter((d) => d.verified).length} รายการ
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {passport.allDuties.slice(0, 3).map((d, idx) => (
                      <div
                        key={d.id || idx}
                        className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-bold text-gray-800">{d.eventName}</p>
                          <p className="text-[11px] text-gray-500">
                            บทบาท: <strong>{d.role}</strong> · วันที่ {d.startDate}
                          </p>
                        </div>
                        {d.verified ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto">
                            ✓ กกท. รับรอง
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 self-start sm:self-auto">
                            รอตรวจสอบ
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Digital Verification Seal & Timestamp */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center text-xs text-gray-600 space-y-1">
                <p className="font-bold text-[#16265E]">
                  🛡️ ข้อมูลนี้ได้รับการตรวจสอบและรับรองความถูกต้องแบบเรียลไทม์จากฐานข้อมูล กกท.
                </p>
                <p className="text-[11px] text-gray-500">
                  เวลาที่ตรวจสอบ: {new Date().toLocaleDateString("th-TH")} เวลา{" "}
                  {new Date().toLocaleTimeString("th-TH")} น.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="rounded-xl bg-[#16265E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors cursor-pointer"
                >
                  🔄 สแกนตรวจสอบท่านถัดไป (Scan Next)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    🖨️ พิมพ์เอกสารรับรอง
                  </button>
                  <Link
                    href={`/alumni`}
                    className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#16265E] hover:bg-gray-50 transition-colors"
                  >
                    ดูทำเนียบรวม
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Not Found Dossier */
            <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-lg space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">
                  ไม่พบข้อมูลบุคลากรในสารบบ กกท.
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  ไม่พบประวัติวุฒิบัตรหรือข้อมูลผู้ผ่านการอบรมสำหรับ:{" "}
                  <strong className="text-red-700">&ldquo;{searchQuery}&rdquo;</strong>
                </p>
                <p className="text-[11px] text-gray-400">
                  กรุณาตรวจสอบความถูกต้องของชื่อ-นามสกุล, QR Code หรือค้นหาด้วยเลขประจำตัวประชาชน 13 หลัก
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#16265E] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors cursor-pointer"
                >
                  <span>🔄</span>
                  <span>ลองสแกนหรือค้นหาใหม่อีกครั้ง</span>
                </button>
              </div>
            </div>
          )
        ) : (
          /* ================= NO QUERY: ON-SITE SCANNER PORTAL ================= */
          <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-gray-100 p-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActiveMode("camera");
                  setScannerError("");
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
                  activeMode === "camera"
                    ? "bg-white text-[#16265E] shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>📷</span>
                <span>กล้องสแกนเนอร์</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode("upload");
                  stopScanner();
                  setScannerError("");
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
                  activeMode === "upload"
                    ? "bg-white text-[#16265E] shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>📁</span>
                <span>อัปโหลดภาพ QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode("manual");
                  stopScanner();
                  setScannerError("");
                }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all cursor-pointer ${
                  activeMode === "manual"
                    ? "bg-white text-[#16265E] shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>⌨️</span>
                <span>ค้นหาชื่อ / เลขบัตร</span>
              </button>
            </div>

            {/* Error Message if any */}
            {scannerError && (
              <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200 flex items-start gap-2">
                <span className="text-base shrink-0">⚠️</span>
                <span>{scannerError}</span>
              </div>
            )}

            {/* TAB 1: LIVE CAMERA SCANNER */}
            {activeMode === "camera" && (
              <div className="space-y-4">
                <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl bg-black p-2 shadow-inner">
                  {/* Camera container */}
                  <div id={scannerContainerId} className="w-full min-h-[300px] overflow-hidden rounded-xl" />

                  {isScanning && (
                    <div className="mt-2 text-center text-[11px] text-white/80 animate-pulse">
                      ⚡ ส่องกล้องไปที่ QR Code บนหน้าจอมือถือหรือบัตรของบุคลากร
                    </div>
                  )}
                </div>

                <div className="text-center text-xs text-gray-500">
                  <p>ระบบจะตรวจจับ QR Code โดยอัตโนมัติเมื่อวางอยู่ในกรอบ</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    หากอุปกรณ์ไม่อนุญาตให้เปิดกล้อง สามารถเลือกแท็บ &ldquo;ค้นหาชื่อ / เลขบัตร&rdquo; หรือ &ldquo;อัปโหลดภาพ QR&rdquo; ได้
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: UPLOAD IMAGE FILE */}
            {activeMode === "upload" && (
              <div className="py-6 text-center space-y-4">
                <div id="sat-qr-file-reader" className="hidden" />
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-3xl text-[#16265E]">
                  📤
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    เลือกรูปภาพที่มี QR Code บัตรดิจิทัล
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    รองรับไฟล์ภาพถ่ายหรือภาพสกรีนช็อต (JPG, PNG, WebP)
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 rounded-xl bg-[#16265E] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors cursor-pointer">
                  <span>📁 เลือกไฟล์ภาพจากเครื่อง</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* TAB 3: MANUAL INPUT FALLBACK (NAME, ID, OR CERT NO) */}
            {activeMode === "manual" && (
              <form onSubmit={handleManualSearch} className="py-4 space-y-4 max-w-md mx-auto">
                <div className="text-center">
                  <h3 className="text-sm font-bold text-gray-900">
                    ค้นหาด้วยชื่อ-นามสกุล, เลขบัตรประชาชน หรือเลขวุฒิบัตร
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    รองรับทั้งบุคลากรปัจจุบันและข้อมูลย้อนหลังในอดีตที่ไม่ได้บันทึกเลขบัตร ปชช.
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อ, นามสกุล, เลขบัตร 13 หลัก หรือเลขวุฒิบัตร..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-center focus:border-[#16265E] focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#16265E] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors cursor-pointer"
                >
                  🔍 ค้นหาและตรวจสอบคุณวุฒิ
                </button>
              </form>
            )}

            {/* Quick Demo Personnel Shortcut for testing */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-center text-[11px] font-semibold text-gray-500 mb-2">
                ตัวอย่างบุคลากรสำหรับทดสอบระบบตรวจสอบหน้างานทันที:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {trainees.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      router.push(`/verify?idCard=${t.idCard.replace(/\D/g, "")}`);
                    }}
                    className="rounded-lg bg-gray-100 hover:bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:text-[#16265E] border border-gray-200 transition-colors cursor-pointer"
                  >
                    {t.name} ({t.sportsType})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
