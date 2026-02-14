"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface SourceBarChartProps {
  data: { source: string; count: number }[];
}

export function SourceBarChart({ data }: SourceBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
        <XAxis
          dataKey="source"
          tick={{ fill: "#6b6b80", fontSize: 11 }}
          axisLine={{ stroke: "#2a2a38" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b6b80", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
        />
        <Tooltip
          contentStyle={{
            background: "#121217",
            border: "1px solid #2a2a38",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e8e4df",
          }}
          formatter={(value: number) => [value.toLocaleString(), "Companies"]}
        />
        <Bar
          dataKey="count"
          fill="#a4785a"
          radius={[4, 4, 0, 0]}
          name="Companies"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
