/**
 * Contenu du questionnaire participants TDF 2026 — données séparées des composants.
 *
 * Source de vérité du contenu des 4 blocs. Aucune image en dur : les blocs 2 et 3
 * référencent un numéro `n` résolu via /public/photos-quizz/manifest.json.
 *
 * ⚠️ Bloc 2 : il y a 14 duels photo (28 images) mais 15 duels de contenu.
 *    `b2_relance_ego` est un duel abstrait SANS photo (n omis) → rendu en bandeaux
 *    colorés. Les `n` des duels suivants sont alignés sur les clés réelles du
 *    manifeste (seixas_jesus→11, wva_mvdp→12, durace_ultegra→13, rival_red→14).
 */

// ── Types ──────────────────────────────────────────
export type FreeQ = { key: string; prompt: string; type: "free" };
export type ChoiceQ = {
  key: string;
  prompt: string;
  type: "choice";
  options: string[];
};
export type PeerQ = { key: string; prompt: string; type: "peer_picker" }; // choisit un participant
export type Block1Q = FreeQ | ChoiceQ | PeerQ;

export type Block2Duel = {
  key: string;
  n?: number; // numéro de duel → manifest.bloc2[n] ; absent = duel texte sans photo
  optionA: string;
  optionB: string;
  layout?: "landscape"; // photos paysage → split haut/bas (défaut = portrait gauche/droite)
};

export type Block3Q = {
  key: string;
  n: number; // → manifest.bloc3[n]
  prompt: string;
  optionA: string;
  optionB: string;
  correct: "A" | "B";
};

// ── BLOC 1 — Portrait (ice-breaker) ────────────────
export const BLOCK1: Block1Q[] = [
  { key: "b1_coureur_2026", prompt: "Qui est ton coureur du Tour 2026 préféré ? 🚴", type: "free" },
  { key: "b1_coureur_alltime", prompt: "Qui est ton coureur all time préféré ? 🚴", type: "free" },
  { key: "b1_souvenir_tour", prompt: "Le souvenir du Tour qui t'a le plus marqué ? 💥", type: "free" },
  { key: "b1_marque_reve", prompt: "Quelle est ta marque de vélo de rêve ? 🚲", type: "free" },
  { key: "b1_col_prefere", prompt: "Quel est ton col préféré que tu as déjà fait ? ⛰️", type: "free" },
  { key: "b1_pire_souvenir", prompt: "Ton pire souvenir à vélo ? 🤮", type: "free" },
  { key: "b1_meilleur_souvenir", prompt: "Ton meilleur souvenir à vélo ? 🥳", type: "free" },
  { key: "b1_surnom_velo", prompt: "Le surnom de ton vélo si tu devais lui en donner un ? 🤩", type: "free" },
  { key: "b1_chanson_col", prompt: "La chanson qui te vient en tête dans un col de l'enfer ? 🎼", type: "free" },
  { key: "b1_boisson_3000", prompt: "Ta boisson préférée après 3000m de D+ ? 🥤", type: "free" },
  { key: "b1_excuse_crame", prompt: "Quelle excuse vas-tu sortir quand tu seras cramé en plein col ? 😵", type: "free" },
  {
    key: "b1_type_coureur",
    prompt: "Si tu étais un type de coureur ? 🚴",
    type: "choice",
    options: ["Sprinteur", "Grimpeur", "Rouleur", "Baroudeur", "Suceur de roue"],
  },
  { key: "b1_objectif_secret", prompt: "Ton objectif secret pour ce voyage (en vrai) ? 🤫", type: "free" },
  { key: "b1_battre", prompt: "Qui veux-tu le plus battre à ce Tour ?", type: "peer_picker" },
];

// ── BLOC 2 — Duels "ou bien" (pas de bonne réponse) ─
export const BLOCK2: Block2Duel[] = [
  { key: "b2_tete_roue", n: 1, optionA: "Je pars en tête et j'explose 💥", optionB: "Je suce des roues toute l'étape 🪱" },
  { key: "b2_descente", n: 2, optionA: "Descendeur kamikaze 🪂", optionB: "Je freine dans chaque virage 🐌" },
  { key: "b2_ricard_iso", n: 3, optionA: "Un Ricard 🥃", optionB: "Une boisson isotonique 🧪" },
  { key: "b2_banane_gel", n: 4, optionA: "Une banane 🍌", optionB: "Un gel caféiné ⚡" },
  { key: "b2_poga_vinge", n: 5, optionA: "Pogačar 🐐", optionB: "Vingegaard" },
  { key: "b2_lance_riri", n: 6, optionA: "Lance Armstrong", optionB: "Richard Virenque" },
  { key: "b2_colnago_peug", n: 7, optionA: "Colnago", optionB: "Peugeot", layout: "landscape" },
  { key: "b2_pantani", n: 8, optionA: "Marco Pantani", optionB: "Marco Pantaloni" },
  { key: "b2_festina_postal", n: 9, optionA: "Festina", optionB: "US Postal" },
  { key: "b2_carbone_entr", n: 10, optionA: "Un cadre carbone à 8000€ 💸", optionB: "Un entraînement rigoureux", layout: "landscape" },
  // duel abstrait sans photo → bandeaux colorés
  { key: "b2_relance_ego", optionA: "Je relance dès qu'on me dépasse 🔥", optionB: "Je laisse filer, l'ego peut attendre 🧘" },
  { key: "b2_seixas_jesus", n: 11, optionA: "Paul Seixas", optionB: "Jésus Christ" },
  { key: "b2_wva_mvdp", n: 12, optionA: "Wout Van Aert", optionB: "Mathieu Van Der Poel" },
  { key: "b2_durace_ultegra", n: 13, optionA: "Shimano Dura-Ace", optionB: "Shimano Ultegra", layout: "landscape" },
  { key: "b2_rival_red", n: 14, optionA: "Sram Rival", optionB: "Sram Red" },
];

