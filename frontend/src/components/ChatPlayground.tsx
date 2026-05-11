import { FormEvent, useState } from "react";
import {
  BadgeDollarSign,
  BookOpenText,
  BrainCircuit,
  Database,
  FileWarning,
  Gauge,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { apiErrorToMessage, getPiiBlockPayload, sendChat } from "../lib/api";
import type { ChatInteraction, ToolCall } from "../types/tokenledger";
import Badge from "./Badge";
import { Spinner } from "./LoadingState";

type ChatPlaygroundProps = {
  latest: ChatInteraction | null;
  onSettled: (interaction: ChatInteraction | null) => void | Promise<void>;
};

const presets = [
  {
    label: "Normal",
    prompt: "What is a rate limiter?",
    icon: Gauge,
  },
  {
    label: "Cache Hit",
    prompt: "What is a rate limiter?",
    icon: Database,
  },
  {
    label: "PII Block",
    prompt: "my email is test@acme.com",
    icon: ShieldAlert,
  },
  {
    label: "Complex Route",
    prompt: "Compare microservices and monolithic architecture and analyze the operational trade-offs in detail",
    icon: BrainCircuit,
  },
  {
    label: "@cost",
    prompt: "@cost what did we spend this week?",
    icon: BadgeDollarSign,
  },
  {
    label: "@docs",
    prompt: "@docs what is the on-call escalation process?",
    icon: BookOpenText,
  },
  {
    label: "@budget",
    prompt: "@budget are we over the AI spend limit?",
    icon: FileWarning,
  },
];

function formatCost(value: number | undefined) {
  if (typeof value !== "number") return "RM 0";
  if (value < 0.01) return `RM ${value.toFixed(6)}`;
  return `RM ${value.toFixed(2)}`;
}

function toolName(tool: ToolCall) {
  return tool.tool ?? tool.name ?? "tool";
}

function ChatPlayground({ latest, onSettled }: ChatPlaygroundProps) {
  const [prompt, setPrompt] = useState("What is a rate limiter?");
  const [userId, setUserId] = useState("demo");
  const [maxTokens, setMaxTokens] = useState(1024);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      prompt: prompt.trim(),
      user_id: userId.trim() || "demo",
      max_tokens: Number.isFinite(maxTokens) ? maxTokens : 1024,
    };

    try {
      const response = await sendChat(payload);
      const interaction: ChatInteraction = {
        status: "allowed",
        prompt: payload.prompt,
        user_id: payload.user_id,
        max_tokens: payload.max_tokens,
        response,
        received_at: new Date().toISOString(),
      };
      await onSettled(interaction);
    } catch (err) {
      const pii = getPiiBlockPayload(err);
      if (pii) {
        const interaction: ChatInteraction = {
          status: "blocked",
          prompt: payload.prompt,
          user_id: payload.user_id,
          max_tokens: payload.max_tokens,
          error: pii.detail ?? "Request blocked before model call",
          detail: pii,
          pii_flags: pii.pii_flags ?? [],
          received_at: new Date().toISOString(),
        };
        await onSettled(interaction);
      } else {
        setError(apiErrorToMessage(err));
        await onSettled(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const allowed = latest?.status === "allowed" ? latest.response : null;
  const blocked = latest?.status === "blocked" ? latest : null;
  const trace = allowed?.trace;
  const tools = trace?.tool_calls ?? [];
  const piiFlags = trace?.pii_flags ?? [];

  return (
    <section className="dashboard-panel rounded-lg p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-300" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">AI Gateway Playground</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">POST /v1/chat with governed routing and audit logging</p>
        </div>
        <Badge variant="outline">X-API-Key</Badge>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.label}
              className="flex min-h-9 items-center gap-2 rounded-md bg-slate-900/65 px-2.5 py-2 text-left text-xs font-medium text-slate-300 ring-1 ring-white/[0.07] transition hover:bg-slate-800/80 hover:text-teal-100 hover:ring-teal-300/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={() => setPrompt(preset.prompt)}
              disabled={isSubmitting}
              title={preset.prompt}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="truncate">{preset.label}</span>
            </button>
          );
        })}
      </div>

      <form className="grid gap-3" onSubmit={submit}>
        <label className="grid gap-2">
          <span className="text-xs font-medium uppercase text-slate-500">Prompt</span>
          <textarea
            className="field-control min-h-28 resize-y px-3 py-3 text-sm leading-6 placeholder:text-slate-600"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Send a gateway request..."
            required
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_112px]">
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase text-slate-500">User ID</span>
            <input
              className="field-control h-10 px-3 text-sm"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase text-slate-500">Max tokens</span>
            <input
              className="field-control h-10 px-3 text-sm"
              type="number"
              min={1}
              max={4096}
              value={maxTokens}
              onChange={(event) => setMaxTokens(Number(event.target.value))}
            />
          </label>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-teal-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            type="submit"
            disabled={isSubmitting || !prompt.trim()}
          >
            {isSubmitting ? <Spinner className="border-slate-500 border-t-slate-100" /> : <Send className="h-4 w-4" />}
            {isSubmitting ? "Sending" : "Send"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-lg bg-rose-950/40 px-3 py-3 text-sm text-rose-100 ring-1 ring-rose-400/25">
          {error}
        </div>
      ) : null}

      {blocked ? (
        <div className="mt-4 rounded-lg bg-rose-950/35 p-3 ring-1 ring-rose-400/25">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-400/10 text-rose-200 ring-1 ring-rose-400/25">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-100">Request blocked before model call</p>
              <p className="mt-1 text-sm leading-6 text-rose-100/80">{blocked.error}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {blocked.pii_flags.length ? (
                  blocked.pii_flags.map((flag) => (
                    <Badge key={flag} variant="red">
                      {flag}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="red">pii_detected</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {allowed ? (
        <div className="dashboard-panel-soft mt-4 rounded-lg">
          <div className="border-b border-white/[0.06] px-3 py-2">
            <p className="text-xs font-medium uppercase text-slate-500">Model response</p>
          </div>
          <div className="max-h-56 overflow-auto px-3 py-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{allowed.response}</p>
          </div>
          <div className="grid gap-2 border-t border-white/[0.06] px-3 py-3 text-xs sm:grid-cols-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Request ID</span>
              <span className="font-mono text-slate-200">{allowed.request_id ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Timestamp</span>
              <span className="text-slate-200">
                {allowed.timestamp ? new Date(allowed.timestamp).toLocaleTimeString() : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Cost</span>
              <span className="text-amber-200">{formatCost(trace?.cost_myr)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Latency</span>
              <span className="text-slate-200">{trace?.latency_ms?.toLocaleString() ?? 0} ms</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Cache</span>
              <Badge variant={trace?.cache_hit ? "teal" : "slate"}>{trace?.cache_hit ? "hit" : "miss"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Model</span>
              <Badge variant={trace?.model_used === "cache" ? "teal" : "blue"}>{trace?.model_used || "unknown"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2 sm:col-span-2">
              <span className="text-slate-500">Route</span>
              <span className="truncate text-slate-200" title={trace?.route_reason}>
                {trace?.route_reason || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Tokens</span>
              <span className="text-slate-200">
                {(trace?.input_tokens ?? 0).toLocaleString()} in / {(trace?.output_tokens ?? 0).toLocaleString()} out
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Tools</span>
              <span className="flex min-w-0 justify-end gap-1">
                {tools.length ? (
                  tools.map((tool, index) => (
                    <Badge key={`${toolName(tool)}-${index}`} variant="violet" title={JSON.stringify(tool)}>
                      {toolName(tool)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-slate-500">none</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:col-span-2">
              <span className="text-slate-500">PII flags</span>
              <span className="flex min-w-0 justify-end gap-1">
                {piiFlags.length ? (
                  piiFlags.map((flag) => (
                    <Badge key={flag} variant="red">
                      {flag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-slate-500">none</span>
                )}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ChatPlayground;
