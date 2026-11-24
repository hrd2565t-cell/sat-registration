"use client";

import { useSyncExternalStore } from "react";
import { updatePersonProfile } from "./alumni-store";
import { isValidThaiIdCard } from "./validation";
import { isAdminAuthenticated } from "./admin-auth";

export interface ProfileClaim {
  id: string;
  traineeId: string;
  traineePersonnelId: string;
  traineeName: string;
  currentAffiliation: string;
  currentCourseTitle: string;
  latestYearBE?: number;
  totalCoursesCount?: number;

  // Claimant's submitted verification data
  claimantName: string;
  idCard: string; // 13-digit Thai National ID
  phone: string; // 10-digit mobile phone
  email?: string;
  newAffiliation?: string;
  note?: string;
  idCardPhotoUrl?: string; // Base64 data URL (cropped/capped)

  // Approval state
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export type ProfileClaimInput = Omit<
  ProfileClaim,
  "id" | "status" | "submittedAt" | "reviewedAt" | "reviewedBy" | "rejectionReason"
>;

const STORAGE_KEY = "sat_alumni_claims_prod_v1";
const INITIAL_CLAIMS: ProfileClaim[] = [];
const SERVER_SNAPSHOT: ClaimsStoreState = { claims: INITIAL_CLAIMS, revision: 0 };

interface ClaimsStoreState {
  claims: ProfileClaim[];
  revision: number;
}

let storeState: ClaimsStoreState = {
  claims: [...INITIAL_CLAIMS],
  revision: 0,
};

let hasLoadedFromCloud = false;
let hydrateStarted = false;
let focusListenersAttached = false;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function clearLocalClaimsCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage access issues
  }
}

function saveToLocalStorage(claims: ProfileClaim[]) {
  if (typeof window === "undefined" || !isAdminAuthenticated()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  } catch (error) {
    console.error("Failed to save claims cache:", error);
  }
}

function loadFromLocalStorage(): ProfileClaim[] | null {
  if (typeof window === "undefined" || !isAdminAuthenticated()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to load claims cache:", error);
  }
  return null;
}

/**
 * โหลดรายการคำร้องยืนยันตัวตนจาก API ฝั่งเซิร์ฟเวอร์ (เฉพาะผู้ดูแลระบบเท่านั้น)
 * ผู้ใช้ทั่วไปจะล้างข้อมูลคำร้องออกจากหน่วยความจำและเบราว์เซอร์ทันทีตามหลัก PDPA
 */
export async function refreshClaimsFromCloud(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!isAdminAuthenticated()) {
    clearLocalClaimsCache();
    hasLoadedFromCloud = false;
    hydrateStarted = false;
    if (storeState.claims.length > 0) {
      storeState = { claims: [], revision: storeState.revision + 1 };
      emitChange();
    }
    return;
  }

  try {
    const res = await fetch("/api/claims", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      clearLocalClaimsCache();
      hasLoadedFromCloud = false;
      if (storeState.claims.length > 0) {
        storeState = { claims: [], revision: storeState.revision + 1 };
        emitChange();
      }
      return;
    }

    if (!res.ok) return;

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      claims?: ProfileClaim[];
    };

    if (data.ok && Array.isArray(data.claims)) {
      hasLoadedFromCloud = true;
      storeState = {
        claims: data.claims,
        revision: storeState.revision + 1,
      };
      saveToLocalStorage(data.claims);
      emitChange();
    }
  } catch (err) {
    console.warn("Failed to refresh profile claims from cloud:", err);
  }
}

