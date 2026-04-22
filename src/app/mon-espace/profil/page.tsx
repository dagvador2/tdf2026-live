import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { BackLink } from "@/components/ui/back-link";
import { FUN_FACT_KEYS } from "@/lib/constants/fun-facts";
import { ProfileForm } from "./ProfileForm";
import type { ProfileFormValues } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const result = await getSessionRider();

  if (result.status === "unauthenticated") redirect("/connexion");
  if (result.status === "admin") redirect("/admin");
  if (result.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <BackLink href="/mon-espace" />
        <p className="text-sm text-muted-foreground">
          Ton compte n&apos;est pas encore lié à un profil coureur. Reviens plus
          tard ou contacte l&apos;admin.
        </p>
        <Link href="/mon-espace" className="mt-4 inline-block text-sm underline">
          Retour
        </Link>
      </div>
    );
  }

  const { rider } = result;
  const funFactsMap = (rider.funFacts as Record<string, string> | null) ?? {};
  const funFacts: Record<string, string> = {};
  for (const key of FUN_FACT_KEYS) {
    funFacts[key] = funFactsMap[key] ?? "";
  }

  const initial: ProfileFormValues = {
    firstName: rider.firstName,
    nickname: rider.nickname ?? "",
    photoUrl: rider.photoUrl ?? "",
    weightKg: rider.weightKg != null ? String(rider.weightKg) : "",
    ftpWatts: rider.ftpWatts != null ? String(rider.ftpWatts) : "",
    level: rider.level ?? "",
    funFacts,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <BackLink href="/mon-espace" />
      <h1 className="mb-1 font-display text-3xl uppercase">Mes infos</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Remplis tes infos personnelles et tes fun facts.
      </p>
      <ProfileForm initial={initial} />
    </div>
  );
}
