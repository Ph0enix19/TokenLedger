import { AuditEntry } from "../api";

type AuditTableProps = {
  rows: AuditEntry[];
  lastUpdated: string;
};

function formatTime(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatCost(value: number | null) {
  return typeof value === "number" ? value.toFixed(6) : "-";
}

function AuditTable({ rows, lastUpdated }: AuditTableProps) {
  return (
    <section className="rounded-md border border-ledger-line bg-ledger-panel">
      <div className="flex flex-col gap-1 border-b border-ledger-line px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Audit log</h2>
          <p className="text-sm text-slate-400">Latest 20 gateway decisions</p>
        </div>
        <p className="text-xs text-slate-500">{lastUpdated ? `Updated ${formatTime(lastUpdated)}` : "Waiting for data"}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] table-fixed text-left text-sm">
          <thead className="bg-slate-950/40 text-xs uppercase tracking-normal text-slate-500">
            <tr>
              <th className="w-24 px-4 py-3 font-medium">Time</th>
              <th className="w-28 px-4 py-3 font-medium">User</th>
              <th className="w-28 px-4 py-3 font-medium">Outcome</th>
              <th className="w-72 px-4 py-3 font-medium">Prompt</th>
              <th className="w-44 px-4 py-3 font-medium">Model</th>
              <th className="w-24 px-4 py-3 font-medium">Cache</th>
              <th className="w-28 px-4 py-3 font-medium">Cost</th>
              <th className="w-28 px-4 py-3 font-medium">Latency</th>
              <th className="w-40 px-4 py-3 font-medium">Route</th>
              <th className="w-48 px-4 py-3 font-medium">Tools</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ledger-line">
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="align-top text-slate-300">
                  <td className="px-4 py-3 text-slate-400">{formatTime(row.created_at)}</td>
                  <td className="px-4 py-3">{row.user_id ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        row.outcome === "blocked"
                          ? "bg-rose-400/10 text-rose-200"
                          : "bg-emerald-400/10 text-emerald-200"
                      }`}
                    >
                      {row.outcome ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="line-clamp-2 break-words text-slate-200">{row.prompt_redacted ?? "-"}</span>
                  </td>
                  <td className="px-4 py-3">{row.model_used ?? "-"}</td>
                  <td className="px-4 py-3">{row.cache_hit ? "hit" : "miss"}</td>
                  <td className="px-4 py-3">{formatCost(row.cost_myr)}</td>
                  <td className="px-4 py-3">{row.latency_ms ?? "-"} ms</td>
                  <td className="px-4 py-3">{row.route_reason ?? "-"}</td>
                  <td className="px-4 py-3">
                    {row.tool_calls?.length ? row.tool_calls.map((tool) => tool.tool ?? "tool").join(", ") : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={10}>
                  No audit entries yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AuditTable;
