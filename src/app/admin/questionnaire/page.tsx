import { notFound } from "next/navigation";
import { FEATURE_QUESTIONNAIRE_ENABLED } from "@/features/questionnaire/flags";
import { getAdminQuestionnaireData } from "@/features/questionnaire/lib/admin";
import { KNOWLEDGE_MAX } from "@/features/questionnaire/seed/questionnaire-content.seed";

export const dynamic = "force-dynamic";

export default async function AdminQuestionnairePage() {
  if (!FEATURE_QUESTIONNAIRE_ENABLED) notFound();

  const data = await getAdminQuestionnaireData();
  const pct =
    data.totalParticipants > 0
      ? Math.round((data.completedCount / data.totalParticipants) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl uppercase tracking-wide">
          Questionnaire participants
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complétion, scores de connaissances et agrégat parrainage (source
          anonymisée).
        </p>
      </header>

      {/* Complétion globale */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="font-display text-xl uppercase tracking-wide">
            Taux de complétion
          </h2>
          <span className="font-mono text-2xl">
            {data.completedCount}/{data.totalParticipants}{" "}
            <span className="text-base text-muted-foreground">({pct}%)</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/10">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {data.startedCount} ont commencé.
        </p>
      </section>

      {/* Scores par participant */}
      <section>
        <h2 className="mb-3 font-display text-xl uppercase tracking-wide">
          Scores de connaissances
        </h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Participant</th>
                <th className="px-4 py-2">État</th>
                <th className="px-4 py-2 text-right">Score /{KNOWLEDGE_MAX}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.userId} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{r.firstName}</td>
                  <td className="px-4 py-2">
                    {r.completed ? (
                      <span className="text-[hsl(var(--primary))]">Complété</span>
                    ) : r.started ? (
                      <span className="text-muted-foreground">En cours</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {r.knowledgeScore ?? "—"}
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    Aucun participant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Agrégat bloc 4 par cible (anonymisé) */}
      <section>
        <h2 className="mb-1 font-display text-xl uppercase tracking-wide">
          Parrainage — faits collectés par personne
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Pour piocher les cases bingo nominatives. Les sources ne sont pas
          affichées.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.aggregates
            .filter((a) => a.totalFacts > 0)
            .map((a) => (
              <div
                key={a.userId}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-lg uppercase tracking-wide">
                    {a.firstName}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {a.totalFacts} fait{a.totalFacts > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-3">
                  {a.groups.map((g) => (
                    <div key={g.prompt}>
                      <p className="text-xs font-medium text-muted-foreground">
                        {g.prompt}
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        {g.answers.map((ans, i) => (
                          <li key={i} className="text-sm">
                            {ans}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
        {data.aggregates.every((a) => a.totalFacts === 0) && (
          <p className="text-sm text-muted-foreground">
            Aucun fait de parrainage pour l&apos;instant.
          </p>
        )}
      </section>
    </div>
  );
}
