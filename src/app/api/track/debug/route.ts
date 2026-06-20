import { NextResponse } from "next/server";
import { getHits } from "@/lib/gps/track-debug";

/**
 * Diagnostic temporaire : dump des dernières requêtes reçues par /api/track.
 * GET /api/track/debug?key=ventoux
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (key !== "ventoux") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const hits = getHits();
  return NextResponse.json({ count: hits.length, hits: [...hits].reverse() });
}
