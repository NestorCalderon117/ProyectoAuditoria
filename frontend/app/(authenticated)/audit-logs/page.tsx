"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { AuditLog, PaginatedResponse } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export default function AuditLogsPage() {
  const [result, setResult] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: "",
    action: "",
    resourceType: "",
    ipAddress: "",
    from: "",
    to: "",
    page: "1",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "25", page: filters.page };
      if (filters.userId) params.userId = filters.userId;
      if (filters.action) params.action = filters.action;
      if (filters.resourceType) params.resourceType = filters.resourceType;
      if (filters.ipAddress) params.ipAddress = filters.ipAddress;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const { data } = await api.get("/audit-logs", { params });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const exportJson = async () => {
    const params: Record<string, string> = {};
    if (filters.userId) params.userId = filters.userId;
    if (filters.action) params.action = filters.action;
    if (filters.resourceType) params.resourceType = filters.resourceType;
    if (filters.ipAddress) params.ipAddress = filters.ipAddress;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    const { data } = await api.get("/audit-logs/export", { params });
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = async () => {
    const params: Record<string, string> = {};
    if (filters.userId) params.userId = filters.userId;
    if (filters.action) params.action = filters.action;
    if (filters.resourceType) params.resourceType = filters.resourceType;
    if (filters.ipAddress) params.ipAddress = filters.ipAddress;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    const { data } = await api.get("/audit-logs/export/csv", {
      params,
      responseType: "text",
      headers: { Accept: "text/csv" },
    });
    const blob = new Blob([data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionColor: Record<string, string> = {
    CREATE: "bg-green-100 text-green-700",
    READ: "bg-blue-100 text-blue-700",
    UPDATE: "bg-yellow-100 text-yellow-700",
    DELETE: "bg-red-100 text-red-700",
  };

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Registro inmutable de auditoría — HIPAA §164.312(b) (append-only)"
        action={
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={exportJson}
              className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Download className="h-4 w-4" />
              JSON
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <input
            type="number"
            placeholder="ID de usuario"
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value, page: "1" })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          />
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value, page: "1" })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          >
            <option value="">Todas las acciones</option>
            <option value="CREATE">CREATE</option>
            <option value="READ">READ</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            type="text"
            placeholder="Tipo de recurso"
            value={filters.resourceType}
            onChange={(e) => setFilters({ ...filters, resourceType: e.target.value, page: "1" })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          />
          <input
            type="text"
            placeholder="Dirección IP"
            value={filters.ipAddress}
            onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value, page: "1" })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          />
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value, page: "1" })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value, page: "1" })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Usuario</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Acción</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Recurso</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Endpoint</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">IP</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result?.data.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.user?.email ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor[log.action] ?? ""}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {log.resourceType}
                        {log.resourceId && `/${log.resourceId}`}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500 max-w-50 truncate">
                        {log.httpMethod} {log.endpoint}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-400">
                        {log.ipAddress ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${log.statusCode < 400 ? "text-green-600" : "text-red-600"}`}
                        >
                          {log.statusCode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {result && result.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  Página {result.page} de {result.totalPages} — {result.total} registros
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={result.page <= 1}
                    onClick={() =>
                      setFilters({ ...filters, page: String(result.page - 1) })
                    }
                    className="p-1.5 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={result.page >= result.totalPages}
                    onClick={() =>
                      setFilters({ ...filters, page: String(result.page + 1) })
                    }
                    className="p-1.5 rounded border border-slate-300 disabled:opacity-30 hover:bg-slate-50 transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
