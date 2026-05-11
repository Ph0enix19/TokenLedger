"use client";

import {
  Ban,
  Calculator,
  CheckCircle2,
  Database,
  FileClock,
  KeyRound,
  Network,
  Route,
  ShieldCheck,
  SkipForward,
  Wrench,
  Zap,
} from "lucide-react";
import type { ChatInteraction, ChatTrace, ToolCall } from "@/types/tokenledger";
import Badge from "./badge";
import EmptyState from "./empty-state";

type StageStatus = "passed" | "skipped" | "blocked" | "cache hit" | "tool called";
type StageEmphasis = "cache" | "router" | "tool" | "blocked";

type Stage = {
  title: string;
  detail: string;
  status: StageStatus;
  icon: typeof KeyRound;
  emphasis?: StageEmphasis;
};

type PipelineTraceProps = {
  latest: ChatInteraction | null;
  auditConfirmed: boolean;
};

const statusStyles: Record<StageStatus, { icon: string; badge: string; line: string }> = {
  passed: {
    icon: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    badge: "border-emerald-500/15 bg-emerald-500/8 text-emerald-400",
    line: "bg-emerald-500/30",
  },
  skipped: {
    icon: "bg-slate-800/40 text-slate-500 ring-slate-700/30",
    badge: "border-slate-700/30 bg-slate-800/20 text-slate-500",
    line: "bg-slate-800/40",
  },
  blocked: {
    icon: "bg-red-500/10 text-red-400 ring-red-500/20",
    badge: "border-red-500/15 bg-red-500/8 text-red-400",
    line: "bg-red-500/30",
  },
  "cache hit": {
    icon: "bg-teal-500/10 text-teal-400 ring-teal-500/20",
    badge: "border-teal-500/15 bg-teal-500/8 text-teal-400",
    line: "bg-teal-500/30",
  },
  "tool called": {
    icon: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
    badge: "border-violet-500/15 bg-violet-500/8 text-violet-400",
    line: "bg-violet-500/30",
  },
};

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

function buildStages(latest: ChatInteraction, auditConfirmed: boolean): { stages: Stage[]; trace: ChatTrace } {
  if (latest.status === "blocked") {
    const trace = blockedTrace(latest);
    return {
      trace,
      stages: [
        { title: "API Key", detail: "Request accepted.", status: "passed", icon: KeyRound },
        { title: "PII Scan", detail: latest.pii_flags.length ? `Blocked: ${latest.pii_flags.join(", ")}` : "Sensitive data.", status: "blocked", icon: ShieldCheck, emphasis: "blocked" },
        { title: "MCP Trigger", detail: "Skipped.", status: "skipped", icon: Wrench },
        { title: "Cache Lookup", detail: "Skipped.", status: "skipped", icon: Database },
        { title: "Router", detail: "No route.", status: "skipped", icon: Route },
        { title: "LLM Response", detail: "Blocked.", status: "skipped", icon: Network },
        { title: "Cost", detail: "No cost.", status: "skipped", icon: Calculator },
        { title: "Audit", detail: auditConfirmed ? "Logged." : "Pending.", status: auditConfirmed ? "passed" : "skipped", icon: FileClock },
      ],
    };
  }

  const trace = latest.response.trace;
  const tools = trace.tool_calls ?? [];
  const isCacheHit = Boolean(trace.cache_hit);
  const modelUsed = trace.model_used || "unrouted";
  const isLargeRoute = modelUsed.includes("70b");

  return {
    trace,
    stages: [
      { title: "API Key", detail: "Accepted.", status: "passed", icon: KeyRound },
      { title: "PII Scan", detail: "Clean.", status: "passed", icon: ShieldCheck },
      { title: "MCP Trigger", detail: tools.length ? tools.map(toolName).join(", ") : "No trigger.", status: tools.length ? "tool called" : "skipped", icon: Wrench, emphasis: tools.length ? "tool" : undefined },
      { title: "Cache Lookup", detail: isCacheHit ? "Hit." : "Miss.", status: isCacheHit ? "cache hit" : "passed", icon: Database, emphasis: isCacheHit ? "cache" : undefined },
      { title: "Router", detail: isCacheHit ? "Bypassed." : isLargeRoute ? "Large model." : "Small model.", status: isCacheHit ? "skipped" : "passed", icon: Route, emphasis: isLargeRoute && !isCacheHit ? "router" : undefined },
      { title: "LLM Response", detail: isCacheHit ? "Cached." : `${modelUsed}.`, status: isCacheHit ? "cache hit" : "passed", icon: Network, emphasis: isCacheHit ? "cache" : undefined },
      { title: "Cost", detail: isCacheHit ? "Free." : `RM ${(trace.cost_myr ?? 0).toFixed(6)}`, status: isCacheHit ? "skipped" : "passed", icon: Calculator },
      { title: "Audit", detail: auditConfirmed ? "Logged." : "Pending.", status: latest.response.request_id || auditConfirmed ? "passed" : "skipped", icon: FileClock },
    ],
  };
}

