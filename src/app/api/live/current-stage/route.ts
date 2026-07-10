import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Étape actuellement en direct (statut "live"), pour le banner spectateur
 * qui pointe vers le suivi live + classement de l'étape. Public.
 */
export async function GET() {
  const stage = await prisma.stage.findFirst({
    where: { status: "live" },
    orderBy: { number: "asc" },
    select: { id: true, number: true, name: true },
  });

  return NextResponse.json({ stage });
}
