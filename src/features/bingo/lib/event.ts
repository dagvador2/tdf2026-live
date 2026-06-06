import { prisma } from "@/lib/db";
import type { BingoEvent } from "@prisma/client";

export async function getActiveBingoEvent(): Promise<BingoEvent | null> {
  return prisma.bingoEvent.findFirst({
    where: { isActive: true },
    orderBy: { startsAt: "asc" },
  });
}
