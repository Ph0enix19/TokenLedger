"use client";

import { Braces, ClipboardList, ShieldAlert } from "lucide-react";
import type { AuditRow, ChatInteraction, ChatTrace, ToolCall } from "@/types/tokenledger";
import Badge from "./badge";
import EmptyState from "./empty-state";

type RequestDetailPanelProps = {
  row: AuditRow | null;
  latest: ChatInteraction | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
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
  if (typeof value !== "number") return "—";
  if (value < 0.01) return `RM ${value.toFixed(6)}`;
  return `RM ${value.toFixed(2)}`;
}

function toolName(tool: ToolCall) {
  return tool.tool ?? tool.name ?? "tool";
}

function blockedTrace(latest: Extract<ChatInteraction, { status: "blocked" }>): ChatTrace {
  return {
    pii_detected: true,
    pii_flags: latest.pii_flags,
    cache_hit: false,
    model_used: "blocked",
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
  if (!row || !latestId || row.request_id === latestId) return latest.response.trace;
  return null;
}

export default function RequestDetailPanel({ row, latest }: RequestDetailPanelProps) {
  const trace = traceFor(row, latest);
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
      <div className="tl-panel rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 ring-1 ring-[var(--tl-border)]">
            <ClipboardList className="h-4 w-4 text-[var(--tl-muted)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="tl-heading text-sm font-semibold">Request Detail</h2>
            <p className="tl-muted text-[10px]">Click an audit row or send a prompt</p>
          </div>
        </div>
        <EmptyState compact icon={ClipboardList} title="No request selected" description="Details will appear here when you select a row." />
      </div>
    );
  }

  return (
    <div className="tl-panel overflow-hidden rounded-2xl">
      <div className="tl-panel-header flex items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 ring-1 ring-[var(--tl-border)]">
            <ClipboardList className="h-4 w-4 text-[var(--tl-muted)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="tl-heading text-sm font-semibold">Request Detail</h2>
            <p className="tl-muted text-[10px]">{!row && latest ? "Latest result" : "Selected audit row"}</p>
          </div>
        </div>
        <Badge variant={outcome === "blocked" ? "red" : "green"}>{outcome ?? "unknown"}</Badge>
      </div>

      <div className="p-4 space-y-3">
        {/* Prompt */}
        <div className="tl-soft rounded-lg p-3">
          <p className="tl-muted text-[9px] font-bold uppercase tracking-[0.15em]">Prompt</p>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-[var(--tl-body)]">{prompt || "-"}</p>
        </div>

        {/* Metadata grid */}
        <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--tl-border)] text-[11px] sm:grid-cols-2">
          {[
            ["Request ID", requestId ?? row?.id ?? "-", true],
            ["User", row?.user_id ?? latest?.user_id ?? "-", false],
            ["Timestamp", formatDateTime(timestamp), false],
            ["Model", row?.model_used ?? trace?.model_used ?? "-", false],
            ["Cache", row?.cache_hit !== null && row?.cache_hit !== undefined ? (row.cache_hit ? "yes" : "no") : trace?.cache_hit ? "yes" : "no", false],
            ["Route", row?.route_reason ?? trace?.route_reason ?? "-", false],
            ["Cost", formatCost(row?.cost_myr ?? trace?.cost_myr), false, true],
            ["Latency", `${row?.latency_ms ?? trace?.latency_ms ?? "-"} ms`, false],
          ].map(([label, value, _mono, isCost], i) => (
            <div key={String(label)} className={`bg-[color-mix(in_srgb,var(--tl-panel-soft)_76%,transparent)] px-3 py-2 ${i % 2 === 0 ? "border-[var(--tl-border)] sm:border-r" : ""} ${i < 6 ? "border-b border-[var(--tl-border)]" : ""}`}>
              <dt className="tl-muted text-[9px] font-bold uppercase tracking-[0.12em]">{String(label)}</dt>
              <dd className={`mt-0.5 ${_mono ? "font-mono" : ""} ${isCost ? "font-bold text-amber-600 dark:text-amber-300" : "text-[var(--tl-heading)]"}`}>
                {String(value)}
              </dd>
            </div>
          ))}
        </div>

        {/* Tokens */}
        <div className="tl-soft rounded-lg px-3 py-2">
          <dt className="tl-muted text-[9px] font-bold uppercase tracking-[0.12em]">Tokens</dt>
          <dd className="mt-0.5 text-[11px] text-[var(--tl-heading)]">
            {(trace?.input_tokens ?? 0).toLocaleString()} input / {(trace?.output_tokens ?? 0).toLocaleString()} output
          </dd>
        </div>

        {/* PII + Tools */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="tl-muted mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em]">PII flags</p>
            <div className="flex flex-wrap gap-1">
              {piiFlags.length ? piiFlags.map((flag) => (
                <Badge key={flag} variant="red"><ShieldAlert className="h-2.5 w-2.5" />{flag}</Badge>
              )) : <Badge variant="ghost">none</Badge>}
            </div>
          </div>
          <div>
            <p className="tl-muted mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em]">Tool calls</p>
            <div className="flex flex-wrap gap-1">
              {tools.length ? tools.map((tool, i) => (
                <Badge key={`${toolName(tool)}-${i}`} variant="violet" title={JSON.stringify(tool)}>{toolName(tool)}</Badge>
              )) : <Badge variant="ghost">none</Badge>}
            </div>
          </div>
        </div>

        {/* Raw JSON */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Braces className="h-3 w-3 text-[var(--tl-muted)]" aria-hidden="true" />
            <p className="tl-muted text-[9px] font-bold uppercase tracking-[0.12em]">Raw trace</p>
          </div>
          <pre className="max-h-32 overflow-auto rounded-lg border border-[var(--tl-border)] bg-slate-950 p-2.5 text-[10px] leading-5 text-slate-300 dark:bg-slate-950/60">
            {JSON.stringify(trace ?? row ?? latest, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
