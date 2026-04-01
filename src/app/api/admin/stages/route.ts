import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const stages = await prisma.stage.findMany({
    orderBy: { number: "asc" },
    include: {
      _count: { select: { entries: true, checkpoints: true } },
    },
  });

  return NextResponse.json(stages);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { id, gpxUrl, ttNthRider, teamTopN, gcMode } = body;

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const stage = await prisma.stage.update({
    where: { id },
    data: {
      ...(gpxUrl !== undefined && { gpxUrl }),
      ...(ttNthRider !== undefined && { ttNthRider }),
      ...(teamTopN !== undefined && { teamTopN }),
      ...(gcMode !== undefined && { gcMode }),
    },
  });

  return NextResponse.json(stage);
}
