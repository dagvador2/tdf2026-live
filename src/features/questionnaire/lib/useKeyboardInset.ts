import { useEffect, useState } from "react";

/**
 * Hauteur (px) dont le clavier virtuel recouvre le bas du viewport.
 * 0 quand le clavier est fermé. Basé sur l'API VisualViewport (iOS Safari +
 * Android Chrome). Sert à remonter le pied de page (bouton « Suivant ») au-dessus
 * du clavier dans le questionnaire.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Recouvrement = hauteur de mise en page - (hauteur visible + décalage haut)
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(overlap > 1 ? Math.round(overlap) : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
