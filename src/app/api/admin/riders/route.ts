import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const riders = await prisma.rider.findMany({
    orderBy: [{ team: { name: "asc" } }, { firstName: "asc" }],
    include: { team: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(riders);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { id, firstName, nickname, slug, teamId, photoUrl, editionCount, funFacts } = body;

  if (id) {
    const rider = await prisma.rider.update({
      where: { id },
      data: { firstName, nickname, slug, teamId, photoUrl, editionCount, funFacts },
    });
    return NextResponse.json(rider);
  }

  const rider = await prisma.rider.create({
    data: { firstName, nickname, slug, teamId, photoUrl, editionCount, funFacts },
  });
  return NextResponse.json(rider, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  await prisma.rider.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
