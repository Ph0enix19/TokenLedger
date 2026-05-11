import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Bot, Clock, Coins, FileClock, Gauge, LayoutDashboard, MessageSquare, Network, ShieldCheck } from "lucide-react";
import {
  apiErrorToMessage,
  getAudit,
  getDashboardStats,
  getHealth,
  getReady,
  getTimeseries,
} from "./lib/api";
import type {
  AuditRow,
  ChatInteraction,
  DashboardStats,
  EndpointStatus,
  TimeseriesResponse,
} from "./types/tokenledger";
import AuditLogTable from "./components/AuditLogTable";
import ChartsPanel from "./components/ChartsPanel";
import ChatPlayground from "./components/ChatPlayground";
import HeaderBar from "./components/HeaderBar";
import MetricCard from "./components/MetricCard";
import PipelineTrace from "./components/PipelineTrace";
import RequestDetailPanel from "./components/RequestDetailPanel";

const emptyStats: DashboardStats = {
  cost_today_myr: 0,
  requests_today: 0,
  cache_hit_rate_pct_24h: 0,
  p95_latency_ms_24h: 0,
  requests_by_model_24h: [],
  last_updated: "",
};

const checkingStatus: EndpointStatus = {
  state: "checking",
  label: "Checking",
};

const railItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Playground", icon: MessageSquare },
  { label: "Trace", icon: Network },
  { label: "Audit", icon: FileClock },
  { label: "Policy", icon: ShieldCheck },
];

function statusFromHealth(payload: Record<string, unknown>): EndpointStatus {
  const status = typeof payload.status === "string" ? payload.status : "unknown";
  const service = typeof payload.service === "string" ? payload.service : "backend";

  return status === "ok"
    ? { state: "healthy", label: "Healthy", detail: `${service}: ${status}` }
    : { state: "unavailable", label: "Unavailable", detail: `${service}: ${status}` };
}

function statusFromReady(payload: Record<string, unknown>): EndpointStatus {
  const status = typeof payload.status === "string" ? payload.status : "unknown";
  const db = typeof payload.db === "string" ? payload.db : "db unknown";

  return status === "ready"
    ? { state: "ready", label: "Ready", detail: `database ${db}` }
    : { state: "unavailable", label: "Not ready", detail: db };
}

function formatCostToday(value: number) {
  if (value < 0.01) return `RM ${value.toFixed(6)}`;
  return `RM ${value.toFixed(2)}`;
}

function findMatchingAuditRow(rows: AuditRow[], interaction: ChatInteraction | null) {
  if (!interaction) return rows[0] ?? null;

  if (interaction.status === "allowed" && interaction.response.request_id) {
    return rows.find((row) => row.request_id === interaction.response.request_id) ?? rows[0] ?? null;
  }

  if (interaction.status === "blocked") {
    return (
      rows.find((row) => row.outcome === "blocked" && row.user_id === interaction.user_id) ??
      rows.find((row) => row.outcome === "blocked") ??
      rows[0] ??
      null
    );
  }

  return rows[0] ?? null;
}

