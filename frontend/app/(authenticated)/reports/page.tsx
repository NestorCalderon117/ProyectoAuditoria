"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type {
  DashboardData,
  ComplianceSummary,
  AuditFinding,
  SecurityIncident,
} from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Download, Loader2 } from "lucide-react";

type RangePreset = "30d" | "90d" | "custom";

// Traducciones de categorías de controles HIPAA
const categoryTranslations: Record<string, string> = {
  Administrative: "Administrativo",
  Technical: "Técnico",
  Physical: "Físico",
};

// Traducciones de estados de hallazgos
const findingStatusTranslations: Record<string, string> = {
  Open: "Abierto",
  InProgress: "En Progreso",
  Resolved: "Resuelto",
  Closed: "Cerrado",
};

// Traducciones de tipos de incidentes
const incidentTypeTranslations: Record<string, string> = {
  Breach: "Brecha de Seguridad",
  NearMiss: "Casi Incidente",
  SecurityEvent: "Evento de Seguridad",
  PolicyViolation: "Violación de Política",
};

// Traducciones de estados de incidentes
const incidentStatusTranslations: Record<string, string> = {
  Open: "Abierto",
  Investigating: "Investigando",
  Resolved: "Resuelto",
  Closed: "Cerrado",
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [rangePreset, setRangePreset] = useState<RangePreset>("90d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardRes, summaryRes, findingsRes, incidentsRes] = await Promise.all([
        api.get("/dashboard"),
        api.get("/hipaa-controls/summary"),
        api.get("/findings"),
        api.get("/incidents"),
      ]);

      setDashboard(dashboardRes.data);
      setSummary(summaryRes.data);
      setFindings(findingsRes.data);
      setIncidents(incidentsRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generatedAt = useMemo(() => new Date(), []);

  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    const end = dateTo ? new Date(dateTo) : now;

    if (rangePreset === "custom" && dateFrom && dateTo) {
      return { fromDate: new Date(dateFrom), toDate: end };
    }

    const start = new Date(now);
    start.setDate(now.getDate() - (rangePreset === "30d" ? 30 : 90));
    return { fromDate: start, toDate: end };
  }, [rangePreset, dateFrom, dateTo]);

  if (loading || !dashboard || !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const openFindings = findings.filter((f) => f.status === "Open" || f.status === "InProgress").length;
  const criticalFindings = findings.filter((f) => f.severity === "Critical").length;
  const unresolvedIncidents = incidents.filter((i) => i.status === "Open" || i.status === "Investigating").length;

  const inRange = (isoDate: string) => {
    const d = new Date(isoDate);
    return d >= fromDate && d <= toDate;
  };

  const findingsInScope = findings.filter((f) => inRange(f.createdAt));
  const incidentsInScope = incidents.filter((i) => inRange(i.createdAt));
  const highRiskFindings = findingsInScope.filter(
    (f) => (f.severity === "Critical" || f.severity === "High") && (f.status === "Open" || f.status === "InProgress"),
  ).length;

  const riskLevel =
    summary.percentage >= 85 && highRiskFindings === 0
      ? "Bajo"
      : summary.percentage >= 70 && highRiskFindings <= 2
        ? "Moderado"
        : "Alto";

  const findingsByStatus = findingsInScope.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  const incidentsByType = incidentsInScope.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});

  const printReport = () => {
    window.print();
  };

  return (
    <div className="print:p-0 print:m-0" id="formal-report-root">
      <div className="print:hidden">
        <PageHeader
          title="Reporte Formal de Cumplimiento"
          description="Formato de auditoría HIPAA listo para exportar a PDF"
          action={
            <button
              onClick={printReport}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </button>
          }
        />

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Alcance del Reporte</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value as RangePreset)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="30d">Ultimos 30 dias</option>
              <option value="90d">Ultimos 90 dias</option>
              <option value="custom">Rango personalizado</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              disabled={rangePreset !== "custom"}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-slate-100"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              disabled={rangePreset !== "custom"}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-slate-100"
            />
            <div className="md:col-span-2 text-xs text-slate-500 flex items-center">
              Cobertura efectiva: {fromDate.toLocaleDateString()} a {toDate.toLocaleDateString()}
            </div>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border-slate-300 print:rounded-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">HealthTech Solutions</h1>
            <p className="text-sm text-slate-500 mt-1">Informe Formal de Cumplimiento HIPAA</p>
            <p className="text-xs text-slate-500 mt-1">Clasificacion: Uso interno y auditoria</p>
          </div>
          <div className="text-xs text-slate-500 text-right">
            <p>Codigo: HT-HIPAA-RPT-2026</p>
            <p>Version: 1.1</p>
            <p>Fecha: {generatedAt.toLocaleDateString()}</p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-3 gap-2">
          <p><span className="font-semibold">Periodo evaluado:</span> {fromDate.toLocaleDateString()} - {toDate.toLocaleDateString()}</p>
          <p><span className="font-semibold">Generado:</span> {generatedAt.toLocaleDateString()} {generatedAt.toLocaleTimeString()}</p>
          <p><span className="font-semibold">Normativa:</span> 45 CFR Part 164 (Security Rule)</p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Cumplimiento Global" value={`${summary.percentage}%`} subtitle={`${summary.implemented}/${summary.total} implementados`} />
        <MetricCard title="Hallazgos Abiertos" value={String(openFindings)} subtitle="Open + InProgress" />
        <MetricCard title="Hallazgos Criticos" value={String(criticalFindings)} subtitle="Severidad Critical" />
        <MetricCard title="Incidentes sin Resolver" value={String(unresolvedIncidents)} subtitle="Open + Investigating" />
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border-slate-300 print:rounded-none">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Resumen Ejecutivo</h2>
        <div className="text-sm text-slate-700 space-y-2">
          <p>
            Durante el periodo analizado, el sistema mantiene un <span className="font-semibold">{summary.percentage}%</span> de cumplimiento
            sobre controles HIPAA registrados.
          </p>
          <p>
            Se identifican <span className="font-semibold">{highRiskFindings}</span> hallazgos de alto riesgo (High/Critical) en estado abierto o en progreso.
          </p>
          <p>
            Nivel de riesgo institucional estimado: <span className="font-semibold">{riskLevel}</span>.
          </p>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 print:shadow-none print:border-slate-300">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Evidencia A. Resumen de Controles HIPAA</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 font-semibold text-slate-600">Categoría</th>
                <th className="text-left py-2 pr-4 font-semibold text-slate-600">Total</th>
                <th className="text-left py-2 pr-4 font-semibold text-slate-600">Implementados</th>
                <th className="text-left py-2 pr-4 font-semibold text-slate-600">Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.byCategory).map(([name, item]) => (
                <tr key={name} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{categoryTranslations[name] || name}</td>
                  <td className="py-2 pr-4">{item.total}</td>
                  <td className="py-2 pr-4">{item.implemented}</td>
                  <td className="py-2 pr-4 font-semibold">{item.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none print:border-slate-300">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Evidencia B. Hallazgos por Estado</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 font-semibold text-slate-600">Estado</th>
                  <th className="text-left py-2 pr-4 font-semibold text-slate-600">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(findingsByStatus).map(([status, count]) => (
                  <tr key={status} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{findingStatusTranslations[status] || status}</td>
                    <td className="py-2 pr-4 font-semibold">{count}</td>
                  </tr>
                ))}
                {Object.keys(findingsByStatus).length === 0 && (
                  <tr>
                    <td className="py-2 pr-4 text-slate-500" colSpan={2}>Sin hallazgos dentro del periodo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none print:border-slate-300">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Evidencia C. Incidentes por Tipo</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 font-semibold text-slate-600">Tipo</th>
                  <th className="text-left py-2 pr-4 font-semibold text-slate-600">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(incidentsByType).map(([type, count]) => (
                  <tr key={type} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{incidentTypeTranslations[type] || type}</td>
                    <td className="py-2 pr-4 font-semibold">{count}</td>
                  </tr>
                ))}
                {Object.keys(incidentsByType).length === 0 && (
                  <tr>
                    <td className="py-2 pr-4 text-slate-500" colSpan={2}>Sin incidentes dentro del periodo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none print:border-slate-300">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Evidencia D. Top 5 Usuarios Mas Activos</h2>
          <div className="space-y-2 text-sm">
            {dashboard.topUsers.length === 0 && (
              <p className="text-slate-500">Sin actividad registrada.</p>
            )}
            {dashboard.topUsers.map((item, idx) => (
              <div key={item.user?.id ?? idx} className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-700">{item.user?.email ?? "—"}</span>
                <span className="font-semibold text-slate-800">{item.actionCount} acciones</span>
              </div>
            ))}
          </div>
        </article>

        <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none print:border-slate-300">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Evidencia E. Incidentes Recientes</h2>
          <div className="space-y-2 text-sm">
            {dashboard.recentIncidents.length === 0 && (
              <p className="text-slate-500">No hay incidentes recientes.</p>
            )}
            {dashboard.recentIncidents.map((item) => (
              <div key={item.id} className="border-b border-slate-100 pb-2">
                <p className="text-slate-700">{item.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {incidentTypeTranslations[item.type] || item.type} - {incidentStatusTranslations[item.status] || item.status} - {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6 print:shadow-none print:border-slate-300 print:rounded-none">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Conclusiones y Acciones Recomendadas</h2>
        <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
          <li>Priorizar remediacion de hallazgos High/Critical con plan y fecha comprometida.</li>
          <li>Actualizar evidencia documental de controles PartiallyImplemented y NotImplemented.</li>
          <li>Mantener revision mensual de incidentes y tendencias de acceso PHI.</li>
        </ul>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-10 text-xs text-slate-600">
          <div>
            <p className="border-t border-slate-400 pt-2">Responsable de Seguridad</p>
            <p>Nombre: ____________________________</p>
            <p>Fecha: _____________________________</p>
          </div>
          <div>
            <p className="border-t border-slate-400 pt-2">Auditoria / Compliance</p>
            <p>Nombre: ____________________________</p>
            <p>Fecha: _____________________________</p>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }

          aside {
            display: none !important;
          }

          main {
            margin-left: 0 !important;
            padding: 0 !important;
          }

          body {
            background: #ffffff !important;
          }

          #formal-report-root {
            color: #111827;
          }
        }
      `}</style>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 print:shadow-none print:border-slate-300">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}
