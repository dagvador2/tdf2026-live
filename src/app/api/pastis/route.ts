import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { isPastisAdmin } from "@/lib/pastis/admin";
import { sseManager } from "@/lib/sse/manager";
import { SSE_EVENTS } from "@/lib/sse/events";
import { PASTIS_CHANNEL, PASTIS_MAX_QUANTITY } from "@/lib/pastis/constants";
import { getRiderPastisCount, getPastisData } from "@/lib/pastis/queries";
import { notifyPastisAdmins } from "@/lib/pastis/notify";

/**
 * Compteur de pastis 🥃
 * - POST : ajoute un (ou plusieurs) pastis. Un coureur ne déclare que pour
 *   lui-même (source `self`, selfie obligatoire) ; un « validateur pastis »
 *   (admin ou coureur sur la liste blanche) peut viser n'importe qui (source
 *   `admin`, sans selfie).
 * - DELETE : retire un pastis précis (`logId`) ou le dernier d'un coureur.
 */

interface Actor {
  kind: "rider" | "admin";
  riderId: string | null;
  adminCap: boolean; // droit d'agir sur les autres
}

/** Identifie l'appelant, ou null si non autorisé. */
async function resolveActor(): Promise<Actor | null> {
  const s = await getSessionRider();
  if (s.status === "rider") {
    return { kind: "rider", riderId: s.rider.id, adminCap: isPastisAdmin(s.rider.email) };
  }
  if (s.status === "admin") {
    return { kind: "admin", riderId: null, adminCap: true };
  }
  return null;
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
async function broadcastUpdate(
  riderId: string,
  delta: number,
  photoUrl?: string | null
) {
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
    photoUrl: photoUrl ?? null,
    delta,
    riderCount: riderRow?.count ?? 0,
    total: data.total,
    at: new Date().toISOString(),
  });

  return {
    riderCount: riderRow?.count ?? (await getRiderPastisCount(riderId)),
    total: data.total,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    riderId?: string;
    quantity?: number;
    stageId?: string | null;
    photoUrl?: string;
    caption?: string;
  };

  const actor = await resolveActor();
  if (!actor) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Cible + source
  let riderId: string;
  let source: "self" | "admin";
  if (body.riderId && actor.adminCap) {
    riderId = body.riderId;
    source = "admin";
  } else if (body.riderId && !actor.adminCap) {
    return NextResponse.json(
      { error: "Tu ne peux déclarer des pastis que pour toi" },
      { status: 403 }
    );
  } else if (actor.kind === "rider" && actor.riderId) {
    riderId = actor.riderId;
    source = "self";
  } else {
    return NextResponse.json({ error: "riderId requis" }, { status: 400 });
  }

  // Selfie obligatoire pour l'auto-déclaration coureur
  if (source === "self" && !body.photoUrl) {
    return NextResponse.json({ error: "Selfie obligatoire" }, { status: 400 });
  }

  // Quantité : entier >= 1, plafonné (garde-fou anti-spam / faute de frappe).
  let quantity = Number.isFinite(body.quantity) ? Math.trunc(body.quantity as number) : 1;
  if (quantity < 1) quantity = 1;
  if (quantity > PASTIS_MAX_QUANTITY) quantity = PASTIS_MAX_QUANTITY;

  // Étape : celle fournie (admin), sinon l'étape live du moment, sinon aucune.
  const stageId =
    body.stageId !== undefined ? body.stageId : await currentLiveStageId();

  await prisma.pastisLog.create({
    data: {
      riderId,
      stageId: stageId ?? undefined,
      quantity,
      source,
      photoUrl: body.photoUrl ?? null,
      caption: body.caption?.slice(0, 280) ?? null,
    },
  });

  // Notif push aux validateurs uniquement pour les déclarations coureur (avec selfie)
  if (source === "self") {
    void notifyPastisAdmins(riderId, {
      photoUrl: body.photoUrl ?? null,
      caption: body.caption ?? null,
    });
  }

  const totals = await broadcastUpdate(riderId, quantity, body.photoUrl ?? null);
  return NextResponse.json({ ok: true, ...totals });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    riderId?: string;
    logId?: string;
  };

  const actor = await resolveActor();
  if (!actor) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Suppression d'un pastis précis (feed de validation)
  if (body.logId) {
    const log = await prisma.pastisLog.findUnique({
      where: { id: body.logId },
      select: { id: true, riderId: true, quantity: true },
    });
    if (!log) {
      return NextResponse.json({ error: "Pastis introuvable" }, { status: 404 });
    }
    const isOwn = actor.kind === "rider" && actor.riderId === log.riderId;
    if (!actor.adminCap && !isOwn) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    await prisma.pastisLog.delete({ where: { id: log.id } });
    const totals = await broadcastUpdate(log.riderId, -log.quantity);
    return NextResponse.json({ ok: true, ...totals });
  }

  // Sinon : retire le dernier pastis du coureur ciblé (undo)
  const targetRiderId =
    actor.adminCap && body.riderId
      ? body.riderId
      : actor.kind === "rider"
        ? actor.riderId
        : null;
  if (!targetRiderId) {
    return NextResponse.json({ error: "riderId requis" }, { status: 400 });
  }

  const last = await prisma.pastisLog.findFirst({
    where: { riderId: targetRiderId },
    orderBy: { createdAt: "desc" },
    select: { id: true, quantity: true },
  });
  if (!last) {
    return NextResponse.json({ error: "Aucun pastis à annuler" }, { status: 404 });
  }

  await prisma.pastisLog.delete({ where: { id: last.id } });
  const totals = await broadcastUpdate(targetRiderId, -last.quantity);
  return NextResponse.json({ ok: true, ...totals });
}
