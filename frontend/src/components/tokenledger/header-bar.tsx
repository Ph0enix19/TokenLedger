"use client";

import { Menu, Moon, RefreshCw, Server, ShieldCheck, Sun, TerminalSquare } from "lucide-react";
import type { EndpointStatus } from "@/types/tokenledger";
import Badge from "./badge";
import { Spinner } from "./spinner";

type HeaderBarProps = {
  health: EndpointStatus;
  ready: EndpointStatus;
  lastRefreshed: string | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleSidebar: () => void;
  sidebarExpanded: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

function formatTime(value: string | null) {
  if (!value) return "Waiting";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function stateStyle(state: EndpointStatus["state"]) {
  if (state === "healthy" || state === "ready") {
    return {
      dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.72)]",
      text: "text-emerald-600 dark:text-emerald-300",
    };
  }
  if (state === "checking") {
    return {
      dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]",
      text: "text-amber-600 dark:text-amber-300",
    };
  }
  return {
    dot: "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.6)]",
    text: "text-red-600 dark:text-red-300",
  };
}

function StatusPill({ label, status, icon: Icon }: { label: string; status: EndpointStatus; icon: typeof Server }) {
  const style = stateStyle(status.state);

  return (
    <div className="tl-soft flex min-h-9 items-center gap-2 rounded-xl px-3 py-1.5">
      <Icon className={`h-3.5 w-3.5 ${style.text}`} aria-hidden="true" />
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      <span className="tl-muted text-[11px] font-semibold">{label}</span>
      <span className={`text-[11px] font-bold ${style.text}`} title={status.detail}>
        {status.label}
      </span>
    </div>
  );
}

export default function HeaderBar({
  health,
  ready,
  lastRefreshed,
  isRefreshing,
  onRefresh,
  onToggleSidebar,
  sidebarExpanded,
  theme,
  onToggleTheme,
}: HeaderBarProps) {
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <header className="tl-panel sticky top-3 z-30 rounded-2xl px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="tl-button tl-button-secondary h-10 w-10 lg:hidden"
            type="button"
            onClick={onToggleSidebar}
            aria-label="Open navigation"
            aria-expanded={sidebarExpanded}
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 text-sm font-black text-white shadow-[0_12px_28px_rgba(14,165,233,0.2)]">
            TL
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="tl-heading truncate text-lg font-bold tracking-tight">TokenLedger</h1>
              <Badge variant="teal">AI Gateway</Badge>
              <Badge variant="outline">Local</Badge>
            </div>
            <p className="tl-muted mt-0.5 text-[11px] font-medium">
              Governed routing, cost controls, cache visibility, and audit evidence.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label="API" status={health} icon={ShieldCheck} />
          <StatusPill label="DB" status={ready} icon={Server} />

          <div className="tl-soft flex min-h-9 items-center gap-2 rounded-xl px-3 py-1.5">
            <TerminalSquare className="h-3.5 w-3.5 text-[var(--tl-faint)]" aria-hidden="true" />
            <span className="tl-muted text-[11px] font-semibold tabular-nums">{formatTime(lastRefreshed)}</span>
          </div>

          <button
            className="tl-button tl-button-secondary h-9 px-3 text-[11px]"
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            suppressHydrationWarning
          >
            <ThemeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span suppressHydrationWarning>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>

          <button
            className="tl-button tl-button-primary h-9 px-3 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh dashboard"
            aria-label="Refresh dashboard"
          >
            {isRefreshing ? <Spinner className="h-3.5 w-3.5 text-white" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            {isRefreshing ? "Syncing" : "Refresh"}
          </button>
        </div>
      </div>
    </header>
  );
}
