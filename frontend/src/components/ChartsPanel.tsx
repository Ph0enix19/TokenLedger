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
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";
import type { ModelUsage, TimeseriesResponse } from "../types/tokenledger";
import EmptyState from "./EmptyState";

type ChartsPanelProps = {
  modelUsage: ModelUsage[];
  timeseries: TimeseriesResponse | null;
  loading: boolean;
};

const expectedModels = ["cache", "llama-3.1-8b-instant", "llama-3.3-70b-versatile", "unknown"];

const modelColors: Record<string, string> = {
  cache: "#2dd4bf",
  "llama-3.1-8b-instant": "#38bdf8",
  "llama-3.3-70b-versatile": "#818cf8",
  unknown: "#64748b",
};

const tooltipStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "6px",
  color: "#e2e8f0",
  boxShadow: "0 16px 40px rgba(2, 6, 23, 0.32)",
};

function compactModelName(model: string) {
  if (model === "llama-3.1-8b-instant") return "8B instant";
  if (model === "llama-3.3-70b-versatile") return "70B versatile";
  return model || "unknown";
}

function normalizeModelUsage(data: ModelUsage[]) {
  const byModel = new Map(data.map((item) => [item.model || "unknown", item.requests]));
  const extras = data
    .filter((item) => !expectedModels.includes(item.model || "unknown"))
    .map((item) => item.model || "unknown");
  const models = [...expectedModels, ...extras];

  return models.map((model) => ({
    model,
    label: compactModelName(model),
    requests: Number(byModel.get(model) ?? 0),
    fill: modelColors[model] ?? "#94a3b8",
  }));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatCost(value: number) {
  if (value === 0) return "RM 0";
  if (value < 0.01) return `RM ${value.toFixed(6)}`;
  return `RM ${value.toFixed(2)}`;
}

function ChartsPanel({ modelUsage, timeseries, loading }: ChartsPanelProps) {
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
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="dashboard-panel rounded-lg p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-300" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white">Model Usage</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Routing decisions over the last 24 hours</p>
          </div>
          <span className="rounded-[5px] bg-slate-900/80 px-2 py-1 text-xs text-slate-300 ring-1 ring-white/10">
            {modelTotal.toLocaleString()} requests
          </span>
        </div>
        <div className="h-64">
          {loading ? (
            <div className="h-full animate-pulse rounded bg-slate-900/80" />
          ) : modelTotal > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelData} margin={{ top: 10, right: 8, left: -24, bottom: 34 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 5" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  interval={0}
                  angle={-14}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(45, 212, 191, 0.08)" }}
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.model ?? "model"}
                />
                <Bar dataKey="requests" radius={[4, 4, 0, 0]}>
                  {modelData.map((entry) => (
                    <Cell key={entry.model} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              compact
              icon={BarChart3}
              title="No routing data yet"
              description="Send a prompt to populate model usage, cache traffic, and unknown fallback evidence."
            />
          )}
        </div>
        {modelTotal > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
            {modelData
              .filter((item) => item.requests > 0)
              .map((item) => (
                <span key={item.model} className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                  {item.label}
                </span>
              ))}
          </div>
        ) : null}
      </article>

      <article className="dashboard-panel rounded-lg p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-amber-300" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-white">Cost Trend</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Daily MYR spend from the dashboard timeseries API</p>
          </div>
          <span className="rounded-[5px] bg-amber-400/10 px-2 py-1 text-xs text-amber-200 ring-1 ring-amber-400/20">
            7 days
          </span>
        </div>
        <div className="h-64">
          {loading ? (
            <div className="h-full animate-pulse rounded bg-slate-900/80" />
          ) : hasCostData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costPoints} margin={{ top: 10, right: 14, left: -18, bottom: 8 }}>
                <defs>
                  <linearGradient id="costGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `RM ${Number(value).toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [formatCost(Number(value)), "Cost"]}
                  labelFormatter={(label) => `Date ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  fill="url(#costGradient)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#fbbf24", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              compact
              icon={LineChartIcon}
              title="No spend curve yet"
              description="The timeseries endpoint is reachable, but there is no non-zero MYR cost to plot."
            />
          )}
        </div>
      </article>
    </section>
  );
}

export default ChartsPanel;
