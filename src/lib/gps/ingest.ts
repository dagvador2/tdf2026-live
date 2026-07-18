import { prisma } from "@/lib/db";
import {
  detectGeofenceHits,
  computeArmed,
  GeofenceCheckpoint,
} from "@/lib/gps/geofence";
import { stageTracker } from "@/lib/time-gap/stage-tracker";
import { projectOnPolyline } from "@/lib/gpx/projection";
import { parseGPX } from "@/lib/gpx/parser";
import { readGPXFileRaw } from "@/lib/gpx/reader";
import { sseManager } from "@/lib/sse/manager";
import { SSE_EVENTS } from "@/lib/sse/events";
import type { RiderSnapshot, LiveSnapshot } from "@/lib/time-gap/types";
import type { EntryStatus, StageType } from "@prisma/client";

/**
 * Une position GPS prête à être enregistrée (unités internes : speed en m/s,
 * timestamp en Date). Partagé entre le tracker web (/api/gps/batch) et
 * l'ingestion Traccar/OsmAnd (/api/track).
 */
export interface IngestPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: Date;
}

export interface IngestResult {
  checkpointHits: number;
}

// Arming state of the geofences, per stage entry (see lib/gps/geofence.ts).
// Kept in memory across requests; after a server restart it is rebuilt once
// per entry from the stored positions.
const globalForGeofence = globalThis as unknown as {
  geofenceArmed?: Map<string, Set<string>>;
  geofenceRebuilt?: Set<string>;
};
const armedByEntry = (globalForGeofence.geofenceArmed ??= new Map());
const rebuiltEntries = (globalForGeofence.geofenceRebuilt ??= new Set());

/**
 * Cœur d'ingestion d'un lot de positions pour un coureur sur une étape :
 * insertion → passage en "tracking" → geofencing → mise à jour de la
 * progression → calcul des écarts → diffusion SSE. Sans authentification ni
 * validation (à la charge de l'appelant).
 */
export async function ingestPositions(opts: {
  stageId: string;
  stageType: StageType;
  entryId: string;
  riderId: string;
  entryStatus: EntryStatus;
  gpxUrl: string | null;
  positions: IngestPosition[];
}): Promise<IngestResult> {
  const { stageId, stageType, entryId, riderId, entryStatus, gpxUrl, positions } =
    opts;

  if (positions.length === 0) return { checkpointHits: 0 };

  // 1. Insert positions
  await prisma.gpsPosition.createMany({
    data: positions.map((p) => ({
      entryId,
      latitude: p.latitude,
      longitude: p.longitude,
      altitude: p.altitude,
      speed: p.speed,
      accuracy: p.accuracy,
      timestamp: p.timestamp,
    })),
  });

  // 2. Update entry status to "tracking" on first data
  if (entryStatus === "registered" || entryStatus === "started") {
    await prisma.stageEntry.update({
      where: { id: entryId },
      data: { status: "tracking" },
    });
  }

  // 3. Geofence detection
  const checkpoints = await prisma.checkpoint.findMany({
    where: { stageId },
    orderBy: { order: "asc" },
  });

  const priorRecords = await prisma.timeRecord.findMany({
    where: { entryId },
    select: { checkpointId: true, timestamp: true },
  });
  const alreadyPassed = new Set(priorRecords.map((r) => r.checkpointId));

  // Sur un contre-la-montre, ni le départ ni l'arrivée ne sont tamponnés par
  // GPS : les coureurs attendent leur tour dans la zone de départ (chrono
  // déclenché trop tôt), et l'arrivée doit être fiable à la seconde près.
  // Les deux sont saisis via /admin/live-timing ; seuls les points
  // intermédiaires (col, sprint) restent déclenchés automatiquement par GPS.
  const isTimeTrial = stageType === "team_tt" || stageType === "individual_tt";
  const geofenceCheckpoints: GeofenceCheckpoint[] = checkpoints
    .filter(
      (cp) => !(isTimeTrial && (cp.type === "start" || cp.type === "finish"))
    )
    .map((cp) => ({
      id: cp.id,
      latitude: cp.latitude,
      longitude: cp.longitude,
      radiusM: cp.radiusM,
      order: cp.order,
      kmFromStart: cp.kmFromStart,
      type: cp.type,
    }));

  let armed = armedByEntry.get(entryId);
  if (!armed) {
    armed = new Set();
    armedByEntry.set(entryId, armed);
  }

  // After a restart, rebuild the arming state once from stored positions —
  // otherwise a rider already on the course could miss their next checkpoint.
  if (!rebuiltEntries.has(entryId)) {
    rebuiltEntries.add(entryId);
    const needsRebuild = geofenceCheckpoints.some(
      (cp) => cp.type !== "start" && !alreadyPassed.has(cp.id) && !armed!.has(cp.id)
    );
    if (needsRebuild) {
      const pastPositions = await prisma.gpsPosition.findMany({
        where: { entryId },
        orderBy: { timestamp: "desc" },
        take: 200,
        select: { latitude: true, longitude: true },
      });
      for (const id of computeArmed(pastPositions, geofenceCheckpoints)) {
        armed.add(id);
      }
    }
  }

  const firstPosition = await prisma.gpsPosition.findFirst({
    where: { entryId },
    orderBy: { timestamp: "asc" },
    select: { timestamp: true },
  });

  const { hits, newlyArmed } = detectGeofenceHits(
    positions,
    geofenceCheckpoints,
    {
      priorRecords,
      armed,
      firstPositionAt: firstPosition?.timestamp ?? positions[0].timestamp,
    }
  );
  for (const id of newlyArmed) armed.add(id);

  for (const hit of hits) {
    try {
      await prisma.timeRecord.create({
        data: {
          entryId,
          checkpointId: hit.checkpointId,
          timestamp: hit.timestamp,
        },
      });
    } catch {
      // Unique (entryId, checkpointId) violation — already recorded by a
      // concurrent request, safe to ignore.
    }
  }

  // 4. Update progression history (projection on the GPX polyline)
  const lastPosition = positions[positions.length - 1];

  if (gpxUrl) {
    try {
      const gpxXml = readGPXFileRaw(gpxUrl);
      if (!gpxXml) throw new Error("GPX file not found");
      const gpxData = parseGPX(gpxXml);

      if (gpxData.coordinates.length > 0) {
        const projection = projectOnPolyline(
          lastPosition.latitude,
          lastPosition.longitude,
          gpxData.coordinates
        );

        const history = stageTracker.getHistory(stageId);
        history.addEntry(
          riderId,
          projection.distanceFromStart,
          lastPosition.timestamp.getTime()
        );
      }
    } catch {
      // GPX read/parse error — non-blocking, gaps just won't update
    }
  }

  // 5. Broadcast snapshot via SSE
  const snapshot = await buildSnapshot(stageId);
  if (snapshot) {
    sseManager.broadcast(stageId, SSE_EVENTS.POSITIONS, snapshot);
  }

  // 6. Broadcast checkpoint events
  for (const hit of hits) {
    const cp = checkpoints.find((c) => c.id === hit.checkpointId);
    sseManager.broadcast(stageId, SSE_EVENTS.CHECKPOINT, {
      riderId,
      checkpointId: hit.checkpointId,
      checkpointName: cp?.name ?? "",
      timestamp: hit.timestamp.toISOString(),
    });
  }

  return { checkpointHits: hits.length };
}

