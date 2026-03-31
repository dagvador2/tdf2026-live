import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { signRiderJWT } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { riderId } = body;

  if (!riderId) {
    return NextResponse.json(
      { error: "riderId requis" },
      { status: 400 }
    );
  }

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) {
    return NextResponse.json(
      { error: "Coureur introuvable" },
      { status: 404 }
    );
  }

  const token = await signRiderJWT(riderId);
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/coureur/${token}`;

  return NextResponse.json({ token, url });
}
