"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { UserCircle, Key, ShieldCheck, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, loadUser } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: "error", text: "Las contraseñas no coinciden" });
      return;
    }
    setPwdLoading(true);
    try {
      await api.patch("/users/me/password", {
        currentPassword,
        newPassword,
      });
      setPwdMsg({ type: "success", text: "Contraseña cambiada exitosamente" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Error al cambiar contraseña";
      setPwdMsg({ type: "error", text: msg ?? "Error al cambiar contraseña" });
    } finally {
      setPwdLoading(false);
    }
  };

  const setupMfa = async () => {
    setMfaLoading(true);
    try {
      const { data } = await api.post("/auth/mfa/setup");
      setQrUrl(data.qrCode ?? data.otpauthUrl ?? null);
    } finally {
      setMfaLoading(false);
    }
  };

  if (!user) return null;

  const roleColor: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    DOCTOR: "bg-blue-100 text-blue-700",
    NURSE: "bg-teal-100 text-teal-700",
    AUDITOR: "bg-amber-100 text-amber-700",
    LAB_EXTERNAL: "bg-orange-100 text-orange-700",
    PHARMACIST: "bg-green-100 text-green-700",
  };

  return (
    <>
      <PageHeader title="Mi Perfil" description="Información de tu cuenta y configuración de seguridad" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-primary/10 p-3 rounded-xl">
              <UserCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800">{user.email}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[user.role]}`}>
                {user.role}
              </span>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Estado</dt>
              <dd className="font-medium">{user.isActive ? "Activo" : "Inactivo"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">MFA</dt>
              <dd className="font-medium">{user.mfaEnabled ? "Habilitado" : "Deshabilitado"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Último Login</dt>
              <dd className="font-medium text-xs">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Cuenta creada</dt>
              <dd className="font-medium text-xs">
                {new Date(user.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          {/* MFA Setup */}
          {user.mfaEnabled && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold text-slate-800">Desactivar MFA</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Esto eliminará la autenticación de dos factores. Podrás configurarla de nuevo después.
              </p>
              <button
                onClick={async () => {
                  if (!confirm("¿Estás seguro de que deseas desactivar MFA?")) return;
                  try {
                    await api.post("/auth/mfa/disable");
                    await loadUser();
                    setQrUrl(null);
                  } catch {
                    alert("Error al desactivar MFA");
                  }
                }}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Desactivar MFA
              </button>
            </div>
          )}

          {!user.mfaEnabled && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-slate-800">Configurar MFA</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Protege tu cuenta con autenticación de dos factores (TOTP).
              </p>
              <button
                onClick={setupMfa}
                disabled={mfaLoading}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {mfaLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generar QR
              </button>
              {qrUrl && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-2">
                    Escanea este código con tu app de autenticación:
                  </p>
                  <img
                    src={qrUrl}
                    alt="MFA QR Code"
                    className="mx-auto"
                    width={200}
                    height={200}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg text-slate-800">Cambiar Contraseña</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            No puedes reutilizar las últimas 5 contraseñas. Mínimo 8 caracteres.
          </p>

          {pwdMsg && (
            <div
              className={`text-sm rounded-lg px-4 py-3 mb-4 ${
                pwdMsg.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {pwdMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña Actual
              </label>
              <input
                required
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nueva Contraseña
              </label>
              <input
                required
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirmar Contraseña
              </label>
              <input
                required
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={pwdLoading}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {pwdLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Cambiar Contraseña
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
