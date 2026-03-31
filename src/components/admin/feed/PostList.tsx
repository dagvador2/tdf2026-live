"use client";

import { useCallback, useEffect, useState } from "react";

interface Post {
  id: string;
  type: string;
  content: string;
  photoUrl: string | null;
  pinned: boolean;
  createdAt: string;
}

interface PostListProps {
  stageId: string;
  refreshKey: number;
}

export function PostList({ stageId, refreshKey }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/feed?stageId=${stageId}`);
      const data = await res.json();
      setPosts(data.posts);
    } finally {
      setLoading(false);
    }
  }, [stageId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, refreshKey]);

  async function handlePin(postId: string, pinned: boolean) {
    await fetch("/api/admin/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pin", postId, pinned }),
    });
    fetchPosts();
  }

  async function handleDelete(postId: string) {
    if (!confirm("Supprimer ce post ?")) return;
    await fetch("/api/admin/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", postId }),
    });
    fetchPosts();
  }

  if (loading) {
    return <p className="py-4 text-center text-gray-500">Chargement...</p>;
  }

  if (posts.length === 0) {
    return (
      <p className="py-8 text-center text-gray-400">Aucun post pour le moment</p>
    );
  }

  const TYPE_LABELS: Record<string, string> = {
    text: "Texte",
    photo: "Photo",
    result: "Résultat",
    highlight: "Moment fort",
  };

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className={`rounded-lg border p-4 ${
            post.pinned ? "border-[#F2C200] bg-yellow-50" : "bg-white"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {TYPE_LABELS[post.type] ?? post.type}
                </span>
                {post.pinned && (
                  <span className="text-xs font-medium text-[#F2C200]">
                    Épinglé
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(post.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
              <p className="text-sm">{post.content}</p>
              {post.photoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={post.photoUrl}
                  alt=""
                  className="mt-2 h-32 rounded object-cover"
                />
              )}
            </div>

            <div className="ml-4 flex gap-2">
              <button
                onClick={() => handlePin(post.id, !post.pinned)}
                className="text-xs text-gray-500 hover:text-[#F2C200]"
              >
                {post.pinned ? "Désépingler" : "Épingler"}
              </button>
              <button
                onClick={() => handleDelete(post.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
