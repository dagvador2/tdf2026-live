"use client";

import { useEffect, useState } from "react";
import { BingoAchievementType } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SSE_EVENT_TYPES } from "@/features/bingo/lib/constants";
import { formatRelativeFR } from "@/features/bingo/lib/format";

type FeedAchievement = {
  type: BingoAchievementType | string;
  line: string;
};

export type FeedItem = {
  id: string;
  position: number;
  cellText: string;
  validatedAt: string;
  userId: string;
  userName: string;
  userImage: string | null;
  achievements: FeedAchievement[];
};

type Props = {
  eventId: string;
  initialItems: FeedItem[];
};

type SSEValidated = {
  userId: string;
  userName: string | null;
  cellId: string;
  position: number;
  cellText: string;
  achievements: FeedAchievement[];
  validatedAt: string;
};

type SSEUnvalidated = {
  userId: string;
  cellId: string;
  position: number;
};

export function BingoFeedClient({ eventId, initialItems }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);

  useEffect(() => {
    const url = `/api/bingo/stream?eventId=${encodeURIComponent(eventId)}`;
    const es = new EventSource(url);

    es.addEventListener(SSE_EVENT_TYPES.VALIDATED, (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as SSEValidated;
        setItems((prev) => {
          const next: FeedItem = {
            id: data.cellId,
            position: data.position,
            cellText: data.cellText,
            validatedAt: data.validatedAt,
            userId: data.userId,
            userName: data.userName ?? "Inconnu",
            userImage: null,
            achievements: data.achievements,
          };
          return [next, ...prev.filter((it) => it.id !== data.cellId)].slice(
            0,
            50
          );
        });
      } catch (err) {
        console.warn("[bingo] bad validated event", err);
      }
    });

    es.addEventListener(SSE_EVENT_TYPES.UNVALIDATED, (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as SSEUnvalidated;
        setItems((prev) => prev.filter((it) => it.id !== data.cellId));
      } catch (err) {
        console.warn("[bingo] bad unvalidated event", err);
      }
    });

    es.onerror = () => {
      // EventSource auto-reconnects. We don't tear down here.
    };

    return () => es.close();
  }, [eventId]);

  if (items.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Personne n&apos;a encore validé de case. Soyez le premier !
      </p>
    );
  }

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {items.map((it) => (
        <li
          key={it.id}
          className="flex items-center gap-3 rounded-lg border border-secondary/10 bg-card p-3 text-sm"
        >
          <Avatar className="h-8 w-8 shrink-0">
            {it.userImage ? <AvatarImage src={it.userImage} alt={it.userName} /> : null}
            <AvatarFallback>{it.userName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-secondary">{it.userName}</span>
              {it.achievements.length > 0 ? (
                <span className="rounded-full bg-primary px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wide text-primary-foreground">
                  {it.achievements.some((a) => a.line === "FULL")
                    ? "Full house"
                    : "Bingo"}
                </span>
              ) : null}
            </div>
            <p className="truncate text-secondary/80">&laquo; {it.cellText} &raquo;</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeFR(new Date(it.validatedAt))}
          </span>
        </li>
      ))}
    </ul>
  );
}
