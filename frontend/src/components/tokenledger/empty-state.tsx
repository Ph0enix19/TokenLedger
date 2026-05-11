"use client";

import { type LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
};

export default function EmptyState({ title, description, icon: Icon, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--tl-border)] bg-[color-mix(in_srgb,var(--tl-panel-soft)_74%,transparent)] px-6 text-center ${
        compact ? "py-6" : "py-10"
      }`}
    >
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tl-panel-raised)] text-[var(--tl-muted)] ring-1 ring-[var(--tl-border)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <p className="tl-heading mt-3 text-sm font-semibold">{title}</p>
      <p className="tl-muted mt-1 max-w-xs text-xs leading-5">{description}</p>
    </div>
  );
}
