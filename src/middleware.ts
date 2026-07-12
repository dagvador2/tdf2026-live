import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

// Ancien domaine Railway → nouveau domaine letourexplorer.com.
// On garde le .up.railway.app actif pendant la transition : toute requête
// de navigation reçue avec cet ancien Host est redirigée en permanent (308)
// vers le nouveau domaine, chemin + query params préservés. On ajoute un
// flag `from_old_domain=1` dans l'URL de destination : c'est le seul moyen
// fiable de signaler l'origine à la bannière de migration, car un cookie
// posé sur railway.app n'est PAS lisible sur letourexplorer.com (frontière
// de domaine). Ça couvre notamment la PWA installée depuis l'ancien domaine,
// qui se relance sans referrer.
// NB : /api/* est exclu du matcher → les POST Traccar (GPS) continuent de
// passer sur l'ancien domaine tant que les coureurs n'ont pas mis à jour
// leur TRACK_URL.
const OLD_HOST = "tdf2026-live-production.up.railway.app";
const NEW_ORIGIN = "https://letourexplorer.com";

export default auth((req) => {
  if (req.headers.get("host") === OLD_HOST) {
    const target = new URL(
      req.nextUrl.pathname + req.nextUrl.search,
      NEW_ORIGIN
    );
    target.searchParams.set("from_old_domain", "1");
    return NextResponse.redirect(target, 308);
  }

  const { pathname } = req.nextUrl;
  const session = req.auth;

  // /admin/* (hors /admin/login) → réservé aux admins
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    if (session.user?.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // /mon-espace/* → réservé aux coureurs (role rider ou pending)
  if (pathname.startsWith("/mon-espace")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/connexion";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  // Toutes les navigations (nécessaire pour la redirection de domaine, qui
  // doit couvrir la home, les histoires, les classements, etc.), en excluant
  // /api (Traccar GPS), les assets Next et les fichiers PWA statiques. Les
  // contrôles d'accès /admin et /mon-espace ci-dessus restent inchangés.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|apple-touch-icon.png|robots.txt|sw.js|workbox).*)",
  ],
};
