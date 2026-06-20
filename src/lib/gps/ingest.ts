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
  const gaps = stageTracker.computeGaps(stageId);

  if (gaps.length > 0) {
    const riderIds = gaps.map((g) => g.riderId);
    const riders = await prisma.rider.findMany({
      where: { id: { in: riderIds } },
      select: { id: true, firstName: true, team: { select: { color: true } } },
    });
    const riderMap = new Map(riders.map((r) => [r.id, r]));

    const latestPositions = await prisma.gpsPosition.findMany({
      where: { entry: { stageId, riderId: { in: riderIds } } },
      orderBy: { timestamp: "desc" },
      distinct: ["entryId"],
      select: {
        latitude: true,
        longitude: true,
        speed: true,
        entry: { select: { riderId: true } },
      },
    });
    const posMap = new Map(latestPositions.map((p) => [p.entry.riderId, p]));

    const snapshot: LiveSnapshot = {
      stageId,
      timestamp: Date.now(),
      riders: gaps.map((g): RiderSnapshot => {
        const rider = riderMap.get(g.riderId);
        const pos = posMap.get(g.riderId);
        return {
          riderId: g.riderId,
          firstName: rider?.firstName ?? "",
          teamColor: rider?.team.color ?? "",
          latitude: pos?.latitude ?? 0,
          longitude: pos?.longitude ?? 0,
          speed: pos?.speed ?? null,
          distanceFromStart: g.distanceFromStart,
          timeGapToLeader: g.timeGapToLeader,
          riderAhead: g.riderAheadId
            ? {
                id: g.riderAheadId,
                firstName: riderMap.get(g.riderAheadId)?.firstName ?? "",
                gap: g.riderAheadGap ?? 0,
              }
            : null,
          riderBehind: g.riderBehindId
            ? {
                id: g.riderBehindId,
                firstName: riderMap.get(g.riderBehindId)?.firstName ?? "",
                gap: g.riderBehindGap ?? 0,
              }
            : null,
        };
      }),
    };

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