function hydrateClaims() {
  if (typeof window === "undefined") return;

  if (!isAdminAuthenticated()) {
    clearLocalClaimsCache();
    hasLoadedFromCloud = false;
    hydrateStarted = false;
    return;
  }

  if (!hydrateStarted) {
    hydrateStarted = true;
    const saved = loadFromLocalStorage();
    if (saved && saved.length > 0 && storeState.claims.length === 0) {
      storeState = {
        claims: saved,
        revision: storeState.revision + 1,
      };
    }
    void refreshClaimsFromCloud();
  }

  if (!focusListenersAttached) {
    focusListenersAttached = true;
    const handleFocusOrVisible = () => {
      if (document.visibilityState === "visible" && isAdminAuthenticated()) {
        void refreshClaimsFromCloud();
      }
    };
    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);
  }
}

// ล้างแคชเก่าทันทีหากไม่ได้อยู่ในสถานะผู้ดูแลระบบ (ป้องกันข้อมูล PDPA ค้างจากเวอร์ชันเดิม)
if (typeof window !== "undefined") {
  if (isAdminAuthenticated()) {
    const saved = loadFromLocalStorage();
    if (saved && saved.length > 0) {
      storeState = {
        claims: saved,
        revision: 1,
      };
    }
  } else {
    clearLocalClaimsCache();
  }
}

export function useProfileClaimsStore() {
  hydrateClaims();
  const current = useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => storeState,
    () => SERVER_SNAPSHOT
  );

  return {
    claims: current.claims,
    hasLoadedFromCloud,
    pendingClaims: current.claims.filter((c) => c.status === "pending"),
    approvedClaims: current.claims.filter((c) => c.status === "approved"),
    rejectedClaims: current.claims.filter((c) => c.status === "rejected"),
    pendingCount: current.claims.filter((c) => c.status === "pending").length,
  };
}

export function usePendingClaimsCount(): number {
  const { pendingCount } = useProfileClaimsStore();
  return pendingCount;
}

/**
 * ตรวจสอบสถานะคำร้องที่ค้างอยู่ด้วยเลขบัตรประชาชน (สำหรับผู้สมัครทั่วไปเช็กสถานะตนเอง)
 */
export async function checkPendingClaimStatus(
  idCard: string
): Promise<{ hasPending: boolean; claimId?: string }> {
  const cleanId = idCard.replace(/\D/g, "");
  if (cleanId.length !== 13 || !isValidThaiIdCard(cleanId)) {
    return { hasPending: false };
  }

  try {
    const res = await fetch("/api/claims/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCard: cleanId }),
    });
    if (!res.ok) return { hasPending: false };
    const data = (await res.json().catch(() => ({}))) as {
      hasPending?: boolean;
      claimId?: string;
    };
    return {
      hasPending: Boolean(data.hasPending),
      claimId: data.claimId,
    };
  } catch {
    return { hasPending: false };
  }
}

/**
 * ส่งคำร้องขอยืนยันตัวตนไปยัง API ฝั่งเซิร์ฟเวอร์ (เข้ารหัสจัดเก็บอย่างปลอดภัย)
 */
export async function submitProfileClaim(
  input: ProfileClaimInput
): Promise<{ success: boolean; claim?: ProfileClaim; error?: string }> {
  const cleanId = (input.idCard || "").replace(/\D/g, "");
  if (!cleanId || cleanId.length !== 13) {
    return { success: false, error: "เลขประจำตัวประชาชนต้องมี 13 หลัก" };
  }

  if (!isValidThaiIdCard(cleanId)) {
    return {
      success: false,
      error: "เลขประจำตัวประชาชนไม่ถูกต้องตามหลักการทะเบียนราษฎร์ (โปรดตรวจสอบอีกครั้ง)",
    };
  }

  try {
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        ...input,
        idCard: cleanId,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      claim?: ProfileClaim;
      error?: string;
    };

    if (!res.ok || !data.ok || !data.claim) {
      return {
        success: false,
        error: data.error || "ไม่สามารถส่งคำขอยืนยันตัวตนได้ โปรดลองใหม่อีกครั้ง",
      };
    }

    if (isAdminAuthenticated()) {
      void refreshClaimsFromCloud();
    }

    return { success: true, claim: data.claim };
  } catch (err) {
    console.warn("submitProfileClaim network error:", err);
    return {
      success: false,
      error: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง",
    };
  }
}

