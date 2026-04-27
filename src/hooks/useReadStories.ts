"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tdf2026-read-stories";

/**
 * Tracks which stories the current visitor has read (browser-local).
 *
 * Stored client-side only. Anonymous visitors (no account needed) get
 * tracking too. A future iteration could sync to the server for logged-in
 * users, but that's not needed for V1.
 */
export function useReadStories() {
  const [read, setRead] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setRead(new Set(arr));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Sync across tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const arr = JSON.parse(e.newValue);
        if (Array.isArray(arr)) setRead(new Set(arr));
      } catch {
        // ignore
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const markRead = useCallback((slug: string) => {
    setRead((prev) => {
      if (prev.has(slug)) return prev;
      const next = new Set(prev);
      next.add(slug);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const unmarkRead = useCallback((slug: string) => {
    setRead((prev) => {
      if (!prev.has(slug)) return prev;
      const next = new Set(prev);
      next.delete(slug);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRead(new Set());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    read,
    hydrated,
    isRead: (slug: string) => read.has(slug),
    markRead,
    unmarkRead,
    clearAll,
    count: read.size,
  };
}
