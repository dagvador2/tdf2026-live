import { NextResponse } from "next/server";

/**
 * Ancien tracker web (GPS du navigateur) — DÉSACTIVÉ.
 *
 * Le suivi GPS passe désormais uniquement par l'app Traccar Client → /api/track
 * (source unique). Ce endpoint est conservé pour répondre proprement aux anciens
 * clients web encore ouverts, sans rien ingérer.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Tracker web désactivé. Le suivi GPS passe par l'app Traccar Client.",
    },
    { status: 410 }
  );
}
