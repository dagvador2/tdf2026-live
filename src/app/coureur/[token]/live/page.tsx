import { verifyRiderJWT } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";
import { RiderDashboard } from "@/components/live/RiderDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mode Course — TDF 2026",
  themeColor: "#0D0D0D",
};

export default async function RiderLivePage({
  params,
}: {
  params: { token: string };
}) {
  const result = await verifyRiderJWT(params.token);

  if ("error" in result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0D0D0D]">
        <p className="text-lg text-red-400">
          {result.error === "expired" ? "Lien expiré" : "Lien invalide"}
        </p>
      </main>
    );
  }

  const rider = await prisma.rider.findUnique({
    where: { id: result.riderId },
    include: { team: true },
  });

  if (!rider) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0D0D0D]">
        <p className="text-lg text-red-400">Coureur introuvable</p>
      </main>
    );
  }

  // Find the current live stage (or the next upcoming one)
  const liveStage = await prisma.stage.findFirst({
    where: { status: "live" },
    include: {
      checkpoints: { orderBy: { order: "asc" } },
    },
  });

  if (!liveStage) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D0D] text-white">
        <h1 className="font-mono text-2xl font-bold text-[#F2C200]">
          Pas d&apos;étape en cours
        </h1>
        <p className="mt-2 text-gray-400">
          Le mode course s&apos;activera au démarrage de l&apos;étape.
        </p>
      </main>
    );
  }

  // Generate a fresh JWT for the GPS API calls
  const { signRiderJWT } = await import("@/lib/auth/jwt");
  const apiToken = await signRiderJWT(rider.id);

  return (
    <RiderDashboard
      riderId={rider.id}
      riderName={rider.firstName}
      teamColor={rider.team.color}
      token={apiToken}
      stageId={liveStage.id}
      stageName={`Étape ${liveStage.number} — ${liveStage.name}`}
      totalDistanceKm={liveStage.distanceKm}
      checkpoints={liveStage.checkpoints.map((cp) => ({
        name: cp.name,
        type: cp.type,
        kmFromStart: cp.kmFromStart,
      }))}
    />
  );
}
