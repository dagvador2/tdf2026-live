import { redirect } from "next/navigation";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { prisma } from "@/lib/db";
import { signRiderJWT } from "@/lib/auth/jwt";
import { RiderLiveClient } from "@/components/coureur/RiderLiveClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mode Course — TDF 2026",
  themeColor: "#0D0D0D",
};

export const dynamic = "force-dynamic";

export default async function CoursePage() {
  const result = await getSessionRider();

  if (result.status === "unauthenticated") redirect("/connexion?next=/mon-espace/course");
  if (result.status === "admin") redirect("/admin");
  if (result.status === "pending") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0D0D0D] px-6 text-center text-white">
        <div>
          <p className="text-lg text-red-400">Compte non lié à un coureur</p>
          <p className="mt-2 text-sm text-gray-400">
            L&apos;admin doit d&apos;abord lier ton compte à un profil coureur.
          </p>
        </div>
      </main>
    );
  }

  const { rider } = result;
  const stage = await prisma.stage.findFirst({
    where: { status: { in: ["live", "upcoming"] } },
    orderBy: { number: "asc" },
    include: {
      checkpoints: { orderBy: { order: "asc" } },
    },
  });

  // Le client RiderLiveClient utilise le JWT pour envoyer les batches GPS.
  // On signe un token frais à partir de la session.
  // (L'API /api/gps/batch accepte aussi la session Auth.js en fallback.)
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
