export const FEATURE_BINGO_ENABLED =
  process.env.FEATURE_BINGO_ENABLED === "true";

/**
 * Bingo is released to all participants: the feature flag is the only gate.
 * The email param is kept so call sites stay unchanged; the old
 * BINGO_ALLOWED_EMAILS allowlist is no longer read.
 */
export function isBingoAllowedForEmail(
  _email: string | null | undefined
): boolean {
  return FEATURE_BINGO_ENABLED;
}
