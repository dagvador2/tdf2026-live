import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import {
  FEATURE_BINGO_ENABLED,
  isBingoAllowedForEmail,
} from "@/features/bingo/flags";
import { getActiveBingoEvent } from "@/features/bingo/lib/event";
import { BingoFeedClient } from "@/features/bingo/components/BingoFeedClient";

export const dynamic = "force-dynamic";

export default async function BingoFeedPage() {
  if (!FEATURE_BINGO_ENABLED) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?callbackUrl=/bingo/feed");
  if (!isBingoAllowedForEmail(session.user.email)) notFound();

  const event = await getActiveBingoEvent();
  if (!event) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-foreground">
        <h1 className="font-display text-3xl">Feed bingo</h1>
        <p className="mt-3 text-muted-foreground">
          Aucun événement bingo actif pour l&apos;instant.
        </p>
      </main>
    );
  }

  const cells = await prisma.bingoGridCell.findMany({
    where: {
      grid: { eventId: event.id },
      validatedAt: { not: null },
    },
    include: {
      grid: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              rider: { select: { firstName: true, photoUrl: true } },
            },
          },
          achievements: {
            select: { type: true, line: true, achievedAt: true },
          },
        },
      },
    },
    orderBy: { validatedAt: "desc" },
    take: 50,
  });

  const initial = cells.map((c) => ({
    id: c.id,
    position: c.position,
    cellText: c.text,
    validatedAt: c.validatedAt!.toISOString(),
    userId: c.grid.userId,
    userName:
      c.grid.user?.rider?.firstName ??
      c.grid.user?.name ??
      "Inconnu",
    userImage:
      c.grid.user?.rider?.photoUrl ?? c.grid.user?.image ?? null,
    achievements: c.grid.achievements
      .filter((a) => {
        if (!c.validatedAt) return false;
        // Show only achievements unlocked at (or just after) this validation —
        // within 5s heuristic. Good enough for the feed.
        return (
          Math.abs(a.achievedAt.getTime() - c.validatedAt.getTime()) < 5000
        );
      })
      .map((a) => ({ type: a.type, line: a.line })),
  }));

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <h1 className="font-display text-2xl uppercase tracking-tight">
        Feed bingo
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Toutes les validations du groupe, en direct.
      </p>
      <BingoFeedClient eventId={event.id} initialItems={initial} />
    </main>
  );
}
