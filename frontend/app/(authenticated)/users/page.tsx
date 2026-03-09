"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { User } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";

const ROLES = ["ADMIN", "DOCTOR", "NURSE", "AUDITOR", "LAB_EXTERNAL", "PHARMACIST"] as const;

const roleColor: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  DOCTOR: "bg-blue-100 text-blue-700",
  NURSE: "bg-teal-100 text-teal-700",
  AUDITOR: "bg-amber-100 text-amber-700",
  LAB_EXTERNAL: "bg-orange-100 text-orange-700",
  PHARMACIST: "bg-green-100 text-green-700",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "NURSE" as string,
    isActive: true,
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ email: "", password: "", role: "NURSE", isActive: true });
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ email: u.email, password: "", role: u.role, isActive: u.isActive });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          email: form.email,
          role: form.role,
          isActive: form.isActive,
        };
        await api.patch(`/users/${editing.id}`, payload);
      } else {
        await api.post("/users", {
          email: form.email,
          password: form.password,
          role: form.role,
        });
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("¿Desactivar este usuario?")) return;
    await api.delete(`/users/${id}`);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Gestión de cuentas y roles del sistema"
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">ID</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Rol</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">MFA</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Último Login</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 text-xs font-mono">#{u.id}</td>
                  <td className="px-6 py-3 font-medium">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {u.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs">
                    {u.mfaEnabled ? "✓ Habilitado" : "—"}
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-500">
                    {u.lastLogin
                      ? new Date(u.lastLogin).toLocaleString()
                      : "Nunca"}
                  </td>
                  <td className="px-6 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(u)} className="text-slate-400 hover:text-primary transition">
                      <Pencil className="h-4 w-4 inline" />
                    </button>
                    {u.isActive && (
                      <button
                        onClick={() => handleDeactivate(u.id)}
                        className="text-slate-400 hover:text-danger transition"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? "Editar Usuario" : "Nuevo Usuario"}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {editing && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-700">
                    Cuenta activa
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
