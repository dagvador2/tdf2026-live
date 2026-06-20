/**
 * Tampon de diagnostic temporaire : garde en mémoire les dernières requêtes
 * reçues par /api/track, pour voir si un téléphone atteint le serveur et avec
 * quels paramètres. Consultable via GET /api/track/debug?key=ventoux.
 *
 * À retirer une fois le suivi Traccar validé.
 */
export interface TrackHit {
  at: string;
  method: string;
  id: string | null;
  lat: string | null;
  lon: string | null;
  outcome: string;
  ua: string | null;
  url: string;
  ctype: string;
  body: string;
}

const MAX = 50;
const globalForDebug = globalThis as unknown as { trackHits?: TrackHit[] };
const buffer: TrackHit[] = (globalForDebug.trackHits ??= []);

export function recordHit(hit: TrackHit) {
  buffer.push(hit);
  if (buffer.length > MAX) buffer.shift();
}

export function getHits(): TrackHit[] {
  return buffer;
}
