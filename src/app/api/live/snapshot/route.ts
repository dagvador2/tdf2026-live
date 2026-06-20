import { NextResponse } from "next/server";
import { buildSnapshot } from "@/lib/gps/ingest";

/**
 * Instantané live d'une étape (dernières positions + écarts).
 *
 * Sert l'état INITIAL au spectateur quand il ouvre la carte (le flux SSE ne
 * pousse que les mises à jour, jamais l'existant) et de filet de sécurité par
 * polling si une connexion SSE tombe.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const stageId = new URL(request.url).searchParams.get("stageId");

  if (!stageId) {
    return NextResponse.json({ error: "Missing stageId" }, { status: 400 });
  }

  const snapshot = await buildSnapshot(stageId);

  return NextResponse.json(
    snapshot ?? { stageId, timestamp: Date.now(), riders: [] }
  );
}
