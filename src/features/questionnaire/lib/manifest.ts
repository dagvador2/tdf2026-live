import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BLOCK1,
  BLOCK2,
  BLOCK3,
} from "@/features/questionnaire/seed/questionnaire-content.seed";
import { focusFor } from "@/features/questionnaire/lib/photo-focus";
import type {
  Block1View,
  Block2DuelView,
  Block3QView,
} from "@/features/questionnaire/lib/types";

// ── Manifeste images (généré par scripts/normalize-quiz-photos.ts) ──
type QuizManifest = {
  bloc2: Record<string, { a?: string; b?: string }>;
  bloc3: Record<string, string>;
};

let cached: QuizManifest | null = null;

function loadManifest(): QuizManifest {
  if (cached) return cached;
  try {
    const raw = readFileSync(
      join(process.cwd(), "public", "photos-quizz", "manifest.json"),
      "utf-8",
    );
    cached = JSON.parse(raw) as QuizManifest;
  } catch {
    // Pas de manifeste (ex: photos pas encore normalisées) → fallback emojis partout
    cached = { bloc2: {}, bloc3: {} };
  }
  return cached;
}

// ── View-models sérialisables passés aux composants client ──
// Aucune réponse correcte (bloc 3) n'est exposée au client.

export function getBlock1View(): Block1View[] {
  return BLOCK1;
}

/** Photo de Pogačar à l'attaque (duel 1, option A) pour le popup d'incitation. */
export function getPromptImageUrl(): string | null {
  return loadManifest().bloc2["1"]?.a ?? null;
}

export function getBlock2View(): Block2DuelView[] {
  const m = loadManifest();
  return BLOCK2.map((d) => {
    const imgs = d.n != null ? m.bloc2[String(d.n)] : undefined;
    const a = focusFor(`b2_${d.n}_a`);
    const b = focusFor(`b2_${d.n}_b`);
    return {
      key: d.key,
      layout: d.layout ?? "portrait",
      optionA: {
        text: d.optionA,
        image: imgs?.a ?? null,
        position: a.position,
        fit: a.fit,
      },
      optionB: {
        text: d.optionB,
        image: imgs?.b ?? null,
        position: b.position,
        fit: b.fit,
      },
    };
  });
}

export function getBlock3View(): Block3QView[] {
  const m = loadManifest();
  return BLOCK3.map((q) => {
    const f = focusFor(`b3_${q.n}`);
    return {
      key: q.key,
      prompt: q.prompt,
      optionA: q.optionA,
      optionB: q.optionB,
      image: m.bloc3[String(q.n)] ?? null,
      position: f.position,
      fit: f.fit,
    };
  });
}
