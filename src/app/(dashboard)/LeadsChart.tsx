"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface LeadsChartProps {
  data: { date: string; count: number }[];
}

export function LeadsChart({ data }: LeadsChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="copperGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a4785a" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#a4785a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#6b6b80", fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)} // MM-DD
          axisLine={{ stroke: "#2a2a38" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b6b80", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "#121217",
            border: "1px solid #2a2a38",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e8e4df",
          }}
          labelFormatter={(label: string) =>
            new Date(label).toLocaleDateString("en-ZA", {
              month: "short",
              day: "numeric",
            })
          }
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#a4785a"
          strokeWidth={2}
          fill="url(#copperGradient)"
          name="Leads"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
