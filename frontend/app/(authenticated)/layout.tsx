"use client";

import { useEffect, useRef, useCallback, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await logout();
      window.location.href = "/login";
    }, INACTIVITY_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    setMounted(true);
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    // Solo redirigir después de que el componente esté montado en el cliente
    // y después de que loadUser haya intentado cargar el usuario
    if (mounted && !loading && !user) {
      router.replace("/login");
    }
  }, [mounted, loading, user, router]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  // Mostrar loading mientras carga
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mostrar loading mientras redirige
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
