import "server-only";

/**
 * Liste blanche des « validateurs pastis » : des coureurs (compte Google) à qui
 * on donne le droit d'ajuster le compteur de tout le monde et qui reçoivent les
 * notifs push à chaque déclaration. Évite de les passer en vrai admin (ce qui
 * leur ferait perdre leur rôle coureur).
 *
 * Renseigner `PASTIS_ADMIN_EMAILS` (emails séparés par des virgules).
 */
export const PASTIS_ADMIN_EMAILS = (process.env.PASTIS_ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isPastisAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return PASTIS_ADMIN_EMAILS.includes(email.toLowerCase());
}
