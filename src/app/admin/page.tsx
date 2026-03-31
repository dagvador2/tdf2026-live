import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-display text-4xl">Dashboard Admin</h1>
      <p className="text-muted-foreground">
        Connecté en tant que {session.user?.name}
      </p>
    </main>
  );
}
