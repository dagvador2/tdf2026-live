import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const liveStage = await prisma.stage.findFirst({
    where: { status: "live" },
    select: { id: true },
  });

  return NextResponse.json({ live: !!liveStage });
}
