"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/features/questionnaire/components/ProgressBar";
import { Block1Step } from "@/features/questionnaire/components/Block1Step";
import { Block2Step } from "@/features/questionnaire/components/Block2Step";
import { Block3Step } from "@/features/questionnaire/components/Block3Step";
import { Block4Picker } from "@/features/questionnaire/components/Block4Picker";
import { Block4PersonStep } from "@/features/questionnaire/components/Block4PersonStep";
import { FinalScreen } from "@/features/questionnaire/components/FinalScreen";
import { saveAnswer } from "@/features/questionnaire/actions/save-answer";
import {
  saveSponsorFact,
  saveSponsorFacts,
  saveSponsorTargets,
} from "@/features/questionnaire/actions/save-sponsor";
import { completeQuestionnaire } from "@/features/questionnaire/actions/complete";
import { useKeyboardInset } from "@/features/questionnaire/lib/useKeyboardInset";
import type {
  Block1View,
  Block2DuelView,
  Block3QView,
  Participant,
  WizardInitialState,
} from "@/features/questionnaire/lib/types";

type Choice = "A" | "B";
type Answer = { text: string | null; choice: Choice | null };

type Step =
  | { kind: "b1"; idx: number }
  | { kind: "b2"; idx: number }
  | { kind: "b3"; idx: number }
  | { kind: "b4picker" }
  | { kind: "b4person"; targetUserId: string }
  | { kind: "final" };

