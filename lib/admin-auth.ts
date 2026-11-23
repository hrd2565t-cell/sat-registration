"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

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

/**
 * Server-verified admin login: sends PIN to /api/admin/login
 * Never exposes the expected PIN in client bundle!
 */
export async function loginAdmin(pin: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pin: pin.trim() }),
    });

    if (res.ok) {
      try {
        window.sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
      } catch {
        // Storage unavailable in private browsing edge cases
      }
      notify();
      return true;
    }
    return false;
  } catch (err) {
    console.error("Login request failed:", err);
    return false;
  }
}

export async function logoutAdmin(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/admin/logout", {
      method: "POST",
    });
  } catch {
    // Ignore network error on logout
  }
  try {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
  notify();
}

/**
 * Verifies with server whether the current admin session cookie is still valid.
 */
export async function verifyAdminSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/admin/verify");
    if (res.ok) {
      const data = await res.json();
      const isValid = Boolean(data.authenticated);
      if (!isValid) {
        window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
        notify();
      }
      return isValid;
    }
  } catch {
    // network issue, keep client state temporarily
  }
  return isAdminAuthenticated();
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

export function useIsAdmin(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook to guard admin pages using useSyncExternalStore.
 * Automatically verifies session with server and redirects to /admin/login?next=... if not authenticated.
 */
export function useAdminGuard() {
  const pathname = usePathname();
  const isAuthenticated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    let isCancelled = false;

    // Check client state first
    if (!isAdminAuthenticated()) {
      const nextQuery =
        pathname && pathname !== "/admin"
          ? `?next=${encodeURIComponent(pathname)}`
          : "";
      window.location.href = `/admin/login${nextQuery}`;
      return;
    }

    // Verify session token on server to prevent client-side forgery
    verifyAdminSession().then((valid) => {
      if (!valid && !isCancelled) {
        const nextQuery =
          pathname && pathname !== "/admin"
            ? `?next=${encodeURIComponent(pathname)}`
            : "";
        window.location.href = `/admin/login${nextQuery}`;
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [pathname, isAuthenticated]);

  return { isAuthenticated };
}
