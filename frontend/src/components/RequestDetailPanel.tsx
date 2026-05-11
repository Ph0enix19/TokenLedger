import { Braces, ClipboardList, ShieldAlert } from "lucide-react";
import type { AuditRow, ChatInteraction, ChatTrace, ToolCall } from "../types/tokenledger";
import Badge from "./Badge";
import EmptyState from "./EmptyState";

type RequestDetailPanelProps = {
  row: AuditRow | null;
  latest: ChatInteraction | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatCost(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  if (value < 0.01) return `RM ${value.toFixed(6)}`;
  return `RM ${value.toFixed(2)}`;
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || typeof value === "undefined") return "-";
  return value ? "yes" : "no";
}

function toolName(tool: ToolCall) {
  return tool.tool ?? tool.name ?? "tool";
}

function blockedTrace(latest: Extract<ChatInteraction, { status: "blocked" }>): ChatTrace {
  return {
    pii_detected: true,
    pii_flags: latest.pii_flags,
    cache_hit: false,
    model_used: "",
    route_reason: "blocked_by_pii_scan",
    input_tokens: 0,
    output_tokens: 0,
    cost_myr: 0,
    latency_ms: 0,
    tool_calls: [],
  };
}

function traceFor(row: AuditRow | null, latest: ChatInteraction | null): ChatTrace | null {
  if (!latest) return null;

  if (latest.status === "blocked") {
    if (!row || row.outcome === "blocked") return blockedTrace(latest);
    return null;
  }

  const latestId = latest.response.request_id;
  if (!row || !latestId || row.request_id === latestId) {
    return latest.response.trace;
  }

  return null;
}

function RequestDetailPanel({ row, latest }: RequestDetailPanelProps) {
  const trace = traceFor(row, latest);
  const isLatestOnly = !row && latest;
  const blockedLatest = latest?.status === "blocked" ? latest : null;
  const allowedLatest = latest?.status === "allowed" ? latest : null;
  const tools = trace?.tool_calls ?? row?.tool_calls ?? [];
  const piiFlags = row?.pii_flags?.length ? row.pii_flags : trace?.pii_flags ?? blockedLatest?.pii_flags ?? [];
  const prompt = row?.prompt_redacted ?? latest?.prompt ?? "";
  const outcome = row?.outcome ?? latest?.status ?? null;
  const requestId = row?.request_id ?? allowedLatest?.response.request_id ?? null;
  const timestamp = row?.created_at ?? allowedLatest?.response.timestamp ?? latest?.received_at;

  if (!row && !latest) {
    return (
      <section className="dashboard-panel rounded-lg p-4">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">Request Detail</h2>
          <p className="mt-1 text-xs text-slate-500">Click an audit row or send a prompt</p>
        </div>
        <EmptyState
          compact
          icon={ClipboardList}
          title="No request selected"
          description="The detail panel will show prompt text, route metadata, tools, PII flags, tokens, and raw trace JSON."
        />
      </section>
    );
  }

  return (
    <section className="dashboard-panel rounded-lg p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Request Detail</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isLatestOnly ? "Latest playground result" : "Selected audit row with trace context"}
          </p>
        </div>
        <Badge variant={outcome === "blocked" ? "red" : "green"}>{outcome ?? "unknown"}</Badge>
      </div>

      <div className="dashboard-panel-soft rounded-lg p-3">
        <p className="text-xs font-medium uppercase text-slate-500">Full redacted prompt</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{prompt || "-"}</p>
      </div>

      <dl className="mt-3 grid overflow-hidden rounded-lg border border-white/[0.06] text-xs sm:grid-cols-2">
        <div className="border-b border-white/[0.06] p-3 sm:border-r">
          <dt className="text-slate-500">Request ID</dt>
          <dd className="mt-1 font-mono text-slate-200">{requestId ?? row?.id ?? "-"}</dd>
        </div>
        <div className="border-b border-white/[0.06] p-3">
          <dt className="text-slate-500">User ID</dt>
          <dd className="mt-1 text-slate-200">{row?.user_id ?? latest?.user_id ?? "-"}</dd>
        </div>
        <div className="border-b border-white/[0.06] p-3 sm:border-r">
          <dt className="text-slate-500">Timestamp</dt>
          <dd className="mt-1 text-slate-200">{formatDateTime(timestamp)}</dd>
        </div>
        <div className="border-b border-white/[0.06] p-3">
          <dt className="text-slate-500">Model used</dt>
          <dd className="mt-1 text-slate-200">{row?.model_used ?? trace?.model_used ?? "-"}</dd>
        </div>
        <div className="border-b border-white/[0.06] p-3 sm:border-r">
          <dt className="text-slate-500">Cache hit</dt>
          <dd className="mt-1 text-slate-200">{formatBoolean(row?.cache_hit ?? trace?.cache_hit)}</dd>
        </div>
        <div className="border-b border-white/[0.06] p-3">
          <dt className="text-slate-500">Route reason</dt>
          <dd className="mt-1 truncate text-slate-200" title={row?.route_reason ?? trace?.route_reason}>
            {row?.route_reason ?? trace?.route_reason ?? "-"}
          </dd>
        </div>
        <div className="border-b border-white/[0.06] p-3 sm:border-r">
          <dt className="text-slate-500">Cost</dt>
          <dd className="mt-1 text-amber-200">{formatCost(row?.cost_myr ?? trace?.cost_myr)}</dd>
        </div>
        <div className="border-b border-white/[0.06] p-3">
          <dt className="text-slate-500">Latency</dt>
          <dd className="mt-1 text-slate-200">{row?.latency_ms ?? trace?.latency_ms ?? "-"} ms</dd>
        </div>
        <div className="p-3 sm:col-span-2">
          <dt className="text-slate-500">Tokens</dt>
          <dd className="mt-1 text-slate-200">
            {(trace?.input_tokens ?? 0).toLocaleString()} input / {(trace?.output_tokens ?? 0).toLocaleString()} output
          </dd>
        </div>
      </dl>

      <div className="mt-3 grid gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">PII flags</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {piiFlags.length ? (
              piiFlags.map((flag) => (
                <Badge key={flag} variant="red">
                  <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                  {flag}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">none</Badge>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Tool calls</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tools.length ? (
              tools.map((tool, index) => (
                <Badge key={`${toolName(tool)}-${index}`} variant="violet" title={JSON.stringify(tool)}>
                  {toolName(tool)}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">none</Badge>
            )}
          </div>
          <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-slate-950/70 p-2 text-[11px] leading-5 text-slate-400 ring-1 ring-white/[0.06]">
            {JSON.stringify(tools, null, 2)}
          </pre>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Braces className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <p className="text-xs font-medium uppercase text-slate-500">Raw trace JSON</p>
          </div>
          <pre className="max-h-48 overflow-auto rounded-lg bg-slate-950/70 p-2 text-[11px] leading-5 text-slate-400 ring-1 ring-white/[0.06]">
            {JSON.stringify(trace ?? row ?? latest, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}

export default RequestDetailPanel;
