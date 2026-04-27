"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface DailyPoint {
  date: string;
  views: number;
  reads: number;
}

function formatDateTick(d: string): string {
  // d is YYYY-MM-DD
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function ViewsChart({ data }: { data: DailyPoint[] }) {
  const allZero = data.every((d) => d.views === 0 && d.reads === 0);
  if (allZero) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Pas encore d&apos;event sur la période.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="g-views" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(48 100% 47%)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(48 100% 47%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-reads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(232 37% 17%)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(232 37% 17%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(40 20% 88%)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            stroke="hsl(0 0% 40%)"
            fontSize={11}
          />
          <YAxis allowDecimals={false} stroke="hsl(0 0% 40%)" fontSize={11} />
          <Tooltip
            labelFormatter={(label) => (typeof label === "string" ? formatDateTick(label) : "")}
            contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Area
            type="monotone"
            dataKey="views"
            name="Vues"
            stroke="hsl(48 100% 47%)"
            fill="url(#g-views)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="reads"
            name="Lectures"
            stroke="hsl(232 37% 17%)"
            fill="url(#g-reads)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
