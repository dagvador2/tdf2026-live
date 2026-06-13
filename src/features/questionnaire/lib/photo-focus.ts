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
  // Photos verticales très hautes : visage en haut → on remonte le cadrage
  b2_5_a: "center top", // Pogačar
  b2_5_b: "center top", // Vingegaard
  b3_6: "center top", // attaque Pogačar (quiz)
};

export function focusFor(key: string): string {
  return PHOTO_FOCUS[key] ?? "center";
}
