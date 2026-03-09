"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { MedicalRecord } from "@/lib/types";
import { useAuthStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Plus, Pencil, Trash2, Loader2, X, FileText } from "lucide-react";

const recordTypes = ["XRAY", "CT", "MRI", "LAB", "GENERAL"];

const typeColor: Record<string, string> = {
  XRAY: "bg-purple-100 text-purple-700",
  CT: "bg-blue-100 text-blue-700",
  MRI: "bg-indigo-100 text-indigo-700",
  LAB: "bg-green-100 text-green-700",
  GENERAL: "bg-slate-100 text-slate-700",
};

export default function MedicalRecordsPage() {
  const { hasRole } = useAuthStore();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MedicalRecord | null>(null);
  const [form, setForm] = useState({
    patientId: "",
    recordType: "GENERAL",
    content: "",
    s3ImageKey: "",
  });
  const [saving, setSaving] = useState(false);
  const [patientFilter, setPatientFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (patientFilter) {
        const { data } = await api.get(`/medical-records/patient/${patientFilter}`);
        setRecords(data);
      } else {
        setRecords([]);
      }
    } finally {
      setLoading(false);
    }
  }, [patientFilter]);

  useEffect(() => {
    if (patientFilter) load();
    else setLoading(false);
  }, [patientFilter, load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ patientId: patientFilter, recordType: "GENERAL", content: "", s3ImageKey: "" });
    setShowForm(true);
  };

  const openEdit = (r: MedicalRecord) => {
    setEditing(r);
    setForm({
      patientId: String(r.patientId),
      recordType: r.recordType,
      content: r.content,
      s3ImageKey: r.s3ImageKey ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/medical-records/${editing.id}`, {
          recordType: form.recordType,
          content: form.content,
          ...(form.s3ImageKey && { s3ImageKey: form.s3ImageKey }),
        });
      } else {
        await api.post("/medical-records", {
          patientId: parseInt(form.patientId, 10),
          recordType: form.recordType,
          content: form.content,
          ...(form.s3ImageKey && { s3ImageKey: form.s3ImageKey }),
        });
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este registro médico?")) return;
    await api.delete(`/medical-records/${id}`);
    load();
  };

  return (
    <>
      <PageHeader
        title="Registros Médicos"
        description="Gestión de registros médicos con contenido cifrado (AES-256-CBC) y almacenamiento S3"
        action={
          hasRole("ADMIN", "DOCTOR") && (
            <button
              onClick={openCreate}
              disabled={!patientFilter}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Nuevo Registro
            </button>
          )
        }
      />

      {/* Patient Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">
            ID del Paciente:
          </label>
          <input
            type="number"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            placeholder="Ingrese el ID del paciente"
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm w-48"
          />
          <button
            onClick={load}
            disabled={!patientFilter}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            Buscar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !patientFilter ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Ingrese un ID de paciente para ver sus registros médicos</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">ID</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Tipo</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Contenido</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">S3 Key</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Accedido por</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Fecha</th>
                  {hasRole("ADMIN", "DOCTOR") && (
                    <th className="text-right px-6 py-3 font-semibold text-slate-600">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-xs">{r.id}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor[r.recordType] ?? typeColor.GENERAL}`}>
                        {r.recordType}
                      </span>
                    </td>
                    <td className="px-6 py-3 max-w-[300px] truncate">{r.content}</td>
                    <td className="px-6 py-3 text-xs text-slate-400 font-mono max-w-[150px] truncate">
                      {r.s3ImageKey ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      {r.accessedBy?.email ?? "—"}
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-xs">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    {hasRole("ADMIN", "DOCTOR") && (
                      <td className="px-6 py-3 text-right space-x-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="text-slate-400 hover:text-primary transition"
                        >
                          <Pencil className="h-4 w-4 inline" />
                        </button>
                        {hasRole("ADMIN") && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-slate-400 hover:text-danger transition"
                          >
                            <Trash2 className="h-4 w-4 inline" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No hay registros médicos para este paciente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                {editing ? "Editar Registro Médico" : "Nuevo Registro Médico"}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ID del Paciente
                  </label>
                  <input
                    required
                    type="number"
                    value={form.patientId}
                    onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Registro
                </label>
                <select
                  value={form.recordType}
                  onChange={(e) => setForm({ ...form, recordType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                >
                  {recordTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contenido
                </label>
                <textarea
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  placeholder="Contenido del registro médico (se cifra en BD)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  S3 Image Key <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  value={form.s3ImageKey}
                  onChange={(e) => setForm({ ...form, s3ImageKey: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  placeholder="MRN-00001/rec-001/img.dcm"
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
