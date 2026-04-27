import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";

const VALID_KINDS = new Set(["view", "read", "share"]);
const MAX_SESSION_ID_LEN = 64;

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  let body: { kind?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  if (!body.kind || !VALID_KINDS.has(body.kind)) {
    return new NextResponse("Invalid kind", { status: 400 });
  }

  const sessionId =
    body.sessionId && body.sessionId.length <= MAX_SESSION_ID_LEN ? body.sessionId : null;

  const story = await prisma.tourStory.findUnique({
    where: { slug: params.slug },
    select: { id: true, publishedAt: true },
  });
  if (!story) return new NextResponse("Story not found", { status: 404 });
  // On accepte les events meme sur les brouillons : utile si un admin teste
  // une histoire en preview avant publication.

  // Auth optionnelle. Si session NextAuth presente, on lie userId.
  const session = await auth();
  const userId = session?.user?.id ?? null;

  await prisma.storyViewEvent.create({
    data: {
      storyId: story.id,
      kind: body.kind,
      userId,
      sessionId,
    },
  });

  return NextResponse.json({ ok: true });
}
