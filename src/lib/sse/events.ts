export const SSE_EVENTS = {
  POSITIONS: "positions",
  CHECKPOINT: "checkpoint",
  FEED: "feed",
  STAGE_STATUS: "stage_status",
  PING: "ping",
  CONNECTED: "connected",
} as const;

export type SSEEventType = (typeof SSE_EVENTS)[keyof typeof SSE_EVENTS];
