import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const stageId = searchParams.get("stageId");
  if (!stageId) return NextResponse.json({ error: "stageId requis" }, { status: 400 });

  const checkpoints = await prisma.checkpoint.findMany({
    where: { stageId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(checkpoints);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { id, stageId, name, type, latitude, longitude, radiusM, order, kmFromStart, elevation } = body;

  if (id) {
    const cp = await prisma.checkpoint.update({
      where: { id },
      data: { name, type, latitude, longitude, radiusM, order, kmFromStart, elevation },
    });
    return NextResponse.json(cp);
  }

  const cp = await prisma.checkpoint.create({
    data: { stageId, name, type, latitude, longitude, radiusM, order, kmFromStart, elevation },
  });
  return NextResponse.json(cp, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  await prisma.checkpoint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
