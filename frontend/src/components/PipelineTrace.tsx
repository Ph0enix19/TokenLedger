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
} from "lucide-react";
import type { ChatInteraction, ChatTrace, ToolCall } from "../types/tokenledger";
import Badge from "./Badge";
import EmptyState from "./EmptyState";

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

const statusBadgeClasses: Record<StageStatus, string> = {
  passed: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  skipped: "border-slate-600/30 bg-slate-800/50 text-slate-400",
  blocked: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  "cache hit": "border-teal-400/30 bg-teal-400/10 text-teal-200",
  "tool called": "border-indigo-400/30 bg-indigo-400/10 text-indigo-200",
};

const iconClasses: Record<StageStatus, string> = {
  passed: "bg-emerald-400/10 text-emerald-200 ring-emerald-400/25",
  skipped: "bg-slate-900/90 text-slate-500 ring-slate-700/70",
  blocked: "bg-rose-400/10 text-rose-200 ring-rose-400/30",
  "cache hit": "bg-teal-400/10 text-teal-200 ring-teal-400/30",
  "tool called": "bg-indigo-400/10 text-indigo-200 ring-indigo-400/30",
};

const rowEmphasisClasses: Record<StageEmphasis, string> = {
  cache: "bg-teal-950/18 ring-teal-400/20",
  router: "bg-sky-950/20 ring-sky-400/20",
  tool: "bg-indigo-950/20 ring-indigo-400/20",
  blocked: "bg-rose-950/25 ring-rose-400/25",
};

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

function buildStages(latest: ChatInteraction, auditConfirmed: boolean): { stages: Stage[]; trace: ChatTrace } {
  if (latest.status === "blocked") {
    const trace = blockedTrace(latest);
    return {
      trace,
      stages: [
        {
          title: "API Key",
          detail: "Protected request accepted with the configured development key.",
          status: "passed",
          icon: KeyRound,
        },
        {
          title: "PII Scan",
          detail: latest.pii_flags.length ? `Blocked flags: ${latest.pii_flags.join(", ")}` : "Sensitive data detected.",
          status: "blocked",
          icon: ShieldCheck,
          emphasis: "blocked",
        },
        {
          title: "MCP Trigger",
          detail: "Skipped because policy enforcement stopped the request.",
          status: "skipped",
          icon: Wrench,
        },
        {
          title: "Cache Lookup",
          detail: "Skipped after the PII block.",
          status: "skipped",
          icon: Database,
        },
        {
          title: "Router",
          detail: "No model route selected.",
          status: "skipped",
          icon: Route,
        },
        {
          title: "LLM / Cache Response",
          detail: "Request blocked before model call.",
          status: "skipped",
          icon: Network,
        },
        {
          title: "Cost",
          detail: "No provider cost incurred.",
          status: "skipped",
          icon: Calculator,
        },
        {
          title: "Audit",
          detail: auditConfirmed ? "Blocked attempt is visible in the audit table." : "Waiting for audit refresh.",
          status: auditConfirmed ? "passed" : "skipped",
          icon: FileClock,
        },
      ],
    };
  }

  const trace = latest.response.trace;
  const tools = trace.tool_calls ?? [];
  const isCacheHit = Boolean(trace.cache_hit);
  const modelUsed = trace.model_used || "unknown";
  const isLargeRoute = modelUsed.includes("70b");
  const routeDetail = isCacheHit
    ? "Router bypassed by semantic cache."
    : isLargeRoute
      ? `Large model route: ${trace.route_reason || "complex prompt"}`
      : modelUsed.includes("8b")
        ? `Small/default route: ${trace.route_reason || "default route"}`
        : trace.route_reason || "Route decision recorded.";

  return {
    trace,
    stages: [
      {
        title: "API Key",
        detail: "Gateway accepted the protected request header.",
        status: "passed",
        icon: KeyRound,
      },
      {
        title: "PII Scan",
        detail: trace.pii_flags?.length ? `Flags: ${trace.pii_flags.join(", ")}` : "No sensitive data detected.",
        status: trace.pii_detected ? "blocked" : "passed",
        icon: ShieldCheck,
        emphasis: trace.pii_detected ? "blocked" : undefined,
      },
      {
        title: "MCP Trigger",
        detail: tools.length ? tools.map(toolName).join(", ") : "No @cost, @docs, or @budget trigger.",
        status: tools.length ? "tool called" : "skipped",
        icon: Wrench,
        emphasis: tools.length ? "tool" : undefined,
      },
      {
        title: "Cache Lookup",
        detail: isCacheHit ? "Semantic match served this response." : "Cache miss, continued to router.",
        status: isCacheHit ? "cache hit" : "passed",
        icon: Database,
        emphasis: isCacheHit ? "cache" : undefined,
      },
      {
        title: "Router",
        detail: routeDetail,
        status: isCacheHit ? "skipped" : "passed",
        icon: Route,
        emphasis: isLargeRoute && !isCacheHit ? "router" : undefined,
      },
      {
        title: "LLM / Cache Response",
        detail: isCacheHit ? "Served by cache with no provider call." : `${modelUsed} generated the response.`,
        status: isCacheHit ? "cache hit" : "passed",
        icon: Network,
        emphasis: isCacheHit ? "cache" : undefined,
      },
      {
        title: "Cost",
        detail: isCacheHit ? "No new model cost." : `MYR ${(trace.cost_myr ?? 0).toFixed(6)}`,
        status: isCacheHit ? "skipped" : "passed",
        icon: Calculator,
      },
      {
        title: "Audit",
        detail: auditConfirmed ? "Request is present in the audit log." : "Request ID returned, audit refresh pending.",
        status: latest.response.request_id || auditConfirmed ? "passed" : "skipped",
        icon: FileClock,
      },
    ],
  };
}

