import { FileClock, ShieldAlert, Wrench } from "lucide-react";
import type { AuditRow, ToolCall } from "../types/tokenledger";
import Badge from "./Badge";
import EmptyState from "./EmptyState";
import TableSkeleton from "./LoadingState";

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

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
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

function modelVariant(model: string | null) {
  if (model === "cache") return "teal" as const;
  if (model?.includes("70b")) return "violet" as const;
  if (model?.includes("8b")) return "blue" as const;
  return "slate" as const;
}

function AuditLogTable({ rows, loading, selectedId, onSelect, lastUpdated }: AuditLogTableProps) {
  return (
    <section className="dashboard-panel overflow-hidden rounded-lg">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Audit Log</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Latest 20 gateway decisions, policy outcomes, route evidence</p>
        </div>
        <p className="text-xs text-slate-500">{lastUpdated ? `Updated ${formatTime(lastUpdated)}` : "Waiting for data"}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[1360px] table-fixed text-left text-sm">
          <thead className="border-b border-white/[0.06] bg-slate-900/80 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="w-24 px-3 py-2.5 font-medium">Time</th>
              <th className="w-24 px-3 py-2.5 font-medium">Request</th>
              <th className="w-24 px-3 py-2.5 font-medium">User</th>
              <th className="w-24 px-3 py-2.5 font-medium">Outcome</th>
              <th className="w-80 px-3 py-2.5 font-medium">Prompt</th>
              <th className="w-44 px-3 py-2.5 font-medium">Model</th>
              <th className="w-24 px-3 py-2.5 font-medium">Cache</th>
              <th className="w-28 px-3 py-2.5 font-medium">Cost</th>
              <th className="w-28 px-3 py-2.5 font-medium">Latency</th>
              <th className="w-40 px-3 py-2.5 font-medium">Route</th>
              <th className="w-40 px-3 py-2.5 font-medium">Tools</th>
              <th className="w-40 px-3 py-2.5 font-medium">PII</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {loading ? (
              <TableSkeleton rows={6} columns={12} />
            ) : rows.length ? (
              rows.map((row) => {
                const blocked = row.outcome === "blocked" || row.pii_flags.length > 0;
                const hasTools = row.tool_calls.length > 0;
                const selected = row.id === selectedId;

                return (
                  <tr
                    key={row.id}
                    className={`cursor-pointer align-top transition hover:bg-slate-900/70 ${
                      selected ? "bg-sky-950/30 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.28)]" : ""
                    } ${blocked ? "bg-rose-950/15" : ""} ${hasTools ? "shadow-[inset_3px_0_0_rgba(129,140,248,0.55)]" : ""}`}
                    onClick={() => onSelect(row)}
                    title="Open request detail"
                  >
                    <td className="px-3 py-3 text-xs text-slate-400">{formatTime(row.created_at)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-300">{row.request_id ?? row.id}</td>
                    <td className="px-3 py-3 text-slate-300">{row.user_id ?? "-"}</td>
                    <td className="px-3 py-3">
                      <Badge variant={blocked ? "red" : "green"}>{row.outcome ?? "unknown"}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="truncate text-slate-200" title={row.prompt_redacted ?? ""}>
                        {row.prompt_redacted ?? "-"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={modelVariant(row.model_used)} title={row.model_used ?? undefined}>
                        <span className="max-w-36 truncate">{row.model_used ?? "unknown"}</span>
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      {row.cache_hit === null ? (
                        <Badge variant="outline">n/a</Badge>
                      ) : (
                        <Badge variant={row.cache_hit ? "teal" : "slate"}>{row.cache_hit ? "hit" : "miss"}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-amber-100">{formatCost(row.cost_myr)}</td>
                    <td className="px-3 py-3 text-xs text-slate-300">{formatLatency(row.latency_ms)}</td>
                    <td className="px-3 py-3">
                      <div className="truncate text-xs text-slate-400" title={row.route_reason ?? ""}>
                        {row.route_reason ?? "-"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 flex-wrap gap-1">
                        {hasTools ? (
                          row.tool_calls.slice(0, 2).map((tool, index) => (
                            <Badge key={`${toolName(tool)}-${index}`} variant="violet" title={JSON.stringify(tool)}>
                              <Wrench className="h-3 w-3" aria-hidden="true" />
                              {toolName(tool)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-600">none</span>
                        )}
                        {row.tool_calls.length > 2 ? <Badge variant="violet">+{row.tool_calls.length - 2}</Badge> : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 flex-wrap gap-1">
                        {row.pii_flags.length ? (
                          row.pii_flags.slice(0, 2).map((flag) => (
                            <Badge key={flag} variant="red">
                              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                              {flag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-600">none</span>
                        )}
                        {row.pii_flags.length > 2 ? <Badge variant="red">+{row.pii_flags.length - 2}</Badge> : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-8" colSpan={12}>
                  <EmptyState
                    compact
                    icon={FileClock}
                    title="No audit entries yet"
                    description="Use the playground presets to generate allowed, cached, routed, tool-backed, and blocked requests."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AuditLogTable;
