import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { BackLink } from "@/components/ui/back-link";
import { MaillotsForm } from "./MaillotsForm";
import type { JerseysFormValues } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes maillots — Mon espace" };

export default async function MaillotsPage() {
  const result = await getSessionRider();

  if (result.status === "unauthenticated") redirect("/connexion");
  if (result.status === "admin") redirect("/admin");
  if (result.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <BackLink href="/mon-espace" />
        <p className="text-sm text-muted-foreground">
          Ton compte n&apos;est pas encore lié à un profil coureur.
        </p>
        <Link href="/mon-espace" className="mt-4 inline-block text-sm underline">
          Retour
        </Link>
      </div>
    );
  }

  const { rider } = result;

  const teams = await prisma.team.findMany({
    where: { slug: { not: "sans-equipe" } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, color: true, logoUrl: true },
  });

  const extraJerseys = (rider.extraJerseys as Record<string, number> | null) ?? {};

  const initial: JerseysFormValues = {
    jerseySize: rider.jerseySize ?? "",
    extraJerseys,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <BackLink href="/mon-espace" />
      <h1 className="mb-1 font-display text-3xl uppercase">Mes maillots</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Choisis ta taille et indique si tu veux des maillots additionnels d&apos;autres équipes.
      </p>
      <MaillotsForm initial={initial} teams={teams} ownTeamSlug={rider.team.slug} />
    </div>
  );
}
