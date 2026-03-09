"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { Patient } from "@/lib/types";
import { useAuthStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";

export default function PatientsPage() {
  const { hasRole } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState({ mrn: "", name: "", dob: "", ssn: "", diagnosis: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/patients");
      setPatients(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ mrn: "", name: "", dob: "", ssn: "", diagnosis: "" });
    setShowForm(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({ mrn: p.mrn, name: p.name, dob: p.dob, ssn: p.ssn, diagnosis: p.diagnosis ?? "" });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/patients/${editing.id}`, {
          name: form.name,
          dob: form.dob,
          ssn: form.ssn,
          ...(form.diagnosis && { diagnosis: form.diagnosis }),
        });
      } else {
        await api.post("/patients", {
          ...form,
          ...(form.diagnosis ? {} : { diagnosis: undefined }),
        });
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este paciente? (soft delete)")) return;
    await api.delete(`/patients/${id}`);
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
        title="Pacientes"
        description="Gestión de registros médicos con datos PHI cifrados (AES-256-CBC)"
        action={
          hasRole("ADMIN", "DOCTOR") && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Plus className="h-4 w-4" />
              Nuevo Paciente
            </button>
          )
        }
      />

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">MRN</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Fecha Nacimiento</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">SSN</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Diagnóstico</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Creado</th>
                {hasRole("ADMIN", "DOCTOR") && (
                  <th className="text-right px-6 py-3 font-semibold text-slate-600">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs">{p.mrn}</td>
                  <td className="px-6 py-3 font-medium">{p.name}</td>
                  <td className="px-6 py-3">{p.dob}</td>
                  <td className="px-6 py-3 font-mono text-xs">
                    •••-••-{p.ssn?.slice(-4) ?? "****"}
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                    {p.diagnosis ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-slate-400 text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  {hasRole("ADMIN", "DOCTOR") && (
                    <td className="px-6 py-3 text-right space-x-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-slate-400 hover:text-primary transition"
                      >
                        <Pencil className="h-4 w-4 inline" />
                      </button>
                      {hasRole("ADMIN") && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-slate-400 hover:text-danger transition"
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No hay pacientes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? "Editar Paciente" : "Nuevo Paciente"}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    MRN
                  </label>
                  <input
                    required
                    value={form.mrn}
                    onChange={(e) => setForm({ ...form, mrn: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    placeholder="MRN-00001"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  required
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SSN
                </label>
                <input
                  required
                  value={form.ssn}
                  onChange={(e) => setForm({ ...form, ssn: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  placeholder="123-45-6789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Diagnóstico
                </label>
                <textarea
                  value={form.diagnosis}
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  placeholder="Diagnóstico del paciente (opcional, se cifra en BD)"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
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
