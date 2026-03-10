"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Sidebar } from "@/components/sidebar";
import { Loader2 } from "lucide-react";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes — HIPAA §164.312(a)(2)(iii)

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, loadUser, logout } = useAuthStore();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await logout();
      window.location.href = "/login";
    }, INACTIVITY_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    loadUser().then(() => {
      // Después de intentar cargar el usuario (incluyendo refresh si es necesario)
      if (!useAuthStore.getState().user && !useAuthStore.getState().loading) {
        router.push("/login");
      }
    });
  }, [loadUser, router]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-64 p-8">{children}</main>
    </div>
  );
}
