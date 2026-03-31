"use client";

import { Badge } from "@/components/ui/badge";
import type { ReplayPost, ReplayTimeRecord } from "@/lib/replay/types";

interface ReplayFeedProps {
  posts: ReplayPost[];
  recentCheckpoints: ReplayTimeRecord[];
}

export function ReplayFeed({ posts, recentCheckpoints }: ReplayFeedProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h3 className="mb-2 font-display text-sm uppercase text-secondary">
        Événements
      </h3>

      {/* Recent checkpoints */}
      {recentCheckpoints.length > 0 && (
        <div className="mb-3 space-y-1">
          {recentCheckpoints.map((cp, i) => (
            <div
              key={`${cp.riderId}-${cp.checkpointName}-${i}`}
              className="flex items-center gap-2 rounded bg-orange-50 px-2 py-1 text-xs animate-in slide-in-from-left-2"
            >
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-[10px]">
                {cp.checkpointType === "col" ? "Col" : "Passage"}
              </Badge>
              <span className="font-medium">{cp.riderName}</span>
              <span className="text-muted-foreground">→ {cp.checkpointName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      <div className="max-h-[200px] space-y-2 overflow-y-auto">
        {posts.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Aucun événement
          </p>
        ) : (
          posts.slice(0, 10).map((post) => (
            <div key={post.id} className="border-b border-border pb-2 last:border-0">
              <p className="text-xs text-foreground">{post.content}</p>
              <span className="text-[10px] text-muted-foreground">
                {new Date(post.createdAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
