import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Connexion — TDF 2026",
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/mon-espace");
  }

  const next = searchParams.next ?? "/mon-espace";

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: next });
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <span className="font-display text-2xl text-primary-foreground">
              TDF
            </span>
          </div>
          <h1 className="font-display text-3xl uppercase">Espace coureur</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connecte-toi pour accéder à ton espace personnel
          </p>
        </div>

        {searchParams.error && (
          <Card className="mb-4 border-destructive bg-destructive/10">
            <CardContent className="p-4 text-sm text-destructive">
              {errorMessage(searchParams.error)}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4 p-6">
            <form action={signInWithGoogle}>
              <Button type="submit" className="w-full" size="lg">
                <GoogleIcon />
                <span className="ml-2">Se connecter avec Google</span>
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              La connexion par email arrive bientôt
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Si tu es admin,{" "}
          <a href="/admin/login" className="underline">
            clique ici
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "OAuthAccountNotLinked":
      return "Cet email est déjà associé à un autre mode de connexion.";
    case "AccessDenied":
      return "Accès refusé. Contacte l'admin si c'est une erreur.";
    default:
      return "Une erreur est survenue. Réessaie dans un instant.";
  }
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
