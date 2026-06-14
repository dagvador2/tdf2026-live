"use client";

import { Block1Step } from "@/features/questionnaire/components/Block1Step";
import { Block2Step } from "@/features/questionnaire/components/Block2Step";
import { Block3Step } from "@/features/questionnaire/components/Block3Step";
import type {
  Block1View,
  Block2DuelView,
  Block3QView,
} from "@/features/questionnaire/lib/types";

function base(url: string | null): string {
  if (!url) return "—";
  return url.split("/").pop() ?? url;
}

/** Contact-sheet dev-only : rend toutes les vignettes aux vraies dimensions. */
export function PreviewSheet({
  block1 = [],
  block2,
  block3,
}: {
  block1?: Block1View[];
  block2: Block2DuelView[];
  block3: Block3QView[];
}) {
  return (
    <div className="mx-auto w-[390px] space-y-8 px-3 py-6">
      {block1.map((q) => (
        <section key={q.key} data-shot={`b1-${q.key}`}>
          <p className="mb-1 font-mono text-xs text-muted-foreground">{q.key}</p>
          <Block1Step
            q={q}
            value={q.key === "b1_region" ? "Autre pays" : ""}
            participants={[]}
            onChangeText={() => {}}
            onCommitText={() => {}}
            onChoose={() => {}}
            onEnter={() => {}}
          />
        </section>
      ))}
      <h1 className="font-display text-2xl uppercase">Preview duels</h1>
      {block2.map((d) => (
        <section key={d.key} data-shot={`duel-${d.key}`}>
          <p className="mb-1 font-mono text-xs text-muted-foreground">
            {d.key} — A:{base(d.optionA.image)} ({d.optionA.position}) · B:
            {base(d.optionB.image)} ({d.optionB.position})
          </p>
          <div className="h-[548px] w-full">
            <Block2Step duel={d} value={null} onSelect={() => {}} />
          </div>
        </section>
      ))}

      <h1 className="font-display text-2xl uppercase">Preview quiz</h1>
      {block3.map((q) => (
        <section key={q.key} data-shot={`quiz-${q.key}`}>
          <p className="mb-1 font-mono text-xs text-muted-foreground">
            {q.key} — {base(q.image)} ({q.position})
          </p>
          <Block3Step q={q} value={null} onSelect={() => {}} />
        </section>
      ))}
    </div>
  );
}
