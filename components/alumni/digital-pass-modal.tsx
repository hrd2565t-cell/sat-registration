"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import type { HistoricalTrainee } from "@/lib/alumni-store";
import { getTraineePassport } from "@/lib/alumni-store";

interface DigitalPassModalProps {
  idCard: string;
  allTrainees: HistoricalTrainee[];
  onClose: () => void;
}

export function DigitalPassModal({
  idCard,
  allTrainees,
  onClose,
}: DigitalPassModalProps) {
  const passport = getTraineePassport(idCard, allTrainees);
  const cardRef = useRef<HTMLDivElement>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live anti-tamper clock ticking every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("th-TH", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " น."
      );
      setCurrentDate(
        now.toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate dynamic QR Code pointing to public verification page
  useEffect(() => {
    if (!passport) return;
    const cleanId = passport.primary.idCard.replace(/\D/g, "");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const verifyUrl = `${origin}/verify?idCard=${cleanId}`;

    QRCode.toDataURL(verifyUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [passport]);

  if (!passport) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
          <p className="text-sm font-semibold text-gray-700">ไม่พบข้อมูลบุคลากรกีฬา</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg bg-[#16265E] px-4 py-2 text-xs font-semibold text-white"
          >
            ปิด
          </button>
        </div>
      </div>
    );
  }

  const { primary, records, allDuties, isActive } = passport;
  const cleanId = primary.idCard.replace(/\D/g, "");
  const maskedId =
    cleanId.length === 13
      ? `${cleanId.slice(0, 1)}-${cleanId.slice(1, 5)}-XXXXX-${cleanId.slice(10, 12)}-${cleanId.slice(12)}`
      : primary.idCard;

  // Isolated Printing: Prints ONLY the digital card centered on 1 single sheet
  const handlePrintPass = () => {
    if (!cardRef.current) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById("sat-digital-pass-print-iframe");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "sat-digital-pass-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        return;
      }

      const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
        .map((el) => el.outerHTML)
        .join("\n");

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>บัตรดิจิทัลบุคลากรกีฬา - ${primary.name}</title>
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              color: #0f172a !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            .print-badge-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              padding: 20px 0;
              width: 100%;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .print-badge-wrapper > div {
              max-width: 380px !important;
              width: 380px !important;
              box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div class="print-badge-wrapper">
            ${cardRef.current.outerHTML}
            <div style="margin-top: 14px; text-align: center; font-size: 10.5px; color: #475569; font-weight: 600;">
              เอกสารรับรองคุณวุฒิบัตรดิจิทัลทางการ • การกีฬาแห่งประเทศไทย (กกท.) • หน้า 1 จาก 1
            </div>
          </div>
        </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 300);
    } catch {
      window.print();
    }
  };
  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // 3x scale for crisp high-dpi phone screens
        useCORS: true,
        backgroundColor: null,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const safeName = primary.name.replace(/\s+/g, "_");
      link.download = `SAT_Digital_Badge_${safeName}.png`;
      link.href = image;
      link.click();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to generate digital pass image:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกภาพ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 sm:p-5 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-4 flex flex-col items-center max-w-md w-full animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="self-end mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
          title="ปิดหน้าต่าง (Esc)"
        >
          ✕
        </button>

        {/* ================= DIGITAL ACCREDITATION CARD CONTAINER ================= */}
        <div
          ref={cardRef}
          className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-[#0a1535] via-[#16265E] to-[#0b1329] p-5 sm:p-6 text-white shadow-2xl ring-1 ring-amber-400/30 select-none"
          style={{ maxWidth: "380px" }}
        >
          {/* Decorative ambient gradients */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-20 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Card Top Gold Foil Strip */}
          <div className="relative flex items-center justify-between border-b border-white/15 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 p-1 backdrop-blur-xs border border-white/20 shadow-xs">
                <Image
                  src="/assets/logo-sat.webp"
                  alt="SAT Emblem"
                  width={34}
                  height={34}
                  className="object-contain drop-shadow-md"
                />
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-black tracking-wide text-amber-300">
                  การกีฬาแห่งประเทศไทย
                </p>
                <p className="text-[9.5px] font-bold text-white/75 tracking-wider uppercase">
                  Sports Authority of Thailand
                </p>
              </div>
            </div>

            <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-400/40 uppercase tracking-wider">
              E-BADGE
            </span>
          </div>

          {/* Dynamic Live Anti-Tamper Security Clock Strip */}
          <div className="relative mt-3 flex items-center justify-between rounded-xl bg-black/40 px-3 py-1.5 backdrop-blur-md border border-white/10 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-extrabold tracking-wider text-emerald-300 uppercase">
                LIVE SECURE
              </span>
            </div>
            <div className="text-right font-mono text-[11px] font-bold text-white tracking-wide">
              {currentDate} · {currentTime}
            </div>
          </div>

          {/* Personnel Identity Block */}
          <div className="relative mt-4 flex flex-col items-center text-center">
            {/* Avatar / Photo with Gold Ring */}
            <div className="relative flex h-22 w-22 items-center justify-center rounded-full border-3 border-amber-400 bg-gradient-to-br from-[#2563eb] to-[#1e3a8a] text-3xl font-extrabold text-white shadow-lg">
              {primary.name.replace(/^(นาย|นางสาว|นาง|ดร\.|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.)\s*/, "").slice(0, 2)}
              <span
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#16265E] bg-emerald-500 text-xs text-white shadow-xs"
                title="สถานะผ่านการรับรอง"
              >
                ✓
              </span>
            </div>

            <h3 className="mt-2.5 text-lg font-black tracking-tight text-white leading-snug">
              {primary.name}
            </h3>

            {/* Position / Credential Title */}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
              {primary.affiliationGroup && (
                <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-extrabold text-[#1a1438] shadow-xs">
                  🏛️ {primary.affiliationGroup}
                </span>
              )}
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-blue-100 border border-white/15">
                {primary.affiliation}
              </span>
            </div>

            <p className="mt-1.5 text-xs text-white/70 font-mono tracking-wider">
              {primary.personnelId ? `🆔 รหัส ${primary.personnelId}` : `🪪 ${maskedId}`}
            </p>
          </div>

          {/* QR Code Verification Window */}
          <div className="relative mt-4 flex flex-col items-center rounded-2xl bg-white p-3.5 text-gray-900 shadow-md">
            <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-1">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Accreditation Verification QR"
                  className="h-36 w-36 object-contain"
                />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center text-xs text-gray-400">
                  กำลังสร้าง QR...
                </div>
              )}
            </div>

            <p className="mt-1.5 text-center text-[10px] font-bold text-[#16265E] tracking-tight">
              สแกนตรวจสอบคุณวุฒิและสถานะหน้างาน
            </p>
            <p className="text-[9px] text-gray-500">
              รับรองโดย <span className="font-semibold text-gray-700">การกีฬาแห่งประเทศไทย (กกท.)</span>
            </p>
          </div>

          {/* Card Meta Stats Footer */}
          <div className="relative mt-3.5 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white/10 p-2 backdrop-blur-xs border border-white/10">
              <p className="text-[10px] text-white/60">สถานะการรับรอง</p>
              <p className="text-xs font-bold text-emerald-300">
                {isActive ? "🟢 ปฏิบัติงานต่อเนื่อง" : "🟢 ผ่านการรับรอง"}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-2 backdrop-blur-xs border border-white/10">
              <p className="text-[10px] text-white/60">วุฒิบัตรรับรอง</p>
              <p className="text-xs font-bold text-amber-300">
                {records.length} หลักสูตร ({allDuties.length} หน้าที่)
              </p>
            </div>
          </div>

          {/* Microprint watermark bottom */}
          <div className="relative mt-3 text-center border-t border-white/10 pt-2 text-[8.5px] tracking-wider text-white/50 uppercase">
            Official Digital Accreditation · Sports Authority of Thailand
          </div>
        </div>
        {/* ================= END CARD CONTAINER ================= */}

        {/* Action Buttons Toolbar */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 w-full">
          {/* Save to Album button */}
          <button
            type="button"
            onClick={handleSaveImage}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-bold text-[#1e1b4b] shadow-md hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer disabled:opacity-50"
          >
            <span>{isGenerating ? "⏳" : "📥"}</span>
            <span>{isGenerating ? "กำลังบันทึกภาพ..." : "บันทึกบัตรลงเครื่อง (Save Image)"}</span>
          </button>

          {/* Test verification link */}
          <a
            href={`/verify?idCard=${cleanId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all"
          >
            <span>🔍</span>
            <span>เปิดหน้าตรวจสอบ (Verify)</span>
          </a>

          {/* Print button */}
          <button
            type="button"
            onClick={handlePrintPass}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all cursor-pointer"
            title="พิมพ์บัตรดิจิทัลนี้ (ออกกระดาษ 1 หน้าพอดี)"
          >
            <span>🖨️</span>
            <span>พิมพ์บัตร (PDF)</span>
          </button>
        </div>

        {saveSuccess && (
          <p className="mt-2 text-xs text-emerald-300 font-semibold animate-in fade-in">
            ✓ บันทึกภาพบัตรดิจิทัลลงเครื่องสำเร็จแล้ว
          </p>
        )}
      </div>
    </div>
  );
}
