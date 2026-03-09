"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { AuditFinding } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";

const CATEGORIES = ["Administrative", "Technical", "Physical"] as const;
const SEVERITIES = ["Critical", "High", "Medium", "Low", "Informational"] as const;
const STATUSES = ["Open", "InProgress", "Remediated", "AcceptedRisk", "Closed"] as const;

const severityColor: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-blue-100 text-blue-700",
  Informational: "bg-slate-100 text-slate-600",
};

const statusColor: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  InProgress: "bg-yellow-100 text-yellow-700",
  Remediated: "bg-green-100 text-green-700",
  AcceptedRisk: "bg-purple-100 text-purple-700",
  Closed: "bg-slate-100 text-slate-600",
};

export default function FindingsPage() {
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AuditFinding | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "Technical" as string,
    severity: "Medium" as string,
    hipaaControlCode: "",
    description: "",
    assignedToId: "",
    dueDate: "",
    status: "Open" as string,
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/findings");
      setFindings(data);
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
      category: "Technical",
      severity: "Medium",
      hipaaControlCode: "",
      description: "",
      assignedToId: "",
      dueDate: "",
      status: "Open",
    });
    setShowForm(true);
  };

  const openEdit = (f: AuditFinding) => {
    setEditing(f);
    setForm({
      category: f.category,
      severity: f.severity,
      hipaaControlCode: f.hipaaControlCode,
      description: f.description,
      assignedToId: f.assignedToId ? String(f.assignedToId) : "",
      dueDate: f.dueDate ? f.dueDate.split("T")[0] : "",
      status: f.status,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        category: form.category,
        severity: form.severity,
        hipaaControlCode: form.hipaaControlCode,
        description: form.description,
      };
      if (form.assignedToId) payload.assignedToId = Number(form.assignedToId);
      if (form.dueDate) payload.dueDate = form.dueDate;
      if (editing) {
        payload.status = form.status;
        await api.patch(`/findings/${editing.id}`, payload);
      } else {
        await api.post("/findings", payload);
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este hallazgo?")) return;
    await api.delete(`/findings/${id}`);
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
        title="Hallazgos de Auditoría"
        description="Resultados de auditoría vinculados a controles HIPAA"
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus className="h-4 w-4" />
            Nuevo Hallazgo
          </button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Código</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Categoría</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Severidad</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Descripción</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Asignado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha Límite</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{f.hipaaControlCode}</td>
                  <td className="px-4 py-3 text-xs">{f.category}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColor[f.severity]}`}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[250px] truncate">{f.description}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[f.status]}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{f.assignedTo?.email ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {f.dueDate ? new Date(f.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(f)} className="text-slate-400 hover:text-primary transition">
                      <Pencil className="h-4 w-4 inline" />
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="text-slate-400 hover:text-danger transition">
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {findings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No hay hallazgos registrados
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? "Editar Hallazgo" : "Nuevo Hallazgo"}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Severidad</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código Control HIPAA</label>
                <input
                  required
                  value={form.hipaaControlCode}
                  onChange={(e) => setForm({ ...form, hipaaControlCode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="§164.312(a)(1)"
                />
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Asignado (ID)</label>
                  <input
                    type="number"
                    value={form.assignedToId}
                    onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Límite</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
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
