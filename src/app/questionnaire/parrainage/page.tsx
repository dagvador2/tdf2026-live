import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { FEATURE_QUESTIONNAIRE_ENABLED } from "@/features/questionnaire/flags";
import {
  getParticipants,
  getQuestionnaireState,
} from "@/features/questionnaire/lib/data";
import { getOrCreateQuestionnaire } from "@/features/questionnaire/actions/_shared";
import { ParrainageEditor } from "@/features/questionnaire/components/ParrainageEditor";

export const dynamic = "force-dynamic";

export default async function ParrainagePage() {
  if (!FEATURE_QUESTIONNAIRE_ENABLED) notFound();

  const session = await auth();
  if (!session?.user?.id)
    redirect("/connexion?callbackUrl=/questionnaire/parrainage");

  await getOrCreateQuestionnaire(session.user.id);

  const [participants, state] = await Promise.all([
    getParticipants(session.user.id),
    getQuestionnaireState(session.user.id),
  ]);

  const initialFacts: Record<string, Record<string, string>> = {};
  for (const b of state?.sponsorings ?? []) {
    initialFacts[b.targetUserId] = {};
    for (const f of b.facts) {
      if (f.answerText) initialFacts[b.targetUserId][f.questionKey] = f.answerText;
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <header className="mb-5">
        <Link
          href="/mon-espace"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Mon espace
        </Link>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-secondary">
          Parrainage 🎤
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Balance des anecdotes sur qui tu veux, quand tu veux. Clique sur une
          personne, écris, puis <strong>Enregistrer</strong>. Tu peux revenir en
          ajouter à tout moment.
        </p>
      </header>

      <ParrainageEditor participants={participants} initialFacts={initialFacts} />
    </main>
  );
}
