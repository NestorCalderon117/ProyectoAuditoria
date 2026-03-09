"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import type { DashboardData } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import {
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  Activity,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#dc2626",
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#3b82f6",
  Informational: "#6b7280",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/dashboard");
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const severityData = Object.entries(data.findingsBySeverity).map(
    ([name, value]) => ({ name, value }),
  );

  const compliancePie = [
    { name: "Implementado", value: data.compliance.implemented, color: "#16a34a" },
    { name: "Parcial", value: data.compliance.partial, color: "#f59e0b" },
    { name: "No Implementado", value: data.compliance.notImplemented, color: "#dc2626" },
  ].filter((d) => d.value > 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Métricas de cumplimiento HIPAA y actividad del sistema"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title="Cumplimiento HIPAA"
          value={`${data.compliance.percentage}%`}
          subtitle={`${data.compliance.implemented} de ${data.compliance.total} controles`}
          icon={<ShieldCheck className="h-6 w-6" />}
          color="text-success"
          bgColor="bg-green-50"
        />
        <KpiCard
          title="Hallazgos Abiertos"
          value={String(
            Object.values(data.findingsBySeverity).reduce((a, b) => a + b, 0),
          )}
          subtitle="Por severidad"
          icon={<FileSearch className="h-6 w-6" />}
          color="text-warning"
          bgColor="bg-amber-50"
        />
        <KpiCard
          title="Incidentes Recientes"
          value={String(data.recentIncidents.length)}
          subtitle="Últimos 90 días"
          icon={<AlertTriangle className="h-6 w-6" />}
          color="text-danger"
          bgColor="bg-red-50"
        />
        <KpiCard
          title="Usuarios Activos"
          value={String(data.topUsers.length)}
          subtitle="Top 5 últimos 30 días"
          icon={<Activity className="h-6 w-6" />}
          color="text-info"
          bgColor="bg-blue-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Compliance Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Cumplimiento por Estado
          </h3>
          {compliancePie.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={compliancePie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {compliancePie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 text-center py-20">Sin datos</p>
          )}
        </div>

        {/* Findings by Severity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Hallazgos Abiertos por Severidad
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={severityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {severityData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={SEVERITY_COLORS[entry.name] ?? "#6b7280"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity by Hour */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">
          Actividad por Hora (últimos 7 días)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.activityByHour}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11 }}
              tickFormatter={(h: number) => `${h}h`}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(h) => `${h}:00`} />
            <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Incidentes Recientes
          </h3>
          <div className="space-y-3">
            {data.recentIncidents.length === 0 && (
              <p className="text-sm text-slate-400">Sin incidentes recientes</p>
            )}
            {data.recentIncidents.map((inc) => (
              <div
                key={inc.id}
                className="flex items-start justify-between border-b border-slate-100 pb-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700 line-clamp-1">
                    {inc.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {inc.type} — {new Date(inc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={inc.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Top Users */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Usuarios más Activos (30 días)
          </h3>
          <div className="space-y-3">
            {data.topUsers.map((tu, i) => (
              <div
                key={tu.user?.id ?? i}
                className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {tu.user?.email ?? "—"}
                  </p>
                  <p className="text-xs text-slate-400">{tu.user?.role}</p>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {tu.actionCount} acciones
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
  bgColor,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {title}
        </span>
        <div className={`${bgColor} ${color} p-2 rounded-lg`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-slate-800">{value}</div>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Open: "bg-red-100 text-red-700",
    Investigating: "bg-yellow-100 text-yellow-700",
    Resolved: "bg-green-100 text-green-700",
    Closed: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}
