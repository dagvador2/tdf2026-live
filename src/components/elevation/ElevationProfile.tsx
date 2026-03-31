"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";

interface ElevationPoint {
  distance: number;
  elevation: number;
}

interface CheckpointMark {
  name: string;
  type: string;
  kmFromStart: number;
  elevation?: number;
}

interface ElevationProfileProps {
  data: ElevationPoint[];
  checkpoints?: CheckpointMark[];
  className?: string;
  riderPositions?: { distanceFromStart: number; firstName: string; teamColor: string }[];
}

export function ElevationProfile({
  data,
  checkpoints,
  className = "h-[200px] w-full",
  riderPositions,
}: ElevationProfileProps) {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-muted ${className}`}>
        <p className="text-sm text-muted-foreground">Aucun profil disponible</p>
      </div>
    );
  }

  // Convert distance from meters to km for display
  const chartData = data.map((point) => ({
    distKm: point.distance / 1000,
    elevation: Math.round(point.elevation),
  }));

  // Sample data to avoid too many points for rendering
  const sampled = sampleData(chartData, 300);

  // Find elevation for checkpoints by interpolating
  const cpMarks = checkpoints
    ?.map((cp) => {
      const ele = interpolateElevation(data, cp.kmFromStart * 1000);
      return { ...cp, interpolatedEle: ele };
    })
    .filter((cp) => cp.interpolatedEle !== null);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sampled} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F2C200" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#F2C200" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="distKm"
            tickFormatter={(v: number) => `${v.toFixed(0)}`}
            tick={{ fontSize: 11 }}
            axisLine={{ stroke: "#ddd" }}
            tickLine={false}
            label={{
              value: "km",
              position: "insideBottomRight",
              offset: -5,
              fontSize: 11,
              fill: "#999",
            }}
          />
          <YAxis
            tickFormatter={(v: number) => `${v}`}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
            label={{
              value: "m",
              position: "insideTopLeft",
              offset: -5,
              fontSize: 11,
              fill: "#999",
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded border border-border bg-card px-3 py-2 text-xs shadow">
                  <p className="font-mono font-bold">{d.elevation} m</p>
                  <p className="text-muted-foreground">{d.distKm.toFixed(1)} km</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#F2C200"
            strokeWidth={2}
            fill="url(#elevGradient)"
          />
          {/* Checkpoint markers */}
          {cpMarks?.map((cp) => (
            <ReferenceDot
              key={cp.name}
              x={cp.kmFromStart}
              y={cp.interpolatedEle!}
              r={cp.type === "col" ? 6 : 4}
              fill={getCheckpointColor(cp.type)}
              stroke="white"
              strokeWidth={2}
            />
          ))}
          {/* Rider positions */}
          {riderPositions?.map((rider) => (
            <ReferenceDot
              key={rider.firstName}
              x={rider.distanceFromStart / 1000}
              y={interpolateElevation(data, rider.distanceFromStart) ?? 0}
              r={5}
              fill={rider.teamColor}
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function sampleData<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  const sampled: T[] = [];
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }
  if (sampled[sampled.length - 1] !== data[data.length - 1]) {
    sampled.push(data[data.length - 1]);
  }
  return sampled;
}

function interpolateElevation(
  data: { distance: number; elevation: number }[],
  distMeters: number
): number | null {
  if (data.length === 0) return null;
  if (distMeters <= data[0].distance) return data[0].elevation;
  if (distMeters >= data[data.length - 1].distance) return data[data.length - 1].elevation;

  for (let i = 1; i < data.length; i++) {
    if (data[i].distance >= distMeters) {
      const t =
        (distMeters - data[i - 1].distance) /
        (data[i].distance - data[i - 1].distance);
      return data[i - 1].elevation + t * (data[i].elevation - data[i - 1].elevation);
    }
  }
  return data[data.length - 1].elevation;
}

function getCheckpointColor(type: string): string {
  switch (type) {
    case "start":
      return "#8DB600";
    case "finish":
      return "#D32F2F";
    case "col":
      return "#E88B00";
    case "sprint":
      return "#0055A4";
    default:
      return "#666";
  }
}
