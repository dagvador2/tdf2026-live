import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { sendPushToAudience } from "@/lib/push/send";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const wasUnpublished = await prisma.tourStory.findUnique({
    where: { id: params.id },
    select: { publishedAt: true },
  });

  const story = await prisma.tourStory.update({
    where: { id: params.id },
    data: { publishedAt: new Date() },
  });

  // Only fire the push when transitioning from draft -> published, to avoid
  // re-blasting subscribers if an admin clicks "Publier" twice.
  let push: { sent: number; failed: number; removed: number } | null = null;
  if (!wasUnpublished?.publishedAt) {
    try {
      push = await sendPushToAudience({
        type: "new_story",
        title: `Nouvelle histoire : ${story.title}`,
        body: story.excerpt.length > 120 ? story.excerpt.substring(0, 117) + "..." : story.excerpt,
        url: `/histoires/${story.slug}`,
        audience: "all",
      });
    } catch (err) {
      console.error("[publish] push failed", err);
    }
  }

  return NextResponse.json({ ok: true, slug: story.slug, push });
}
