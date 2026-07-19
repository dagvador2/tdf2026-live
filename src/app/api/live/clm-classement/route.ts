import { NextResponse } from "next/server";
import { getClmLiveClassement } from "@/lib/standings/clm-live";

export const dynamic = "force-dynamic";

/**
 * Classement provisoire CLM pour le suivi live public du site.
 * Mêmes données que l'overlay OBS, sans clé : ce sont des classements
 * publics, la clé ne protège que l'URL du bandeau.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stageNumber = Number(searchParams.get("stage"));

  if (!stageNumber) {
    return NextResponse.json(
      { error: "Paramètre stage requis" },
      { status: 400 }
    );
  }

  const classement = await getClmLiveClassement(stageNumber);

  if (!classement) {
    return NextResponse.json({ error: "Étape introuvable" }, { status: 404 });
  }

  return NextResponse.json(classement);
}
