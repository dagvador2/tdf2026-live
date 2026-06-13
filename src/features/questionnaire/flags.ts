export const FEATURE_QUESTIONNAIRE_ENABLED =
  process.env.FEATURE_QUESTIONNAIRE_ENABLED === "true";

const QUESTIONNAIRE_ALLOWED_EMAILS = (
  process.env.QUESTIONNAIRE_ALLOWED_EMAILS ?? ""
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * True if the feature is on AND (allowlist is empty OR email is on it).
 * Used to hide /questionnaire entirely from non-allowed users — they get a 404.
 */
export function isQuestionnaireAllowedForEmail(
  email: string | null | undefined,
): boolean {
  if (!FEATURE_QUESTIONNAIRE_ENABLED) return false;
  if (QUESTIONNAIRE_ALLOWED_EMAILS.length === 0) return true;
  if (!email) return false;
  return QUESTIONNAIRE_ALLOWED_EMAILS.includes(email.toLowerCase());
}
