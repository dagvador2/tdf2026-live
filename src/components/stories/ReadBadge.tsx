"use client";

import { Check } from "lucide-react";
import { useReadStories } from "@/hooks/useReadStories";

/**
 * "Lu" badge displayed in the top-right corner of a StoryCard image.
 * Renders nothing until hydrated (avoids SSR/CSR flicker) or if the
 * slug is not yet read.
 */
export function ReadBadge({ slug }: { slug: string }) {
  const { isRead, hydrated } = useReadStories();
  if (!hydrated || !isRead(slug)) return null;
  return (
    <span
      className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-green-600/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md"
      aria-label="Histoire lue"
    >
      <Check className="h-3 w-3" strokeWidth={3} />
      Lu
    </span>
  );
}

/**
 * Same badge but bigger / placed bottom-left on the FeaturedStoryCard
 * (where the "À la une" badge already occupies top-left).
 */
export function ReadBadgeFeatured({ slug }: { slug: string }) {
  const { isRead, hydrated } = useReadStories();
  if (!hydrated || !isRead(slug)) return null;
  return (
    <span
      className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-green-600/95 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-md"
      aria-label="Histoire lue"
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
      Lu
    </span>
  );
}