function StageIcon({ stage }: { stage: Stage }) {
  if (stage.status === "blocked") {
    return <Ban className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  if (stage.status === "skipped") {
    return <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  if (stage.status === "passed") {
    return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  const Icon = stage.icon;
  return <Icon className="h-3.5 w-3.5" aria-hidden="true" />;
}

function PipelineTrace({ latest, auditConfirmed }: PipelineTraceProps) {
  if (!latest) {
    return (
      <section className="dashboard-panel rounded-lg p-4">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">Pipeline Trace</h2>
          <p className="mt-1 text-xs text-slate-500">Last request flow through TokenLedger</p>
        </div>
        <EmptyState
          compact
          icon={Network}
          title="No request selected"
          description="Send a preset prompt to see authentication, PII blocking, cache, router, tool, cost, and audit stages light up."
        />
      </section>
    );
  }

  const { stages, trace } = buildStages(latest, auditConfirmed);
  const tools = trace.tool_calls ?? [];

  return (
    <section className="dashboard-panel rounded-lg p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Pipeline Trace</h2>
          <p className="mt-1 text-xs text-slate-500">Eight-stage gateway path for the latest request</p>
        </div>
        <Badge variant={latest.status === "blocked" ? "red" : trace.cache_hit ? "teal" : "green"}>
          {latest.status === "blocked" ? "blocked" : trace.cache_hit ? "cache hit" : "allowed"}
        </Badge>
      </div>

      <ol className="relative space-y-3 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-white/[0.08]">
        {stages.map((stage) => (
          <li key={stage.title} className="relative flex gap-3">
            <div
              className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ${iconClasses[stage.status]}`}
            >
              <StageIcon stage={stage} />
            </div>
            <div
              className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 ring-1 ${
                stage.emphasis ? rowEmphasisClasses[stage.emphasis] : "bg-slate-950/20 ring-white/[0.045]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-100">{stage.title}</p>
                <span
                  className={`shrink-0 rounded-[5px] border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClasses[stage.status]}`}
                >
                  {stage.status}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{stage.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      {tools.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-3">
          {tools.map((tool, index) => (
            <Badge key={`${toolName(tool)}-${index}`} variant="violet" title={JSON.stringify(tool)}>
              {toolName(tool)}
            </Badge>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default PipelineTrace;
