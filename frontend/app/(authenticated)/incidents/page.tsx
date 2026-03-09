"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { SecurityIncident } from "@/lib/types";
import { useAuthStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Plus, Pencil, Loader2, X } from "lucide-react";

const INCIDENT_TYPES = ["Breach", "NearMiss", "SecurityEvent", "PolicyViolation"] as const;
const INCIDENT_STATUSES = ["Open", "Investigating", "Resolved", "Closed"] as const;

const typeColor: Record<string, string> = {
  Breach: "bg-red-100 text-red-700",
  NearMiss: "bg-orange-100 text-orange-700",
  SecurityEvent: "bg-yellow-100 text-yellow-700",
  PolicyViolation: "bg-purple-100 text-purple-700",
};

const statusColor: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  Investigating: "bg-yellow-100 text-yellow-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-slate-100 text-slate-600",
};

export default function IncidentsPage() {
  const { hasRole } = useAuthStore();
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SecurityIncident | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "SecurityEvent" as string,
    description: "",
    affectedCount: "",
    status: "Open" as string,
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/incidents");
      setIncidents(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ type: "SecurityEvent", description: "", affectedCount: "", status: "Open" });
    setShowForm(true);
  };

  const openEdit = (inc: SecurityIncident) => {
    setEditing(inc);
    setForm({
      type: inc.type,
      description: inc.description,
      affectedCount: String(inc.affectedCount),
      status: inc.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/incidents/${editing.id}`, {
          status: form.status,
          description: form.description,
          affectedCount: form.affectedCount ? Number(form.affectedCount) : undefined,
        });
      } else {
        await api.post("/incidents", {
          type: form.type,
          description: form.description,
          affectedCount: form.affectedCount ? Number(form.affectedCount) : 0,
        });
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
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
        title="Incidentes de Seguridad"
        description="Registro de brechas e incidentes — HIPAA Breach Notification Rule"
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus className="h-4 w-4" />
            Reportar Incidente
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Descripción</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Afectados</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Reportado por</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha</th>
                {hasRole("ADMIN", "AUDITOR") && (
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs font-mono">#{inc.id}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor[inc.type]}`}>
                      {inc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[300px] truncate">{inc.description}</td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    {inc.affectedCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[inc.status]}`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{inc.reportedBy?.email ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(inc.createdAt).toLocaleDateString()}
                  </td>
                  {hasRole("ADMIN", "AUDITOR") && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(inc)} className="text-slate-400 hover:text-primary transition">
                        <Pencil className="h-4 w-4 inline" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No hay incidentes registrados
                  </td>
                </tr>
              )}
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
                {editing ? "Actualizar Incidente" : "Reportar Incidente"}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {INCIDENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Registros Afectados</label>
                <input
                  type="number"
                  min="0"
                  value={form.affectedCount}
                  onChange={(e) => setForm({ ...form, affectedCount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="0"
                />
              </div>
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
                  {editing ? "Guardar" : "Reportar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
