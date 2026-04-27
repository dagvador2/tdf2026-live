import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({
    stageStart: prefs?.stageStart ?? true,
    newStory: prefs?.newStory ?? true,
    feedHighlights: prefs?.feedHighlights ?? true,
    myResults: prefs?.myResults ?? true,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { stageStart?: boolean; newStory?: boolean; feedHighlights?: boolean; myResults?: boolean };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const data: Record<string, boolean> = {};
  if (typeof body.stageStart === "boolean") data.stageStart = body.stageStart;
  if (typeof body.newStory === "boolean") data.newStory = body.newStory;
  if (typeof body.feedHighlights === "boolean") data.feedHighlights = body.feedHighlights;
  if (typeof body.myResults === "boolean") data.myResults = body.myResults;

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  return NextResponse.json(prefs);
}
