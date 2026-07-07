import { NextResponse } from "next/server";
import { getTwitchLiveStatus } from "@/lib/twitch/status";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getTwitchLiveStatus();
  return NextResponse.json(status);
}
