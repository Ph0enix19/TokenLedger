"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import type { ModelUsage, TimeseriesResponse } from "@/types/tokenledger";
import EmptyState from "./empty-state";

type ChartsPanelProps = {
  modelUsage: ModelUsage[];
  timeseries: TimeseriesResponse | null;
  loading: boolean;
};

const modelColors: Record<string, string> = {
  blocked: "#f87171",
  cache: "#34d399",
  "llama-3.1-8b-instant": "#60a5fa",
  "llama-3.3-70b-versatile": "#a78bfa",
  unknown: "#f87171",
};

const modelLabels: Record<string, string> = {
  blocked: "Blocked",
  cache: "Cache",
  "llama-3.1-8b-instant": "8B Instant",
  "llama-3.3-70b-versatile": "70B Versatile",
  unknown: "Blocked",
};

const tooltipStyle: React.CSSProperties = {
  background: "var(--tl-popover, var(--popover))",
  border: "1px solid var(--tl-border)",
  borderRadius: "12px",
  color: "var(--tl-heading)",
  boxShadow: "var(--tl-shadow)",
  fontSize: "12px",
  padding: "10px 14px",
};

function normalizeModelUsage(data: ModelUsage[]) {
  const expectedModels = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "cache", "blocked"];
  const modelName = (model: string | null) => (!model || model === "unknown" ? "blocked" : model);
  const byModel = new Map(data.map((item) => [modelName(item.model), item.requests]));
  const extras = data
    .map((item) => modelName(item.model))
    .filter((model) => !expectedModels.includes(model));
  const models = [...expectedModels, ...extras];

  return models
    .map((model) => ({
      model,
      label: modelLabels[model] || model,
      requests: Number(byModel.get(model) ?? 0),
      fill: modelColors[model] ?? "#94a3b8",
    }))
    .filter((item) => item.requests > 0);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatCost(value: number) {
  if (value === 0) return "RM 0";
  if (value < 0.01) return `RM ${value.toFixed(6)}`;
  return `RM ${value.toFixed(2)}`;
}

export default function ChartsPanel({ modelUsage, timeseries, loading }: ChartsPanelProps) {
  const modelData = normalizeModelUsage(modelUsage);
  const modelTotal = modelData.reduce((total, item) => total + item.requests, 0);
  const costPoints =
    timeseries?.points
      ?.map((point) => ({
        ...point,
        label: formatDate(point.date),
        value: Number(point.value ?? 0),
      }))
      .filter((point) => Number.isFinite(point.value)) ?? [];
  const hasCostData = costPoints.some((point) => point.value > 0);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Model Usage Chart */}
      <div className="tl-panel overflow-hidden rounded-2xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/24">
                <BarChart3 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" aria-hidden="true" />
              </div>
              <h2 className="tl-heading text-sm font-semibold">Model Usage</h2>
            </div>
            <p className="tl-muted mt-1 ml-9 text-[11px]">Routing decisions - 24h</p>
          </div>
          <span className="tl-soft mt-1 rounded-full px-3 py-1 text-[10px] font-bold text-[var(--tl-muted)]">
            {modelTotal} requests
          </span>
        </div>
        <div className="px-2 pb-4 pt-2 h-64">
          {loading ? (
            <div className="mx-3 h-full animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/30" />
          ) : modelTotal > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelData} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
                <CartesianGrid stroke="var(--tl-grid)" strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--tl-muted)", fontSize: 11, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--tl-grid)" }}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--tl-muted)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  cursor={{ fill: "rgba(96, 165, 250, 0.04)" }}
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.model ?? "model"}
                />
                <Bar dataKey="requests" radius={[8, 8, 0, 0]} maxBarSize={64}>
                  {modelData.map((entry) => (
                    <Cell key={entry.model} fill={entry.fill} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState compact icon={BarChart3} title="No routing data" description="Send a prompt to populate model usage." />
            </div>
          )}
        </div>
        {modelTotal > 0 && (
          <div className="flex flex-wrap gap-4 border-t border-[var(--tl-border)] px-5 py-3">
            {modelData.map((item) => (
              <span key={item.model} className="tl-muted inline-flex items-center gap-2 text-[11px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="font-medium text-[var(--tl-body)]">{item.label}</span>
                <span>{item.requests}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Cost Trend Chart */}
      <div className="tl-panel overflow-hidden rounded-2xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/24">
                <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" aria-hidden="true" />
              </div>
              <h2 className="tl-heading text-sm font-semibold">Cost Trend</h2>
            </div>
            <p className="tl-muted mt-1 ml-9 text-[11px]">Daily MYR spend</p>
          </div>
          <span className="mt-1 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            7 days
          </span>
        </div>
        <div className="px-2 pb-4 pt-2 h-64">
          {loading ? (
            <div className="mx-3 h-full animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/30" />
          ) : hasCostData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costPoints} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
                <defs>
                  <linearGradient id="costGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--tl-grid)" strokeDasharray="3 6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--tl-muted)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--tl-muted)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(value) => `RM ${Number(value).toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [formatCost(Number(value)), "Cost"]}
                  labelFormatter={(label) => `${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  fill="url(#costGradient)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#f59e0b", strokeWidth: 2, stroke: "#0c1120" }}
                  activeDot={{ r: 5, fill: "#fbbf24", strokeWidth: 2, stroke: "#0c1120" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState compact icon={TrendingUp} title="No spend curve" description="Send prompts to generate cost data." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
