import { prisma } from "@/lib/db";
import { ingestPositions, IngestPosition } from "@/lib/gps/ingest";
import { recordHit } from "@/lib/gps/track-debug";

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

interface ParsedRequest {
  params: URLSearchParams;
  rawBody: string;
  contentType: string;
}

async function readParams(request: Request): Promise<ParsedRequest> {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);
  const contentType = request.headers.get("content-type") ?? "";
  let rawBody = "";

  if (request.method !== "GET") {
    try {
      rawBody = await request.text();
      const trimmed = rawBody.trim();
      if (trimmed.startsWith("{")) {
        const body = JSON.parse(trimmed) as Record<string, unknown>;
        const location = body.location as
          | { coords?: Record<string, unknown>; _?: unknown }
          | undefined;

        if (location && typeof location === "object") {
          // Traccar Client récent : gabarit OsmAnd "&id=..&lat=..&lon=.." dans location._
          if (typeof location._ === "string") {
            for (const [k, v] of new URLSearchParams(location._)) {
              if (k) params.set(k, v);
            }
          }
          // Complément depuis coords (unités sûres : degrés / mètres)
          const c = location.coords;
          if (c && typeof c === "object") {
            const fill = (key: string, val: unknown) => {
              if (val !== null && val !== undefined && !params.get(key)) {
                params.set(key, String(val));
              }
            };
            fill("lat", c.latitude);
            fill("lon", c.longitude);
            fill("accuracy", c.accuracy);
            fill("altitude", c.altitude);
          }
        } else {
          // JSON plat { id, lat, lon, ... }
          for (const [k, v] of Object.entries(body ?? {})) {
            if (v !== null && v !== undefined) params.set(k, String(v));
          }
        }
      } else if (trimmed) {
        // Corps form-urlencoded (id=..&lat=..&lon=..)
        for (const [k, v] of new URLSearchParams(rawBody)) params.set(k, v);
      }
    } catch {
      // body illisible — on se rabat sur les paramètres d'URL
    }
  }

  return { params, rawBody, contentType };
}

async function handle(request: Request): Promise<Response> {
  const { params, rawBody, contentType } = await readParams(request);

  const deviceId = params.get("id") ?? params.get("deviceid");
  const latitude = numOrNull(params.get("lat"));
  const longitude = numOrNull(params.get("lon"));

  // Diagnostic temporaire : on enregistre chaque requête atteignant le serveur.
  const log = (outcome: string) =>
    recordHit({
      at: new Date().toISOString(),
      method: request.method,
      id: deviceId,
      lat: params.get("lat"),
      lon: params.get("lon"),
      outcome,
      ua: request.headers.get("user-agent"),
      url: request.url,
      ctype: contentType,
      body: rawBody.slice(0, 2000),
    });

  if (!deviceId || latitude === null || longitude === null) {
    log("missing_params");
    return new Response("OK", { status: 200 });
  }

  // Code → coureur
  const rider = await prisma.rider.findUnique({
    where: { traccarDeviceId: deviceId },
    select: { id: true },
  });
  if (!rider) {
    log(`unknown_code:${deviceId}`);
    return new Response("OK", { status: 200 });
  }

  // Étape en cours
  const stage = await prisma.stage.findFirst({
    where: { status: "live" },
    select: { id: true, gpxUrl: true, type: true },
    orderBy: { number: "asc" },
  });
  if (!stage) {
    log("no_live_stage");
    return new Response("OK", { status: 200 });
  }

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
    stageType: stage.type,
    entryId: entry.id,
    riderId: rider.id,
    entryStatus: entry.status,
    gpxUrl: stage.gpxUrl,
    positions: [position],
  });

  log("ok");
  return new Response("OK", { status: 200 });
}

export const GET = handle;
export const POST = handle;
