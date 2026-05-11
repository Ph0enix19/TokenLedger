"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Database,
  FileClock,
  LayoutDashboard,
  MessageSquare,
  Network,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  apiErrorToMessage,
  getAudit,
  getDashboardStats,
  getHealth,
  getReady,
  getTimeseries,
} from "@/lib/tokenledger-api";
import type {
  AuditRow,
  ChatInteraction,
  DashboardStats,
  EndpointStatus,
  TimeseriesResponse,
} from "@/types/tokenledger";
import AuditLogTable from "@/components/tokenledger/audit-log-table";
import ChartsPanel from "@/components/tokenledger/charts-panel";
import ChatPlayground from "@/components/tokenledger/chat-playground";
import HeaderBar from "@/components/tokenledger/header-bar";
import MetricCard from "@/components/tokenledger/metric-card";
import PipelineTrace from "@/components/tokenledger/pipeline-trace";
import RequestDetailPanel from "@/components/tokenledger/request-detail-panel";

type Theme = "light" | "dark";

const THEME_KEY = "tokenledger-theme";

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

const navItems = [
  { id: "overview", label: "Overview", description: "Status and KPIs", icon: LayoutDashboard },
  { id: "playground", label: "Playground", description: "Gateway request", icon: MessageSquare },
  { id: "trace", label: "Pipeline", description: "Routing path", icon: Network },
  { id: "audit", label: "Audit Log", description: "Evidence trail", icon: FileClock },
  { id: "security", label: "Security", description: "PII and policy", icon: ShieldCheck },
] as const;

function getSavedTheme(): Theme | null {
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getThemeSnapshot() {
  if (typeof window === "undefined") return "dark:system";
  const saved = getSavedTheme();
  const theme = saved ?? getSystemTheme();
  return `${theme}:${saved ? "stored" : "system"}`;
}

function subscribeTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) onStoreChange();
  };

  window.addEventListener("tokenledger-theme-change", onStoreChange);
  window.addEventListener("storage", handleStorage);
  media.addEventListener("change", onStoreChange);

  return () => {
    window.removeEventListener("tokenledger-theme-change", onStoreChange);
    window.removeEventListener("storage", handleStorage);
    media.removeEventListener("change", onStoreChange);
  };
}

function applyThemePreference(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new Event("tokenledger-theme-change"));
}

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

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 text-sm font-black tracking-tight text-white shadow-[0_12px_32px_rgba(14,165,233,0.22)]">
        TL
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="tl-heading text-sm font-bold leading-4">TokenLedger</p>
          <p className="tl-muted mt-0.5 text-[11px] font-medium">Observability Dashboard</p>
        </div>
      )}
    </div>
  );
}

type AppSidebarProps = {
  activeId: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigate: (id: string) => void;
  onToggleCollapsed: () => void;
};

