import { LucideIcon } from "lucide-react";

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  tone: "mint" | "blue" | "amber" | "rose";
};

const toneClasses = {
  mint: "text-ledger-mint bg-teal-400/10 border-teal-300/20",
  blue: "text-ledger-blue bg-sky-400/10 border-sky-300/20",
  amber: "text-ledger-amber bg-amber-400/10 border-amber-300/20",
  rose: "text-ledger-rose bg-rose-400/10 border-rose-300/20",
};

function MetricCard({ icon: Icon, label, value, detail, tone }: MetricCardProps) {
  return (
    <article className="min-h-32 rounded-md border border-ledger-line bg-ledger-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 break-words text-2xl font-semibold tracking-normal text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      {detail ? <p className="mt-3 text-xs uppercase tracking-normal text-slate-500">{detail}</p> : null}
    </article>
  );
}

export default MetricCard;
