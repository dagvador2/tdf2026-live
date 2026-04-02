import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const riders = await prisma.rider.findMany({
    orderBy: [{ team: { name: "asc" } }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      nickname: true,
      team: { select: { name: true, color: true } },
    },
  });

  return NextResponse.json(
    riders.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      nickname: r.nickname,
      teamName: r.team.name,
      teamColor: r.team.color,
    }))
  );
}