function StageIcon({ stage }: { stage: Stage }) {
  if (stage.status === "blocked") return <Ban className="h-3 w-3" />;
  if (stage.status === "skipped") return <SkipForward className="h-3 w-3" />;
  if (stage.status === "passed") return <CheckCircle2 className="h-3 w-3" />;
  if (stage.status === "cache hit") return <Zap className="h-3 w-3" />;
  return <stage.icon className="h-3 w-3" />;
}

export default function PipelineTrace({ latest, auditConfirmed }: PipelineTraceProps) {
  if (!latest) {
    return (
      <div className="tl-panel rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 ring-1 ring-[var(--tl-border)]">
            <Network className="h-4 w-4 text-[var(--tl-muted)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="tl-heading text-sm font-semibold">Pipeline Trace</h2>
            <p className="tl-muted text-[10px]">Request flow</p>
          </div>
        </div>
        <EmptyState compact icon={Network} title="No request yet" description="Send a prompt to see the pipeline." />
      </div>
    );
  }

  const { stages, trace } = buildStages(latest, auditConfirmed);
  const tools = trace.tool_calls ?? [];

  return (
    <div className="tl-panel overflow-hidden rounded-2xl">
      <div className="tl-panel-header flex items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 ring-1 ring-[var(--tl-border)]">
            <Network className="h-4 w-4 text-[var(--tl-muted)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="tl-heading text-sm font-semibold">Pipeline Trace</h2>
            <p className="tl-muted text-[10px]">8-stage gateway path</p>
          </div>
        </div>
        <Badge variant={latest.status === "blocked" ? "red" : trace.cache_hit ? "teal" : "green"}>
          {latest.status === "blocked" ? "blocked" : trace.cache_hit ? "cache hit" : "allowed"}
        </Badge>
      </div>

      <div className="p-4">
        {/* Compact Timeline */}
        <ol className="relative space-y-1.5">
          {stages.map((stage, index) => {
            const style = statusStyles[stage.status];
            const isLast = index === stages.length - 1;
            return (
              <li key={stage.title} className="relative flex gap-2.5">
                {/* Node + Line */}
                <div className="flex flex-col items-center">
                  <div className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${style.icon}`}>
                    <StageIcon stage={stage} />
                  </div>
                  {!isLast && (
                    <div className={`w-px flex-1 my-0.5 ${style.line}`} style={{ minHeight: '8px' }} />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--tl-heading)]">{stage.title}</span>
                    <span className="text-[10px] text-[var(--tl-muted)]">{stage.detail}</span>
                  </div>
                  <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${style.badge}`}>
                    {stage.status}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Tool calls */}
        {tools.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1 border-t border-[var(--tl-border)] pt-2.5">
            {tools.map((tool, index) => (
              <Badge key={`${toolName(tool)}-${index}`} variant="violet" title={JSON.stringify(tool)}>
                {toolName(tool)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
