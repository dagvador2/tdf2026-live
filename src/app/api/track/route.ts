import { prisma } from "@/lib/db";
import { ingestPositions, IngestPosition } from "@/lib/gps/ingest";

/**
 * Endpoint protocole OsmAnd pour l'app Traccar Client.
 *
 * Le coureur règle dans l'app :
 *   - URL serveur : https://<app>/api/track
 *   - Identifiant : son code Traccar (Rider.traccarDeviceId)
 *
 * L'app envoie alors des requêtes du type :
 *   GET /api/track?id=<code>&lat=..&lon=..&timestamp=..&speed=..&altitude=..&accuracy=..&batt=..
 *
 * On retrouve le coureur via son code, on prend l'étape en cours (status=live)
 * et on délègue au cœur d'ingestion partagé (geofence, écarts, SSE).
 *
 * Renvoie toujours HTTP 200 quand la requête est traitable (même si le ping
 * est ignoré, ex. coureur inconnu ou aucune étape live) pour éviter que le
 * client ne ré-essaie en boucle. Les vraies erreurs serveur remontent en 500
 * pour que Traccar Client garde le point en mémoire et le renvoie plus tard.
 */
export const dynamic = "force-dynamic";

// OsmAnd transmet la vitesse en nœuds par défaut ; notre pipeline stocke des m/s.
const KNOTS_TO_MS = 0.514444;

function numOrNull(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

function parseTimestamp(raw: string | null): Date {
  if (!raw) return new Date();
  const n = Number(raw);
  if (!Number.isNaN(n)) {
    // epoch : secondes si < 1e12, millisecondes sinon
    return new Date(n < 1e12 ? n * 1000 : n);
  }
  const d = new Date(raw); // ISO 8601 ou "yyyy-MM-dd HH:mm:ss"
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

async function readParams(request: Request): Promise<URLSearchParams> {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  if (request.method === "POST") {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as Record<string, unknown>;
        for (const [k, v] of Object.entries(body ?? {})) {
          if (v !== null && v !== undefined) params.set(k, String(v));
        }
      } else {
        const text = await request.text();
        if (text) {
          for (const [k, v] of new URLSearchParams(text)) params.set(k, v);
        }
      }
    } catch {
      // body illisible — on se rabat sur les paramètres d'URL
    }
  }

  return params;
}

async function handle(request: Request): Promise<Response> {
  const params = await readParams(request);

  const deviceId = params.get("id") ?? params.get("deviceid");
  const latitude = numOrNull(params.get("lat"));
  const longitude = numOrNull(params.get("lon"));

  if (!deviceId || latitude === null || longitude === null) {
    return new Response("OK", { status: 200 });
  }

  // Code → coureur
  const rider = await prisma.rider.findUnique({
    where: { traccarDeviceId: deviceId },
    select: { id: true },
  });
  if (!rider) return new Response("OK", { status: 200 });

  // Étape en cours
  const stage = await prisma.stage.findFirst({
    where: { status: "live" },
    select: { id: true, gpxUrl: true },
    orderBy: { number: "asc" },
  });
  if (!stage) return new Response("OK", { status: 200 });

  // Inscription du coureur à l'étape (créée à la volée si besoin)
  let entry = await prisma.stageEntry.findUnique({
    where: { riderId_stageId: { riderId: rider.id, stageId: stage.id } },
    select: { id: true, status: true },
  });
  if (!entry) {
    entry = await prisma.stageEntry.create({
      data: { riderId: rider.id, stageId: stage.id },
      select: { id: true, status: true },
    });
  }

  const speed = numOrNull(params.get("speed"));

  const position: IngestPosition = {
    latitude,
    longitude,
    altitude: numOrNull(params.get("altitude")),
    speed: speed === null ? null : speed * KNOTS_TO_MS,
    accuracy: numOrNull(params.get("accuracy")),
    timestamp: parseTimestamp(params.get("timestamp")),
  };

  await ingestPositions({
    stageId: stage.id,
    entryId: entry.id,
    riderId: rider.id,
    entryStatus: entry.status,
    gpxUrl: stage.gpxUrl,
    positions: [position],
  });

  return new Response("OK", { status: 200 });
}

export const GET = handle;
export const POST = handle;
