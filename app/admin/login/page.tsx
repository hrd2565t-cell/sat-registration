"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import { isAdminAuthenticated, loginAdmin } from "@/lib/admin-auth";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/admin";

  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string>("");
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAdminAuthenticated()) {
      router.replace(nextUrl);
    } else {
      // Focus first input box
      const timer = setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [router, nextUrl]);

  const verifyPin = (fullPin: string) => {
    if (fullPin.length !== 6) return;

    if (loginAdmin(fullPin)) {
      setIsSuccess(true);
      setError("");
      setTimeout(() => {
        router.replace(nextUrl);
      }, 250);
    } else {
      setError("รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPin(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();
      }, 500);
    }
  };

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value.replace(/\D/g, ""); // numbers only
    if (!val) {
      const nextPin = [...pin];
      nextPin[index] = "";
      setPin(nextPin);
      return;
    }

    const digit = val.slice(-1);
    const nextPin = [...pin];
    nextPin[index] = digit;
    setPin(nextPin);
    if (error) setError("");

    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    const full = nextPin.join("");
    if (full.length === 6 && !nextPin.includes("")) {
      verifyPin(full);
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (!pin[index] && index > 0) {
        event.preventDefault();
        const nextPin = [...pin];
        nextPin[index - 1] = "";
        setPin(nextPin);
        inputsRef.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const nextPin = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      nextPin[i] = pasted[i];
    }
    setPin(nextPin);
    if (error) setError("");

    if (pasted.length === 6) {
      verifyPin(pasted);
    } else {
      inputsRef.current[Math.min(5, pasted.length)]?.focus();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F2F4F8] px-4 py-8">
      <div className="w-full max-w-[420px] rounded-2xl border border-[#E0E5E8] bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3 h-14 w-14">
            <Image
              src="/assets/logo-sat-header.png"
              alt="SAT Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-[18px] font-bold text-[#16265E]">
            เข้าสู่ระบบผู้ดูแลระบบ
          </h1>
          <p className="mt-1 text-[12px] text-[#6b7280]">
            ระบบรับสมัครเข้าอบรมบุคลากรกีฬาแห่งประเทศไทย
          </p>
        </div>

        {/* PIN Box Form */}
        <div className="mt-6 flex flex-col items-center">
          <p className="mb-4 text-[12.5px] font-medium text-[#374151]">
            กรอกรหัส PIN 6 หลัก
          </p>

          <div
            className={`flex items-center justify-center gap-2 sm:gap-2.5 ${
              isShaking ? "animate-shake" : ""
            }`}
          >
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={isSuccess}
                onChange={(e) => handleChange(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                aria-label={`PIN หลักที่ ${i + 1}`}
                className={`h-12 w-11 rounded-lg border text-center text-[22px] font-bold outline-none transition-all sm:h-13 sm:w-12 ${
                  isSuccess
                    ? "border-[#22c55e] bg-[#f0fdf4] text-[#15803d]"
                    : error
                    ? "border-[#ef4444] bg-[#fef2f2] text-[#b91c1c] focus:ring-2 focus:ring-[#ef4444]/30"
                    : digit
                    ? "border-[#16265E] bg-[#f8fafc] text-[#16265E] focus:ring-2 focus:ring-[#16265E]/20"
                    : "border-[#d1d5db] bg-white text-[#111827] focus:border-[#16265E] focus:ring-2 focus:ring-[#16265E]/20"
                }`}
              />
            ))}
          </div>

          {/* Visibility toggle */}
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            className="mt-3.5 inline-flex items-center gap-1.5 text-[11px] text-[#6b7280] transition hover:text-[#16265E]"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              {showPin ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
            <span>{showPin ? "ซ่อนตัวเลข" : "แสดงตัวเลข"}</span>
          </button>

          {/* Status / Error Message */}
          <div className="mt-4 min-h-[24px] text-center">
            {isSuccess && (
              <p className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#15803d]">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>รหัสถูกต้อง กำลังเข้าสู่ระบบ...</span>
              </p>
            )}
            {error && (
              <p className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-[#dc2626]">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer / Back link */}
        <div className="mt-6 border-t border-[#f1f5f9] pt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#16265E] transition hover:underline"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10H5m0 0l5-5m-5 5l5 5" />
            </svg>
            <span>กลับสู่หน้าหลักสำหรับผู้สมัคร</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F2F4F8]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#16265E] border-t-transparent" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
