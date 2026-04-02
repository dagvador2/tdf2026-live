import { verifyRiderJWT } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";
import { RiderLiveClient } from "@/components/coureur/RiderLiveClient";
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

  // Find a live or upcoming stage
  const stage = await prisma.stage.findFirst({
    where: { status: { in: ["live", "upcoming"] } },
    orderBy: { number: "asc" },
    include: {
      checkpoints: { orderBy: { order: "asc" } },
    },
  });

  // Generate a fresh JWT for the GPS API calls
  const { signRiderJWT } = await import("@/lib/auth/jwt");
  const apiToken = await signRiderJWT(rider.id);

  return (
    <RiderLiveClient
      riderId={rider.id}
      riderName={rider.firstName}
      teamColor={rider.team.color}
      token={apiToken}
      stage={
        stage
          ? {
              id: stage.id,
              number: stage.number,
              name: stage.name,
              status: stage.status,
              distanceKm: stage.distanceKm,
              gpxUrl: stage.gpxUrl,
              checkpoints: stage.checkpoints.map((cp) => ({
                name: cp.name,
                type: cp.type,
                kmFromStart: cp.kmFromStart,
              })),
              checkpointsWithCoords: stage.checkpoints.map((cp) => ({
                lat: cp.latitude,
                lng: cp.longitude,
                name: cp.name,
                type: cp.type,
                kmFromStart: cp.kmFromStart,
              })),
            }
          : null
      }
    />
  );
}
