import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { sseManager } from "@/lib/sse/manager";
import { SSE_EVENTS } from "@/lib/sse/events";
import { PASTIS_CHANNEL, PASTIS_MAX_QUANTITY } from "@/lib/pastis/constants";
import { getRiderPastisCount, getPastisData } from "@/lib/pastis/queries";

/**
 * Compteur de pastis 🥃
 * - POST : ajoute un (ou plusieurs) pastis. Un coureur ne peut incrémenter que
 *   son propre compteur (source `self`) ; un admin peut viser n'importe quel
 *   coureur (source `admin`).
 * - DELETE : annule le dernier pastis (undo) selon les mêmes règles.
 */

interface ResolvedTarget {
  riderId: string;
  source: "self" | "admin";
}

/** Détermine le coureur ciblé selon la session, ou renvoie une erreur HTTP. */
async function resolveTarget(bodyRiderId?: string): Promise<ResolvedTarget | NextResponse> {
  const session = await getSessionRider();

  if (session.status === "rider") {
    // Un coureur ne peut agir que sur lui-même, quel que soit le body.
    return { riderId: session.rider.id, source: "self" };
  }

  if (session.status === "admin") {
    if (!bodyRiderId) {
      return NextResponse.json({ error: "riderId requis" }, { status: 400 });
    }
    return { riderId: bodyRiderId, source: "admin" };
  }

  return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
}

/** Étape live du moment (pour attribuer le « pastis du jour »), sinon null. */
async function currentLiveStageId(): Promise<string | null> {
  const stage = await prisma.stage.findFirst({
    where: { status: "live", number: { gte: 1 } },
    select: { id: true },
  });
  return stage?.id ?? null;
}

/** Recalcule les totaux et diffuse l'événement live à tous les clients SSE. */
async function broadcastUpdate(riderId: string, delta: number) {
  const [rider, data] = await Promise.all([
    prisma.rider.findUnique({
      where: { id: riderId },
      select: {
        firstName: true,
        nickname: true,
        team: { select: { id: true, name: true, color: true } },
      },
    }),
    getPastisData(),
  ]);

  const riderRow = data.individual.find((r) => r.riderId === riderId);

  sseManager.broadcast(PASTIS_CHANNEL, SSE_EVENTS.PASTIS, {
    riderId,
    riderName: rider?.nickname || rider?.firstName || "Un coureur",
    teamName: rider?.team.name ?? "",
    teamColor: rider?.team.color ?? "#999",
    delta,
    riderCount: riderRow?.count ?? 0,
    total: data.total,
    at: new Date().toISOString(),
  });

  return { riderCount: riderRow?.count ?? (await getRiderPastisCount(riderId)), total: data.total };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    riderId?: string;
    quantity?: number;
    stageId?: string | null;
  };

  const target = await resolveTarget(body.riderId);
  if (target instanceof NextResponse) return target;

  // Quantité : entier >= 1, plafonné (garde-fou anti-spam / faute de frappe).
  let quantity = Number.isFinite(body.quantity) ? Math.trunc(body.quantity as number) : 1;
  if (quantity < 1) quantity = 1;
  if (quantity > PASTIS_MAX_QUANTITY) quantity = PASTIS_MAX_QUANTITY;

  // Étape : celle fournie (admin), sinon l'étape live du moment, sinon aucune.
  const stageId =
    body.stageId !== undefined ? body.stageId : await currentLiveStageId();

  await prisma.pastisLog.create({
    data: {
      riderId: target.riderId,
      stageId: stageId ?? undefined,
      quantity,
      source: target.source,
    },
  });

  const totals = await broadcastUpdate(target.riderId, quantity);
  return NextResponse.json({ ok: true, ...totals });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { riderId?: string };

  const target = await resolveTarget(body.riderId);
  if (target instanceof NextResponse) return target;

  // Undo : on retire le pastis le plus récent du coureur ciblé.
  const last = await prisma.pastisLog.findFirst({
    where: { riderId: target.riderId },
    orderBy: { createdAt: "desc" },
    select: { id: true, quantity: true },
  });

  if (!last) {
    return NextResponse.json({ error: "Aucun pastis à annuler" }, { status: 404 });
  }

  await prisma.pastisLog.delete({ where: { id: last.id } });

  const totals = await broadcastUpdate(target.riderId, -last.quantity);
  return NextResponse.json({ ok: true, ...totals });
}
