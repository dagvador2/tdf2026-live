import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { OverlayClassement } from "./OverlayClassement";

export const metadata: Metadata = {
  title: "Overlay classement — TDF 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: {
    mode?: string;
    stage?: string;
    key?: string;
    limit?: string;
  };
}

type OverlayMode = "team" | "individual";

const MODE_BY_TYPE: Record<string, OverlayMode> = {
  team_tt: "team",
  individual_tt: "individual",
};

export default async function OverlayClassementPage({ searchParams }: Props) {
  const explicitStage = Number(searchParams.stage) || null;
  const explicitMode: OverlayMode | null =
    searchParams.mode === "individual" || searchParams.mode === "team"
      ? searchParams.mode
      : null;

  // Sans paramètres, l'overlay suit le programme tout seul : CLM live en
  // priorité, sinon le prochain CLM à venir (le mode découle du type d'étape).
  const tts = await prisma.stage.findMany({
    where: { type: { in: ["team_tt", "individual_tt"] }, number: { gte: 1 } },
    orderBy: { date: "asc" },
    select: { number: true, type: true, status: true },
  });

  let stage = explicitStage;
  let mode = explicitMode;

  if (!stage) {
    const candidates = mode
      ? tts.filter((s) => MODE_BY_TYPE[s.type] === mode)
      : tts;
    const current =
      candidates.find((s) => s.status === "live") ??
      candidates.find((s) => s.status === "upcoming") ??
      candidates[candidates.length - 1];
    stage = current?.number ?? 2;
    mode ??= current ? MODE_BY_TYPE[current.type] : "individual";
  } else {
    const match = tts.find((s) => s.number === stage);
    mode ??= match ? MODE_BY_TYPE[match.type] : "team";
  }

  const limit = Number(searchParams.limit) || (mode === "team" ? 4 : 4);

  return (
    <OverlayClassement
      mode={mode}
      stage={stage}
      accessKey={searchParams.key ?? ""}
      limit={limit}
    />
  );
}
