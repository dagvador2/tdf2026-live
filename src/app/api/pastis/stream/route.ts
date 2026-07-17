import { sseManager } from "@/lib/sse/manager";
import { PASTIS_CHANNEL } from "@/lib/pastis/constants";
import { getPastisData } from "@/lib/pastis/queries";

export const dynamic = "force-dynamic";

/**
 * Flux SSE public du compteur de pastis. À la connexion on envoie le total
 * courant, puis chaque `POST /api/pastis` diffuse un événement `pastis`.
 */
export async function GET() {
  const { total } = await getPastisData();

  let controllerRef: ReadableStreamDefaultController | null = null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      sseManager.addClient(PASTIS_CHANNEL, controller);
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ total })}\n\n`)
      );
    },
    cancel() {
      if (controllerRef) {
        sseManager.removeClient(PASTIS_CHANNEL, controllerRef);
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
