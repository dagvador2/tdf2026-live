import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-1.5">
      <div className="flex h-9 w-9 items-center justify-center rounded bg-primary">
        <span className="font-display text-lg leading-none text-primary-foreground">
          TDF
        </span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-xl tracking-tight text-secondary">
          TDF 2026
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Live Tracker
        </span>
      </div>
    </Link>
  );
}
