import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?next=/mon-espace/notifications");

  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  const initial = {
    stageStart: prefs?.stageStart ?? true,
    newStory: prefs?.newStory ?? true,
    feedHighlights: prefs?.feedHighlights ?? true,
    myResults: prefs?.myResults ?? true,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-wide">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active les notifications push pour rester au courant en direct.
        </p>
      </header>
      <NotificationsClient initial={initial} />
    </div>
  );
}
