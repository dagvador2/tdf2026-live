import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stageId = searchParams.get("stageId");
  const type = searchParams.get("type");

  if (!stageId || !type) {
    return NextResponse.json(
      { error: "stageId and type required" },
      { status: 400 }
    );
  }

  if (type === "positions") {
    const page = parseInt(searchParams.get("page") ?? "0");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "10000");

    const positions = await prisma.gpsPosition.findMany({
      where: { entry: { stageId } },
      orderBy: { timestamp: "asc" },
      skip: page * pageSize,
      take: pageSize + 1, // +1 to detect if there's more
      select: {
        latitude: true,
        longitude: true,
        altitude: true,
        speed: true,
        timestamp: true,
        entry: {
          select: {
            rider: { select: { id: true } },
          },
        },
      },
    });

    const hasMore = positions.length > pageSize;
    const results = hasMore ? positions.slice(0, pageSize) : positions;

    return NextResponse.json({ positions: results, hasMore });
  }

  if (type === "timeRecords") {
    const timeRecords = await prisma.timeRecord.findMany({
      where: { entry: { stageId } },
      orderBy: { timestamp: "asc" },
      select: {
        timestamp: true,
        checkpoint: { select: { name: true, type: true } },
        entry: {
          select: {
            rider: { select: { id: true, firstName: true } },
          },
        },
      },
    });
    return NextResponse.json({ timeRecords });
  }

  if (type === "posts") {
    const posts = await prisma.livePost.findMany({
      where: { stageId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        type: true,
        content: true,
        photoUrl: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ posts });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
