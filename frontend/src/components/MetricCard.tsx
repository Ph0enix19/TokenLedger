import { LucideIcon } from "lucide-react";

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  trend?: string;
  tone: "mint" | "blue" | "amber" | "rose" | "slate";
  loading?: boolean;
};

const toneClasses = {
  mint: "text-teal-200 bg-teal-400/10 ring-teal-300/20",
  blue: "text-sky-200 bg-sky-400/10 ring-sky-300/20",
  amber: "text-amber-200 bg-amber-400/10 ring-amber-300/20",
  rose: "text-rose-200 bg-rose-400/10 ring-rose-300/20",
  slate: "text-slate-200 bg-slate-800/80 ring-slate-500/20",
};

const accentClasses = {
  mint: "from-teal-300/80 to-emerald-300/30",
  blue: "from-sky-300/80 to-blue-400/30",
  amber: "from-amber-300/80 to-yellow-300/30",
  rose: "from-rose-300/80 to-red-300/30",
  slate: "from-slate-300/45 to-slate-500/10",
};

function MetricCard({ icon: Icon, label, value, detail, trend, tone, loading = false }: MetricCardProps) {
  return (
    <article className="metric-surface min-h-32 rounded-lg p-4">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accentClasses[tone]}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-4 h-8 w-28 animate-pulse rounded-md bg-slate-800" />
          ) : (
            <p className="mt-3 break-words text-3xl font-semibold tracking-normal text-white">{value}</p>
          )}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-4 flex min-h-5 items-center justify-between gap-2">
        <p className="truncate text-xs text-slate-500">{detail}</p>
        {trend ? (
          <p className="shrink-0 rounded-[5px] bg-white/[0.035] px-2 py-0.5 text-[11px] font-medium text-slate-300">
            {trend}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default MetricCard;
