import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const liveStage = await prisma.stage.findFirst({
    where: { status: "live" },
    select: { id: true },
  });

  return NextResponse.json({ live: !!liveStage });
}
