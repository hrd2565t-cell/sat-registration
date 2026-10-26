"use client";

import Link from "next/link";
import { useState } from "react";
import { adminUser } from "@/lib/admin-data";
import {
  resetDemoData,
  useApplications,
} from "@/lib/applications-store";
import { resetCourses } from "@/lib/courses-store";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[#078A43]" : "bg-[#d1d5db]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[19px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#eef0f3] py-3 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[11.5px] font-medium text-[#111827]">{title}</p>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-[#6b7280]">
          {description}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export function SettingsAdmin() {
  const { applications } = useApplications();
  const pending = applications.filter(
    (item) => item.status === "pending"
  ).length;
  const [emailNotify, setEmailNotify] = useState(true);
  const [lineNotify, setLineNotify] = useState(false);
  const [dailySummary, setDailySummary] = useState(true);
  const [notice, setNotice] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    resetDemoData();
    resetCourses();
    setConfirmReset(false);
    setNotice("รีเซ็ตข้อมูลเดโมเป็นค่าเริ่มต้นเรียบร้อยแล้ว");
  };

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      {notice && (
        <div
          role="status"
          className="mb-3 rounded-[5px] border border-[#b9dbc5] bg-[#eef9f1] px-3 py-2 text-[11.5px] text-[#176c3a]"
        >
          {notice}
        </div>
      )}

      <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
        <h1 className="text-[17px] font-semibold text-[#111827]">
          ตั้งค่าระบบ
        </h1>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[#4b5563]">
          ข้อมูลบัญชี การแจ้งเตือน และเครื่องมือจัดการข้อมูลเดโม
        </p>
      </section>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <h2 className="text-[13px] font-semibold text-[#111827]">
              บัญชีผู้ใช้งาน
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f1fc] text-[16px] font-semibold text-[#1e3a8a]">
                {adminUser.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[#111827]">
                  {adminUser.name}
                </p>
                <p className="mt-0.5 text-[10.5px] text-[#6b7280]">
                  เจ้าหน้าที่ตรวจสอบคุณสมบัติ · สิทธิ์ผู้ดูแลระบบ
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 rounded-[6px] bg-[#f8fafc] px-3 py-2.5 text-[10.5px] text-[#4b5563] sm:grid-cols-2">
              <div>
                <p className="text-[9.5px] text-[#6b7280]">สถานะบัญชี</p>
                <p className="mt-0.5 font-medium text-[#176c3a]">
                  ใช้งานอยู่ (เดโม)
                </p>
              </div>
              <div>
                <p className="text-[9.5px] text-[#6b7280]">การยืนยันตัวตน</p>
                <p className="mt-0.5 font-medium text-[#111827]">
                  ยังไม่ได้เชื่อมระบบล็อกอินจริง
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <h2 className="text-[13px] font-semibold text-[#111827]">
              การแจ้งเตือน
            </h2>
            <p className="mt-0.5 text-[10.5px] text-[#6b7280]">
              ตั้งค่าในเครื่องนี้เพื่อทดลองรูปแบบการแจ้งเตือน
            </p>
            <div className="mt-1">
              <SettingRow
                title="อีเมลเมื่อมีผู้สมัครใหม่"
                description="ส่งสรุปข้อมูลผู้สมัครใหม่ไปยังอีเมลของเจ้าหน้าที่"
                checked={emailNotify}
                onChange={setEmailNotify}
              />
              <SettingRow
                title="แจ้งเตือนผ่าน LINE"
                description="เชื่อมต่อกลุ่มงานตรวจสอบเพื่อรับข้อความแจ้งเตือน"
                checked={lineNotify}
                onChange={setLineNotify}
              />
              <SettingRow
                title="สรุปงานประจำวัน"
                description="รวบรวมจำนวนผู้สมัครและรายการรอตรวจสอบในแต่ละวัน"
                checked={dailySummary}
                onChange={setDailySummary}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setNotice("บันทึกการตั้งค่าการแจ้งเตือนในเครื่องนี้แล้ว")
                }
                className="inline-flex h-8 items-center rounded-[5px] bg-[#1e3a8a] px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#1e40af]"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-3">
          <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <h2 className="text-[13px] font-semibold text-[#111827]">
              ข้อมูลเดโม
            </h2>
            <dl className="mt-2.5 space-y-2 text-[10.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-[#6b7280]">ผู้สมัครในระบบ</dt>
                <dd className="font-semibold text-[#111827]">
                  {applications.length} คน
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6b7280]">รอตรวจสอบ</dt>
                <dd className="font-semibold text-[#9a5c00]">
                  {pending} คน
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#6b7280]">พื้นที่จัดเก็บ</dt>
                <dd className="text-right font-medium text-[#111827]">
                  localStorage
                </dd>
              </div>
            </dl>
            <p className="mt-2.5 text-[10px] leading-relaxed text-[#6b7280]">
              ข้อมูลถูกเก็บเฉพาะเบราว์เซอร์นี้ การรีเซ็ตจะลบรายการที่เพิ่มหรือแก้ไข
              รวมถึงการแก้ไขหลักสูตร และกลับไปใช้ข้อมูลตัวอย่าง 185 รายการ
            </p>
            {confirmReset ? (
              <div className="mt-2.5 rounded-[5px] border border-[#f0b5b8] bg-[#fff5f5] p-2.5">
                <p className="text-[10.5px] font-medium text-[#9e2a30]">
                  ยืนยันการลบข้อมูลที่แก้ไขทั้งหมด?
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex h-8 flex-1 items-center justify-center rounded-[5px] bg-[#c2242c] text-[10.5px] font-semibold text-white transition-colors hover:bg-[#a91d24]"
                  >
                    ยืนยันรีเซ็ต
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="inline-flex h-8 flex-1 items-center justify-center rounded-[5px] border border-[#d1d5db] bg-white text-[10.5px] font-medium text-[#374151] transition-colors hover:bg-[#f8fafc]"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="mt-2.5 inline-flex h-8 w-full items-center justify-center rounded-[5px] border border-[#d8a0a3] bg-white text-[10.5px] font-semibold text-[#9e2a30] transition-colors hover:bg-[#fff5f5]"
              >
                รีเซ็ตข้อมูลเดโม
              </button>
            )}
          </section>

          <section className="rounded-lg border border-[#e3e6ea] bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
            <h2 className="text-[13px] font-semibold text-[#111827]">
              ลิงก์สาธารณะ
            </h2>
            <div className="mt-2.5 space-y-1">
              {[
                { href: "/", label: "หน้าหลักและหลักสูตร" },
                { href: "/register", label: "หน้าสมัครเข้ารับการอบรม" },
                { href: "/status", label: "ตรวจสอบสถานะผู้สมัคร" },
                { href: "/timeline", label: "กำหนดการรับสมัคร" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-8 items-center justify-between rounded-[5px] px-2 text-[10.5px] font-medium text-[#1e3a8a] transition-colors hover:bg-[#eff6ff]"
                >
                  {item.label}
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M7 4l6 6-6 6"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </section>

          <p className="text-center text-[9.5px] text-[#6b7280]">
            ระบบต้นแบบ · SAT Admission 2569
          </p>
        </div>
      </div>
    </div>
  );
}
