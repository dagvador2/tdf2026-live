import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

const VALID_POSITIONS = new Set([
  "center top",
  "center 15%",
  "center 25%",
  "center",
  "center 75%",
  "center bottom",
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body: { position?: string | null };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const position = body.position;
  if (position !== null && (typeof position !== "string" || !VALID_POSITIONS.has(position))) {
    return new NextResponse("Invalid position", { status: 400 });
  }

  const story = await prisma.tourStory.update({
    where: { id: params.id },
    data: { heroImagePosition: position },
  });

  return NextResponse.json({ ok: true, heroImagePosition: story.heroImagePosition });
}
