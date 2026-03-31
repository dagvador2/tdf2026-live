import { prisma } from "@/lib/db";
import { StageTimeline } from "@/components/stages/StageTimeline";

export const metadata = {
  title: "Étapes — TDF 2026",
  description: "Programme des 6 étapes du Tour de France amateur 2026",
};

export default async function StagesPage() {
  const stages = await prisma.stage.findMany({
    orderBy: { number: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 font-display text-4xl uppercase text-secondary md:text-5xl">
        Programme des étapes
      </h1>
      <p className="mb-8 text-muted-foreground">
        6 étapes dans les Alpes — du 20 au 25 juillet 2026
      </p>

      <StageTimeline stages={stages} />
    </div>
  );
}
