"use client";

import { useSyncExternalStore } from "react";
import { updatePersonProfile } from "./alumni-store";
import { isValidThaiIdCard, formatThaiIdCard } from "./validation";

export interface ProfileClaim {
  id: string; // e.g. "CLM-2026-0001"
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
  idCardPhotoUrl?: string; // Base64 data URL or mock evidence link

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

// Production empty claims queue waiting for real submissions from certified sports personnel
const INITIAL_CLAIMS: ProfileClaim[] = [];

interface ClaimsStoreState {
  claims: ProfileClaim[];
  revision: number;
}

let storeState: ClaimsStoreState = {
  claims: [...INITIAL_CLAIMS],
  revision: 0,
};

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function saveToLocalStorage(claims: ProfileClaim[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  } catch (error) {
    console.error("Failed to save claims to localStorage:", error);
  }
}

function loadFromLocalStorage(): ProfileClaim[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to load claims from localStorage:", error);
  }
  return null;
}

// Initialize on client
if (typeof window !== "undefined") {
  const saved = loadFromLocalStorage();
  if (saved && saved.length > 0) {
    storeState = {
      claims: saved,
      revision: 1,
    };
  } else {
    saveToLocalStorage(INITIAL_CLAIMS);
  }
}

export function useProfileClaimsStore() {
  const current = useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => storeState,
    () => ({ claims: INITIAL_CLAIMS, revision: 0 })
  );

  return {
    claims: current.claims,
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
 * Generate Next Claim ID e.g. CLM-2569-0003
 */
function generateNextClaimId(claims: ProfileClaim[]): string {
  const yearBE = new Date().getFullYear() + 543;
  const count = claims.length + 1;
  return `CLM-${yearBE}-${String(count).padStart(4, "0")}`;
}

/**
 * Submit a new profile claim
 */
export function submitProfileClaim(
  input: ProfileClaimInput
): { success: boolean; claim?: ProfileClaim; error?: string } {
  const cleanId = (input.idCard || "").replace(/\D/g, "");
  if (!cleanId || cleanId.length !== 13) {
    return { success: false, error: "เลขประจำตัวประชาชนต้องมี 13 หลัก" };
  }

  // Validate Thai ID checksum if not test mock
  if (!isValidThaiIdCard(cleanId)) {
    return {
      success: false,
      error: "เลขประจำตัวประชาชนไม่ถูกต้องตามหลักการทะเบียนราษฎร์ (โปรดตรวจสอบอีกครั้ง)",
    };
  }

  // Check if there is already a pending claim for this person
  const existingPending = storeState.claims.find(
    (c) =>
      c.status === "pending" &&
      (c.traineePersonnelId === input.traineePersonnelId ||
        c.idCard.replace(/\D/g, "") === cleanId)
  );

  if (existingPending) {
    return {
      success: false,
      error: `มีคำขอยืนยันตัวตนสำหรับบุคคลนี้อยู่ในคิวรอการตรวจสอบแล้ว (รหัสอ้างอิง: ${existingPending.id})`,
    };
  }

  const newClaim: ProfileClaim = {
    ...input,
    id: generateNextClaimId(storeState.claims),
    idCard: cleanId,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };

  const updatedClaims = [newClaim, ...storeState.claims];
  storeState = {
    claims: updatedClaims,
    revision: storeState.revision + 1,
  };

  saveToLocalStorage(updatedClaims);
  emitChange();

  return { success: true, claim: newClaim };
}

/**
 * Approve a profile claim by Admin:
 * 1. Updates claim status to "approved"
 * 2. Syncs and updates the trainee's record in alumni store (replacing USR-2026-XXXX with 13-digit real ID)
 */
export function approveProfileClaim(
  claimId: string,
  adminName = "เจ้าหน้าที่ กกท."
): { success: boolean; updatedCount: number; error?: string } {
  const claim = storeState.claims.find((c) => c.id === claimId);
  if (!claim) {
    return { success: false, updatedCount: 0, error: "ไม่พบข้อมูลคำขอยืนยันตัวตน" };
  }

  const now = new Date().toISOString();

  // 1. Update Person in Alumni Registry (using their personnelId or name)
  const identifier = claim.traineePersonnelId || claim.traineeName;
  const updatedRecords = updatePersonProfile(identifier, {
    idCard: claim.idCard,
    phone: claim.phone,
    email: claim.email,
    affiliation: claim.newAffiliation || claim.currentAffiliation,
    status: "active",
  });

  // 2. Mark claim as approved
  const nextClaims = storeState.claims.map((c) => {
    if (c.id === claimId) {
      return {
        ...c,
        status: "approved" as const,
        reviewedAt: now,
        reviewedBy: adminName,
      };
    }
    return c;
  });

  storeState = {
    claims: nextClaims,
    revision: storeState.revision + 1,
  };

  saveToLocalStorage(nextClaims);
  emitChange();

  return { success: true, updatedCount: updatedRecords };
}

/**
 * Reject a profile claim
 */
export function rejectProfileClaim(
  claimId: string,
  reason: string,
  adminName = "เจ้าหน้าที่ กกท."
): { success: boolean; error?: string } {
  const claim = storeState.claims.find((c) => c.id === claimId);
  if (!claim) {
    return { success: false, error: "ไม่พบข้อมูลคำขอยืนยันตัวตน" };
  }

  const now = new Date().toISOString();
  const nextClaims = storeState.claims.map((c) => {
    if (c.id === claimId) {
      return {
        ...c,
        status: "rejected" as const,
        rejectionReason: reason || "เอกสารหรือหลักฐานไม่เพียงพอ",
        reviewedAt: now,
        reviewedBy: adminName,
      };
    }
    return c;
  });

  storeState = {
    claims: nextClaims,
    revision: storeState.revision + 1,
  };

  saveToLocalStorage(nextClaims);
  emitChange();

  return { success: true };
}

/**
 * Delete a claim record (Admin only)
 */
export function deleteProfileClaim(claimId: string) {
  const nextClaims = storeState.claims.filter((c) => c.id !== claimId);
  storeState = {
    claims: nextClaims,
    revision: storeState.revision + 1,
  };
  saveToLocalStorage(nextClaims);
  emitChange();
}
