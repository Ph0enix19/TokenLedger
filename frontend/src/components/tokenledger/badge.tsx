"use client";

import type { ReactNode } from "react";

type BadgeVariant =
  | "slate"
  | "teal"
  | "blue"
  | "amber"
  | "red"
  | "green"
  | "violet"
  | "outline"
  | "ghost";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  title?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  slate: "border-slate-300/70 bg-slate-100 text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/55 dark:text-slate-300",
  teal: "border-teal-300/70 bg-teal-50 text-teal-700 dark:border-teal-500/24 dark:bg-teal-500/12 dark:text-teal-300",
  blue: "border-blue-300/70 bg-blue-50 text-blue-700 dark:border-blue-500/24 dark:bg-blue-500/12 dark:text-blue-300",
  amber: "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-500/24 dark:bg-amber-500/12 dark:text-amber-300",
  red: "border-red-300/70 bg-red-50 text-red-700 dark:border-red-500/24 dark:bg-red-500/12 dark:text-red-300",
  green: "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/24 dark:bg-emerald-500/12 dark:text-emerald-300",
  violet: "border-violet-300/70 bg-violet-50 text-violet-700 dark:border-violet-500/24 dark:bg-violet-500/12 dark:text-violet-300",
  outline: "border-[var(--tl-border-strong)] bg-transparent text-[var(--tl-muted)]",
  ghost: "border-transparent bg-transparent text-[var(--tl-faint)]",
};

export default function Badge({ children, variant = "slate", className = "", title }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-6 max-w-full min-w-0 items-center gap-1.5 overflow-hidden text-ellipsis rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.05em] whitespace-nowrap ${variantClasses[variant]} ${className}`}
      title={title}
    >
      {children}
    </span>
  );
}
