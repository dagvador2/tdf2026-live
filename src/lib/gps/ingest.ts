import { prisma } from "@/lib/db";
import { detectGeofenceHits, GeofenceCheckpoint } from "@/lib/gps/geofence";
import { stageTracker } from "@/lib/time-gap/stage-tracker";
import { projectOnPolyline } from "@/lib/gpx/projection";
import { parseGPX } from "@/lib/gpx/parser";
import { readGPXFileRaw } from "@/lib/gpx/reader";
import { sseManager } from "@/lib/sse/manager";
import { SSE_EVENTS } from "@/lib/sse/events";
import type { RiderSnapshot, LiveSnapshot } from "@/lib/time-gap/types";
import type { EntryStatus } from "@prisma/client";

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

/**
 * Cœur d'ingestion d'un lot de positions pour un coureur sur une étape :
 * insertion → passage en "tracking" → geofencing → mise à jour de la
 * progression → calcul des écarts → diffusion SSE. Sans authentification ni
 * validation (à la charge de l'appelant).
 */
export async function ingestPositions(opts: {
  stageId: string;
  entryId: string;
  riderId: string;
  entryStatus: EntryStatus;
  gpxUrl: string | null;
  positions: IngestPosition[];
}): Promise<IngestResult> {
  const { stageId, entryId, riderId, entryStatus, gpxUrl, positions } = opts;

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

  const existingRecords = await prisma.timeRecord.findMany({
    where: { entryId },
    select: { checkpointId: true },
  });
  const alreadyPassed = new Set(existingRecords.map((r) => r.checkpointId));

  const geofenceCheckpoints: GeofenceCheckpoint[] = checkpoints.map((cp) => ({
    id: cp.id,
    latitude: cp.latitude,
    longitude: cp.longitude,
    radiusM: cp.radiusM,
    order: cp.order,
  }));

  const hits = detectGeofenceHits(positions, geofenceCheckpoints, alreadyPassed);

  for (const hit of hits) {
    await prisma.timeRecord.create({
      data: {
        entryId,
        checkpointId: hit.checkpointId,
        timestamp: hit.timestamp,
      },
    });
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
            select: { firstName: true, team: { select: { color: true } } },
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
