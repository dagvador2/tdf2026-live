import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { SessionRefresher } from "./SessionRefresher";

export default async function MonEspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <SessionRefresher />
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/mon-espace"
            className="font-display text-lg uppercase tracking-wide"
          >
            Mon espace
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.user.name || session.user.email}
            </span>
            <form action={handleSignOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
