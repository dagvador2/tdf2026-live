import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "inverted" renders light text for use on dark backgrounds */
  variant?: "default" | "inverted";
}

export function Logo({ variant = "default" }: LogoProps) {
  const inverted = variant === "inverted";
  return (
    <Link href="/" className="flex items-center gap-1.5">
      <div className="flex h-9 w-9 items-center justify-center rounded bg-primary">
        <span className="font-display text-lg leading-none text-primary-foreground">
          TDF
        </span>
      </div>
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-xl tracking-tight transition-colors",
            inverted ? "text-white" : "text-secondary"
          )}
        >
          TDF 2026
        </span>
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-widest transition-colors",
            inverted ? "text-white/60" : "text-muted-foreground"
          )}
        >
          Live Tracker
        </span>
      </div>
    </Link>
  );
}
