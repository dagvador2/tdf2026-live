import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { sseManager } from "@/lib/sse/manager";
import { SSE_EVENTS } from "@/lib/sse/events";

const VALID_TRANSITIONS: Record<string, string[]> = {
  upcoming: ["live"],
  live: ["paused", "finished"],
  paused: ["live", "finished"],
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { stageId, newStatus } = await request.json();

  if (!stageId || !newStatus) {
    return NextResponse.json(
      { error: "stageId et newStatus requis" },
      { status: 400 }
    );
  }

  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) {
    return NextResponse.json(
      { error: "Étape introuvable" },
      { status: 404 }
    );
  }

  const allowed = VALID_TRANSITIONS[stage.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Transition ${stage.status} → ${newStatus} non autorisée`,
      },
      { status: 400 }
    );
  }

  const now = new Date();
  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === "live" && stage.status === "upcoming") {
    updateData.startTime = now;
  }
  if (newStatus === "finished") {
    updateData.endTime = now;
  }

  const updated = await prisma.stage.update({
    where: { id: stageId },
    data: updateData,
  });

  // Broadcast stage_status via SSE
  sseManager.broadcast(stageId, SSE_EVENTS.STAGE_STATUS, {
    stageId,
    status: newStatus,
    startTime: updated.startTime?.toISOString() ?? null,
    endTime: updated.endTime?.toISOString() ?? null,
  });

  return NextResponse.json(updated);
}
