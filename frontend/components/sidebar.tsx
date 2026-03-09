"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  FileSearch,
  ShieldCheck,
  AlertTriangle,
  ScrollText,
  UserCircle,
  LogOut,
  Shield,
  FileText,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Reportes", href: "/reports", icon: FileText, roles: ["ADMIN", "AUDITOR"] },
  { name: "Pacientes", href: "/patients", icon: HeartPulse, roles: ["ADMIN", "DOCTOR", "NURSE"] },
  { name: "Registros Médicos", href: "/medical-records", icon: FileText, roles: ["ADMIN", "DOCTOR", "NURSE"] },
  { name: "Audit Logs", href: "/audit-logs", icon: ScrollText, roles: ["ADMIN", "AUDITOR"] },
  { name: "Hallazgos", href: "/findings", icon: FileSearch, roles: ["ADMIN", "AUDITOR"] },
  { name: "Controles HIPAA", href: "/hipaa-controls", icon: ShieldCheck },
  { name: "Incidentes", href: "/incidents", icon: AlertTriangle },
  { name: "Usuarios", href: "/users", icon: Users, roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const filteredNav = navigation.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-sidebar text-white flex flex-col z-30">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <Shield className="h-8 w-8 text-primary-light" />
        <div>
          <h1 className="font-bold text-lg leading-tight">HealthTech</h1>
          <span className="text-[11px] text-slate-400">HIPAA Compliance</span>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                active
                  ? "bg-primary text-white"
                  : "text-slate-300 hover:bg-sidebar-hover hover:text-white",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-1">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
            pathname === "/profile"
              ? "bg-primary text-white"
              : "text-slate-300 hover:bg-sidebar-hover hover:text-white",
          )}
        >
          <UserCircle className="h-5 w-5" />
          Mi Perfil
        </Link>
        <button
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-500/20 hover:text-red-300 transition w-full"
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </button>
      </div>

      {user && (
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-xs text-slate-400 truncate">{user.email}</p>
          <span className="text-[10px] font-semibold text-primary-light uppercase">{user.role}</span>
        </div>
      )}
    </aside>
  );
}
