"use client";

import * as React from "react";

interface PdpaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export function PdpaModal({ isOpen, onClose, onAccept }: PdpaModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdpa-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
    >
      <div className="flex max-h-[90vh] w-full max-w-[680px] flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-gradient-to-r from-[#16265E] to-[#1e3a8a] px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-lg">
              🛡️
            </span>
            <div>
              <h3 id="pdpa-modal-title" className="text-base font-bold leading-tight">
                นโยบายการคุ้มครองข้อมูลส่วนบุคคล (PDPA Privacy Notice)
              </h3>
              <p className="text-xs text-white/80">
                โครงการพัฒนาบุคลากรกีฬา • การกีฬาแห่งประเทศไทย (กกท.)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="ปิดหน้าต่าง"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 text-[13px] leading-relaxed text-[#334155] space-y-4">
          <p className="text-[13.5px] font-medium text-[#0f172a]">
            การกีฬาแห่งประเทศไทย (กกท.) ให้ความสำคัญอย่างยิ่งต่อการคุ้มครองข้อมูลส่วนบุคคลของท่าน ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) จึงขอแจ้งรายละเอียดการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลดังนี้:
          </p>

          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-3.5">
            <div>
              <h4 className="font-bold text-[#16265E] flex items-center gap-1.5">
                <span>1.</span>
                <span>วัตถุประสงค์ในการเก็บรวบรวมและประมวลผลข้อมูล</span>
              </h4>
              <ul className="mt-1.5 list-disc pl-5 space-y-1 text-[#475569]">
                <li>เพื่อใช้ในการรับสมัคร คัดเลือก ตรวจสอบคุณสมบัติ และจัดสรรโควตาสัดส่วน 5 กลุ่มเป้าหมาย</li>
                <li>เพื่อติดต่อประสานงาน แจ้งผลการพิจารณา และส่งมอบกำหนดการฝึกอบรม</li>
                <li>เพื่อจัดพิมพ์บัตรประจำตัวผู้เข้ารับการอบรม วุฒิบัตร และเอกสารการอบรม</li>
                <li>เพื่อบันทึกประวัติการพัฒนาบุคลากรกีฬาลงในฐานข้อมูลทำเนียบ กกท. (Alumni Portal) เพื่อสิทธิประโยชน์และการต่อยอดวิชาชีพ</li>
              </ul>
            </div>

            <div className="border-t border-[#e2e8f0] pt-3">
              <h4 className="font-bold text-[#16265E] flex items-center gap-1.5">
                <span>2.</span>
                <span>ประเภทของข้อมูลส่วนบุคคลที่มีการจัดเก็บ</span>
              </h4>
              <p className="mt-1 text-[#475569]">
                ชื่อ-นามสกุล, หมายเลขประจำตัวประชาชน (13 หลัก), สังกัด/ตำแหน่ง, หมายเลขโทรศัพท์, อีเมล, รูปถ่ายหน้าตรง, หนังสือนำส่ง และเอกสารสำเนาบัตรประชาชนรับรองสำเนาถูกต้อง
              </p>
            </div>

            <div className="border-t border-[#e2e8f0] pt-3">
              <h4 className="font-bold text-[#16265E] flex items-center gap-1.5">
                <span>3.</span>
                <span>ระยะเวลาการจัดเก็บและมาตรการความปลอดภัย</span>
              </h4>
              <p className="mt-1 text-[#475569]">
                กกท. จะเก็บรักษาข้อมูลส่วนบุคคลตามมาตรฐานความปลอดภัยทางเทคนิคและการบริหารจัดการ โดยจำกัดสิทธิ์เฉพาะเจ้าหน้าที่ผู้รับผิดชอบโครงการ และเก็บรักษาตามระเบียบงานสารบรรณและฐานข้อมูลบุคลากรกีฬาแห่งชาติตลอดช่วงเวลาการดำเนินงานตามพันธกิจ
              </p>
            </div>

            <div className="border-t border-[#e2e8f0] pt-3">
              <h4 className="font-bold text-[#16265E] flex items-center gap-1.5">
                <span>4.</span>
                <span>สิทธิของเจ้าของข้อมูลส่วนบุคคล</span>
              </h4>
              <p className="mt-1 text-[#475569]">
                ท่านมีสิทธิในการขอเข้าถึง ขอรับสำเนา ขอแก้ไขข้อมูลให้ถูกต้อง ขอระงับการใช้ หรือขอให้ลบหรือทำลายข้อมูลส่วนบุคคลของท่านได้ตามที่กฎหมาย PDPA กำหนด โดยติดต่อผ่านฝ่ายพัฒนาบุคลากรกีฬา กกท.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-[#eff6ff] p-3 border border-[#bfdbfe] text-xs text-[#1e40af] flex items-start gap-2">
            <span className="text-base shrink-0">ℹ️</span>
            <div>
              <p className="font-bold">ช่องทางติดต่อเจ้าหน้าที่คุ้มครองข้อมูล (DPO):</p>
              <p className="mt-0.5 text-[11.5px] text-[#1e3a8a]">
                ฝ่ายพัฒนาบุคลากรกีฬา การกีฬาแห่งประเทศไทย (กกท.) 286 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240 • โทรศัพท์ 02-186-7111
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-semibold text-[#475569] shadow-2xs transition hover:bg-[#f1f5f9]"
          >
            ปิดหน้าต่าง
          </button>
          {onAccept && (
            <button
              type="button"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16265E] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1e3a8a]"
            >
              <span>✓ รับทราบและยินยอม</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
