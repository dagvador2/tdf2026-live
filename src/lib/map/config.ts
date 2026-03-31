export const MAP_CONFIG = {
  styleUrl: `https://api.maptiler.com/maps/outdoor-v2/style.json`,
  defaultCenter: [6.1, 45.2] as [number, number],
  defaultZoom: 10,
  traceColor: "#F2C200",
  traceWidth: 4,
  traceOutlineColor: "#1B1F3B",
  traceOutlineWidth: 6,
} as const;

export function getStyleUrl(key: string): string {
  return `${MAP_CONFIG.styleUrl}?key=${key}`;
}
