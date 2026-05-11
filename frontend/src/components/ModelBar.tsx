import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModelUsage } from "../api";

type ModelBarProps = {
  data: ModelUsage[];
};

function ModelBar({ data }: ModelBarProps) {
  return (
    <section className="min-h-[360px] rounded-md border border-ledger-line bg-ledger-panel p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Model usage</h2>
        <p className="text-sm text-slate-400">Requests by model, last 24h</p>
      </div>
      <div className="h-[280px]">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 10, left: -22, bottom: 38 }}>
              <CartesianGrid stroke="#263244" vertical={false} />
              <XAxis
                dataKey="model"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#263244" }}
                angle={-16}
                textAnchor="end"
                height={52}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "rgba(45, 212, 191, 0.08)" }}
                contentStyle={{
                  background: "#111827",
                  border: "1px solid #263244",
                  borderRadius: "6px",
                  color: "#f8fafc",
                }}
              />
              <Bar dataKey="requests" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">No model requests yet</div>
        )}
      </div>
    </section>
  );
}

export default ModelBar;
