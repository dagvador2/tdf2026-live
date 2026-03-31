import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="font-display text-8xl text-primary">404</span>
      <h1 className="mt-4 font-display text-3xl uppercase text-secondary">
        Page introuvable
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Cette page n&apos;existe pas ou a été déplacée. Peut-être cherchez-vous
        une étape, une équipe ou un coureur ?
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/">Accueil</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/etapes">Étapes</Link>
        </Button>
      </div>
    </div>
  );
}
