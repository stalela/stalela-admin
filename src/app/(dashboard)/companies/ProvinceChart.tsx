"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

interface ProvinceChartProps {
  data: { province: string; count: number }[];
}

const COLORS = [
  "#a4785a", // copper-600
  "#d4a574", // copper-light
  "#7c5cff", // vibranium
  "#8a6349", // copper-700
  "#60a5fa", // info
  "#34d399", // success
  "#fbbf24", // warning
  "#f87171", // danger
  "#818cf8", // indigo
  "#a78bfa", // violet
];

export function ProvinceChart({ data }: ProvinceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="province"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={50}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
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
        <Legend wrapperStyle={{ fontSize: "11px", color: "#6b6b80" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
