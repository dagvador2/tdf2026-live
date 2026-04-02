import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronRight } from "lucide-react";

interface TeamCardProps {
  name: string;
  slug: string;
  color: string;
  description: string | null;
  riderCount: number;
  logoUrl?: string | null;
}

export function TeamCard({ name, slug, color, description, riderCount, logoUrl }: TeamCardProps) {
  return (
    <Link href={`/equipes/${slug}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg">
        <div className="h-1.5" style={{ backgroundColor: color }} />
        <CardContent className="flex items-center gap-4 p-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color}20` }}
          >
            {logoUrl ? (
              <Image src={logoUrl} alt={name} width={44} height={44} className="h-11 w-11 object-contain" />
            ) : (
              <Users className="h-7 w-7" style={{ color }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg uppercase leading-tight text-secondary">
              {name}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
            <Badge variant="secondary" className="mt-2">
              {riderCount} coureurs
            </Badge>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  );
}
