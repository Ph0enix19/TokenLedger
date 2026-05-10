import { PipelineTrace as PipelineTraceType } from "../api";

type PipelineTraceProps = {
  trace: PipelineTraceType;
};

function boolLabel(value: boolean) {
  return value ? "yes" : "no";
}

function PipelineTrace({ trace }: PipelineTraceProps) {
  const rows = [
    ["PII detected", boolLabel(trace.pii_detected)],
    ["Cache hit", boolLabel(trace.cache_hit)],
    ["Model used", trace.model_used || "-"],
    ["Route reason", trace.route_reason || "-"],
    ["Input tokens", trace.input_tokens.toLocaleString()],
    ["Output tokens", trace.output_tokens.toLocaleString()],
    ["Cost MYR", trace.cost_myr.toFixed(6)],
    ["Latency ms", trace.latency_ms.toLocaleString()],
    [
      "Tool calls",
      trace.tool_calls.length ? trace.tool_calls.map((tool) => tool.tool ?? "tool").join(", ") : "-",
    ],
  ];

  return (
    <div className="rounded-md border border-ledger-line bg-slate-950 p-3">
      <h3 className="text-sm font-semibold text-white">Pipeline trace</h3>
      <dl className="mt-2 grid gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3" key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="break-words text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
      {trace.pii_flags.length ? (
        <div className="mt-3 rounded border border-rose-400/30 bg-rose-950/40 px-2 py-2 text-xs text-rose-100">
          {trace.pii_flags.join(", ")}
        </div>
      ) : null}
    </div>
  );
}

export default PipelineTrace;
