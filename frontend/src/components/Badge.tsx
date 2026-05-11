import type { ReactNode } from "react";

type BadgeVariant =
  | "slate"
  | "teal"
  | "blue"
  | "amber"
  | "red"
  | "green"
  | "violet"
  | "outline";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  title?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  slate: "border-slate-700/80 bg-slate-800/70 text-slate-300",
  teal: "border-teal-400/25 bg-teal-400/10 text-teal-200",
  blue: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  red: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  violet: "border-indigo-400/25 bg-indigo-400/10 text-indigo-200",
  outline: "border-slate-600/80 bg-transparent text-slate-300",
};

function Badge({ children, variant = "slate", className = "", title }: BadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-[5px] border px-2 py-0.5 text-[11px] font-medium leading-5 ${variantClasses[variant]} ${className}`}
      title={title}
    >
      {children}
    </span>
  );
}

export default Badge;
