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
import { Pencil, Link as LinkIcon } from "lucide-react";

interface Rider {
  id: string;
  firstName: string;
  nickname: string | null;
  slug: string;
  teamId: string;
  photoUrl: string | null;
  editionCount: number;
  team: { id: string; name: string; color: string };
}

interface RiderListProps {
  riders: Rider[];
  onEdit: (rider: Rider) => void;
  onGenerateLink: (riderId: string) => void;
}

export function RiderList({ riders, onEdit, onGenerateLink }: RiderListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Prénom</TableHead>
          <TableHead>Surnom</TableHead>
          <TableHead>Équipe</TableHead>
          <TableHead className="text-center">Éditions</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {riders.map((rider) => (
          <TableRow key={rider.id}>
            <TableCell className="font-medium">{rider.firstName}</TableCell>
            <TableCell className="text-muted-foreground">
              {rider.nickname || "—"}
            </TableCell>
            <TableCell>
              <Badge
                style={{ backgroundColor: rider.team.color, color: rider.team.color === "#E8E0D0" ? "#1A1A1A" : "#fff" }}
              >
                {rider.team.name}
              </Badge>
            </TableCell>
            <TableCell className="text-center font-mono">
              {rider.editionCount}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(rider)}>
                  <Pencil className="mr-1 h-3 w-3" />
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onGenerateLink(rider.id)}
                >
                  <LinkIcon className="mr-1 h-3 w-3" />
                  Lien
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
