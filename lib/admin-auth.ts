"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";

export const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "336699";
export const AUTH_STORAGE_KEY = "sat-admin-authenticated";

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(AUTH_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function loginAdmin(pin: string): boolean {
  if (typeof window === "undefined") return false;
  if (pin === ADMIN_PIN) {
    try {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
    } catch {
      // Storage unavailable in private browsing edge cases
    }
    notify();
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return isAdminAuthenticated();
}

function getServerSnapshot() {
  return false;
}

/**
 * Hook to guard admin pages using useSyncExternalStore.
 * Automatically redirects to /admin/login?next=... if not authenticated.
 */
export function useAdminGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      const nextQuery =
        pathname && pathname !== "/admin"
          ? `?next=${encodeURIComponent(pathname)}`
          : "";
      router.replace(`/admin/login${nextQuery}`);
    }
  }, [router, pathname, isAuthenticated]);

  return { isAuthenticated };
}
