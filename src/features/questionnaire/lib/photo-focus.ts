/**
 * Réglage du cadrage (`object-position`) par photo, pour bien voir les têtes /
 * sujets malgré le recadrage `object-cover` des conteneurs larges.
 *
 * Clé = basename normalisé sans extension (ex: "b2_1_a", "b3_3").
 * Valeur = n'importe quel `object-position` CSS ("center", "center top",
 * "center 30%", "50% 20%", …). Absent = "center" (défaut).
 *
 * Ajusté visuellement via screenshots headless du rendu réel.
 */
export const PHOTO_FOCUS: Record<string, string> = {
  // Duels : portraits décapités par le recadrage large → on remonte vers le haut
  b2_5_a: "center top", // Pogačar
  b2_5_b: "center top", // Vingegaard
  b2_6_a: "center top", // Lance Armstrong
  b2_6_b: "center top", // Richard Virenque
  b2_8_a: "center top", // Marco Pantani
  b2_9_b: "center top", // US Postal
  b2_11_a: "center top", // Paul Seixas
  b2_12_b: "center top", // Mathieu Van Der Poel
  // Quiz
  b3_6: "center top", // attaque Pogačar
};

export function focusFor(key: string): string {
  return PHOTO_FOCUS[key] ?? "center";
}
