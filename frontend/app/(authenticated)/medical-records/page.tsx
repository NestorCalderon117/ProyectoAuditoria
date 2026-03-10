"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import type { MedicalRecord, Patient } from "@/lib/types";
import { useAuthStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  FileText,
  Download,
  ImageMinus,
} from "lucide-react";

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
  const [patients, setPatients] = useState<Patient[]>([]);
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, kind: "success" | "error") => {
    setToast({ message, kind });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

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

  const loadPatients = useCallback(async () => {
    try {
      const { data } = await api.get("/patients");
      setPatients(data);
    } catch {
      showToast("No se pudo cargar la lista de pacientes.", "error");
    }
  }, [showToast]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (patientFilter) load();
    else setLoading(false);
  }, [patientFilter, load]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const selectedPatient =
    patients.find((p) => String(p.id) === patientFilter) ?? null;

  const openCreate = () => {
    if (!selectedPatient) {
      showToast("Selecciona un paciente valido antes de crear el registro.", "error");
      return;
    }

    setEditing(null);
    setForm({ patientId: String(selectedPatient.id), recordType: "GENERAL", content: "", s3ImageKey: "" });
    setSelectedFile(null);
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
    setSelectedFile(null);
    setShowForm(true);
  };

  const uploadFileToRecord = async (recordId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    // Let the browser/axios set multipart boundary automatically.
    await api.post(`/medical-records/${recordId}/image`, formData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let recordId: number;

      if (editing) {
        const { data } = await api.patch(`/medical-records/${editing.id}`, {
          recordType: form.recordType,
          content: form.content,
          ...(form.s3ImageKey && { s3ImageKey: form.s3ImageKey }),
        });
        recordId = data.id ?? editing.id;
      } else {
        const { data } = await api.post("/medical-records", {
          patientId: parseInt(form.patientId, 10),
          recordType: form.recordType,
          content: form.content,
          ...(form.s3ImageKey && { s3ImageKey: form.s3ImageKey }),
        });
        recordId = data.id;
      }

      let uploadWarning: string | null = null;
      if (selectedFile) {
        try {
          await uploadFileToRecord(recordId, selectedFile);
        } catch (error: unknown) {
          const message =
            typeof error === "object" &&
            error !== null &&
            "response" in error &&
            typeof (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message !== "undefined"
              ? (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
              : undefined;

          const normalized = Array.isArray(message) ? message.join(", ") : message;
          uploadWarning = normalized ?? "No se pudo subir la imagen. Puedes reintentar desde Editar.";
        }
      }

      setShowForm(false);
      setSelectedFile(null);
      await load();

      if (uploadWarning) {
        showToast(`Registro guardado, pero la imagen no se subio. Detalle: ${uploadWarning}`, "error");
      } else {
        showToast(
          selectedFile
            ? "Registro e imagen guardados correctamente."
            : "Registro guardado correctamente.",
          "success",
        );
      }
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message !== "undefined"
          ? (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : "No se pudo guardar el registro.";
      const normalized = Array.isArray(message) ? message.join(", ") : String(message);
      showToast(normalized, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este registro médico?")) return;
    await api.delete(`/medical-records/${id}`);
    load();
  };

  const handleDownloadImage = async (id: number) => {
    const { data } = await api.get(`/medical-records/${id}/image-url`);
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  const handleRemoveImage = async (id: number) => {
    if (!confirm("¿Eliminar imagen asociada del registro?")) return;
    await api.delete(`/medical-records/${id}/image`);
    load();
  };

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${
            toast.kind === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <PageHeader
        title="Registros Médicos"
        description="Gestión de registros médicos con contenido cifrado (AES-256-CBC) y almacenamiento en Azure Blob"
        action={
          hasRole("ADMIN", "DOCTOR") && (
            <button
              onClick={openCreate}
              disabled={!selectedPatient}
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
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-slate-700">
            Paciente:
          </label>
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm min-w-80"
          >
            <option value="">Seleccione un paciente</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.mrn} - {p.name}
              </option>
            ))}
          </select>
          {selectedPatient && (
            <span className="text-xs text-slate-500">
              Seleccionado: {selectedPatient.mrn}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !patientFilter ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Selecciona un paciente para ver sus registros médicos</p>
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
                  <th className="text-left px-6 py-3 font-semibold text-slate-600">Imagen (Blob Key)</th>
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
                    <td className="px-6 py-3 max-w-75 truncate">{r.content}</td>
                    <td className="px-6 py-3 text-xs text-slate-400 font-mono max-w-37.5 truncate">
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
                        {r.s3ImageKey && (
                          <button
                            onClick={() => handleDownloadImage(r.id)}
                            className="text-slate-400 hover:text-blue-600 transition"
                            title="Descargar imagen"
                          >
                            <Download className="h-4 w-4 inline" />
                          </button>
                        )}
                        {hasRole("ADMIN", "DOCTOR") && r.s3ImageKey && (
                          <button
                            onClick={() => handleRemoveImage(r.id)}
                            className="text-slate-400 hover:text-amber-600 transition"
                            title="Eliminar imagen"
                          >
                            <ImageMinus className="h-4 w-4 inline" />
                          </button>
                        )}
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
                    Paciente
                  </label>
                  <input
                    readOnly
                    value={selectedPatient ? `${selectedPatient.mrn} - ${selectedPatient.name}` : ""}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 outline-none"
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
                  Blob Key <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  value={form.s3ImageKey}
                  onChange={(e) => setForm({ ...form, s3ImageKey: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  placeholder="MRN-00001/rec-001/img.dcm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Archivo de Imagen <span className="text-slate-400">(PNG/JPG/DICOM)</span>
                </label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.dcm,application/dicom,image/png,image/jpeg"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
                {selectedFile && (
                  <p className="text-xs text-slate-500 mt-1">Seleccionado: {selectedFile.name}</p>
                )}
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
