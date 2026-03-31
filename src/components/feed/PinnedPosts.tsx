import { FeedPost } from "./FeedPost";

interface Post {
  id: string;
  type: string;
  content: string;
  photoUrl: string | null;
  pinned: boolean;
  createdAt: string | Date;
}

export function PinnedPosts({ posts }: { posts: Post[] }) {
  const pinned = posts.filter((p) => p.pinned);
  if (pinned.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      <h3 className="font-display text-sm uppercase tracking-wide text-muted-foreground">
        Épinglés
      </h3>
      {pinned.map((post) => (
        <FeedPost
          key={post.id}
          type={post.type}
          content={post.content}
          photoUrl={post.photoUrl}
          pinned
          createdAt={post.createdAt}
        />
      ))}
    </div>
  );
}
