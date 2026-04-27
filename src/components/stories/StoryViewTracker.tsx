"use client";

import { useEffect } from "react";
import { trackStoryEvent } from "@/lib/stories/tracking";

/**
 * Mounted on /histoires/[slug]. Fires a "view" event once per browser
 * session for the given slug. The dedup is handled inside trackStoryEvent.
 */
export function StoryViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackStoryEvent(slug, "view");
  }, [slug]);
  return null;
}
