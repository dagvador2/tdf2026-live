import type { Fit } from "@/features/questionnaire/lib/types";

/**
 * Réglage du cadrage par photo, pour bien voir les têtes / sujets malgré le
 * recadrage des conteneurs.
 *
 * Clé = basename normalisé sans extension (ex: "b2_1_a", "b3_3").
 *  - position : object-position CSS ("center", "center top", "62% 0%", …)
 *  - fit      : "cover" (défaut, remplit/recadre) | "contain" (dézoome, photo
 *               entière sur fond clair — pour les produits/logos)
 *
 * Ajusté visuellement via screenshots headless du rendu réel.
 */
export type PhotoFocus = { position?: string; fit?: Fit };

export const PHOTO_FOCUS: Record<string, PhotoFocus> = {
  // ── Duels (portrait) — décalages demandés ──
  // « vers la droite » = on glisse l'image vers la droite = object-position-x plus bas (38%)
  // « vers la gauche » = object-position-x plus haut (62%)
  b2_5_a: { position: "38% 0%" }, // Pogačar : haut + un peu à droite
  b2_5_b: { position: "38% 0%" }, // Vingegaard CLM : un peu à droite
  b2_2_a: { position: "38% center" }, // descendeur kamikaze : un peu à droite
  b2_3_b: { fit: "contain" }, // energy drink : dézoom
  b2_4_a: { position: "62% center" }, // banane : un peu à gauche
  b2_4_b: { position: "38% center" }, // gel caféiné : un peu à droite
  b2_8_a: { position: "62% center" }, // Pantani : un peu à gauche
  b2_8_b: { position: "62% center" }, // Pantaloni : un peu à gauche
  b2_9_a: { position: "62% center" }, // Festina : un peu à gauche
  b2_9_b: { position: "38% center" }, // US Postal : un peu à droite
  b2_11_a: { position: "center 30%" }, // Seixas : remonter un peu
  b2_12_a: { position: "38% center" }, // Wout Van Aert : un peu à droite
  b2_14_a: { fit: "contain" }, // Sram Rival : dézoom (voir le dérailleur)
  b2_14_b: { fit: "contain" }, // Sram Red : dézoom

  // ── Quiz ──
  b3_1: { position: "center top" }, // maillot jaune : montrer le haut
  b3_2: { fit: "contain" }, // logo IKEA : entier
  b3_4: { fit: "contain" }, // pendule (8 secondes) : dézoom
  b3_6: { position: "center top" }, // attaque Pogačar
};

export function focusFor(key: string): { position: string; fit: Fit } {
  const f = PHOTO_FOCUS[key];
  return { position: f?.position ?? "center", fit: f?.fit ?? "cover" };
}
