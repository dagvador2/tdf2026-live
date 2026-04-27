"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function StoryRowActions({
  storyId,
  title,
  isPublished,
}: {
  storyId: string;
  title: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (!confirm(`Publier "${title}" maintenant ?\nUn push sera envoyé à tous les abonnés.`)) return;
    setError(null);
    const res = await fetch(`/api/admin/histoires/${storyId}/publish`, { method: "POST" });
    if (!res.ok) {
      setError(await res.text().catch(() => "Erreur"));
      return;
    }
    startTransition(() => router.refresh());
  }

  async function unpublish() {
    if (!confirm(`Dépublier "${title}" ?`)) return;
    setError(null);
    const res = await fetch(`/api/admin/histoires/${storyId}/unpublish`, { method: "POST" });
    if (!res.ok) {
      setError(await res.text().catch(() => "Erreur"));
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      {!isPublished ? (
        <button
          onClick={publish}
          disabled={pending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "..." : "Publier"}
        </button>
      ) : (
        <button
          onClick={unpublish}
          disabled={pending}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {pending ? "..." : "Dépublier"}
        </button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
