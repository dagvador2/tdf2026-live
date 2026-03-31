import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sseManager } from "@/lib/sse/manager";
import { SSE_EVENTS } from "@/lib/sse/events";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stageId = searchParams.get("stageId");

  const where = stageId ? { stageId } : {};
  const posts = await prisma.livePost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;

  if (action === "create") {
    const { stageId, authorId, type, content, photoUrl } = body;

    const post = await prisma.livePost.create({
      data: {
        stageId,
        authorId,
        type: type ?? "text",
        content,
        photoUrl: photoUrl ?? null,
      },
    });

    // Broadcast via SSE
    sseManager.broadcast(stageId, SSE_EVENTS.FEED, {
      id: post.id,
      type: post.type,
      content: post.content,
      photoUrl: post.photoUrl,
      pinned: post.pinned,
      createdAt: post.createdAt.toISOString(),
    });

    return NextResponse.json({ post }, { status: 201 });
  }

  if (action === "pin") {
    const { postId, pinned } = body;
    const post = await prisma.livePost.update({
      where: { id: postId },
      data: { pinned },
    });
    return NextResponse.json({ post });
  }

  if (action === "delete") {
    const { postId } = body;
    await prisma.livePost.delete({ where: { id: postId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
