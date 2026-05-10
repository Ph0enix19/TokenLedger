import { useEffect, useMemo, useState } from "react";
import { Activity, Clock, Coins, Database, Gauge } from "lucide-react";
import { apiErrorToMessage, AuditEntry, DashboardStats, fetchAudit, fetchStats } from "./api";
import AuditTable from "./components/AuditTable";
import MetricCard from "./components/MetricCard";
import ModelBar from "./components/ModelBar";
import Playground from "./components/Playground";

const emptyStats: DashboardStats = {
  cost_today_myr: 0,
  requests_today: 0,
  cache_hit_rate_pct_24h: 0,
  p95_latency_ms_24h: 0,
  requests_by_model_24h: [],
  last_updated: "",
};

function App() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [auditRows, setAuditRows] = useState<AuditEntry[]>([]);
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      const [nextStats, nextAudit] = await Promise.all([fetchStats(), fetchAudit(20)]);
      setStats(nextStats);
      setAuditRows(nextAudit.audit_log);
      setStatus("online");
      setError(null);
    } catch (err) {
      setStatus("offline");
      setError(apiErrorToMessage(err));
    }
  };

  useEffect(() => {
    void loadDashboard();
    const timer = window.setInterval(() => {
      void loadDashboard();
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const statusClasses = useMemo(() => {
    if (status === "online") return "bg-emerald-400 shadow-emerald-400/40";
    if (status === "offline") return "bg-rose-400 shadow-rose-400/40";
    return "bg-amber-300 shadow-amber-300/40";
  }, [status]);

  return (
    <main className="min-h-screen bg-ledger-ink text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-ledger-line pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-ledger-line bg-slate-900">
                <Database className="h-5 w-5 text-ledger-mint" aria-hidden="true" />
              </div>
              <h1 className="text-3xl font-semibold tracking-normal text-white">TokenLedger</h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Real-time cost tracking and controls for AI infrastructure
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className={`h-2.5 w-2.5 rounded-full shadow-lg ${statusClasses}`} />
            <span>{status === "checking" ? "checking backend" : `backend ${status}`}</span>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-rose-400/30 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Coins}
            label="Cost today"
            value={`MYR ${stats.cost_today_myr.toFixed(6)}`}
            tone="mint"
          />
          <MetricCard
            icon={Activity}
            label="Requests today"
            value={stats.requests_today.toLocaleString()}
            tone="blue"
          />
          <MetricCard
            icon={Gauge}
            label="Cache hit rate"
            value={`${stats.cache_hit_rate_pct_24h.toFixed(1)}%`}
            detail="last 24h"
            tone="amber"
          />
          <MetricCard
            icon={Clock}
            label="p95 latency"
            value={`${stats.p95_latency_ms_24h.toLocaleString()} ms`}
            detail="last 24h"
            tone="rose"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
          <ModelBar data={stats.requests_by_model_24h} />
          <Playground onComplete={loadDashboard} />
        </section>

        <AuditTable rows={auditRows} lastUpdated={stats.last_updated} />
      </div>
    </main>
  );
}

export default App;
