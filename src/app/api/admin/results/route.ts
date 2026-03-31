import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stageId = searchParams.get("stageId");

  if (!stageId) {
    return NextResponse.json({ error: "stageId required" }, { status: 400 });
  }

  const records = await prisma.timeRecord.findMany({
    where: { entry: { stageId } },
    include: {
      checkpoint: { select: { name: true, type: true, order: true } },
      entry: {
        select: {
          status: true,
          rider: {
            select: {
              id: true,
              firstName: true,
              team: { select: { id: true, name: true, color: true } },
            },
          },
        },
      },
    },
    orderBy: [{ checkpoint: { order: "asc" } }, { timestamp: "asc" }],
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;

  if (action === "upsert") {
    const { entryId, checkpointId, timestamp, correctedBy } = body;
    const record = await prisma.timeRecord.upsert({
      where: { entryId_checkpointId: { entryId, checkpointId } },
      create: {
        entryId,
        checkpointId,
        timestamp: new Date(timestamp),
        isManual: true,
        correctedBy,
      },
      update: {
        timestamp: new Date(timestamp),
        isManual: true,
        correctedBy,
      },
    });
    return NextResponse.json({ record });
  }

  if (action === "validate") {
    const { stageId } = body;
    await prisma.stage.update({
      where: { id: stageId },
      data: { status: "finished", endTime: new Date() },
    });
    // Update all tracking entries to finished
    await prisma.stageEntry.updateMany({
      where: { stageId, status: "tracking" },
      data: { status: "finished" },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