/**
 * Construit l'instantané live d'une étape à partir de la DERNIÈRE position
 * connue de chaque coureur (en base) enrichie des écarts (en mémoire).
 *
 * Basé sur la base de données plutôt que sur la seule progression en mémoire :
 * tout coureur ayant au moins une position apparaît, même après un redémarrage
 * serveur. Trié du leader au dernier. Réutilisé par le broadcast SSE et par
 * l'endpoint GET /api/live/snapshot (état initial + secours du spectateur).
 */
export async function buildSnapshot(
  stageId: string
): Promise<LiveSnapshot | null> {
  const latest = await prisma.gpsPosition.findMany({
    where: { entry: { stageId } },
    orderBy: { timestamp: "desc" },
    distinct: ["entryId"],
    select: {
      latitude: true,
      longitude: true,
      speed: true,
      entry: {
        select: {
          riderId: true,
          rider: {
            select: {
              firstName: true,
              photoZoomUrl: true,
              team: { select: { color: true } },
            },
          },
        },
      },
    },
  });

  if (latest.length === 0) return null;

  const gaps = stageTracker.computeGaps(stageId);
  const gapMap = new Map(gaps.map((g) => [g.riderId, g]));
  const nameMap = new Map(
    latest.map((p) => [p.entry.riderId, p.entry.rider.firstName])
  );

  const riders: RiderSnapshot[] = latest.map((p) => {
    const g = gapMap.get(p.entry.riderId);
    return {
      riderId: p.entry.riderId,
      firstName: p.entry.rider.firstName,
      teamColor: p.entry.rider.team.color,
      photoZoomUrl: p.entry.rider.photoZoomUrl,
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed,
      distanceFromStart: g?.distanceFromStart ?? 0,
      timeGapToLeader: g?.timeGapToLeader ?? null,
      riderAhead: g?.riderAheadId
        ? {
            id: g.riderAheadId,
            firstName: nameMap.get(g.riderAheadId) ?? "",
            gap: g.riderAheadGap ?? 0,
          }
        : null,
      riderBehind: g?.riderBehindId
        ? {
            id: g.riderBehindId,
            firstName: nameMap.get(g.riderBehindId) ?? "",
            gap: g.riderBehindGap ?? 0,
          }
        : null,
    };
  });

  // Leader → dernier (distance décroissante)
  riders.sort((a, b) => b.distanceFromStart - a.distanceFromStart);

  return { stageId, timestamp: Date.now(), riders };
}
