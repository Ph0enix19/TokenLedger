"use client";

import { FileClock, ShieldAlert, Wrench } from "lucide-react";
import type { AuditRow, ToolCall } from "@/types/tokenledger";
import Badge from "./badge";
import EmptyState from "./empty-state";

type AuditLogTableProps = {
  rows: AuditRow[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (row: AuditRow) => void;
  lastUpdated: string | null;
};

function formatTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
}

function formatCost(value: number | null) {
  if (typeof value !== "number") return "-";
  if (value < 0.01) return `RM ${value.toFixed(6)}`;
  return `RM ${value.toFixed(2)}`;
}

function formatLatency(value: number | null) {
  return typeof value === "number" ? `${value.toLocaleString()} ms` : "-";
}

function toolName(tool: ToolCall) {
  return tool.tool ?? tool.name ?? "tool";
}

function modelDisplay(model: string | null) {
  if (!model) return null;
  if (model === "blocked" || model === "unknown") return "Blocked";
  if (model === "llama-3.1-8b-instant") return "8B Instant";
  if (model === "llama-3.3-70b-versatile") return "70B Versatile";
  if (model === "cache") return "Cache";
  return model;
}

function modelVariant(model: string | null) {
  if (model === "blocked" || model === "unknown") return "red" as const;
  if (model === "cache") return "teal" as const;
  if (model?.includes("70b")) return "violet" as const;
  if (model?.includes("8b")) return "blue" as const;
  return "slate" as const;
}

export default function AuditLogTable({ rows, loading, selectedId, onSelect, lastUpdated }: AuditLogTableProps) {
  return (
    <div className="tl-panel overflow-hidden rounded-2xl">
      <div className="tl-panel-header flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 ring-1 ring-[var(--tl-border)]">
            <FileClock className="h-4 w-4 text-[var(--tl-muted)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="tl-heading text-sm font-semibold">Audit Log</h2>
            <p className="tl-muted mt-0.5 text-[10px]">Latest gateway decisions, policy outcomes, and route evidence</p>
          </div>
        </div>
        <span className="tl-muted text-[10px] font-semibold">
          {lastUpdated ? `Updated ${formatTime(lastUpdated)}` : "Waiting"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="tl-table w-full min-w-[1240px] table-auto text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--tl-border)] text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--tl-muted)]">
              <th className="w-[78px] px-4 py-3">Time</th>
              <th className="w-[78px] px-4 py-3">Req</th>
              <th className="w-[110px] px-4 py-3">User</th>
              <th className="w-[118px] px-4 py-3">Outcome</th>
              <th className="min-w-[260px] px-4 py-3">Prompt</th>
              <th className="w-[142px] px-4 py-3">Model</th>
              <th className="w-[90px] px-4 py-3">Cache</th>
              <th className="w-[116px] px-4 py-3">Cost</th>
              <th className="w-[110px] px-4 py-3">Latency</th>
              <th className="w-[140px] px-4 py-3">Route</th>
              <th className="w-[190px] px-4 py-3">Tools</th>
              <th className="w-[130px] px-4 py-3">PII</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--tl-border)]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 12 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div
                        className="h-3 rounded bg-slate-200/80 dark:bg-slate-800/40"
                        style={{ width: j === 4 ? "78%" : "48px" }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length > 0 ? (
              rows.map((row) => {
                const isBlocked = row.outcome === "blocked" || row.pii_flags.length > 0;
                const hasTools = row.tool_calls.length > 0;
                const isSelected = row.id === selectedId;

                return (
                  <tr
                    key={row.id}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? "bg-sky-500/10 ring-1 ring-inset ring-sky-500/25"
                        : isBlocked
                          ? "bg-red-500/[0.04] hover:bg-red-500/[0.07]"
                          : "hover:bg-slate-500/10"
                    } ${hasTools ? "border-l-2 border-l-violet-400/50" : ""}`}
                    onClick={() => onSelect(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(row);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                  >
                    <td className="px-4 py-3 text-[11px] tabular-nums text-[var(--tl-muted)]">{formatTime(row.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--tl-muted)]">{row.request_id ?? row.id}</td>
                    <td className="max-w-[110px] truncate px-4 py-3 text-[11px] text-[var(--tl-body)]">{row.user_id ?? "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={isBlocked ? "red" : "green"}>{row.outcome ?? "unknown"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[300px] truncate text-[12px] text-[var(--tl-heading)]" title={row.prompt_redacted ?? ""}>
                        {row.prompt_redacted ?? "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.model_used ? (
                        <Badge variant={modelVariant(row.model_used)}>{modelDisplay(row.model_used)}</Badge>
                      ) : (
                        <span className="text-[var(--tl-faint)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.cache_hit === null ? (
                        <span className="text-[var(--tl-faint)]">-</span>
                      ) : (
                        <Badge variant={row.cache_hit ? "teal" : "slate"}>
                          {row.cache_hit ? "hit" : "miss"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-bold text-amber-600 dark:text-amber-300">{formatCost(row.cost_myr)}</td>
                    <td className="px-4 py-3 text-[11px] tabular-nums text-[var(--tl-body)]">{formatLatency(row.latency_ms)}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-[132px] truncate text-[11px] text-[var(--tl-muted)]" title={row.route_reason ?? ""}>
                        {row.route_reason ?? "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 flex-wrap gap-1.5">
                        {hasTools ? (
                          row.tool_calls.slice(0, 2).map((tool, i) => (
                            <Badge key={`${toolName(tool)}-${i}`} variant="violet" className="max-w-[168px]">
                              <Wrench className="h-3 w-3 shrink-0" />
                              <span className="truncate">{toolName(tool)}</span>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[var(--tl-faint)]">-</span>
                        )}
                        {row.tool_calls.length > 2 && <Badge variant="violet">+{row.tool_calls.length - 2}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 flex-wrap gap-1.5">
                        {row.pii_flags.length ? (
                          row.pii_flags.slice(0, 2).map((flag) => (
                            <Badge key={flag} variant="red" className="max-w-[112px]">
                              <ShieldAlert className="h-3 w-3 shrink-0" />
                              <span className="truncate">{flag}</span>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[var(--tl-faint)]">-</span>
                        )}
                        {row.pii_flags.length > 2 && <Badge variant="red">+{row.pii_flags.length - 2}</Badge>}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-10" colSpan={12}>
                  <EmptyState compact icon={FileClock} title="No audit entries" description="Send prompts to generate request records." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
