import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { BackLink } from "@/components/ui/back-link";
import { FUN_FACT_KEYS } from "@/lib/constants/fun-facts";
import { B1_TO_FUNFACT } from "@/features/questionnaire/seed/questionnaire-content.seed";
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

  const { rider, userId } = result;
  const funFactsMap = (rider.funFacts as Record<string, string> | null) ?? {};

  // Le questionnaire (bloc 1) écrit dans Rider.funFacts au fil de l'eau, mais
  // rien ne relit dans l'autre sens : si funFacts a été écrasé (ex: ce
  // formulaire enregistré avant que le questionnaire ne soit complété), on
  // retombe sur la réponse du questionnaire pour ne pas re-perdre la donnée
  // au prochain "Enregistrer".
  const questionnaireAnswers = await prisma.questionnaireAnswer.findMany({
    where: { questionnaire: { userId }, block: 1 },
    select: { questionKey: true, answerText: true },
  });
  const answerByB1Key = new Map(questionnaireAnswers.map((a) => [a.questionKey, a.answerText ?? ""]));
  const b1KeyByFunFact = Object.fromEntries(
    Object.entries(B1_TO_FUNFACT).map(([b1Key, ffKey]) => [ffKey, b1Key])
  );

  const funFacts: Record<string, string> = {};
  for (const key of FUN_FACT_KEYS) {
    const b1Key = b1KeyByFunFact[key];
    funFacts[key] = funFactsMap[key] || (b1Key ? answerByB1Key.get(b1Key) ?? "" : "") || "";
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
