import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { BackLink } from "@/components/ui/back-link";
import { parseLogistics } from "@/lib/rider/logistics";
import { LogisticsForm } from "./LogisticsForm";

export const dynamic = "force-dynamic";

export default async function LogistiquePage() {
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

  const initial = parseLogistics(result.rider.logistics);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <BackLink href="/mon-espace" />
      <h1 className="mb-1 font-display text-3xl uppercase">Logistique</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Infos de transport visibles uniquement par l&apos;admin (organisation
        des transferts et covoiturages).
      </p>
      <LogisticsForm initial={initial} />
    </div>
  );
}
