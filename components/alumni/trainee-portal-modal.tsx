"use client";

import { useState, useMemo } from "react";
import {
  useAlumniStore,
  getTraineePassport,
  updatePersonProfile,
  addDutyRecord,
  type HistoricalTrainee,
  type DutyRecord,
} from "@/lib/alumni-store";
import { useProfileClaimsStore } from "@/lib/claims-store";
import { isValidThaiIdCard, formatThaiIdCard } from "@/lib/validation";
import { DutyRecordModal } from "./duty-record-modal";

interface TraineePortalModalProps {
  onClose: () => void;
  initialIdCard?: string;
  onOpenDigitalPass?: (idCard: string) => void;
  onOpenPassport?: (idCard: string) => void;
}

export function TraineePortalModal({
  onClose,
  initialIdCard = "",
  onOpenDigitalPass,
  onOpenPassport,
}: TraineePortalModalProps) {
  const { trainees } = useAlumniStore();
  const { claims } = useProfileClaimsStore();

  const [idCardInput, setIdCardInput] = useState(
    initialIdCard ? formatThaiIdCard(initialIdCard.replace(/\D/g, "")) : ""
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggedInIdCard, setLoggedInIdCard] = useState<string | null>(() => {
    const clean = initialIdCard.replace(/\D/g, "");
    if (clean.length === 13) {
      const match = trainees.find(
        (t) => t.idCard && t.idCard.replace(/\D/g, "") === clean
      );
      return match ? clean : null;
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<"certs" | "edit" | "duties">("certs");

  // Edit Profile Form State
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAffiliation, setEditAffiliation] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Duty Report Modal State
  const [isAddDutyOpen, setIsAddDutyOpen] = useState(false);

  const cleanId = idCardInput.replace(/\D/g, "");
  const isIdValid = cleanId.length === 13 && isValidThaiIdCard(cleanId);

  // Retrieve current trainee passport
  const passport = useMemo(() => {
    if (!loggedInIdCard) return null;
    return getTraineePassport(loggedInIdCard, trainees);
  }, [loggedInIdCard, trainees]);

  const { primary, records, allDuties } = passport || {
    primary: undefined as unknown as HistoricalTrainee,
    records: [] as HistoricalTrainee[],
    allDuties: [] as DutyRecord[],
  };

  // Populate edit fields when logging in
  const initEditFields = (trainee: HistoricalTrainee) => {
    setEditPhone(trainee.phone || "");
    setEditEmail(trainee.email || "");
    setEditAffiliation(trainee.affiliation || "");
  };

  const handleIdChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 13);
    setIdCardInput(formatThaiIdCard(raw));
    if (loginError) setLoginError("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanId || cleanId.length !== 13) {
      setLoginError("กรุณากรอกเลขประจำตัวประชาชน 13 หลัก");
      return;
    }

    if (!isValidThaiIdCard(cleanId)) {
      setLoginError("เลขประจำตัวประชาชนไม่ถูกต้องตามหลักการทะเบียนราษฎร์");
      return;
    }

    // Find trainee with this 13-digit ID
    const match = trainees.find(
      (t) => t.idCard && t.idCard.replace(/\D/g, "") === cleanId
    );

    if (match) {
      setLoggedInIdCard(cleanId);
      initEditFields(match);
      setLoginError("");
      return;
    }

    // Check if there is a pending claim
    const pendingClaim = claims.find(
      (c) => c.idCard.replace(/\D/g, "") === cleanId && c.status === "pending"
    );

    if (pendingClaim) {
      setLoginError(
        `คำขอยืนยันตัวตนของคุณ (${pendingClaim.id}) อยู่ระหว่างการตรวจสอบของเจ้าหน้าที่ กกท. เมื่อได้รับการอนุมัติแล้ว ท่านจะสามารถเข้าสู่ระบบได้ทันที`
      );
      return;
    }

    setLoginError(
      "ไม่พบข้อมูลเลขประจำตัวประชาชนนี้ในระบบ หากท่านเคยผ่านการอบรมกับ กกท. ในอดีต โปรดค้นหาชื่อของท่านในทำเนียบ แล้วกด 'ยืนยันตัวตนเจ้าของประวัติ' เพื่อผูกเลข 13 หลัก"
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInIdCard || !primary) return;

    if (!editAffiliation.trim()) {
      alert("กรุณาระบุสมาคมกีฬาหรือสังกัดปัจจุบัน");
      return;
    }

    updatePersonProfile(loggedInIdCard, {
      phone: editPhone.trim(),
      email: editEmail.trim(),
      affiliation: editAffiliation.trim(),
    });

    setToastMsg("✓ อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว");
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSaveNewDuty = (
    dutyData: Omit<DutyRecord, "id" | "traineeId" | "createdAt" | "verified">
  ) => {
    if (!primary) return;
    addDutyRecord(primary.id, {
      ...dutyData,
      verified: false, // Trainee self-report requires กกท. approval
    });
    setIsAddDutyOpen(false);
    setToastMsg("✓ ส่งรายงานการปฏิบัติหน้าที่เรียบร้อยแล้ว (รอเจ้าหน้าที่ กกท. ตรวจสอบรับรอง)");
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-blue-900/20 overflow-hidden my-6">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#0E2554] via-[#16265E] to-[#1e3a8a] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-2xl shadow-md">
                🪪
              </span>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>พอร์ทัลบุคลากรกีฬา (Sports Personnel Portal)</span>
                  {loggedInIdCard && (
                    <span className="rounded-full bg-emerald-500/30 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      ✓ เข้าสู่ระบบแล้ว
                    </span>
                  )}
                </h3>
                <p className="text-xs text-blue-200">
                  ระบบบริการตนเองสำหรับโค้ช ผู้ตัดสิน และผู้บริหารกีฬาที่ผ่านการรับรอง กกท.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {toastMsg && (
            <div className="mb-4 rounded-xl bg-emerald-500/90 text-white p-3 text-xs font-bold shadow-md animate-in fade-in duration-150 flex items-center gap-2">
              <span>{toastMsg}</span>
            </div>
          )}

          {!loggedInIdCard || !primary ? (
            /* LOGIN SCREEN */
            <div className="space-y-5 py-3">
              <div className="text-center space-y-1">
                <span className="rounded-full bg-blue-50 text-[#16265E] px-3.5 py-1 text-xs font-bold border border-blue-200">
                  เข้าสู่ระบบด้วยเลขประจำตัวประชาชน
                </span>
                <h4 className="text-xl font-extrabold text-gray-900 mt-2">
                  เข้าจัดการพาสปอร์ตและรายงานผลงาน
                </h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  เฉพาะบุคลากรที่มีเลขประจำตัวประชาชน 13 หลัก ผูกกับประวัติในทำเนียบ กกท. เรียบร้อยแล้ว
                </p>
              </div>

              <form onSubmit={handleLogin} className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    เลขประจำตัวประชาชน (13 หลัก) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={idCardInput}
                    onChange={(e) => handleIdChange(e.target.value)}
                    placeholder="X-XXXX-XXXXX-XX-X"
                    maxLength={17}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-mono font-bold tracking-wider text-gray-900 focus:border-[#16265E] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    เบอร์โทรศัพท์มือถือที่ลงทะเบียนไว้ <span className="text-gray-400 font-normal">(ถ้ามี)</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:border-[#16265E] focus:outline-hidden"
                  />
                </div>

                {loginError && (
                  <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900 leading-relaxed space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-950">
                      <span>⚠️ แจ้งเตือน:</span>
                    </p>
                    <p>{loginError}</p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!isIdValid}
                    className="w-full rounded-xl bg-[#16265E] px-5 py-3 text-sm font-bold text-white hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>🔐</span>
                    <span>เข้าสู่ระบบบุคลากรกีฬา</span>
                  </button>
                </div>
              </form>

              <div className="border-t border-gray-100 pt-4 text-center">
                <p className="text-xs text-gray-500">
                  ยังไม่ได้ผูกเลข 13 หลักกับประวัติเดิม?{" "}
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-[#16265E] font-bold underline hover:text-blue-800 cursor-pointer"
                  >
                    ค้นหาชื่อในทำเนียบเพื่อยืนยันตัวตน
                  </button>
                </p>
              </div>
            </div>
          ) : (
            /* AUTHENTICATED PORTAL VIEW */
            <div className="space-y-5">
              {/* Personnel Banner Card */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-[#16265E] p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-2xl font-bold text-[#1e1b4b] shadow-inner shrink-0">
                    {primary.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-white">{primary.name}</h4>
                      <span className="rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold">
                        ✓ ยืนยันตัวตนแล้ว
                      </span>
                    </div>
                    <p className="text-xs text-blue-200 mt-0.5">
                      📍 {primary.affiliation} · 🪪 {formatThaiIdCard(loggedInIdCard)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenDigitalPass) onOpenDigitalPass(loggedInIdCard);
                    }}
                    className="rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1e1b4b] px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    📱 บัตรดิจิทัล
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoggedInIdCard(null)}
                    className="rounded-xl bg-white/10 hover:bg-white/20 text-white/90 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("certs")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "certs"
                      ? "bg-[#16265E] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  📜 วุฒิบัตรและการรับรอง ({records.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "edit"
                      ? "bg-[#16265E] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  ✏️ แก้ไขข้อมูลส่วนตัว
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("duties")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "duties"
                      ? "bg-[#16265E] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  🛡️ การปฏิบัติหน้าที่ ({allDuties.length})
                </button>
              </div>

              {/* TAB 1: CERTS */}
              {activeTab === "certs" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">
                      หลักสูตรที่ผ่านการรับรองจาก กกท. ({records.length} รายการ)
                    </span>
                    {onOpenPassport && (
                      <button
                        type="button"
                        onClick={() => onOpenPassport(loggedInIdCard)}
                        className="text-xs font-bold text-[#16265E] hover:underline cursor-pointer"
                      >
                        เปิดดูพาสปอร์ตฉบับเต็ม →
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {records.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-gray-200 p-3 bg-gray-50/50 hover:bg-blue-50/30 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[#16265E] text-white px-2 py-0.5 font-bold text-[11px]">
                              {r.courseTitle}
                            </span>
                            <span className="text-xs font-bold text-gray-800">
                              รุ่นปี พ.ศ. {r.yearBE}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">
                            {r.courseCategory || "หลักสูตรพัฒนาบุคลากรกีฬา"} · วันที่ผ่าน: {r.passedDate}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                          ✓ รับรองคุณวุฒิ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: EDIT PROFILE */}
              {activeTab === "edit" && (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        เบอร์โทรศัพท์มือถือ
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="08X-XXX-XXXX"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#16265E] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        อีเมล (Email)
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#16265E] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      สมาคมกีฬา / สังกัดหน่วยงานปัจจุบัน
                    </label>
                    <input
                      type="text"
                      required
                      value={editAffiliation}
                      onChange={(e) => setEditAffiliation(e.target.value)}
                      placeholder="เช่น สมาคมกีฬาว่ายน้ำแห่งประเทศไทย"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-[#16265E] focus:outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-[#16265E] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#1e3a8a] transition-all shadow-md cursor-pointer"
                    >
                      บันทึกการเปลี่ยนแปลง
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: DUTIES */}
              {activeTab === "duties" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">
                      ประวัติการปฏิบัติหน้าที่ ({allDuties.length} ครั้ง)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddDutyOpen(true)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>➕</span>
                      <span>ส่งรายงานหน้าที่ใหม่</span>
                    </button>
                  </div>

                  {allDuties.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-6 text-center text-xs text-gray-500">
                      ยังไม่มีประวัติการปฏิบัติหน้าที่ คลิก &quot;ส่งรายงานหน้าที่ใหม่&quot; เพื่อบันทึกผลงานแมตช์แข่งขัน
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allDuties.map((d) => (
                        <div
                          key={d.id}
                          className="rounded-xl border border-gray-200 p-3 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-gray-900">{d.eventName}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  d.verified
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {d.verified ? "✓ กกท. รับรองแล้ว" : "⏳ รอการตรวจสอบ"}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                              บทบาท: <strong>{d.role}</strong> · วันที่: {d.startDate}{" "}
                              {d.endDate ? `ถึง ${d.endDate}` : ""}
                            </p>
                            {d.knowledgeApplied && (
                              <p className="text-[10px] text-gray-500 italic mt-0.5 line-clamp-1">
                                &quot;{d.knowledgeApplied}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trainee Duty Record Modal */}
      {isAddDutyOpen && primary && (
        <DutyRecordModal
          trainee={primary}
          onClose={() => setIsAddDutyOpen(false)}
          onSave={handleSaveNewDuty}
          isAdmin={false}
        />
      )}
    </div>
  );
}
