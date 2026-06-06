import { notFound } from "next/navigation";
import { sseManager } from "@/lib/sse/manager";
import { auth } from "@/lib/auth/config";
import {
  FEATURE_BINGO_ENABLED,
  isBingoAllowedForEmail,
} from "@/features/bingo/flags";
import { getActiveBingoEvent } from "@/features/bingo/lib/event";
import { bingoChannel } from "@/features/bingo/sse/bingo-events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!FEATURE_BINGO_ENABLED) notFound();

  const session = await auth();
  if (!isBingoAllowedForEmail(session?.user?.email)) notFound();

  const { searchParams } = new URL(request.url);
  let eventId = searchParams.get("eventId");

  if (!eventId) {
    const event = await getActiveBingoEvent();
    if (!event) return new Response("No active bingo event", { status: 404 });
    eventId = event.id;
  }

  const channel = bingoChannel(eventId);
  let controllerRef: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      sseManager.addClient(channel, controller);
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ eventId })}\n\n`
        )
      );
    },
    cancel() {
      if (controllerRef) {
        sseManager.removeClient(channel, controllerRef);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
