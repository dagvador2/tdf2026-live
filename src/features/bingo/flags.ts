export const FEATURE_BINGO_ENABLED =
  process.env.FEATURE_BINGO_ENABLED === "true";

const BINGO_ALLOWED_EMAILS = (process.env.BINGO_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * True if the feature is on AND (allowlist is empty OR email is on it).
 * Used to hide /bingo entirely from non-allowed users — they get a 404.
 */
export function isBingoAllowedForEmail(email: string | null | undefined): boolean {
  if (!FEATURE_BINGO_ENABLED) return false;
  if (BINGO_ALLOWED_EMAILS.length === 0) return true;
  if (!email) return false;
  return BINGO_ALLOWED_EMAILS.includes(email.toLowerCase());
}
