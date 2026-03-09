"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { HipaaControl, ComplianceSummary } from "@/lib/types";
import { useAuthStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Plus, Pencil, Loader2, X, ShieldCheck } from "lucide-react";

const SAFEGUARD_TYPES = ["Administrative", "Technical", "Physical"] as const;
const CONTROL_STATUSES = [
  "Implemented",
  "PartiallyImplemented",
  "NotImplemented",
  "NotApplicable",
] as const;

const statusColor: Record<string, string> = {
  Implemented: "bg-green-100 text-green-700",
  PartiallyImplemented: "bg-yellow-100 text-yellow-700",
  NotImplemented: "bg-red-100 text-red-700",
  NotApplicable: "bg-slate-100 text-slate-600",
};

const statusLabel: Record<string, string> = {
  Implemented: "Implementado",
  PartiallyImplemented: "Parcial",
  NotImplemented: "No Implementado",
  NotApplicable: "N/A",
};

export default function HipaaControlsPage() {
  const { hasRole } = useAuthStore();
  const [controls, setControls] = useState<HipaaControl[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HipaaControl | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    safeguardType: "Technical" as string,
    controlCode: "",
    description: "",
    status: "NotImplemented" as string,
    evidenceRef: "",
  });

  const load = useCallback(async () => {
    try {
      const [ctrlRes, summaryRes] = await Promise.all([
        api.get("/hipaa-controls"),
        api.get("/hipaa-controls/summary"),
      ]);
      setControls(ctrlRes.data);
      setSummary(summaryRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      safeguardType: "Technical",
      controlCode: "",
      description: "",
      status: "NotImplemented",
      evidenceRef: "",
    });
    setShowForm(true);
  };

  const openEdit = (c: HipaaControl) => {
    setEditing(c);
    setForm({
      safeguardType: c.safeguardType,
      controlCode: c.controlCode,
      description: c.description,
      status: c.status,
      evidenceRef: c.evidenceRef ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/hipaa-controls/${editing.id}`, {
          status: form.status,
          description: form.description,
          evidenceRef: form.evidenceRef || undefined,
        });
      } else {
        await api.post("/hipaa-controls", {
          safeguardType: form.safeguardType,
          controlCode: form.controlCode,
          description: form.description,
          status: form.status,
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
        title="Controles HIPAA"
        description="Checklist de controles del HIPAA Security Rule (45 CFR §164)"
        action={
          hasRole("ADMIN", "AUDITOR") && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Plus className="h-4 w-4" />
              Nuevo Control
            </button>
          )
        }
      />

      {/* Compliance Summary */}
      {summary && summary.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{summary.percentage}%</p>
              <p className="text-xs text-slate-500">Cumplimiento Global</p>
            </div>
          </div>
          {Object.entries(summary.byCategory).map(([cat, data]) => (
            <div key={cat} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{cat}</p>
              <p className="text-xl font-bold text-slate-800">{data.percentage}%</p>
              <p className="text-xs text-slate-400">
                {data.implemented} de {data.total} implementados
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Código</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Descripción</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Evidencia</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Revisado</th>
                {hasRole("ADMIN", "AUDITOR") && (
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {controls.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{c.controlCode}</td>
                  <td className="px-4 py-3 text-xs">{c.safeguardType}</td>
                  <td className="px-4 py-3 max-w-[300px] truncate">{c.description}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[c.status]}`}>
                      {statusLabel[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate">
                    {c.evidenceRef ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.lastReviewedAt
                      ? `${c.reviewedBy?.email ?? "—"} — ${new Date(c.lastReviewedAt).toLocaleDateString()}`
                      : "Sin revisar"}
                  </td>
                  {hasRole("ADMIN", "AUDITOR") && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-primary transition">
                        <Pencil className="h-4 w-4 inline" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {controls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No hay controles HIPAA registrados
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
                {editing ? "Editar Control" : "Nuevo Control HIPAA"}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Salvaguarda</label>
                    <select
                      value={form.safeguardType}
                      onChange={(e) => setForm({ ...form, safeguardType: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      {SAFEGUARD_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Código del Control</label>
                    <input
                      required
                      value={form.controlCode}
                      onChange={(e) => setForm({ ...form, controlCode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="§164.312(a)(1)"
                    />
                  </div>
                </>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  {CONTROL_STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel[s]}</option>
                  ))}
                </select>
              </div>
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Referencia de Evidencia</label>
                  <input
                    value={form.evidenceRef}
                    onChange={(e) => setForm({ ...form, evidenceRef: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="/evidences/control-312a1.pdf"
                  />
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
