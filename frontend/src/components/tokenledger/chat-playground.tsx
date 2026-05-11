"use client";

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
import { apiErrorToMessage, getPiiBlockPayload, sendChat } from "@/lib/tokenledger-api";
import type { ChatInteraction, ToolCall } from "@/types/tokenledger";
import Badge from "./badge";
import { Spinner } from "./spinner";

type ChatPlaygroundProps = {
  latest: ChatInteraction | null;
  onSettled: (interaction: ChatInteraction | null) => void | Promise<void>;
};

const presets = [
  { label: "Normal", prompt: "What is a rate limiter?", icon: Gauge },
  { label: "Cache Hit", prompt: "What is a rate limiter?", icon: Database },
  { label: "PII Block", prompt: "my email is test@acme.com", icon: ShieldAlert },
  { label: "Complex", prompt: "Compare microservices and monolithic architecture and analyze the operational trade-offs in detail", icon: BrainCircuit },
  { label: "@cost", prompt: "@cost what did we spend this week?", icon: BadgeDollarSign },
  { label: "@docs", prompt: "@docs what is the on-call escalation process?", icon: BookOpenText },
  { label: "@budget", prompt: "@budget are we over the AI spend limit?", icon: FileWarning },
];

function formatCost(value: number | undefined) {
  if (typeof value !== "number") return "RM 0";
  if (value < 0.01) return `RM ${value.toFixed(6)}`;
  return `RM ${value.toFixed(2)}`;
}

function toolName(tool: ToolCall) {
  return tool.tool ?? tool.name ?? "tool";
}

export default function ChatPlayground({ latest, onSettled }: ChatPlaygroundProps) {
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
    <div className="tl-panel overflow-hidden rounded-2xl">
      <div className="tl-panel-header flex items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/24">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" aria-hidden="true" />
          </div>
          <div>
            <h2 className="tl-heading text-sm font-semibold">Playground</h2>
            <p className="tl-muted text-[9px] uppercase tracking-widest">POST /v1/chat</p>
          </div>
        </div>
        <Badge variant="outline">X-API-Key</Badge>
      </div>

      <div className="p-4 space-y-3">
        {/* Preset Chips */}
        <div className="flex flex-wrap gap-1">
          {presets.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.label}
                className="tl-button tl-button-secondary min-h-8 px-2 text-[10px] disabled:opacity-40"
                type="button"
                onClick={() => setPrompt(preset.prompt)}
                disabled={isSubmitting}
                title={preset.prompt}
              >
                <Icon className="h-3 w-3 text-[var(--tl-muted)]" aria-hidden="true" />
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form className="space-y-2.5" onSubmit={submit}>
          <div>
            <textarea
              className="tl-input w-full resize-none rounded-xl px-3.5 py-3 text-sm leading-6"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Send a gateway request..."
              rows={3}
              required
            />
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="tl-muted mb-1 block text-[9px] font-bold uppercase tracking-[0.15em]">User</label>
              <input
                className="tl-input h-9 w-full rounded-lg px-3 text-xs"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
            <div className="w-24">
              <label className="tl-muted mb-1 block text-[9px] font-bold uppercase tracking-[0.15em]">Tokens</label>
              <input
                className="tl-input h-9 w-full rounded-lg px-3 text-xs"
                type="number"
                min={1}
                max={4096}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>
            <button
              className="tl-button tl-button-primary h-9 px-4 text-[11px] disabled:cursor-not-allowed disabled:opacity-40"
              type="submit"
              disabled={isSubmitting || !prompt.trim()}
            >
              {isSubmitting ? <Spinner className="h-3 w-3 text-white" /> : <Send className="h-3 w-3" />}
              {isSubmitting ? "Sending" : "Send"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Blocked State */}
        {blocked && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3.5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-red-500/24">
                <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-300" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-red-700 dark:text-red-200">Request blocked before model call</p>
                <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/75">{blocked.error}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {blocked.pii_flags.length ? (
                    blocked.pii_flags.map((flag) => <Badge key={flag} variant="red">{flag}</Badge>)
                  ) : (
                    <Badge variant="red">pii_detected</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Allowed Response */}
        {allowed && (
          <div className="overflow-hidden rounded-xl border border-[var(--tl-border)]">
            <div className="max-h-48 overflow-auto bg-[color-mix(in_srgb,var(--tl-panel-soft)_74%,transparent)] px-3.5 py-3">
              <p className="whitespace-pre-wrap text-xs leading-6 text-[var(--tl-body)]">{allowed.response}</p>
            </div>
            <div className="grid gap-px border-t border-[var(--tl-border)] bg-[color-mix(in_srgb,var(--tl-panel-soft)_70%,transparent)] text-[11px] sm:grid-cols-2">
              <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="tl-muted">Req ID</span>
                <span className="font-mono text-[var(--tl-heading)]">{allowed.request_id ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="tl-muted">Model</span>
                <Badge variant={trace?.model_used === "cache" ? "teal" : "blue"}>{trace?.model_used === "cache" ? "Cache" : trace?.model_used === "llama-3.1-8b-instant" ? "8B" : trace?.model_used === "llama-3.3-70b-versatile" ? "70B" : trace?.model_used || "—"}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="tl-muted">Cache</span>
                <Badge variant={trace?.cache_hit ? "teal" : "slate"}>{trace?.cache_hit ? "hit" : "miss"}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="tl-muted">Route</span>
                <span className="text-[var(--tl-body)]" title={trace?.route_reason}>{trace?.route_reason || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="tl-muted">Cost</span>
                <span className="font-bold text-amber-600 dark:text-amber-300">{formatCost(trace?.cost_myr)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="tl-muted">Latency</span>
                <span className="text-[var(--tl-body)]">{trace?.latency_ms?.toLocaleString() ?? 0} ms</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="tl-muted">Tokens</span>
                <span className="text-[var(--tl-body)]">{(trace?.input_tokens ?? 0).toLocaleString()} / {(trace?.output_tokens ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="tl-muted">Tools</span>
                <span className="flex gap-1">
                  {tools.length ? tools.map((tool, i) => (
                    <Badge key={`${toolName(tool)}-${i}`} variant="violet">{toolName(tool)}</Badge>
                  )) : (
                    <span className="tl-faint">none</span>
                  )}
                </span>
              </div>
              {piiFlags.length > 0 && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 sm:col-span-2">
                  <span className="tl-muted">PII</span>
                  <span className="flex gap-1">
                    {piiFlags.map((flag) => <Badge key={flag} variant="red">{flag}</Badge>)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
