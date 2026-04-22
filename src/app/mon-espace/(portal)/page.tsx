import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { computeProfileCompletion } from "@/lib/rider/profile-completion";
import {
  User,
  Calendar,
  Truck,
  Play,
  UserPlus,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MonEspacePage() {
  const result = await getSessionRider();

  if (result.status === "unauthenticated") {
    redirect("/connexion");
  }

  if (result.status === "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Tu es connecté en tant qu&apos;admin.
            </p>
            <Button asChild>
              <Link href="/admin">Aller au back-office</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result.status === "pending") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-primary" />
              <h2 className="font-display text-2xl uppercase">
                Compte en attente
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Bienvenue {result.name ?? result.email} !<br />
              Ton compte a bien été créé. Un admin doit te lier à ton
              profil coureur avant que tu puisses accéder aux étapes et à la
              course.
            </p>
            <p className="text-sm text-muted-foreground">
              Si tu penses que c&apos;est une erreur, envoie-nous ton email
              ({result.email}) pour qu&apos;on fasse le lien manuellement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // status === "rider"
  const { rider } = result;
  const stageEntries = await prisma.stageEntry.findMany({
    where: { riderId: rider.id },
    include: { stage: true },
  });
  const liveStage = await prisma.stage.findFirst({
    where: { status: "live" },
  });
  const isRegisteredOnLive =
    liveStage != null &&
    stageEntries.some((e) => e.stageId === liveStage.id);

  const completion = computeProfileCompletion(rider, stageEntries.length);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase">
          Salut {rider.firstName}
          {rider.nickname && (
            <span className="ml-2 text-muted-foreground">
              ({rider.nickname})
            </span>
          )}
        </h1>
        <p
          className="mt-1 text-sm font-medium"
          style={{ color: rider.team.color }}
        >
          {rider.team.name}
        </p>
      </div>

      {/* Live stage CTA */}
      {liveStage && isRegisteredOnLive && (
        <Card className="mb-6 border-primary bg-primary/10">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase text-primary">Étape en direct</p>
              <p className="font-display text-xl uppercase">
                {liveStage.name}
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/mon-espace/course">
                <Play className="mr-2 h-4 w-4" />
                Lancer
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completion */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg uppercase">
              Complétion du profil
            </h2>
            <span className="font-mono text-2xl font-bold">
              {completion.total}%
            </span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${completion.total}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <CompletionChip label="Profil" value={completion.sections.profile} />
            <CompletionChip label="Sport" value={completion.sections.sport} />
            <CompletionChip label="Fun facts" value={completion.sections.funFacts} />
            <CompletionChip label="Étapes" value={completion.sections.stages} />
            <CompletionChip label="Logistique" value={completion.sections.logistics} />
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <div className="space-y-3">
        <DashboardLink
          href="/mon-espace/profil"
          icon={<User className="h-5 w-5" />}
          title="Mes infos"
          description="Profil, fun facts, poids, FTP"
        />
        <DashboardLink
          href="/mon-espace/etapes"
          icon={<Calendar className="h-5 w-5" />}
          title="Mes étapes"
          description={`${stageEntries.length} participation${stageEntries.length > 1 ? "s" : ""} sur 6`}
        />
        <DashboardLink
          href="/mon-espace/logistique"
          icon={<Truck className="h-5 w-5" />}
          title="Logistique"
          description="Transport, horaires, covoiturage"
        />
      </div>
    </div>
  );
}

function CompletionChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background px-2 py-1 text-center">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono font-bold">{value}%</p>
    </div>
  );
}

function DashboardLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}
