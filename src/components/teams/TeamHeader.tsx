import Image from "next/image";
import { Users } from "lucide-react";

interface TeamHeaderProps {
  name: string;
  color: string;
  description: string | null;
  riderCount: number;
  logoUrl?: string | null;
}

export function TeamHeader({ name, color, description, riderCount, logoUrl }: TeamHeaderProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="h-2" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-5 p-6">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}20` }}
        >
          {logoUrl ? (
            <Image src={logoUrl} alt={name} width={56} height={56} className="h-14 w-14 object-contain" />
          ) : (
            <Users className="h-9 w-9" style={{ color }} />
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl uppercase text-secondary md:text-4xl">
            {name}
          </h1>
          {description && (
            <p className="mt-1 text-muted-foreground">{description}</p>
          )}
          <p className="mt-2 text-sm font-medium" style={{ color }}>
            {riderCount} coureurs
          </p>
        </div>
      </div>
    </div>
  );
}
