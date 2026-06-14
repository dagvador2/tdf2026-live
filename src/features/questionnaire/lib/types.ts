// View-models sérialisables partagés serveur ↔ client (aucun import server-only).
import type { Block1Q } from "@/features/questionnaire/seed/questionnaire-content.seed";

export type Block1View = Block1Q;

export type Fit = "cover" | "contain";

export type DuelImage = {
  text: string;
  image: string | null;
  position: string;
  fit: Fit;
};

export type Block2DuelView = {
  key: string;
  layout: "portrait" | "landscape"; // portrait = split gauche/droite, landscape = haut/bas
  optionA: DuelImage;
  optionB: DuelImage;
};

export type Block3QView = {
  key: string;
  prompt: string;
  optionA: string;
  optionB: string;
  image: string | null; // null → fallback emoji ⚙️
  position: string; // object-position de l'image
  fit: Fit;
};

export type Participant = {
  userId: string;
  firstName: string;
  photoUrl: string | null;
};

// État initial sérialisé passé au wizard pour la reprise au fil de l'eau.
export type InitialAnswer = {
  questionKey: string;
  answerText: string | null;
  answerChoice: string | null;
};

export type InitialSponsorBlock = {
  targetUserId: string;
  facts: { questionKey: string; answerText: string | null }[];
};

export type WizardInitialState = {
  answers: InitialAnswer[];
  sponsorBlocks: InitialSponsorBlock[];
  completed: boolean;
  knowledgeScore: number | null;
};
