import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { sseManager } from "@/lib/sse/manager";
import { SSE_EVENTS } from "@/lib/sse/events";

/**
 * Chronométrage live des CLM : tamponne départ/arrivée pour un ou plusieurs
 * coureurs (CLM équipe = toute l'équipe d'un coup) en créant des TimeRecords
 * manuels sur les checkpoints start/finish de l'étape.
 */

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const stageId = request.nextUrl.searchParams.get("stageId");
  if (!stageId) {
    return NextResponse.json({ error: "stageId requis" }, { status: 400 });
  }

  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: {
      checkpoints: { orderBy: { order: "asc" } },
      entries: {
        include: {
          rider: {
            select: {
              id: true,
              firstName: true,
              nickname: true,
              team: { select: { id: true, name: true, color: true, slug: true } },
            },
          },
          timeRecords: {
            select: {
              timestamp: true,
              isManual: true,
              checkpointId: true,
              checkpoint: { select: { type: true } },
            },
          },
        },
      },
    },
  });

  if (!stage) {
    return NextResponse.json({ error: "Étape introuvable" }, { status: 404 });
  }

  // Checkpoints intermédiaires (col/sprint), ordonnés le long du parcours
  const intermediateCheckpoints = stage.checkpoints
    .filter((cp) => cp.type === "col" || cp.type === "sprint")
    .map((cp) => ({ id: cp.id, name: cp.name, kmFromStart: cp.kmFromStart }));

  const entries = stage.entries.map((entry) => {
    let startTime: string | null = null;
    let finishTime: string | null = null;
    let startSource: "manual" | "gps" | null = null;
    let finishSource: "manual" | "gps" | null = null;
    // Tampons intermédiaires : checkpointId -> { time, source }
    const intermediates: Record<
      string,
      { time: string; source: "manual" | "gps" }
    > = {};
    for (const tr of entry.timeRecords) {
      if (tr.checkpoint.type === "start") {
        startTime = tr.timestamp.toISOString();
        startSource = tr.isManual ? "manual" : "gps";
      } else if (tr.checkpoint.type === "finish") {
        finishTime = tr.timestamp.toISOString();
        finishSource = tr.isManual ? "manual" : "gps";
      } else {
        intermediates[tr.checkpointId] = {
          time: tr.timestamp.toISOString(),
          source: tr.isManual ? "manual" : "gps",
        };
      }
    }
    return {
      entryId: entry.id,
      status: entry.status,
      rider: {
        id: entry.rider.id,
        firstName: entry.rider.firstName,
        nickname: entry.rider.nickname,
      },
      team: entry.rider.team,
      startTime,
      finishTime,
      startSource,
      finishSource,
      intermediates,
    };
  });

  return NextResponse.json({
    stage: {
      id: stage.id,
      number: stage.number,
      name: stage.name,
      type: stage.type,
      status: stage.status,
    },
    hasStartCheckpoint: stage.checkpoints.some((cp) => cp.type === "start"),
    hasFinishCheckpoint: stage.checkpoints.some((cp) => cp.type === "finish"),
    intermediateCheckpoints,
    entries,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { stageId, entryIds, checkpointType, checkpointId, action } = body as {
    stageId?: string;
    entryIds?: string[];
    checkpointType?: "start" | "finish";
    checkpointId?: string;
    action?: "stamp" | "clear";
    timestamp?: string;
  };

  // Un tampon vise soit un checkpoint par TYPE (start/finish), soit un
  // checkpoint intermédiaire par ID (col/sprint). Les intermédiaires ne
  // changent pas le statut du coureur (il reste en course).
  const isIntermediate = typeof checkpointId === "string" && checkpointId.length > 0;

  if (
    !stageId ||
    !Array.isArray(entryIds) ||
    entryIds.length === 0 ||
    (action !== "stamp" && action !== "clear") ||
    (!isIntermediate && checkpointType !== "start" && checkpointType !== "finish")
  ) {
    return NextResponse.json(
      { error: "stageId, entryIds, action et (checkpointType ou checkpointId) requis" },
      { status: 400 }
    );
  }

  const checkpoint = isIntermediate
    ? await prisma.checkpoint.findFirst({ where: { id: checkpointId, stageId } })
    : await prisma.checkpoint.findFirst({
        where: { stageId, type: checkpointType },
        orderBy: { order: checkpointType === "start" ? "asc" : "desc" },
      });

  if (!checkpoint) {
    return NextResponse.json(
      { error: `Checkpoint introuvable sur cette étape` },
      { status: 404 }
    );
  }

  if (action === "stamp") {
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

    const ops: Prisma.PrismaPromise<unknown>[] = [
      ...entryIds.map((entryId) =>
        prisma.timeRecord.upsert({
          where: { entryId_checkpointId: { entryId, checkpointId: checkpoint.id } },
          create: {
            entryId,
            checkpointId: checkpoint.id,
            timestamp,
            isManual: true,
            correctedBy: session.user?.email ?? "live-timing",
          },
          update: {
            timestamp,
            isManual: true,
            correctedBy: session.user?.email ?? "live-timing",
          },
        })
      ),
    ];
    // Départ/arrivée changent le statut ; un intermédiaire n'y touche pas.
    if (!isIntermediate) {
      ops.push(
        prisma.stageEntry.updateMany({
          where: { id: { in: entryIds } },
          data: { status: checkpointType === "start" ? "started" : "finished" },
        })
      );
    }
    await prisma.$transaction(ops);

    // Premier départ tamponné sur une étape encore "à venir" : on la passe
    // automatiquement en live (nécessaire pour l'ingestion GPS Traccar,
    // qui ne s'attache qu'à l'étape de statut live).
    if (checkpointType === "start") {
      const stage = await prisma.stage.findUnique({ where: { id: stageId } });
      if (stage && stage.status === "upcoming") {
        const updated = await prisma.stage.update({
          where: { id: stageId },
          data: { status: "live", startTime: timestamp },
        });
        sseManager.broadcast(stageId, SSE_EVENTS.STAGE_STATUS, {
          stageId,
          status: "live",
          startTime: updated.startTime?.toISOString() ?? null,
          endTime: null,
        });
      }
    }

    return NextResponse.json({ ok: true, timestamp: timestamp.toISOString() });
  }

  // action === "clear" : annule un tampon erroné
  const clearOps: Prisma.PrismaPromise<unknown>[] = [
    prisma.timeRecord.deleteMany({
      where: { entryId: { in: entryIds }, checkpointId: checkpoint.id },
    }),
  ];
  // Annuler un intermédiaire ne change pas le statut du coureur.
  if (!isIntermediate) {
    clearOps.push(
      prisma.stageEntry.updateMany({
        where: { id: { in: entryIds } },
        data: { status: checkpointType === "start" ? "registered" : "started" },
      })
    );
  }
  await prisma.$transaction(clearOps);

  return NextResponse.json({ ok: true });
}
