import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRiderJWT } from "@/lib/auth/jwt";
import { detectGeofenceHits, GeofenceCheckpoint } from "@/lib/gps/geofence";
import { stageTracker } from "@/lib/time-gap/stage-tracker";
import { projectOnPolyline } from "@/lib/gpx/projection";
import { parseGPX } from "@/lib/gpx/parser";
import { readGPXFileRaw } from "@/lib/gpx/reader";
import { sseManager } from "@/lib/sse/manager";
import { SSE_EVENTS } from "@/lib/sse/events";
import type { RiderSnapshot, LiveSnapshot } from "@/lib/time-gap/types";

interface GpsPayloadPosition {
  lat: number;
  lng: number;
  alt: number | null;
  speed: number | null;
  acc: number | null;
  ts: number;
}

interface GpsBatchBody {
  stageId: string;
  positions: GpsPayloadPosition[];
}

export async function POST(request: Request) {
  // 1. Verify JWT
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const result = await verifyRiderJWT(token);

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error === "expired" ? "Token expiré" : "Token invalide" },
      { status: 401 }
    );
  }

  const { riderId } = result;

  // 2. Parse body
  let body: GpsBatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { stageId, positions } = body;

  if (!stageId || !Array.isArray(positions) || positions.length === 0) {
    return NextResponse.json(
      { error: "stageId and positions[] required" },
      { status: 400 }
    );
  }

  // 3. Verify stage is live
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    select: { status: true, gpxUrl: true },
  });

  if (!stage) {
    return NextResponse.json({ error: "Étape introuvable" }, { status: 400 });
  }

  if (stage.status !== "live") {
    return NextResponse.json(
      { error: "Étape pas en cours" },
      { status: 400 }
    );
  }

  // 4. Verify rider is registered for this stage
  const entry = await prisma.stageEntry.findUnique({
    where: { riderId_stageId: { riderId, stageId } },
    select: { id: true, status: true },
  });

  if (!entry) {
    return NextResponse.json(
      { error: "Coureur non inscrit à cette étape" },
      { status: 400 }
    );
  }

  // 5. Insert positions
  const data = positions.map((p) => ({
    entryId: entry.id,
    latitude: p.lat,
    longitude: p.lng,
    altitude: p.alt,
    speed: p.speed,
    accuracy: p.acc,
    timestamp: new Date(p.ts),
  }));

  await prisma.gpsPosition.createMany({ data });

  // 6. Update entry status to "tracking" on first batch
  if (entry.status === "registered" || entry.status === "started") {
    await prisma.stageEntry.update({
      where: { id: entry.id },
      data: { status: "tracking" },
    });
  }

  // 7. Geofence detection
  const checkpoints = await prisma.checkpoint.findMany({
    where: { stageId },
    orderBy: { order: "asc" },
  });

  const existingRecords = await prisma.timeRecord.findMany({
    where: { entryId: entry.id },
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

  const hits = detectGeofenceHits(data, geofenceCheckpoints, alreadyPassed);

  for (const hit of hits) {
    await prisma.timeRecord.create({
      data: {
        entryId: entry.id,
        checkpointId: hit.checkpointId,
        timestamp: hit.timestamp,
      },
    });
  }

  // 8. Update progression history + compute time gaps
  const lastPosition = data[data.length - 1];

  if (stage.gpxUrl) {
    try {
      const gpxXml = readGPXFileRaw(stage.gpxUrl);
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
      // GPX fetch/parse error — non-blocking, gaps just won't update
    }
  }

  // 9. Broadcast snapshot via SSE
  const gaps = stageTracker.computeGaps(stageId);

  if (gaps.length > 0) {
    // Fetch rider info for the snapshot
    const riderIds = gaps.map((g) => g.riderId);
    const riders = await prisma.rider.findMany({
      where: { id: { in: riderIds } },
      select: { id: true, firstName: true, team: { select: { color: true } } },
    });
    const riderMap = new Map(riders.map((r) => [r.id, r]));

    // Fetch latest positions for all active riders
    const latestPositions = await prisma.gpsPosition.findMany({
      where: {
        entry: { stageId, riderId: { in: riderIds } },
      },
      orderBy: { timestamp: "desc" },
      distinct: ["entryId"],
      select: {
        latitude: true,
        longitude: true,
        speed: true,
        entry: { select: { riderId: true } },
      },
    });
    const posMap = new Map(
      latestPositions.map((p) => [p.entry.riderId, p])
    );

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
            ? { id: g.riderAheadId, firstName: riderMap.get(g.riderAheadId)?.firstName ?? "", gap: g.riderAheadGap ?? 0 }
            : null,
          riderBehind: g.riderBehindId
            ? { id: g.riderBehindId, firstName: riderMap.get(g.riderBehindId)?.firstName ?? "", gap: g.riderBehindGap ?? 0 }
            : null,
        };
      }),
    };

    sseManager.broadcast(stageId, SSE_EVENTS.POSITIONS, snapshot);
  }

  // Broadcast checkpoint events
  for (const hit of hits) {
    const cp = checkpoints.find((c) => c.id === hit.checkpointId);
    sseManager.broadcast(stageId, SSE_EVENTS.CHECKPOINT, {
      riderId,
      checkpointId: hit.checkpointId,
      checkpointName: cp?.name ?? "",
      timestamp: hit.timestamp.toISOString(),
    });
  }

  return NextResponse.json({
    ok: true,
    count: positions.length,
    entryId: entry.id,
    checkpointHits: hits.length,
  });
}
