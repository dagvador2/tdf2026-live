export const FEATURE_QUESTIONNAIRE_ENABLED =
  process.env.FEATURE_QUESTIONNAIRE_ENABLED === "true";

/**
 * Le questionnaire est ouvert à tous les utilisateurs connectés dès que la
 * feature est activée (plus d'allowlist d'emails).
 */
export function isQuestionnaireEnabled(): boolean {
  return FEATURE_QUESTIONNAIRE_ENABLED;
}
