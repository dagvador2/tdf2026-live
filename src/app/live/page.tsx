import { prisma } from "@/lib/db";
import { getTwitchLiveStatus } from "@/lib/twitch/status";
import { LivePlayer } from "@/components/live/LivePlayer";
import { STAGE_TYPE_LABELS } from "@/lib/utils/constants";

export const metadata = {
  title: "Le Direct — TDF 2026",
  description: "Suivez les contre-la-montre du TDF Explorer en direct sur Twitch",
};

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const channel = process.env.NEXT_PUBLIC_TWITCH_CHANNEL ?? "";

  const [status, nextTTStage] = await Promise.all([
    getTwitchLiveStatus(),
    prisma.stage.findFirst({
      where: {
        type: { in: ["team_tt", "individual_tt"] },
        status: { in: ["upcoming", "live", "paused"] },
      },
      orderBy: { date: "asc" },
      select: { name: true, type: true, date: true },
    }),
  ]);

  const nextLive = nextTTStage
    ? {
        label: STAGE_TYPE_LABELS[nextTTStage.type] ?? nextTTStage.name,
        dateLabel: new Intl.DateTimeFormat("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "Europe/Paris",
        }).format(nextTTStage.date),
      }
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 font-display text-4xl uppercase text-secondary md:text-5xl">
        Le Direct
      </h1>
      <p className="mb-6 text-muted-foreground">
        Les contre-la-montre du TDF Explorer, diffusés en direct sur Twitch.
      </p>

      {channel ? (
        <LivePlayer channel={channel} nextLive={nextLive} initialStatus={status} />
      ) : (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
          La chaîne Twitch n&apos;est pas encore configurée.
        </p>
      )}
    </div>
  );
}
