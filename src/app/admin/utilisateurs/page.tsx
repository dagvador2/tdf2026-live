import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { UserRow } from "./UserRow";
import { RiderEmailInput } from "./RiderEmailInput";

export const dynamic = "force-dynamic";
export const metadata = { title: "Utilisateurs — Admin" };

export default async function AdminUsersPage() {
  const [users, riders] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        rider: {
          include: { team: true },
        },
      },
    }),
    prisma.rider.findMany({
      orderBy: [{ team: { name: "asc" } }, { firstName: "asc" }],
      include: { team: true, user: true },
    }),
  ]);

  const riderOptions = riders.map((r) => ({
    id: r.id,
    label: `${r.firstName}${r.nickname ? ` (${r.nickname})` : ""} — ${r.team.name}`,
    taken: r.user != null,
  }));

  const pendingCount = users.filter((u) => u.role === "pending").length;
  const riderLinkedCount = users.filter((u) => u.role === "rider").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground">
          Gestion des comptes Auth.js et du lien vers les profils coureurs.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="En attente" value={pendingCount} accent="orange" />
        <StatCard label="Coureurs liés" value={riderLinkedCount} accent="green" />
        <StatCard
          label="Coureurs sans compte"
          value={riders.filter((r) => !r.user).length}
        />
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <h2 className="font-display text-lg uppercase">Comptes</h2>
            <p className="text-xs text-muted-foreground">
              Les nouveaux comptes arrivent en &quot;En attente&quot;. Lie-les à
              un coureur ou ils resteront sans accès.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Compte</th>
                  <th className="p-3 text-left font-medium">Statut</th>
                  <th className="p-3 text-left font-medium">Coureur lié</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-6 text-center text-sm text-muted-foreground"
                    >
                      Aucun compte pour le moment.
                    </td>
                  </tr>
                )}
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    riders={riderOptions}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rider emails for auto-linking */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <h2 className="font-display text-lg uppercase">
              Emails pré-remplis
            </h2>
            <p className="text-xs text-muted-foreground">
              Renseigne l&apos;email Gmail d&apos;un coureur. À la première
              connexion avec cet email, le lien sera fait automatiquement.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Coureur</th>
                  <th className="p-3 text-left font-medium">Équipe</th>
                  <th className="p-3 text-left font-medium">Email</th>
                  <th className="p-3 text-left font-medium">Compte lié</th>
                </tr>
              </thead>
              <tbody>
                {riders.map((rider) => (
                  <tr key={rider.id} className="border-b">
                    <td className="p-3">
                      <span className="font-medium">{rider.firstName}</span>
                      {rider.nickname && (
                        <span className="ml-1 text-muted-foreground">
                          ({rider.nickname})
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${rider.team.color}22`,
                          color: rider.team.color,
                        }}
                      >
                        {rider.team.name}
                      </span>
                    </td>
                    <td className="p-3">
                      <RiderEmailInput
                        riderId={rider.id}
                        initial={rider.email ?? ""}
                      />
                    </td>
                    <td className="p-3 text-xs">
                      {rider.user ? (
                        <span className="text-green-600">
                          ✓ {rider.user.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "orange" | "green";
}) {
  const color =
    accent === "orange"
      ? "text-orange-600"
      : accent === "green"
        ? "text-green-600"
        : "";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-mono text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
