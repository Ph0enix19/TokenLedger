import { Inbox, type LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
};

function EmptyState({ title, description, icon: Icon = Inbox, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex h-full min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-700/50 bg-slate-950/25 px-4 text-center ${
        compact ? "py-5" : "py-8"
      }`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900/80 text-slate-400 ring-1 ring-white/10">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-200">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

export default EmptyState;
