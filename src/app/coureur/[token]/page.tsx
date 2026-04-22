import { redirect } from "next/navigation";

/**
 * Les anciens liens `/coureur/[token]` ne sont plus supportés depuis le pivot
 * Auth.js (PIV.12). On redirige simplement vers la nouvelle page de connexion.
 */
export default function CoureurLegacyRedirect() {
  redirect("/connexion");
}
