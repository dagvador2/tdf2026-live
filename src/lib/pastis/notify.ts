import "server-only";
import { prisma } from "@/lib/db";
import { PASTIS_ADMIN_EMAILS } from "./admin";
import { sendPushToUsers } from "@/lib/push/send";

/**
 * Notifie les « validateurs pastis » (liste blanche) qu'un coureur vient de
 * déclarer un pastis, en joignant le selfie. Ne jette jamais : une notif ratée
 * ne doit pas casser la déclaration.
 */
export async function notifyPastisAdmins(
  riderId: string,
  { photoUrl, caption }: { photoUrl: string | null; caption: string | null }
): Promise<void> {
  try {
    if (PASTIS_ADMIN_EMAILS.length === 0) return;

    const [rider, users] = await Promise.all([
      prisma.rider.findUnique({
        where: { id: riderId },
        select: { firstName: true, nickname: true, team: { select: { name: true } } },
      }),
      prisma.user.findMany({
        where: { email: { in: PASTIS_ADMIN_EMAILS } },
        select: { id: true },
      }),
    ]);

    if (users.length === 0) return;

    const name = rider?.nickname || rider?.firstName || "Un coureur";
    await sendPushToUsers(
      users.map((u) => u.id),
      {
        title: `🥃 ${name} a bu un pastis !`,
        body: caption?.trim() || `${rider?.team.name ?? ""} · appuie pour valider`,
        url: "/mon-espace/apero",
        image: photoUrl ?? undefined,
      }
    );
  } catch (err) {
    console.warn("[pastis] notifyPastisAdmins failed", err);
  }
}
