import { Database, RefreshCw, Server, ShieldCheck, TerminalSquare } from "lucide-react";
import type { EndpointStatus } from "../types/tokenledger";
import Badge from "./Badge";
import { Spinner } from "./LoadingState";

type HeaderBarProps = {
  health: EndpointStatus;
  ready: EndpointStatus;
  lastRefreshed: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
};

function formatTime(value: string | null) {
  if (!value) return "Not refreshed yet";

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function stateClasses(state: EndpointStatus["state"]) {
  if (state === "healthy" || state === "ready") {
    return {
      dot: "bg-emerald-400 shadow-emerald-400/40",
      text: "text-emerald-200",
      badge: "green" as const,
    };
  }

  if (state === "checking") {
    return {
      dot: "bg-amber-300 shadow-amber-300/40",
      text: "text-amber-200",
      badge: "amber" as const,
    };
  }

  return {
    dot: "bg-rose-400 shadow-rose-400/40",
    text: "text-rose-200",
    badge: "red" as const,
  };
}

function EndpointPill({ label, status, icon: Icon }: { label: string; status: EndpointStatus; icon: typeof Server }) {
  const classes = stateClasses(status.state);

  return (
    <div className="dashboard-panel-soft flex min-w-0 items-center gap-2 rounded-lg px-3 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950/55">
        <Icon className={`h-3.5 w-3.5 ${classes.text}`} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full shadow-lg ${classes.dot}`} />
          <span className={`truncate text-xs font-semibold ${classes.text}`} title={status.detail ?? status.label}>
            {status.label}
          </span>
        </p>
      </div>
    </div>
  );
}

function HeaderBar({ health, ready, lastRefreshed, isRefreshing, onRefresh }: HeaderBarProps) {
  return (
    <header className="dashboard-panel rounded-lg px-4 py-4 backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-300/10 text-teal-200 ring-1 ring-teal-300/20">
            <Database className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-normal text-white sm:text-2xl">TokenLedger</h1>
              <Badge variant="blue">AI Gateway Control Plane</Badge>
              <Badge variant="outline">Local / Development</Badge>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Governed AI routing, cost controls, cache visibility, MCP tools, and audit evidence.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:min-w-[600px]">
          <EndpointPill label="Health" status={health} icon={ShieldCheck} />
          <EndpointPill label="Ready" status={ready} icon={Server} />
          <div className="dashboard-panel-soft flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950/55 text-slate-400">
                <TerminalSquare className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">Last refreshed</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-200">{formatTime(lastRefreshed)}</p>
              </div>
            </div>
            <button
              className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md bg-slate-100 px-3 text-xs font-semibold text-slate-950 transition hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
            >
              {isRefreshing ? <Spinner className="border-slate-500 border-t-slate-100" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default HeaderBar;
