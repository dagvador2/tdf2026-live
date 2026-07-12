import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import {
  FEATURE_BINGO_ENABLED,
  isBingoAllowedForEmail,
} from "@/features/bingo/flags";
import { getActiveBingoEvent } from "@/features/bingo/lib/event";
import { BingoGrid } from "@/features/bingo/components/BingoGrid";
import { RevealGridButton } from "@/features/bingo/components/RevealGridButton";

export const dynamic = "force-dynamic";

export default async function BingoPage() {
  if (!FEATURE_BINGO_ENABLED) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?callbackUrl=/bingo");
  if (!isBingoAllowedForEmail(session.user.email)) notFound();

  const event = await getActiveBingoEvent();
  if (!event) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-foreground">
        <h1 className="font-display text-3xl">Bingo TDF 2026</h1>
        <p className="mt-3 text-muted-foreground">
          Aucun événement bingo actif pour l&apos;instant.
        </p>
      </main>
    );
  }

  const grid = await prisma.bingoGrid.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: session.user.id } },
    include: {
      cells: { orderBy: { position: "asc" } },
      achievements: { select: { type: true, line: true } },
    },
  });

  // La grille peut être pré-générée mais masquée : on ne l'affiche qu'après
  // que le coureur a cliqué « Afficher ma grille » (revealedAt renseigné).
  return (
    <main className="min-h-screen bg-background pb-12 text-foreground">
      <header className="px-4 pt-6">
        <h1 className="font-display text-3xl uppercase tracking-tight">
          Bingo TDF 2026
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Coche tes cases au fil du voyage. Première ligne = bingo.
        </p>
      </header>

      {grid && grid.revealedAt ? (
        <BingoGrid grid={grid} />
      ) : (
        <RevealGridButton />
      )}
    </main>
  );
}
