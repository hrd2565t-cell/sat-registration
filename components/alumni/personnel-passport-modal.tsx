"use client";

import { useState, useMemo } from "react";
import {
  type HistoricalTrainee,
  type DutyRecord,
  getTraineePassport,
  KNOWLEDGE_DIMENSIONS,
  updatePersonProfile,
  updatePersonAffiliation,
  AFFILIATION_GROUPS,
} from "@/lib/alumni-store";
import { loginAdmin } from "@/lib/admin-auth";
import { ClaimProfileModal } from "@/components/alumni/claim-profile-modal";

interface PersonnelPassportModalProps {
  idCard: string;
  allTrainees: HistoricalTrainee[];
  onClose: () => void;
  onAddDuty: (trainee: HistoricalTrainee) => void;
  onVerifyDuty?: (dutyId: string) => void;
  onOpenDigitalPass?: (idCard: string) => void;
  onDeleteTrainee?: (id: string) => void;
  isAdmin?: boolean;
}

export function PersonnelPassportModal({
  idCard,
  allTrainees,
  onClose,
  onAddDuty,
  onVerifyDuty,
  onOpenDigitalPass,
  onDeleteTrainee,
  isAdmin = false,
}: PersonnelPassportModalProps) {
  const passport = getTraineePassport(idCard, allTrainees);
  const [activeTab, setActiveTab] = useState<"certs" | "duties">("certs");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPrefix, setEditPrefix] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editGroup, setEditGroup] = useState<string>("");
  const [editAffiliationName, setEditAffiliationName] = useState<string>("");
  const [editPersonnelId, setEditPersonnelId] = useState<string>("");
  const [editIdCard, setEditIdCard] = useState<string>("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive" | "pending_verification">("active");

  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  const { primary, records, allDuties, isActive } = passport || {
    primary: undefined as unknown as HistoricalTrainee,
    records: [] as HistoricalTrainee[],
    allDuties: [] as DutyRecord[],
    isActive: false,
  };

  const handleStartEditProfile = () => {
    if (!isAdmin) {
      setShowPinPrompt(true);
      setPinInput("");
      setPinError("");
      return;
    }
    if (primary) {
      const match = primary.name.match(
        /^(นาย|นางสาว|นาง|ดร\.|นาวาเอก|นาวาโท|นาวาตรี|เรือเอก|พ\.ต\.อ\.|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.|ว่าที่ ร\.ต\.|ว่าที่ร้อยตรี)\s*(.*)$/
      );
      const detectedPrefix = primary.prefix || (match ? match[1] : "");
      const detectedName = match
        ? match[2]
        : primary.prefix
        ? primary.name.replace(new RegExp(`^${primary.prefix}\\s*`), "")
        : primary.name;

      setEditPrefix(detectedPrefix);
      setEditName(detectedName.trim());
      setEditGroup(primary.affiliationGroup || AFFILIATION_GROUPS[0]);
      setEditAffiliationName(primary.affiliation || "");
      setEditPersonnelId(primary.personnelId || "");
      setEditIdCard(primary.idCard || "");
      setEditStatus(primary.status || "active");
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = () => {
    if (!primary) return;
    if (!editAffiliationName.trim()) {
      alert("กรุณาระบุชื่อสมาคมหรือสังกัดหน่วยงาน");
      return;
    }
    const cleanFull = editPrefix ? `${editPrefix.trim()} ${editName.trim()}`.trim() : editName.trim();
    if (!cleanFull) {
      alert("กรุณาระบุชื่อ-นามสกุล");
      return;
    }

    const targetKey = primary.personnelId || primary.idCard || primary.id;
    const count = updatePersonProfile(targetKey, {
      prefix: editPrefix.trim(),
      name: cleanFull,
      affiliationGroup: editGroup,
      affiliation: editAffiliationName.trim(),
      personnelId: editPersonnelId.trim(),
      idCard: editIdCard.trim() || undefined,
      status: editStatus,
    });

    setIsEditingProfile(false);
    setToastMessage(`✓ บันทึกข้อมูลบุคลากรเรียบร้อยแล้ว (อัปเดตทุกหลักสูตร ${count} รายการ)`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(pinInput.trim())) {
      setShowPinPrompt(false);
      setPinError("");
      handleStartEditProfile();
    } else {
      setPinError("รหัส PIN ไม่ถูกต้อง (รหัสเริ่มต้น: 336699)");
    }
  };

  if (!passport) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
          <p className="text-gray-600">ไม่พบข้อมูลประวัติบุคลากร</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg bg-[#16265E] px-4 py-2 text-sm text-white"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  // Format masked ID card (e.g., 1-1005-XXXXX-56)
  const cleanId = primary.idCard.replace(/\D/g, "");
  const maskedId =
    cleanId.length === 13
      ? `${cleanId.slice(0, 1)}-${cleanId.slice(1, 5)}-XXXXX-${cleanId.slice(10, 12)}-${cleanId.slice(12)}`
      : primary.idCard;

  // PDPA Protection: Mask phone number for public visitors, reveal full number only to authenticated admins
  const maskedPhone = useMemo(() => {
    if (!primary.phone) return "";
    if (isAdmin) return primary.phone;
    const digits = primary.phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-XXX-${digits.slice(6)}`;
    }
    if (digits.length === 9) {
      return `${digits.slice(0, 2)}-XXX-${digits.slice(5)}`;
    }
    return primary.phone.length > 5
      ? `${primary.phone.slice(0, 3)}***${primary.phone.slice(-2)}`
      : primary.phone;
  }, [primary.phone, isAdmin]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/65 p-3 sm:p-5 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative my-6 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Passport Header Banner */}
        <div className="relative bg-gradient-to-r from-[#0d1b3e] via-[#16265E] to-[#1e3a8a] p-5 sm:p-6 text-white">
          {/* Subtle watermark / decorative */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute right-24 bottom-0 h-20 w-20 rounded-full bg-[#f59e0b]/10 blur-xl" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            title="ปิดหน้าต่าง (Esc)"
          >
            ✕
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Avatar / Photo */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-white/20 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-2xl font-bold text-white shadow-md">
              {primary.name.replace(/^(นาย|นางสาว|นาง|ดร\.|ร\.ต\.อ\.|พ\.จ\.ต\.|ส\.อ\.)\s*/, "").slice(0, 2)}
              <span
                className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#16265E] text-xs ${
                  isActive ? "bg-[#10b981] text-white" : "bg-[#94a3b8] text-white"
                }`}
                title={isActive ? "สถานะ: มีการปฏิบัติหน้าที่ต่อเนื่อง (Active)" : "สถานะ: ยังไม่มีประวัติปฏิบัติหน้าที่ในรอบปี"}
              >
                {isActive ? "✓" : "–"}
              </span>
            </div>

            {/* Title & Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#f59e0b] px-2 py-0.5 text-[11px] font-bold text-[#1e1b4b] shadow-xs">
                  พาสปอร์ตบุคลากรกีฬา กกท.
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    isActive
                      ? "bg-[#10b981]/25 text-[#6ee7b7] border border-[#10b981]/40"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  {isActive ? "🟢 ปฏิบัติหน้าที่ต่อเนื่อง (Active)" : "⚪ รอรายงานผลงาน (Inactive)"}
                </span>
              </div>

              <h2 className="mt-1.5 text-xl font-bold text-white tracking-tight truncate">
                {primary.name}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-blue-100/85">
                {primary.personnelId && <span>🆔 รหัส {primary.personnelId}</span>}
                {cleanId.length === 13 && <span>🪪 {maskedId}</span>}
                {primary.affiliationGroup && (
                  <span className="rounded-md bg-white/20 px-2 py-0.5 font-bold text-amber-300">
                    🏛️ {primary.affiliationGroup}
                  </span>
                )}
                <span>📍 {primary.affiliation}</span>
                {primary.phone && (
                  <span
                    title={
                      isAdmin
                        ? "เบอร์โทรศัพท์ (เจ้าหน้าที่ผู้ดูแลระบบ)"
                        : "เบอร์โทรศัพท์ (ซ่อนบางส่วนเพื่อความปลอดภัยตาม PDPA)"
                    }
                  >
                    📞 {maskedPhone}
                  </span>
                )}
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={handleStartEditProfile}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1e1b4b] px-3 py-1 text-xs font-bold border border-amber-300/60 transition-all cursor-pointer shadow-md"
                    title="แก้ไขข้อมูลบุคลากร คำนำหน้า ชื่อ-สกุล สังกัด กลุ่มหน่วยงาน (Admin)"
                  >
                    <span>✏️</span>
                    <span>แก้ไขข้อมูลบุคลากร (Admin)</span>
                  </button>
                ) : cleanId.length === 13 ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 text-emerald-300 px-2.5 py-1 text-[11px] font-bold border border-emerald-400/30">
                    <span>✓</span>
                    <span>ยืนยันตัวตนแล้ว</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-[#1e1b4b] px-3 py-1 text-xs font-black border border-amber-200 transition-all cursor-pointer shadow-md"
                    title="ท่านคือเจ้าของชื่อนี้? คลิกเพื่อยืนยันตัวตนด้วยเลขบัตร ปชช. 13 หลัก"
                  >
                    <span>🪪</span>
                    <span>ท่านคือเจ้าของประวัตินี้? ยืนยันตัวตน</span>
                  </button>
                )}
              </div>

              {/* Trainee Identity Claim Callout for Non-Admins */}
              {!isAdmin && cleanId.length !== 13 && (
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl bg-amber-400/15 border border-amber-300/30 p-3 text-xs text-amber-200 backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📢</span>
                    <span className="leading-relaxed">
                      ประวัตินี้ยังไม่ได้ผูกกับเลขประจำตัวประชาชน 13 หลัก หากท่านคือ <strong>{primary.name}</strong> สามารถยืนยันตัวตนเพื่อรับสิทธิ์เข้าถึงพาสปอร์ตดิจิทัลและส่งรายงานผลงาน
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(true)}
                    className="shrink-0 rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-black text-[#1e1b4b] hover:bg-amber-300 transition-all shadow-md cursor-pointer self-start sm:self-auto"
                  >
                    ยืนยันตัวตน 🪪
                  </button>
                </div>
              )}

              {/* Toast inside Passport */}
              {toastMessage && (
                <div className="mt-2.5 rounded-lg bg-emerald-500/90 text-white px-3 py-1.5 text-xs font-bold shadow-md animate-in fade-in duration-150">
                  {toastMessage}
                </div>
              )}

              {/* Inline Edit Profile Form */}
              {isEditingProfile && (
                <div className="mt-3 rounded-2xl bg-black/40 p-4 border border-white/20 backdrop-blur-md space-y-3.5 animate-in fade-in-50 duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300 border-b border-white/10 pb-2">
                    <span className="flex items-center gap-1.5">
                      <span>✏️</span>
                      <span>แก้ไขข้อมูลบุคลากร (Admin)</span>
                    </span>
                    <span className="text-[10.5px] text-blue-200 font-normal">
                      จะอัปเดตทุกหลักสูตรของบุคคลนี้ ({records.length} รายการ)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {/* Prefix */}
                    <div>
                      <label className="text-[11px] text-blue-200 font-semibold block mb-1">
                        คำนำหน้าชื่อ:
                      </label>
                      <input
                        type="text"
                        value={editPrefix}
                        onChange={(e) => setEditPrefix(e.target.value)}
                        placeholder="เช่น นาย, นางสาว, ดร."
                        list="prefix-options"
                        className="w-full rounded-lg bg-white text-gray-900 p-2 text-xs font-semibold focus:outline-hidden"
                      />
                      <datalist id="prefix-options">
                        <option value="นาย" />
                        <option value="นางสาว" />
                        <option value="นาง" />
                        <option value="ดร." />
                        <option value="นาวาเอก" />
                        <option value="นาวาโท" />
                        <option value="นาวาตรี" />
                        <option value="เรือเอก" />
                        <option value="พ.ต.อ." />
                        <option value="ร.ต.อ." />
                        <option value="พ.จ.ต." />
                        <option value="ส.อ." />
                        <option value="ว่าที่ ร.ต." />
                      </datalist>
                    </div>

                    {/* Name */}
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-blue-200 font-semibold block mb-1">
                        ชื่อ - นามสกุล:
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="ชื่อและนามสกุล"
                        className="w-full rounded-lg bg-white text-gray-900 p-2 text-xs font-semibold focus:outline-hidden"
                      />
                    </div>

                    {/* Group */}
                    <div>
                      <label className="text-[11px] text-blue-200 font-semibold block mb-1">
                        กลุ่มหน่วยงาน (5 กลุ่มหลัก):
                      </label>
                      <select
                        value={editGroup}
                        onChange={(e) => setEditGroup(e.target.value)}
                        className="w-full rounded-lg bg-white text-gray-900 p-2 text-xs font-semibold focus:outline-hidden"
                      >
                        {AFFILIATION_GROUPS.map((grp) => (
                          <option key={grp} value={grp}>
                            {grp}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Affiliation name */}
                    <div className="sm:col-span-2">
                      <label className="text-[11px] text-blue-200 font-semibold block mb-1">
                        ชื่อสมาคม / สังกัด / หน่วยงาน:
                      </label>
                      <input
                        type="text"
                        value={editAffiliationName}
                        onChange={(e) => setEditAffiliationName(e.target.value)}
                        placeholder="เช่น สมาคมกีฬาว่ายน้ำแห่งประเทศไทย"
                        className="w-full rounded-lg bg-white text-gray-900 p-2 text-xs font-semibold focus:outline-hidden"
                      />
                    </div>

                    {/* Personnel ID */}
                    <div>
                      <label className="text-[11px] text-blue-200 font-semibold block mb-1">
                        รหัสประจำตัวบุคลากร:
                      </label>
                      <input
                        type="text"
                        value={editPersonnelId}
                        onChange={(e) => setEditPersonnelId(e.target.value)}
                        placeholder="เช่น USR-2026-0001"
                        className="w-full rounded-lg bg-white text-gray-900 p-2 text-xs font-mono font-semibold focus:outline-hidden"
                      />
                    </div>

                    {/* ID Card */}
                    <div>
                      <label className="text-[11px] text-blue-200 font-semibold block mb-1">
                        เลขบัตรประจำตัวประชาชน:
                      </label>
                      <input
                        type="text"
                        value={editIdCard}
                        onChange={(e) => setEditIdCard(e.target.value)}
                        placeholder="เลข 13 หลัก"
                        className="w-full rounded-lg bg-white text-gray-900 p-2 text-xs font-mono font-semibold focus:outline-hidden"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-[11px] text-blue-200 font-semibold block mb-1">
                        สถานะการทำหน้าที่:
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                        className="w-full rounded-lg bg-white text-gray-900 p-2 text-xs font-semibold focus:outline-hidden"
                      >
                        <option value="active">🟢 Active (ทำหน้าที่ต่อเนื่อง)</option>
                        <option value="pending_verification">🟡 รอตรวจสอบ</option>
                        <option value="inactive">⚪ Inactive (ยังไม่มีบันทึก)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="rounded-lg bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/20 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <span>✓</span>
                      <span>บันทึกข้อมูลบุคลากร</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Summary Strip */}
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-black/25 p-2.5 text-center text-xs backdrop-blur-xs">
            <div>
              <p className="text-white/60 text-[11px]">หลักสูตรที่สำเร็จ</p>
              <p className="text-base font-bold text-[#facc15]">{records.length} หลักสูตร</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-white/60 text-[11px]">ประวัติการปฏิบัติหน้าที่</p>
              <p className="text-base font-bold text-white">{allDuties.length} รายการ</p>
            </div>
            <div>
              <p className="text-white/60 text-[11px]">สถานะการรับรอง</p>
              <p className="text-base font-bold text-[#34d399]">
                {allDuties.filter((d) => d.verified).length} / {allDuties.length} ผ่าน
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-5 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("certs")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
              activeTab === "certs"
                ? "border-[#16265E] font-bold text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>📜</span>
            <span>วุฒิบัตรและหลักสูตรที่สำเร็จ ({records.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("duties")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
              activeTab === "duties"
                ? "border-[#16265E] font-bold text-[#16265E]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>🏃</span>
            <span>ประวัติการปฏิบัติหน้าที่ ({allDuties.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="max-h-[50vh] overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeTab === "certs" && (
            <div className="space-y-3">
              {records.map((cert, idx) => (
                <div
                  key={cert.id || idx}
                  className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-xs hover:border-blue-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e0e7ff] text-[#4338ca] font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-[#16265E] text-sm sm:text-base">
                            {cert.courseTitle}
                          </h4>
                          {cert.courseCategory && (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">
                              {cert.courseCategory}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{cert.batch} · ประจำปี พ.ศ. {cert.yearBE}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        ✓ ผ่านการอบรม
                      </span>
                      {isAdmin && onDeleteTrainee && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `ต้องการลบประวัติวุฒิบัตรหลักสูตร "${cert.courseTitle}" (รุ่นปี ${cert.yearBE}) ของ ${primary?.name} ออกจากระบบใช่หรือไม่?\n\n* ข้อมูลจะถูกลบออกจากระบบทันที`
                              )
                            ) {
                              onDeleteTrainee(cert.id);
                              setToastMessage(`ลบหลักสูตร "${cert.courseTitle}" เรียบร้อยแล้ว`);
                            }
                          }}
                          className="rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                          title="ลบวุฒิบัตรหลักสูตรนี้ (Admin)"
                        >
                          🗑️ ลบ
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">วันที่สำเร็จการอบรม:</span>
                      <span className="font-medium text-gray-800">{cert.passedDate || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">กลุ่มหน่วยงาน:</span>
                      <span className="font-medium text-gray-800">{cert.affiliationGroup || "-"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <span className="text-gray-400">ชื่อสมาคม/หน่วยงาน:</span>
                      <span className="font-medium text-gray-800">{cert.affiliation}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "duties" && (
            <div className="space-y-3">
              {allDuties.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                  <span className="text-3xl">📋</span>
                  <p className="mt-2 text-sm font-semibold text-gray-700">
                    ยังไม่มีข้อมูลประวัติการปฏิบัติหน้าที่
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    สามารถกดปุ่ม "บันทึกการปฏิบัติหน้าที่ใหม่" ด้านล่าง เพื่อเพิ่มรายการทัวร์นาเมนต์หรือกิจกรรมที่ไปทำหน้าที่
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddDuty(primary)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#16265E] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1e3a8a]"
                  >
                    + บันทึกการปฏิบัติหน้าที่รายการแรก
                  </button>
                </div>
              ) : (
                allDuties.map((duty, idx) => (
                  <div
                    key={duty.id || idx}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs transition-colors hover:border-blue-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                            {idx + 1}
                          </span>
                          <h4 className="font-bold text-gray-900 text-sm">
                            {duty.eventName}
                          </h4>
                        </div>
                        <p className="text-xs font-semibold text-[#16265E] mt-1 pl-7">
                          บทบาท: {duty.role}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pl-7 sm:pl-0">
                        {duty.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            ✓ กกท. รับรองแล้ว
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                              ⏳ รอเจ้าหน้าที่ตรวจสอบ
                            </span>
                            {isAdmin && onVerifyDuty && (
                              <button
                                type="button"
                                onClick={() => onVerifyDuty(duty.id)}
                                className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                              >
                                กดอนุมัติ
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 pl-7 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-600">
                      <div>
                        <span className="text-gray-400">ช่วงเวลา: </span>
                        <span>{duty.startDate} {duty.endDate ? `ถึง ${duty.endDate}` : ""}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">หน่วยงานที่มอบหมาย: </span>
                        <span>{duty.organization}</span>
                      </div>
                      {duty.location && (
                        <div>
                          <span className="text-gray-400">สถานที่: </span>
                          <span>{duty.location}</span>
                        </div>
                      )}
                      {duty.achievement && (
                        <div className="sm:col-span-2 text-emerald-800 font-medium bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                          🎯 ผลสัมฤทธิ์/ผลงาน: {duty.achievement}
                        </div>
                      )}
                      {duty.knowledgeApplied && (
                        <div className="sm:col-span-2 rounded-xl bg-blue-50/70 p-3 border border-blue-200 text-xs">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-[#16265E] flex items-center gap-1.5">
                              <span>💡</span>
                              <span>การนำความรู้จากการอบรมไปใช้จริง:</span>
                            </span>
                            {duty.impactRating && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                                ⭐ {duty.impactRating}/5 ประสิทธิผล
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700 italic leading-relaxed">
                            "{duty.knowledgeApplied}"
                          </p>
                          {duty.knowledgeDimensions && duty.knowledgeDimensions.length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1 border-t border-blue-100">
                              {duty.knowledgeDimensions.map((dimKey) => {
                                const dimInfo = KNOWLEDGE_DIMENSIONS.find((k) => k.key === dimKey);
                                return (
                                  <span
                                    key={dimKey}
                                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-900 border border-blue-200 shadow-2xs"
                                  >
                                    <span>{dimInfo?.icon || "🏷️"}</span>
                                    <span>{dimInfo?.label.split(" (")[0] || dimKey}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3.5 sm:px-6">
          <div className="text-xs text-gray-500">
            กองพัฒนาบุคลากรกีฬา · การกีฬาแห่งประเทศไทย
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={handleStartEditProfile}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 transition-colors cursor-pointer"
                title="แก้ไขข้อมูลบุคลากร คำนำหน้า ชื่อ-สกุล สังกัด กลุ่มหน่วยงาน (Admin)"
              >
                <span>✏️</span>
                <span>แก้ไขข้อมูลบุคลากร</span>
              </button>
            )}
            {onOpenDigitalPass && (
              <button
                type="button"
                onClick={() => onOpenDigitalPass(primary.idCard)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-3.5 py-2 text-xs font-bold text-[#1e1b4b] shadow-xs hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer"
                title="เปิดบัตรดิจิทัลบุคลากรกีฬาและ QR ตรวจสอบหน้างาน"
              >
                <span>📱</span>
                <span>บัตรดิจิทัล (E-Badge)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onAddDuty(primary)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16265E] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#1e3a8a] transition-colors"
            >
              <span>➕</span>
              <span>รายงานการปฏิบัติหน้าที่</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span>🖨️</span>
              <span>พิมพ์</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>

      {/* Admin PIN Unlock Modal */}
      {showPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                🔒
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">ยืนยันสิทธิ์ผู้ดูแลระบบ (Admin)</h4>
                <p className="text-xs text-gray-500">กรอกรหัส PIN เพื่อปลดล็อกสิทธิ์แก้ไขข้อมูลสังกัด</p>
              </div>
            </div>
            <form onSubmit={handleUnlockPin} className="mt-4 space-y-3">
              <div>
                <input
                  type="password"
                  placeholder="รหัส PIN 6 หลัก (มาตรฐาน: 336699)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-center text-sm font-mono tracking-widest focus:border-[#16265E] focus:outline-hidden"
                  autoFocus
                />
                {pinError && <p className="mt-1 text-xs text-rose-600 font-semibold text-center">{pinError}</p>}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinPrompt(false)}
                  className="rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#16265E] px-4 py-2 text-xs font-bold text-white hover:bg-[#111e4a] cursor-pointer"
                >
                  ปลดล็อกและเริ่มแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Claim Profile Modal */}
      {isClaimModalOpen && primary && (
        <ClaimProfileModal
          trainee={{
            id: primary.id,
            personnelId: primary.personnelId,
            name: primary.name,
            affiliation: primary.affiliation,
            affiliationGroup: primary.affiliationGroup,
            courseTitle: primary.courseTitle,
            latestYearBE: primary.yearBE,
            totalCoursesCount: records.length,
          }}
          onClose={() => setIsClaimModalOpen(false)}
          onSuccess={(claimId) => {
            setToastMessage(`✓ ส่งคำขอยืนยันตัวตนเรียบร้อยแล้ว (รหัส: ${claimId})`);
            setTimeout(() => setToastMessage(null), 5000);
          }}
        />
      )}
    </div>
  );
}
