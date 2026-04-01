import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const entries = await prisma.stageEntry.findMany({
    select: { riderId: true, stageId: true },
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { riderId, stageId, action } = await request.json();

  if (action === "add") {
    const entry = await prisma.stageEntry.create({
      data: { riderId, stageId },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  if (action === "remove") {
    await prisma.stageEntry.deleteMany({
      where: { riderId, stageId },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action invalide" }, { status: 400 });
}
