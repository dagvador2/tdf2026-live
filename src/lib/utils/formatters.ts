/**
 * Format seconds into a readable time gap string.
 * @param seconds - positive = behind leader, 0 = same, null = leader
 */
export function formatTime(seconds: number | null): string {
  if (seconds === null) return "LEADER";
  if (seconds === 0) return "+0:00";

  const sign = seconds > 0 ? "+" : "-";
  const abs = Math.abs(Math.round(seconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;

  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Format distance in meters to km string.
 */
export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format elevation in meters with French locale.
 */
export function formatElevation(meters: number): string {
  return `${meters.toLocaleString("fr-FR")} m D+`;
}

/**
 * Format speed in km/h.
 */
export function formatSpeed(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}
