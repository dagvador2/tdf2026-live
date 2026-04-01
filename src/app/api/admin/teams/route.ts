import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { riders: true } } },
  });

  return NextResponse.json(teams);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { id, name, slug, color, description, logoUrl } = body;

  if (id) {
    // Update
    const team = await prisma.team.update({
      where: { id },
      data: { name, slug, color, description, logoUrl },
    });
    return NextResponse.json(team);
  }

  // Create
  const team = await prisma.team.create({
    data: { name, slug, color, description, logoUrl },
  });
  return NextResponse.json(team, { status: 201 });
}
