import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export default async function FullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion?next=/mon-espace/course");
  }
  return <>{children}</>;
}