/**
 * อนุมัติคำร้องยืนยันตัวตนโดยผู้ดูแลระบบ และอัปเดตประวัติในทำเนียบ กกท.
 */
export async function approveProfileClaim(
  claimId: string,
  adminName = "เจ้าหน้าที่ กกท."
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    const res = await fetch("/api/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ claimId, action: "approve", adminName }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      claim?: ProfileClaim;
      claims?: ProfileClaim[];
      error?: string;
    };

    if (!res.ok || !data.ok || !data.claim) {
      return {
        success: false,
        updatedCount: 0,
        error: data.error || "ไม่พบข้อมูลคำขอยืนยันตัวตน หรือไม่มีสิทธิ์ดำเนินการ",
      };
    }

    const approvedClaim = data.claim;
    const identifier = approvedClaim.traineePersonnelId || approvedClaim.traineeName;
    const updatedRecords = updatePersonProfile(identifier, {
      idCard: approvedClaim.idCard,
      phone: approvedClaim.phone,
      email: approvedClaim.email,
      affiliation: approvedClaim.newAffiliation || approvedClaim.currentAffiliation,
      status: "active",
    });

    if (Array.isArray(data.claims)) {
      hasLoadedFromCloud = true;
      storeState = {
        claims: data.claims,
        revision: storeState.revision + 1,
      };
      saveToLocalStorage(data.claims);
      emitChange();
    }

    return { success: true, updatedCount: updatedRecords };
  } catch (err) {
    console.warn("approveProfileClaim error:", err);
    return {
      success: false,
      updatedCount: 0,
      error: "เกิดข้อผิดพลาดในการเชื่อมต่อเพื่ออนุมัติคำขอ",
    };
  }
}

/**
 * ปฏิเสธคำร้องยืนยันตัวตนโดยผู้ดูแลระบบ
 */
export async function rejectProfileClaim(
  claimId: string,
  reason: string,
  adminName = "เจ้าหน้าที่ กกท."
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        claimId,
        action: "reject",
        reason: reason || "เอกสารหรือหลักฐานไม่เพียงพอ",
        adminName,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      claims?: ProfileClaim[];
      error?: string;
    };

    if (!res.ok || !data.ok) {
      return {
        success: false,
        error: data.error || "ไม่สามารถปฏิเสธคำขอได้",
      };
    }

    if (Array.isArray(data.claims)) {
      hasLoadedFromCloud = true;
      storeState = {
        claims: data.claims,
        revision: storeState.revision + 1,
      };
      saveToLocalStorage(data.claims);
      emitChange();
    }

    return { success: true };
  } catch (err) {
    console.warn("rejectProfileClaim error:", err);
    return {
      success: false,
      error: "เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อปฏิเสธคำขอ",
    };
  }
}

/**
 * ลบคำร้องออกจากระบบ (เฉพาะผู้ดูแลระบบ)
 */
export async function deleteProfileClaim(
  claimId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `/api/claims?claimId=${encodeURIComponent(claimId)}`,
      {
        method: "DELETE",
        credentials: "same-origin",
      }
    );

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      claims?: ProfileClaim[];
      error?: string;
    };

    if (!res.ok || !data.ok) {
      return {
        success: false,
        error: data.error || "ไม่สามารถลบคำขอได้",
      };
    }

    if (Array.isArray(data.claims)) {
      hasLoadedFromCloud = true;
      storeState = {
        claims: data.claims,
        revision: storeState.revision + 1,
      };
      saveToLocalStorage(data.claims);
      emitChange();
    }

    return { success: true };
  } catch (err) {
    console.warn("deleteProfileClaim error:", err);
    return {
      success: false,
      error: "เกิดข้อผิดพลาดในการลบคำขอ",
    };
  }
}
