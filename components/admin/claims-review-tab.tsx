"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  useProfileClaimsStore,
  approveProfileClaim,
  rejectProfileClaim,
  deleteProfileClaim,
  type ProfileClaim,
} from "@/lib/claims-store";
import { formatThaiIdCard } from "@/lib/validation";

export function ClaimsReviewTab() {
  const { claims, pendingCount } = useProfileClaimsStore();
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [actionClaim, setActionClaim] = useState<ProfileClaim | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.traineeName.toLowerCase().includes(q) || c.claimantName.toLowerCase().includes(q);
        const matchId = c.idCard.includes(q) || c.traineePersonnelId.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
        const matchAffil = c.currentAffiliation.toLowerCase().includes(q);
        return matchName || matchId || matchAffil;
      }
      return true;
    });
  }, [claims, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) => c.status === "pending").length;
    const approved = claims.filter((c) => c.status === "approved").length;
    const rejected = claims.filter((c) => c.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [claims]);

  const handleApprove = (claim: ProfileClaim) => {
    if (
      !confirm(
        `ยืนยันการอนุมัติคำขอของ "${claim.traineeName}" ใช่หรือไม่?\n\nระบบจะทำการอัปเดตเลขประจำตัวประชาชน 13 หลัก (${formatThaiIdCard(
          claim.idCard
        )}) และเบอร์โทรศัพท์เข้าสู่ประวัติในทำเนียบ กกท. ทุกหลักสูตรโดยอัตโนมัติ`
      )
    ) {
      return;
    }

    const res = approveProfileClaim(claim.id, "ผู้ดูแลระบบ กกท.");
    if (res.success) {
      showToast(
        `✓ อนุมัติและผูกสิทธิ์สำเร็จ! อัปเดตประวัติของ ${claim.traineeName} จำนวน ${res.updatedCount} รายการหลักสูตร`
      );
    } else {
      alert(`เกิดข้อผิดพลาด: ${res.error}`);
    }
  };

  const handleConfirmReject = () => {
    if (!actionClaim) return;
    const res = rejectProfileClaim(
      actionClaim.id,
      rejectReason || "ข้อมูลหรือหลักฐานไม่เพียงพอ",
      "ผู้ดูแลระบบ กกท."
    );
    if (res.success) {
      showToast(`✕ ปฏิเสธคำขอของ ${actionClaim.traineeName} แล้ว`);
      setIsRejectOpen(false);
      setActionClaim(null);
      setRejectReason("");
    } else {
      alert(`เกิดข้อผิดพลาด: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl bg-emerald-700 text-white px-5 py-3.5 text-xs sm:text-sm font-bold shadow-xl border border-emerald-500 animate-in slide-in-from-top-3 flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header and Explanation */}
      <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-xs border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#16265E] text-white text-base">
                🪪
              </span>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                ตรวจสอบคำขอยืนยันตัวตนเจ้าของประวัติ (Identity Claim Queue)
              </h2>
            </div>
            <p className="text-xs text-gray-500">
              ตรวจสอบคำขอผูกเลขประจำตัวประชาชน 13 หลัก จากโค้ช ผู้ตัดสิน และผู้บริหารกีฬา เพื่อมอบสิทธิ์เข้าถึงพาสปอร์ตดิจิทัล
            </p>
          </div>

          {/* Quick Counter */}
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 border border-amber-200 shadow-2xs">
              ⏳ รอตรวจสอบ: <strong>{stats.pending}</strong> รายการ
            </span>
            <span className="rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
              ✓ ผูกสิทธิ์แล้ว: <strong>{stats.approved}</strong> รายการ
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setFilterStatus("pending")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filterStatus === "pending"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              รอการตรวจสอบ ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("approved")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filterStatus === "approved"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              อนุมัติแล้ว ({stats.approved})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("rejected")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filterStatus === "rejected"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ปฏิเสธ ({stats.rejected})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filterStatus === "all"
                  ? "bg-[#16265E] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, เลขบัตร 13 หลัก, หรือสังกัด..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-[#16265E] focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-xs border border-gray-200 space-y-2">
          <span className="text-3xl">📭</span>
          <h3 className="text-sm font-bold text-gray-700">ไม่มีคำขอยืนยันตัวตนในสถานะนี้</h3>
          <p className="text-xs text-gray-400">
            {filterStatus === "pending"
              ? "ปัจจุบันไม่มีคำขอใหม่ที่ค้างรอการตรวจสอบ"
              : "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา"}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id}
              className={`rounded-2xl bg-white p-5 shadow-xs border transition-all ${
                claim.status === "pending"
                  ? "border-amber-300 bg-amber-50/10 hover:border-amber-400"
                  : claim.status === "approved"
                  ? "border-emerald-200 bg-emerald-50/10"
                  : "border-gray-200 opacity-80"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Target Profile and Claim Info */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-gray-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-gray-700">
                      {claim.id}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        claim.status === "pending"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : claim.status === "approved"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-red-100 text-red-900 border border-red-300"
                      }`}
                    >
                      {claim.status === "pending"
                        ? "⏳ รอการตรวจสอบ"
                        : claim.status === "approved"
                        ? "✓ อนุมัติและผูกสิทธิ์แล้ว"
                        : "✕ ปฏิเสธคำขอ"}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      ยื่นเมื่อ: {new Date(claim.submittedAt).toLocaleDateString("th-TH")} (
                      {new Date(claim.submittedAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} น.)
                    </span>
                  </div>

                  {/* Comparison Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Column 1: Record in SAT Registry */}
                    <div className="rounded-xl bg-gray-50 p-3 border border-gray-200/80">
                      <span className="text-[10px] font-bold text-[#16265E] uppercase tracking-wider block mb-1">
                        🏛️ ข้อมูลเดิมในทำเนียบ กกท.
                      </span>
                      <p className="text-sm font-black text-gray-900">{claim.traineeName}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        📍 สังกัด: {claim.currentAffiliation}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        🎓 หลักสูตร: {claim.currentCourseTitle}
                        {claim.latestYearBE ? ` · ผ่านรุ่นปี ${claim.latestYearBE}` : ""}
                      </p>
                      <p className="text-[10.5px] font-mono text-gray-400 mt-1">
                        รหัสชั่วคราว: {claim.traineePersonnelId}
                      </p>
                    </div>

                    {/* Column 2: Claimant Submitted Data */}
                    <div className="rounded-xl bg-blue-50/60 p-3 border border-blue-200">
                      <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
                        🪪 ข้อมูลที่ขอยืนยันเพื่อผูกสิทธิ์
                      </span>
                      <p className="text-sm font-bold text-blue-950 flex items-center gap-2">
                        <span>เลขบัตร ปชช:</span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-blue-300 text-[#16265E] font-black">
                          {formatThaiIdCard(claim.idCard)}
                        </span>
                      </p>
                      <p className="text-xs text-blue-900 mt-1">
                        📞 เบอร์โทรศัพท์: <strong>{claim.phone}</strong>
                      </p>
                      {claim.email && (
                        <p className="text-xs text-blue-900 mt-0.5">
                          ✉️ อีเมล: {claim.email}
                        </p>
                      )}
                      {claim.newAffiliation && claim.newAffiliation !== claim.currentAffiliation && (
                        <p className="text-xs text-amber-800 mt-0.5 font-semibold">
                          🔄 ขออัปเดตสังกัด: {claim.newAffiliation}
                        </p>
                      )}
                      {claim.note && (
                        <p className="text-[11px] text-gray-600 italic mt-1 bg-white/70 p-1.5 rounded-md border border-gray-200">
                          &quot;{claim.note}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Evidence photo & Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-center sm:items-end justify-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-5">
                  {/* Proof Photo Button */}
                  {claim.idCardPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(claim.idCardPhotoUrl || null)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-gray-300 px-3.5 py-1.5 text-xs font-bold text-[#16265E] hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>📷</span>
                      <span>เปิดดูภาพหลักฐาน</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400 italic">ไม่มีแนบรูปถ่าย</span>
                  )}

                  {/* Actions for Pending */}
                  {claim.status === "pending" && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleApprove(claim)}
                        className="flex-1 sm:flex-initial rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>อนุมัติและผูกสิทธิ์</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActionClaim(claim);
                          setIsRejectOpen(true);
                        }}
                        className="rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  )}

                  {/* Approved Info */}
                  {claim.status === "approved" && (
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-emerald-800">✓ ผูกสิทธิ์สำเร็จแล้ว</p>
                      <p className="text-[10px] text-gray-400">
                        โดย: {claim.reviewedBy || "Admin"} ·{" "}
                        {claim.reviewedAt
                          ? new Date(claim.reviewedAt).toLocaleDateString("th-TH")
                          : ""}
                      </p>
                    </div>
                  )}

                  {/* Rejected Info */}
                  {claim.status === "rejected" && (
                    <div className="text-right max-w-xs">
                      <p className="text-[11px] font-bold text-red-700">เหตุผล: {claim.rejectionReason}</p>
                      <p className="text-[10px] text-gray-400">
                        โดย: {claim.reviewedBy || "Admin"} ·{" "}
                        {claim.reviewedAt
                          ? new Date(claim.reviewedAt).toLocaleDateString("th-TH")
                          : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("ต้องการลบคำขอนี้ใช่หรือไม่?")) {
                            deleteProfileClaim(claim.id);
                          }
                        }}
                        className="text-[10px] text-red-400 hover:text-red-600 underline mt-1 cursor-pointer"
                      >
                        ลบคำขอ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proof Photo Modal */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl bg-white p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold text-gray-800">ภาพถ่ายหลักฐานยืนยันตัวตน</h4>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>
            <div className="flex items-center justify-center bg-gray-100 rounded-xl overflow-hidden max-h-[70vh]">
              <img
                src={selectedPhoto}
                alt="ID Evidence"
                className="max-h-[68vh] w-auto object-contain"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="rounded-lg bg-gray-200 px-4 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-300 cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
      {isRejectOpen && actionClaim && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-gray-900">
              ระบุเหตุผลการปฏิเสธคำขอ ({actionClaim.traineeName})
            </h4>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                เลือกหรือพิมพ์เหตุผล:
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2 text-xs mb-2 focus:outline-hidden"
              >
                <option value="">-- เลือกเหตุผลทั่วไป --</option>
                <option value="ชื่อและนามสกุลไม่ตรงกับบัตรประจำตัวประชาชน">
                  ชื่อและนามสกุลไม่ตรงกับบัตรประจำตัวประชาชน
                </option>
                <option value="รูปถ่ายหลักฐานไม่ชัดเจน หรืออ่านเลขประจำตัวไม่เห็น">
                  รูปถ่ายหลักฐานไม่ชัดเจน หรืออ่านเลขประจำตัวไม่เห็น
                </option>
                <option value="เลขประจำตัวประชาชนไม่ถูกต้องตามหลักทะเบียนราษฎร์">
                  เลขประจำตัวประชาชนไม่ถูกต้องตามหลักทะเบียนราษฎร์
                </option>
                <option value="ไม่พบหลักฐานความเชื่อมโยงกับสมาคมกีฬาที่ระบุ">
                  ไม่พบหลักฐานความเชื่อมโยงกับสมาคมกีฬาที่ระบุ
                </option>
              </select>

              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="หรือระบุข้อความเหตุผลเพิ่มเติม..."
                className="w-full rounded-xl border border-gray-300 p-2 text-xs focus:border-[#16265E] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setIsRejectOpen(false);
                  setActionClaim(null);
                  setRejectReason("");
                }}
                className="rounded-lg px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
              >
                ยืนยันปฏิเสธคำขอ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
