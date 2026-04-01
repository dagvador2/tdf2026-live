"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil } from "lucide-react";

interface Team {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  logoUrl: string | null;
  _count: { riders: number };
}

interface TeamListProps {
  teams: Team[];
  onEdit: (team: Team) => void;
}

export function TeamList({ teams, onEdit }: TeamListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Couleur</TableHead>
          <TableHead>Nom</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead className="text-center">Coureurs</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teams.map((team) => (
          <TableRow key={team.id}>
            <TableCell>
              <div
                className="h-6 w-6 rounded-full border"
                style={{ backgroundColor: team.color }}
              />
            </TableCell>
            <TableCell className="font-medium">{team.name}</TableCell>
            <TableCell className="text-muted-foreground">{team.slug}</TableCell>
            <TableCell className="text-center">
              <Badge variant="secondary">{team._count.riders}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => onEdit(team)}>
                <Pencil className="mr-1 h-3 w-3" />
                Modifier
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
