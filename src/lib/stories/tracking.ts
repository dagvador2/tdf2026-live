// Client-side tracking helpers for /histoires.
// Posts to /api/stories/[slug]/track. Echec silencieux : un track qui
// foire ne casse jamais la page.

const SESSION_KEY = "tdf2026-session-id";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback random (assez bon pour notre usage)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a stable per-browser session id (UUID v4) stored in localStorage.
 * Used to dedup anonymous visitors across the multiple events of a session.
 * Returns null if localStorage is unavailable (privacy mode, SSR).
 */
export function getOrCreateSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export type TrackKind = "view" | "read" | "share";

/**
 * Tracks an event for a story. No-op if the same (slug, kind) was already
 * tracked in this tab session (sessionStorage-based dedup).
 */
export async function trackStoryEvent(slug: string, kind: TrackKind): Promise<void> {
  if (typeof window === "undefined") return;

  const flagKey = `tdf2026-tracked:${kind}:${slug}`;
  try {
    if (window.sessionStorage.getItem(flagKey)) return;
    window.sessionStorage.setItem(flagKey, "1");
  } catch {
    // sessionStorage unavailable -> fire anyway (rare)
  }

  const sessionId = getOrCreateSessionId();

  try {
    await fetch(`/api/stories/${encodeURIComponent(slug)}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, sessionId }),
      // keepalive in case user navigates away right after firing
      keepalive: true,
    });
  } catch {
    // ignore
  }
}