// ── BLOC 3 — Quiz connaissances (score serveur) ────
// NB: question n°7 (Ultegra) sans image → fallback emoji ⚙️
export const BLOCK3: Block3Q[] = [
  { key: "b3_maillot_jaune", n: 1, prompt: "Le maillot jaune c'est :", optionA: "Le leader du classement général", optionB: "Celui qui a bu le plus de Ricard", correct: "A" },
  { key: "b3_merckx", n: 2, prompt: "Merckx :", optionA: "Légende belge", optionB: "Meuble IKEA", correct: "A" },
  { key: "b3_pogacar", n: 3, prompt: "Pogačar :", optionA: "Dopé", optionB: "GOAT", correct: "B" },
  { key: "b3_huit_sec", n: 4, prompt: "Huit secondes en 1989, c'est :", optionA: "8 secondes en 1989", optionB: "Ta gueule", correct: "A" },
  { key: "b3_insu", n: 5, prompt: "Choisis la tournure correcte :", optionA: "À l'insu de mon plein gré", optionB: "À mon insu", correct: "A" },
  { key: "b3_hinault", n: 6, prompt: "« Tant que je respire, j'attaque » :", optionA: "Bernard Hinault", optionB: "L'essence de ce Tour de France", correct: "A" },
  { key: "b3_ultegra", n: 7, prompt: "Ultegra :", optionA: "Une transmission ⚙️", optionB: "Un energy drink 🥤", correct: "A" }, // pas d'image → emoji
  { key: "b3_grand_plateau", n: 8, prompt: "Montée grand plateau :", optionA: "Dopé", optionB: "Grand quoi ?", correct: "A" },
  { key: "b3_chasse_patate", n: 9, prompt: "Chasse patate :", optionA: "Cool", optionB: "Pas cool", correct: "B" },
  { key: "b3_pente_30", n: 10, prompt: "Pente à 30% :", optionA: "Ça va être dur mais ça va passer", optionB: "LOL", correct: "A" },
  { key: "b3_lanterne", n: 11, prompt: "Lanterne rouge :", optionA: "Belle couleur ça, le rouge", optionB: "JAMAIS", correct: "B" },
  { key: "b3_alpe_mois", n: 12, prompt: "Alpe d'Huez :", optionA: "Janvier", optionB: "Juillet", correct: "B" },
  { key: "b3_pinot", n: 13, prompt: "Thibaut Pinot :", optionA: "Un coureur cycliste", optionB: "Une religion", correct: "B" },
  { key: "b3_shimano", n: 14, prompt: "Shimano :", optionA: "Arigato", optionB: "Dura-Ace", correct: "B" },
];

// ── BLOC 4 — Parrainage (questions ciblées par personne) ─
export const BLOCK4_FACT_QUESTIONS = [
  { key: "manie", prompt: "Sa manie / son rituel reconnaissable ?" },
  { key: "phrase", prompt: "La phrase qu'il/elle sort tout le temps ?" },
  { key: "point_faible", prompt: "Son point faible à vélo qu'il/elle n'assume pas ?" },
  { key: "rale", prompt: "Le truc qui va le/la faire râler à coup sûr ?" },
  { key: "bouffe", prompt: "Une habitude bouffe/apéro signature ?" },
  { key: "marrant", prompt: "Un truc qu'il/elle fait qui énerve ou fait marrer ?" },
  { key: "bonus", prompt: "Une ultime bafouille sur cette personne ?" },
] as const;

export type Block4FactKey = (typeof BLOCK4_FACT_QUESTIONS)[number]["key"];

// ── Helpers de contenu ─────────────────────────────
export const BLOCK1_BY_KEY = new Map(BLOCK1.map((q) => [q.key, q]));
export const BLOCK2_BY_KEY = new Map(BLOCK2.map((q) => [q.key, q]));
export const BLOCK3_BY_KEY = new Map(BLOCK3.map((q) => [q.key, q]));

/** Nombre de questions fixes (blocs 1-3). Le bloc 4 est dynamique. */
export const FIXED_QUESTION_COUNT = BLOCK1.length + BLOCK2.length + BLOCK3.length;

/** Score max du quiz connaissances. */
export const KNOWLEDGE_MAX = BLOCK3.length;

/** Palier rigolo selon le score de connaissances /14. */
export function knowledgeLabel(score: number): string {
  if (score <= 4) return "Touriste du dimanche 🩴";
  if (score <= 9) return "Cyclo éclairé 🚴";
  if (score <= 12) return "Puriste 🏆";
  return "Tu connais Coppi par cœur 🐐";
}
