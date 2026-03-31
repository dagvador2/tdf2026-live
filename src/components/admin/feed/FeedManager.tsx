"use client";

import { useState } from "react";
import { PostComposer } from "./PostComposer";
import { PostList } from "./PostList";

interface FeedManagerProps {
  stageId: string;
  authorId: string;
}

export function FeedManager({ stageId, authorId }: FeedManagerProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <PostComposer
        stageId={stageId}
        authorId={authorId}
        onPosted={() => setRefreshKey((k) => k + 1)}
      />
      <PostList stageId={stageId} refreshKey={refreshKey} />
    </div>
  );
}
