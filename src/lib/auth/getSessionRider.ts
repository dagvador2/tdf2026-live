import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import type { Rider } from "@prisma/client";

export type SessionRiderResult =
  | { status: "unauthenticated" }
  | { status: "pending"; userId: string; email: string | null; name: string | null }
  | { status: "rider"; userId: string; rider: Rider & { team: { id: string; name: string; color: string; slug: string } } }
  | { status: "admin"; userId: string };

/**
 * Récupère le Rider lié à la session courante, ou un statut explicite
 * (unauthenticated / pending / admin).
 *
 * Why: centraliser la logique de lookup pour éviter de la dupliquer dans
 * chaque page /mon-espace et API route.
 */
export async function getSessionRider(): Promise<SessionRiderResult> {
  const session = await auth();

  if (!session?.user) {
    return { status: "unauthenticated" };
  }

  if (session.user.role === "admin") {
    return { status: "admin", userId: session.user.id };
  }

  if (session.user.role === "rider" && session.user.riderId) {
    const rider = await prisma.rider.findUnique({
      where: { id: session.user.riderId },
      include: { team: true },
    });
    if (rider) {
      return { status: "rider", userId: session.user.id, rider };
    }
  }

  // Role = pending (ou rider sans rider trouvé)
  return {
    status: "pending",
    userId: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}
