"use client";

import { useState } from "react";
import { trackStoryEvent } from "@/lib/stories/tracking";

export function ShareButtons({ slug, url, title }: { slug: string; url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${url}` : url;
  const text = encodeURIComponent(`${title} — ${fullUrl}`);
  const whatsappHref = `https://wa.me/?text=${text}`;

  function trackShare() {
    trackStoryEvent(slug, "share");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackShare();
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-wrap justify-center gap-3">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackShare}
        className="flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        📱 WhatsApp
      </a>
      <button
        onClick={copyLink}
        className="flex items-center gap-2 rounded-full border-2 border-secondary bg-card px-6 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary hover:text-primary"
      >
        🔗 {copied ? "Copié !" : "Copier le lien"}
      </button>
    </div>
  );
}
