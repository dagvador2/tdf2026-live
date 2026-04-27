"use client";

import { useEffect } from "react";
import { useReadStories } from "@/hooks/useReadStories";
import { trackStoryEvent } from "@/lib/stories/tracking";

const READ_DWELL_MS = 8000;
const READ_SCROLL_RATIO = 0.5;

/**
 * Mounted on /histoires/[slug]. Marks the story as "read" once one of:
 *   - the visitor has been on the page for READ_DWELL_MS (8s)
 *   - they have scrolled past READ_SCROLL_RATIO (50%) of the article body
 */
export function MarkReadOnView({ slug }: { slug: string }) {
  const { markRead } = useReadStories();

  useEffect(() => {
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      markRead(slug);
      // Server-side analytics : dedupliques cote client (sessionStorage)
      trackStoryEvent(slug, "read");
    };

    const timer = window.setTimeout(fire, READ_DWELL_MS);

    function onScroll() {
      if (done) return;
      const article = document.querySelector<HTMLElement>(".article-body");
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const articleTop = window.scrollY + rect.top;
      const scrolled = window.scrollY - articleTop + window.innerHeight;
      const ratio = scrolled / article.offsetHeight;
      if (ratio > READ_SCROLL_RATIO) fire();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [slug, markRead]);

  return null;
}