function AppRail() {
  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center border-r border-white/[0.06] bg-slate-950/55 py-4 backdrop-blur-xl lg:flex">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-300/10 text-teal-200 ring-1 ring-teal-300/20">
        <Bot className="h-5 w-5" aria-hidden="true" />
      </div>
      <nav className="mt-7 flex flex-1 flex-col items-center gap-2" aria-label="Dashboard sections">
        {railItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                item.active
                  ? "bg-slate-100 text-slate-950"
                  : "text-slate-500 hover:bg-slate-900/80 hover:text-slate-200"
              }`}
              type="button"
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          );
        })}
      </nav>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/70 text-slate-500 ring-1 ring-white/[0.06]">
        <Gauge className="h-4 w-4" aria-hidden="true" />
      </div>
    </aside>
  );
}

function App() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [costSeries, setCostSeries] = useState<TimeseriesResponse | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [health, setHealth] = useState<EndpointStatus>(checkingStatus);
  const [ready, setReady] = useState<EndpointStatus>(checkingStatus);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [latestInteraction, setLatestInteraction] = useState<ChatInteraction | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsRefreshing(true);
    setHealth((current) => ({ ...current, state: "checking", label: "Checking" }));
    setReady((current) => ({ ...current, state: "checking", label: "Checking" }));

    const [healthResult, readyResult, statsResult, timeseriesResult, auditResult] = await Promise.allSettled([
      getHealth(),
      getReady(),
      getDashboardStats(),
      getTimeseries("cost", 7),
      getAudit(20),
    ]);

    const issues: string[] = [];
    let nextRows: AuditRow[] | null = null;

    if (healthResult.status === "fulfilled") {
      setHealth(statusFromHealth(healthResult.value));
    } else {
      setHealth({ state: "unavailable", label: "Offline", detail: apiErrorToMessage(healthResult.reason) });
    }

    if (readyResult.status === "fulfilled") {
      setReady(statusFromReady(readyResult.value));
    } else {
      setReady({ state: "unavailable", label: "Not ready", detail: apiErrorToMessage(readyResult.reason) });
    }

    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    } else {
      issues.push(`stats: ${apiErrorToMessage(statsResult.reason)}`);
    }

    if (timeseriesResult.status === "fulfilled") {
      setCostSeries(timeseriesResult.value);
    } else {
      setCostSeries(null);
      issues.push(`timeseries: ${apiErrorToMessage(timeseriesResult.reason)}`);
    }

    if (auditResult.status === "fulfilled") {
      nextRows = auditResult.value.audit_log;
      setAuditRows(nextRows);
    } else {
      issues.push(`audit: ${apiErrorToMessage(auditResult.reason)}`);
    }

    setDashboardError(issues.length ? issues.join(" | ") : null);
    setLastRefreshed(new Date().toISOString());
    setHasLoaded(true);
    setIsRefreshing(false);

    return { auditRows: nextRows };
  }, []);

  useEffect(() => {
    void loadDashboard();
    const timer = window.setInterval(() => {
      void loadDashboard();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadDashboard]);

  const selectedAuditRow = useMemo(() => {
    const explicit = selectedAuditId ? auditRows.find((row) => row.id === selectedAuditId) : null;
    return explicit ?? auditRows[0] ?? null;
  }, [auditRows, selectedAuditId]);

  const auditConfirmed = useMemo(() => {
    if (!latestInteraction) return false;

    if (latestInteraction.status === "allowed" && latestInteraction.response.request_id) {
      return auditRows.some((row) => row.request_id === latestInteraction.response.request_id);
    }

    if (latestInteraction.status === "blocked") {
      return auditRows.some((row) => row.outcome === "blocked" && row.user_id === latestInteraction.user_id);
    }

    return false;
  }, [auditRows, latestInteraction]);

  const handleChatSettled = async (interaction: ChatInteraction | null) => {
    if (interaction) {
      setLatestInteraction(interaction);
    }

    const refreshed = await loadDashboard();
    const rows = refreshed.auditRows ?? [];
    const match = findMatchingAuditRow(rows, interaction);
    if (match) {
      setSelectedAuditId(match.id);
    }
  };

  const cacheRequests = stats.requests_by_model_24h.find((item) => item.model === "cache")?.requests ?? 0;
  const largeModelRequests =
    stats.requests_by_model_24h.find((item) => item.model === "llama-3.3-70b-versatile")?.requests ?? 0;
  const isLoadingInitial = isRefreshing && !hasLoaded;

  return (
    <div className="dashboard-shell min-h-screen text-slate-100">
      <div className="flex min-h-screen">
        <AppRail />
        <main className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6">
            <HeaderBar
              health={health}
              ready={ready}
              lastRefreshed={lastRefreshed}
              isRefreshing={isRefreshing}
              onRefresh={() => void loadDashboard()}
            />

            {dashboardError ? (
              <div className="rounded-lg bg-amber-950/35 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-400/25">
                Some dashboard data could not be refreshed. Previous values remain visible. {dashboardError}
              </div>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={Coins}
                label="Cost Today"
                value={formatCostToday(stats.cost_today_myr)}
                detail="Calculated per request in MYR"
                trend={stats.cost_today_myr > 0 ? "live spend" : "no spend yet"}
                tone="amber"
                loading={isLoadingInitial}
              />
              <MetricCard
                icon={Activity}
                label="Requests Today"
                value={stats.requests_today.toLocaleString()}
                detail="Allowed and blocked attempts"
                trend={`${auditRows.length} in audit`}
                tone="blue"
                loading={isLoadingInitial}
              />
              <MetricCard
                icon={ShieldCheck}
                label="Cache Hit Rate"
                value={`${stats.cache_hit_rate_pct_24h.toFixed(1)}%`}
                detail={`${cacheRequests.toLocaleString()} served from cache`}
                trend="24h"
                tone="mint"
                loading={isLoadingInitial}
              />
              <MetricCard
                icon={Clock}
                label="p95 Latency"
                value={`${stats.p95_latency_ms_24h.toLocaleString()} ms`}
                detail={largeModelRequests ? `${largeModelRequests} large-model routes` : "last 24h"}
                trend={stats.p95_latency_ms_24h > 2500 ? "watch" : "stable"}
                tone={stats.p95_latency_ms_24h > 2500 ? "rose" : "slate"}
                loading={isLoadingInitial}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
              <div className="grid min-w-0 gap-4">
                <ChartsPanel
                  modelUsage={stats.requests_by_model_24h}
                  timeseries={costSeries}
                  loading={isLoadingInitial}
                />
                <AuditLogTable
                  rows={auditRows}
                  loading={isLoadingInitial}
                  selectedId={selectedAuditRow?.id ?? null}
                  onSelect={(row) => setSelectedAuditId(row.id)}
                  lastUpdated={stats.last_updated || lastRefreshed}
                />
              </div>

              <aside className="grid min-w-0 content-start gap-4">
                <ChatPlayground latest={latestInteraction} onSettled={handleChatSettled} />
                <PipelineTrace latest={latestInteraction} auditConfirmed={auditConfirmed} />
                <RequestDetailPanel row={selectedAuditRow} latest={latestInteraction} />
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
