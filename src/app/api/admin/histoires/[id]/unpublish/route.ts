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
    data: { publishedAt: null },
  });

  return NextResponse.json({ ok: true, slug: story.slug });
}
