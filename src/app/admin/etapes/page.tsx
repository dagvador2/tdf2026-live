import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { STAGE_TYPE_LABELS } from "@/lib/utils/constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABELS: Record<string, string> = {
  upcoming: "À venir",
  live: "En cours",
  paused: "Pause",
  finished: "Terminée",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  upcoming: "outline",
  live: "default",
  paused: "secondary",
  finished: "secondary",
};

export default async function AdminStagesPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const stages = await prisma.stage.findMany({
    orderBy: { number: "asc" },
    include: { _count: { select: { entries: true, checkpoints: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase">Étapes</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Distance</TableHead>
            <TableHead>D+</TableHead>
            <TableHead>GPX</TableHead>
            <TableHead>CP</TableHead>
            <TableHead>Inscrits</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stages.map((stage) => (
            <TableRow key={stage.id}>
              <TableCell className="font-mono font-bold">{stage.number}</TableCell>
              <TableCell>
                <Link
                  href={`/admin/etapes/${stage.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {stage.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {STAGE_TYPE_LABELS[stage.type] ?? stage.type}
              </TableCell>
              <TableCell className="font-mono">{stage.distanceKm} km</TableCell>
              <TableCell className="font-mono">
                {stage.elevationM.toLocaleString("fr-FR")} m
              </TableCell>
              <TableCell>{stage.gpxUrl ? "✅" : "❌"}</TableCell>
              <TableCell className="font-mono">{stage._count.checkpoints}</TableCell>
              <TableCell className="font-mono">{stage._count.entries}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[stage.status]}>
                  {STATUS_LABELS[stage.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
