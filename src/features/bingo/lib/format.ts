// Tiny relative-time formatter for the bingo UI. We don't pull a date lib
// because the requirements are minimal: minutes / hours / days, all FR.
export function formatRelativeFR(from: Date, now: Date = new Date()): string {
  const diffSec = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
  if (diffSec < 60) return "à l'instant";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `il y a ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  return `il y a ${diffDay} j`;
}
