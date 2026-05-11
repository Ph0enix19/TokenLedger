"use client";

import { type LucideIcon } from "lucide-react";

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  trend?: string;
  tone: "mint" | "blue" | "amber" | "rose" | "slate";
  loading?: boolean;
};

const toneStyles = {
  mint: {
    icon: "text-emerald-600 dark:text-emerald-300",
    iconBg: "bg-emerald-500/10 ring-emerald-500/24",
    accent: "from-emerald-500/50 via-emerald-500/20 to-transparent",
    shadow: "shadow-[0_0_30px_-8px_rgba(52,211,153,0.1)]",
  },
  blue: {
    icon: "text-blue-600 dark:text-blue-300",
    iconBg: "bg-blue-500/10 ring-blue-500/24",
    accent: "from-blue-500/50 via-blue-500/20 to-transparent",
    shadow: "shadow-[0_0_30px_-8px_rgba(96,165,250,0.1)]",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-300",
    iconBg: "bg-amber-500/10 ring-amber-500/24",
    accent: "from-amber-500/50 via-amber-500/20 to-transparent",
    shadow: "shadow-[0_0_30px_-8px_rgba(251,191,36,0.1)]",
  },
  rose: {
    icon: "text-rose-600 dark:text-rose-300",
    iconBg: "bg-rose-500/10 ring-rose-500/24",
    accent: "from-rose-500/50 via-rose-500/20 to-transparent",
    shadow: "shadow-[0_0_30px_-8px_rgba(251,113,133,0.1)]",
  },
  slate: {
    icon: "text-slate-500 dark:text-slate-300",
    iconBg: "bg-slate-500/10 ring-slate-500/20",
    accent: "from-slate-400/40 via-slate-500/15 to-transparent",
    shadow: "",
  },
};

export default function MetricCard({ icon: Icon, label, value, detail, trend, tone, loading = false }: MetricCardProps) {
  const style = toneStyles[tone];

  return (
    <div className={`tl-panel group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:border-[var(--tl-border-strong)] ${style.shadow}`}>
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${style.accent}`} />
      <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${style.accent} opacity-30 pointer-events-none`} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="tl-muted text-[10px] font-bold uppercase tracking-[0.15em]">{label}</p>
          {loading ? (
            <div className="mt-3 h-10 w-36 animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/40" />
          ) : (
            <p className="tl-heading mt-2 text-[28px] font-bold tracking-tight leading-none">{value}</p>
          )}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${style.iconBg}`}>
          <Icon className={`h-5 w-5 ${style.icon}`} aria-hidden="true" />
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3">
        <p className="tl-muted truncate text-[11px] leading-4">{detail}</p>
        {trend && !loading ? (
          <span className="tl-soft shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-[var(--tl-muted)]">
            {trend}
          </span>
        ) : null}
      </div>
    </div>
  );
}
