"use client";

import { FeedPost } from "./FeedPost";
import { PinnedPosts } from "./PinnedPosts";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import type { FeedEvent } from "@/types";

interface Post {
  id: string;
  type: string;
  content: string;
  photoUrl: string | null;
  pinned: boolean;
  createdAt: string | Date;
}

interface FeedListProps {
  initialPosts: Post[];
  liveStageId: string | null;
}

export function FeedList({ initialPosts, liveStageId }: FeedListProps) {
  const { newPosts, connected } = useLiveFeed(liveStageId);

  // Merge new posts from SSE with initial posts
  const livePosts: Post[] = newPosts.map(feedEventToPost);
  const allPosts = [...livePosts, ...initialPosts];

  // Separate pinned
  const pinned = allPosts.filter((p) => p.pinned);
  const unpinned = allPosts.filter((p) => !p.pinned);

  return (
    <div>
      {liveStageId && (
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "animate-pulse bg-red-500" : "bg-gray-400"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {connected ? "Connecté — les posts apparaissent en temps réel" : "Déconnecté"}
          </span>
        </div>
      )}

      <PinnedPosts posts={pinned} />

      <div className="space-y-3">
        {unpinned.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun post pour le moment
          </p>
        ) : (
          unpinned.map((post, i) => (
            <FeedPost
              key={post.id}
              type={post.type}
              content={post.content}
              photoUrl={post.photoUrl}
              pinned={false}
              createdAt={post.createdAt}
              isNew={i < newPosts.length}
            />
          ))
        )}
      </div>
    </div>
  );
}

function feedEventToPost(event: FeedEvent): Post {
  return {
    id: event.id,
    type: event.type,
    content: event.content,
    photoUrl: event.photoUrl,
    pinned: false,
    createdAt: event.createdAt,
  };
}
