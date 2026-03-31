import { APP_CONFIG } from "@/lib/utils/constants";

type SSEClient = ReadableStreamDefaultController;

class SSEManager {
  private clients: Map<string, Set<SSEClient>> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private encoder = new TextEncoder();

  constructor() {
    this.startHeartbeat();
  }

  addClient(stageId: string, controller: SSEClient) {
    if (!this.clients.has(stageId)) {
      this.clients.set(stageId, new Set());
    }
    this.clients.get(stageId)!.add(controller);
  }

  removeClient(stageId: string, controller: SSEClient) {
    const clients = this.clients.get(stageId);
    if (clients) {
      clients.delete(controller);
      if (clients.size === 0) {
        this.clients.delete(stageId);
      }
    }
  }

  broadcast(stageId: string, event: string, data: unknown) {
    const clients = this.clients.get(stageId);
    if (!clients) return;

    const message = this.encoder.encode(
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    );

    for (const controller of clients) {
      try {
        controller.enqueue(message);
      } catch {
        clients.delete(controller);
      }
    }
  }

  getClientCount(stageId?: string): number {
    if (stageId) return this.clients.get(stageId)?.size ?? 0;
    let total = 0;
    for (const clients of this.clients.values()) {
      total += clients.size;
    }
    return total;
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      const ping = this.encoder.encode(`event: ping\ndata: {}\n\n`);
      for (const clients of this.clients.values()) {
        for (const controller of clients) {
          try {
            controller.enqueue(ping);
          } catch {
            clients.delete(controller);
          }
        }
      }
    }, APP_CONFIG.SSE_HEARTBEAT_MS);
  }
}

// Singleton (survives hot-reload in dev)
const globalForSSE = globalThis as unknown as { sseManager: SSEManager };
export const sseManager = globalForSSE.sseManager || new SSEManager();
if (process.env.NODE_ENV !== "production") {
  globalForSSE.sseManager = sseManager;
}
