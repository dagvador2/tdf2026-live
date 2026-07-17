/**
 * Compteur de pastis — constantes partagées.
 *
 * Le classement pastis est global (pas rattaché à une étape précise pour le
 * live), donc on diffuse sur un canal SSE fixe partagé par tous les clients.
 */
export const PASTIS_CHANNEL = "pastis:global";

/** Garde-fou : nombre de pastis max ajoutables en une seule requête. */
export const PASTIS_MAX_QUANTITY = 20;
