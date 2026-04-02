import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signRiderJWT } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  const { riderId } = await request.json();

  if (!riderId) {
    return NextResponse.json({ error: "riderId requis" }, { status: 400 });
  }

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) {
    return NextResponse.json({ error: "Coureur introuvable" }, { status: 404 });
  }

  const token = await signRiderJWT(riderId);

  return NextResponse.json({ token });
}
