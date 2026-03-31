import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRiderJWT } from "@/lib/auth/jwt";

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
    select: { status: true },
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

  return NextResponse.json({
    ok: true,
    count: positions.length,
    entryId: entry.id,
  });
}
