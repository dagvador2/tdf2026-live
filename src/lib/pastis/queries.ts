import "server-only";
import { prisma } from "@/lib/db";
import {
  computePastisIndividualRanking,
  computePastisTeamRanking,
  type PastisEvent,
} from "@/lib/standings/calculator";

export interface PastisIndividualRow {
  rank: number;
  riderId: string;
  riderName: string;
  riderSlug: string;
  teamName: string;
  teamColor: string;
  count: number;
}

export interface PastisTeamRow {
  rank: number;
  teamId: string;
  teamName: string;
  teamColor: string;
  count: number;
}

export interface PastisData {
  total: number;
  individual: PastisIndividualRow[];
  teams: PastisTeamRow[];
}

/**
 * Agrège les logs de pastis en classements prêts à afficher.
 * @param stageId si fourni, ne compte que les pastis de cette étape (« pastis du jour »).
 */
export async function getPastisData(stageId?: string): Promise<PastisData> {
  const logs = await prisma.pastisLog.findMany({
    where: stageId ? { stageId } : undefined,
    select: {
      quantity: true,
      riderId: true,
      rider: {
        select: {
          firstName: true,
          nickname: true,
          slug: true,
          teamId: true,
          team: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  const events: PastisEvent[] = logs.map((l) => ({
    riderId: l.riderId,
    teamId: l.rider.teamId,
    quantity: l.quantity,
  }));

  const total = events.reduce((acc, e) => acc + e.quantity, 0);

  // Lookup maps (riders/teams qui ont au moins un pastis)
  const riderInfo = new Map(
    logs.map((l) => [
      l.riderId,
      {
        name: l.rider.nickname || l.rider.firstName,
        slug: l.rider.slug,
        teamName: l.rider.team.name,
        teamColor: l.rider.team.color,
      },
    ])
  );
  const teamInfo = new Map(
    logs.map((l) => [
      l.rider.teamId,
      { name: l.rider.team.name, color: l.rider.team.color },
    ])
  );

  const individual: PastisIndividualRow[] = computePastisIndividualRanking(events).map(
    (e) => {
      const info = riderInfo.get(e.riderId);
      return {
        rank: e.rank,
        riderId: e.riderId,
        riderName: info?.name ?? "Inconnu",
        riderSlug: info?.slug ?? "",
        teamName: info?.teamName ?? "",
        teamColor: info?.teamColor ?? "#999",
        count: e.count,
      };
    }
  );

  const teams: PastisTeamRow[] = computePastisTeamRanking(events).map((e) => {
    const info = teamInfo.get(e.teamId);
    return {
      rank: e.rank,
      teamId: e.teamId,
      teamName: info?.name ?? "Inconnu",
      teamColor: info?.color ?? "#999",
      count: e.count,
    };
  });

  return { total, individual, teams };
}

export interface PastisDeclarationRow {
  id: string;
  riderId: string;
  riderName: string;
  teamName: string;
  teamColor: string;
  quantity: number;
  photoUrl: string | null;
  caption: string | null;
  source: "self" | "admin";
  createdAt: string; // ISO
}

/** Dernières déclarations (avec selfie) pour le feed de validation. */
export async function getRecentPastisDeclarations(
  limit = 60
): Promise<PastisDeclarationRow[]> {
  const logs = await prisma.pastisLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      riderId: true,
      quantity: true,
      photoUrl: true,
      caption: true,
      source: true,
      createdAt: true,
      rider: {
        select: {
          firstName: true,
          nickname: true,
          team: { select: { name: true, color: true } },
        },
      },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    riderId: l.riderId,
    riderName: l.rider.nickname || l.rider.firstName,
    teamName: l.rider.team.name,
    teamColor: l.rider.team.color,
    quantity: l.quantity,
    photoUrl: l.photoUrl,
    caption: l.caption,
    source: l.source,
    createdAt: l.createdAt.toISOString(),
  }));
}

/** Total de pastis d'un coureur (tout le Tour). Sert au bouton +1 / undo. */
export async function getRiderPastisCount(riderId: string): Promise<number> {
  const agg = await prisma.pastisLog.aggregate({
    where: { riderId },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}
