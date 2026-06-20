import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { ingestPositions, IngestPosition } from "@/lib/gps/ingest";

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
  // 1. Auth : session Auth.js (cookie)
  const session = await auth();
  if (session?.user?.role !== "rider" || !session.user.riderId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const riderId = session.user.riderId;

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

  // 5. Ingest (insert → geofence → progression → gaps → SSE broadcast)
  const ingestData: IngestPosition[] = positions.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
    altitude: p.alt,
    speed: p.speed,
    accuracy: p.acc,
    timestamp: new Date(p.ts),
  }));

  const { checkpointHits } = await ingestPositions({
    stageId,
    entryId: entry.id,
    riderId,
    entryStatus: entry.status,
    gpxUrl: stage.gpxUrl,
    positions: ingestData,
  });

  return NextResponse.json({
    ok: true,
    count: positions.length,
    entryId: entry.id,
    checkpointHits,
  });
}
