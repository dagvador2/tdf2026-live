import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardStats } from "@/components/admin/DashboardStats";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const [teamCount, riderCount, stageCount, entryCount, liveStage] =
    await Promise.all([
      prisma.team.count(),
      prisma.rider.count(),
      prisma.stage.count(),
      prisma.stageEntry.count(),
      prisma.stage.findFirst({
        where: { status: "live" },
        select: { number: true, name: true },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Connecté en tant que {session.user?.name}
        </p>
      </div>

      <DashboardStats
        teamCount={teamCount}
        riderCount={riderCount}
        stageCount={stageCount}
        entryCount={entryCount}
        liveStage={
          liveStage
            ? `Étape ${liveStage.number} — ${liveStage.name}`
            : null
        }
      />
    </div>
  );
}
