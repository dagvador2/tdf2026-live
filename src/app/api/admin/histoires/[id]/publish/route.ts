import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const story = await prisma.tourStory.update({
    where: { id: params.id },
    data: { publishedAt: new Date() },
  });

  // TODO (PUSH.06): trigger sendPushToAudience({ type: "new_story", ... })
  // once the helper from PUSH.04 is in place.

  return NextResponse.json({ ok: true, slug: story.slug });
}
