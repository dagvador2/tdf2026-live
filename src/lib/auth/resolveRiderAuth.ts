import { auth } from "@/lib/auth/config";
import { verifyRiderJWT } from "@/lib/auth/jwt";

export type RiderAuthResult =
  | { ok: true; riderId: string; source: "jwt" | "session" }
  | { ok: false; status: 401; error: string };

/**
 * Résout l'auth d'un coureur à partir d'une request.
 *
 * Accepte deux sources (période de transition PIV.08 → PIV.12) :
 * - JWT Bearer token dans l'header Authorization (ancien système `/coureur/[token]`)
 * - Session Auth.js via cookie (nouveau portail `/mon-espace`)
 *
 * Le JWT est prioritaire s'il est présent, ce qui permet au client existant
 * (RiderLiveClient) de continuer à fonctionner sans modification.
 */
export async function resolveRiderAuth(
  request: Request
): Promise<RiderAuthResult> {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const result = await verifyRiderJWT(token);
    if ("error" in result) {
      return {
        ok: false,
        status: 401,
        error: result.error === "expired" ? "Token expiré" : "Token invalide",
      };
    }
    return { ok: true, riderId: result.riderId, source: "jwt" };
  }

  // Fallback : session Auth.js (cookie)
  const session = await auth();
  if (session?.user?.role === "rider" && session.user.riderId) {
    return { ok: true, riderId: session.user.riderId, source: "session" };
  }

  return { ok: false, status: 401, error: "Non authentifié" };
}