export function QuestionnaireWizard({
  block1,
  block2,
  block3,
  participants,
  initial,
  userId,
}: {
  block1: Block1View[];
  block2: Block2DuelView[];
  block3: Block3QView[];
  participants: Participant[];
  initial: WizardInitialState;
  userId: string;
}) {
  const participantById = useMemo(
    () => new Map(participants.map((p) => [p.userId, p])),
    [participants],
  );

  // Remonte le pied de page au-dessus du clavier virtuel (iOS/Android).
  const keyboardInset = useKeyboardInset();

  // ── State seedé depuis la reprise ──
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => {
    const m: Record<string, Answer> = {};
    for (const a of initial.answers) {
      m[a.questionKey] = {
        text: a.answerText,
        choice: a.answerChoice === "A" || a.answerChoice === "B" ? a.answerChoice : null,
      };
    }
    return m;
  });
  const [selection, setSelection] = useState<string[]>(() =>
    initial.sponsorBlocks
      .map((b) => b.targetUserId)
      .filter((id) => participantById.has(id))
      .slice(0, 4),
  );
  const [facts, setFacts] = useState<Record<string, Record<string, string>>>(() => {
    const m: Record<string, Record<string, string>> = {};
    for (const b of initial.sponsorBlocks) {
      m[b.targetUserId] = {};
      for (const f of b.facts) m[b.targetUserId][f.questionKey] = f.answerText ?? "";
    }
    return m;
  });
  const [knowledgeScore, setKnowledgeScore] = useState<number | null>(
    initial.knowledgeScore,
  );

  // ── Construction des étapes (dépend de la sélection bloc 4) ──
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = [];
    block1.forEach((_, idx) => s.push({ kind: "b1", idx }));
    block2.forEach((_, idx) => s.push({ kind: "b2", idx }));
    block3.forEach((_, idx) => s.push({ kind: "b3", idx }));
    s.push({ kind: "b4picker" });
    selection.forEach((targetUserId) => s.push({ kind: "b4person", targetUserId }));
    s.push({ kind: "final" });
    return s;
  }, [block1, block2, block3, selection]);

  // ── Point de reprise (calculé synchroniquement, sans flash) ──
  const [index, setIndex] = useState<number>(() => {
    if (initial.completed) return steps.length - 1;
    const isDone = (st: Step): boolean => {
      switch (st.kind) {
        case "b1":
          return !!answers[block1[st.idx].key]?.text?.trim();
        case "b2":
          return !!answers[block2[st.idx].key]?.choice;
        case "b3":
          return !!answers[block3[st.idx].key]?.choice;
        case "b4picker":
          return selection.length >= 1;
        case "b4person":
          return Object.values(facts[st.targetUserId] ?? {}).some((v) =>
            v.trim(),
          );
        case "final":
          return false;
      }
    };
    const firstIncomplete = steps.findIndex((st) => !isDone(st));
    return firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;
  });

  const step = steps[Math.min(index, steps.length - 1)];

  // ── Progression segmentée (basée sur la POSITION, pas le nb de réponses) ──
  const segments = useMemo(() => {
    const n1 = block1.length;
    const n2 = block2.length;
    const n3 = block3.length;
    const n4 = 1 + selection.length; // picker + écrans personnes
    const done = step.kind === "final";
    return [
      {
        label: "Portrait",
        fill: done ? 1 : (index - 0) / n1,
        active: step.kind === "b1",
      },
      {
        label: "Duels",
        fill: done ? 1 : (index - n1) / n2,
        active: step.kind === "b2",
      },
      {
        label: "Quiz",
        fill: done ? 1 : (index - (n1 + n2)) / n3,
        active: step.kind === "b3",
      },
      {
        label: "Parrainage",
        fill: done ? 1 : (index - (n1 + n2 + n3)) / n4,
        active: step.kind === "b4picker" || step.kind === "b4person",
      },
    ];
  }, [index, step.kind, block1.length, block2.length, block3.length, selection.length]);

  // ── Navigation ──
  const goNext = useCallback(
    () => setIndex((i) => Math.min(i + 1, steps.length - 1)),
    [steps.length],
  );
  const goBack = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const [navBusy, setNavBusy] = useState(false);
  const [sponsorError, setSponsorError] = useState<string | null>(null);

  /**
   * Quitte la fiche d'une personne en sauvegardant TOUS ses champs de manière
   * fiable (attendue) avant de naviguer — évite de perdre du texte.
   */
  const leaveCurrentStep = useCallback(async () => {
    if (step.kind === "b4person") {
      const res = await saveSponsorFacts(
        step.targetUserId,
        facts[step.targetUserId] ?? {},
      );
      if (!res.ok) {
        setSponsorError(res.error);
        return false;
      }
    }
    setSponsorError(null);
    return true;
  }, [step, facts]);

  const handleNext = useCallback(async () => {
    if (navBusy) return;
    setNavBusy(true);
    const ok = await leaveCurrentStep();
    setNavBusy(false);
    if (ok) goNext();
  }, [navBusy, leaveCurrentStep, goNext]);

  const handleBack = useCallback(async () => {
    if (navBusy) return;
    setNavBusy(true);
    await leaveCurrentStep();
    setNavBusy(false);
    goBack();
  }, [navBusy, leaveCurrentStep, goBack]);

  // ── Persistance ──
  const setText = (key: string, text: string) =>
    setAnswers((a) => ({ ...a, [key]: { text, choice: a[key]?.choice ?? null } }));

  const commitText = (key: string, block: number) => {
    const text = answers[key]?.text ?? "";
    void saveAnswer({ block, questionKey: key, answerText: text });
  };

  const chooseText = (key: string, block: number, text: string) => {
    setText(key, text);
    void saveAnswer({ block, questionKey: key, answerText: text });
    goNext();
  };

  const chooseB2 = (key: string, choice: Choice) => {
    setAnswers((a) => ({ ...a, [key]: { text: a[key]?.text ?? null, choice } }));
    void saveAnswer({ block: 2, questionKey: key, answerChoice: choice });
    goNext();
  };

  const chooseB3 = (key: string, choice: Choice) => {
    setAnswers((a) => ({ ...a, [key]: { text: a[key]?.text ?? null, choice } }));
    // isCorrect calculé serveur (pour l'admin) mais jamais montré au participant.
    void saveAnswer({ block: 3, questionKey: key, answerChoice: choice });
    goNext();
  };

  const toggleSponsor = (userId: string) =>
    setSelection((sel) =>
      sel.includes(userId)
        ? sel.filter((id) => id !== userId)
        : sel.length >= 4
          ? sel
          : [...sel, userId],
    );

  const confirmSponsors = async () => {
    if (navBusy) return;
    setNavBusy(true);
    setSponsorError(null);
    const res = await saveSponsorTargets(selection);
    setNavBusy(false);
    if (res.ok) goNext();
    else setSponsorError(res.error);
  };

  const setFact = (targetUserId: string, key: string, text: string) =>
    setFacts((f) => ({
      ...f,
      [targetUserId]: { ...(f[targetUserId] ?? {}), [key]: text },
    }));

  const commitFact = (targetUserId: string, key: string) => {
    const text = facts[targetUserId]?.[key] ?? "";
    void saveSponsorFact({ targetUserId, questionKey: key, answerText: text });
  };

  // ── Persistance locale anti-perte (changement d'app / reload) ──
  const draftKey = `questionnaire-draft-${userId}`;
  const stepRef = useRef(step);
  stepRef.current = step;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const factsRef = useRef(facts);
  factsRef.current = facts;

  // 1) Restaure le brouillon local AVANT le 1er write (ordre des effets).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        answers?: Record<string, Answer>;
        facts?: Record<string, Record<string, string>>;
        selection?: string[];
      };
      if (d.answers) setAnswers((a) => ({ ...a, ...d.answers }));
      if (d.facts)
        setFacts((f) => {
          const next = { ...f };
          for (const uid of Object.keys(d.facts!))
            next[uid] = { ...(f[uid] ?? {}), ...d.facts![uid] };
          return next;
        });
      if (d.selection?.length)
        setSelection((s) =>
          Array.from(new Set([...s, ...d.selection!])).slice(0, 4),
        );
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Écrit le brouillon à chaque changement (frappe comprise, instantané).
  useEffect(() => {
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ answers, facts, selection }),
      );
    } catch {
      /* ignore */
    }
  }, [answers, facts, selection, draftKey]);

  // 3) Flush serveur quand l'app passe en arrière-plan (best effort).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      const st = stepRef.current;
      if (st.kind === "b1") {
        const q = block1[st.idx];
        if (q.type === "free")
          void saveAnswer({
            block: 1,
            questionKey: q.key,
            answerText: answersRef.current[q.key]?.text ?? "",
          });
      } else if (st.kind === "b4person") {
        void saveSponsorFacts(
          st.targetUserId,
          factsRef.current[st.targetUserId] ?? {},
        );
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [block1]);

  // ── Complétion à l'arrivée sur l'écran final ──
  useEffect(() => {
    if (step.kind === "final" && !initial.completed && knowledgeScore === null) {
      void completeQuestionnaire().then((r) => {
        if (r.ok) setKnowledgeScore(r.knowledgeScore);
      });
    }
    if (step.kind === "final") {
      try {
        localStorage.removeItem(draftKey); // questionnaire terminé → brouillon obsolète
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  // ── Rendu du contenu de l'étape ──
  const content = (() => {
    switch (step.kind) {
      case "b1": {
        const q = block1[step.idx];
        return (
          <Block1Step
            q={q}
            value={answers[q.key]?.text ?? ""}
            participants={participants}
            onChangeText={(t) => setText(q.key, t)}
            onCommitText={() => commitText(q.key, 1)}
            onChoose={(t) => chooseText(q.key, 1, t)}
            onEnter={() => {
              commitText(q.key, 1);
              goNext();
            }}
          />
        );
      }
      case "b2": {
        const d = block2[step.idx];
        return (
          <Block2Step
            duel={d}
            value={answers[d.key]?.choice ?? null}
            onSelect={(c) => chooseB2(d.key, c)}
          />
        );
      }
      case "b3": {
        const q = block3[step.idx];
        return (
          <Block3Step
            q={q}
            value={answers[q.key]?.choice ?? null}
            onSelect={(c) => chooseB3(q.key, c)}
          />
        );
      }
      case "b4picker":
        return (
          <Block4Picker
            participants={participants}
            selectedIds={selection}
            onToggle={toggleSponsor}
          />
        );
      case "b4person": {
        const target = participantById.get(step.targetUserId);
        if (!target) return null;
        return (
          <Block4PersonStep
            target={target}
            facts={facts[step.targetUserId] ?? {}}
            onChangeFact={(k, t) => setFact(step.targetUserId, k, t)}
            onCommitFact={(k) => commitFact(step.targetUserId, k)}
          />
        );
      }
      case "final":
        return <FinalScreen />;
    }
  })();

  // ── Footer (navigation) ──
  const isFinal = step.kind === "final";
  const showNext = step.kind === "b1" || step.kind === "b4person";
  const isPicker = step.kind === "b4picker";

  return (
    <div
      style={{ height: `calc(100dvh - 8.5rem - ${keyboardInset}px)` }}
      className="mx-auto flex w-full max-w-md flex-col bg-background"
    >
      {!isFinal && (
        <header className="shrink-0 px-4 pt-5">
          <ProgressBar segments={segments} />
        </header>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div
          key={index}
          className="h-full animate-in fade-in slide-in-from-right-3 duration-200"
        >
          {content}
        </div>
      </main>

      <footer className="shrink-0 px-4 pb-7 pt-2">
        {sponsorError && (
          <p className="mb-2 text-center text-sm text-destructive">
            {sponsorError} — réessaie.
          </p>
        )}
        {isFinal ? (
          <Button asChild className="h-12 w-full text-base">
            <Link href="/mon-espace">Retour à mon espace</Link>
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            {index > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={navBusy}
                className="h-12 flex-1 text-base"
              >
                Retour
              </Button>
            )}
            {isPicker ? (
              <Button
                onClick={confirmSponsors}
                disabled={selection.length < 1 || navBusy}
                className="h-12 flex-[2] text-base"
              >
                {navBusy ? "..." : "Continuer"}
              </Button>
            ) : showNext ? (
              <Button
                onClick={handleNext}
                disabled={navBusy}
                className="h-12 flex-[2] text-base"
              >
                {navBusy ? "..." : "Suivant"}
              </Button>
            ) : null}
          </div>
        )}
      </footer>
    </div>
  );
}
