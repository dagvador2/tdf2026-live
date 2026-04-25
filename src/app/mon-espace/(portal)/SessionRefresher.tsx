"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Force un rafraîchissement de la session JWT au chargement de /mon-espace.
 *
 * Why: la session JWT est figée au login. Quand un admin lie un compte
 * pending à un rider via `/admin/utilisateurs`, le User en DB passe en
 * role="rider" mais le JWT existant garde role="pending". Sans logout/login,
 * le coureur ne voit pas le changement.
 *
 * `update()` côté client appelle l'endpoint /api/auth/session qui déclenche
 * le callback jwt avec `trigger: "update"` — la branche dédiée relit
 * role/riderId depuis la DB. On rafraîchit ensuite la page si le role ou
 * riderId a changé pour réafficher le bon dashboard.
 *
 * Ne s'exécute qu'une fois par mount (ref guard). Ciblé uniquement sur
 * /mon-espace, pas global → aucun risque pour le flow OAuth.
 */
export function SessionRefresher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (refreshedRef.current) return;
    refreshedRef.current = true;

    const before = {
      role: session?.user?.role,
      riderId: session?.user?.riderId ?? null,
    };

    update().then((next) => {
      if (!next?.user) return;
      const changed =
        next.user.role !== before.role ||
        (next.user.riderId ?? null) !== before.riderId;
      if (changed) {
        router.refresh();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