function AppSidebar({
  activeId,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onNavigate,
  onToggleCollapsed,
}: AppSidebarProps) {
  return (
    <>
      <button
        aria-label="Close navigation"
        className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        type="button"
        onClick={onCloseMobile}
      />
      <aside
        className={`tl-sidebar fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col transition-all duration-300 lg:sticky lg:top-0 lg:z-20 ${
          collapsed ? "lg:w-[78px]" : "lg:w-[280px]"
        } ${mobileOpen ? "w-[292px] translate-x-0" : "w-[292px] -translate-x-full lg:translate-x-0"}`}
        aria-label="TokenLedger navigation"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <LogoMark compact={collapsed} />
          <button
            className="tl-button tl-button-secondary h-9 w-9 shrink-0"
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            className="tl-button tl-button-secondary h-9 w-9 shrink-0 lg:hidden"
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 px-3" aria-label="Dashboard sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                className={`tl-nav-item flex min-h-11 items-center gap-3 rounded-xl border border-transparent px-3 text-left text-sm font-semibold transition-all ${
                  isActive ? "tl-nav-item-active" : ""
                } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={`${collapsed ? "lg:hidden" : ""}`}>
                  <span className="block leading-4">{item.label}</span>
                  <span className="tl-faint mt-0.5 block text-[10px] font-medium leading-3">{item.description}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <div className={`tl-soft rounded-xl p-3 ${collapsed ? "lg:p-2" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.55)]" />
              <span className={`tl-heading text-xs font-bold ${collapsed ? "lg:hidden" : ""}`}>Gateway online</span>
            </div>
            <p className={`tl-muted mt-1 text-[10px] ${collapsed ? "lg:hidden" : ""}`}>FastAPI 8000 - MCP 8001</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function TokenLedgerDashboard() {
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof navItems)[number]["id"]>("overview");
  const themeSnapshot = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "dark:system");
  const theme = themeSnapshot.startsWith("light") ? "light" : "dark";

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
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await loadDashboard();
    };
    void run();
    const timer = window.setInterval(() => {
      void run();
    }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
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
      setActiveSection("audit");
    }
  };

  const handleNavigate = (id: string) => {
    setActiveSection(id as (typeof navItems)[number]["id"]);
    setMobileSidebarOpen(false);
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const cacheRequests = stats.requests_by_model_24h.find((item) => item.model === "cache")?.requests ?? 0;
  const largeModelRequests = stats.requests_by_model_24h.find((item) => item.model === "llama-3.3-70b-versatile")?.requests ?? 0;
  const isLoadingInitial = isRefreshing && !hasLoaded;

  return (
    <div className="tl-dashboard min-h-screen">
      <div className="flex min-h-screen">
        <AppSidebar
          activeId={activeSection}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onNavigate={handleNavigate}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        />

        <main className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
            <HeaderBar
              health={health}
              ready={ready}
              lastRefreshed={lastRefreshed}
              isRefreshing={isRefreshing}
              onRefresh={() => void loadDashboard()}
              onToggleSidebar={() => setMobileSidebarOpen(true)}
              sidebarExpanded={!sidebarCollapsed}
              theme={theme}
              onToggleTheme={() => {
                applyThemePreference(theme === "dark" ? "light" : "dark");
              }}
            />

            {dashboardError && (
              <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                Some data could not be refreshed. {dashboardError}
              </div>
            )}

            <section id="overview" className="scroll-mt-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                    Control plane
                  </p>
                  <h2 className="tl-heading mt-1 text-xl font-bold tracking-tight">Gateway operations</h2>
                </div>
                <p className="tl-muted text-xs">Live costs, model routing, cache behavior, and policy outcomes.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={Coins}
                  label="Cost Today"
                  value={formatCostToday(stats.cost_today_myr)}
                  detail="Per-request cost in MYR"
                  trend={stats.cost_today_myr > 0 ? "live spend" : "no spend yet"}
                  tone="amber"
                  loading={isLoadingInitial}
                />
                <MetricCard
                  icon={Activity}
                  label="Requests Today"
                  value={stats.requests_today.toLocaleString()}
                  detail="Allowed and blocked traffic"
                  trend={`${auditRows.length} in audit`}
                  tone="blue"
                  loading={isLoadingInitial}
                />
                <MetricCard
                  icon={Database}
                  label="Cache Hit Rate"
                  value={`${stats.cache_hit_rate_pct_24h.toFixed(1)}%`}
                  detail={`${cacheRequests} served from cache`}
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
              </div>
            </section>

            <section className="scroll-mt-5" id="analytics">
              <ChartsPanel
                modelUsage={stats.requests_by_model_24h}
                timeseries={costSeries}
                loading={isLoadingInitial}
              />
            </section>

            <section className="grid scroll-mt-5 gap-5 xl:grid-cols-[430px_minmax(0,1fr)]" id="playground">
              <aside className="grid min-w-0 content-start gap-5">
                <ChatPlayground latest={latestInteraction} onSettled={handleChatSettled} />
                <div id="trace" className="scroll-mt-5">
                  <PipelineTrace latest={latestInteraction} auditConfirmed={auditConfirmed} />
                </div>
              </aside>

              <div className="grid min-w-0 content-start gap-5">
                <div id="audit" className="scroll-mt-5">
                  <AuditLogTable
                    rows={auditRows}
                    loading={isLoadingInitial}
                    selectedId={selectedAuditRow?.id ?? null}
                    onSelect={(row) => {
                      setSelectedAuditId(row.id);
                      setActiveSection("audit");
                    }}
                    lastUpdated={stats.last_updated || lastRefreshed}
                  />
                </div>
                <div id="security" className="scroll-mt-5">
                  <RequestDetailPanel row={selectedAuditRow} latest={latestInteraction} />
                </div>
              </div>
            </section>

            <section className="tl-soft mb-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-500" aria-hidden="true" />
                <span className="tl-heading text-sm font-semibold">TokenLedger AI Gateway</span>
              </div>
              <span className="tl-muted text-xs">Cost tracking - semantic cache - PII controls - audit evidence</span>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
