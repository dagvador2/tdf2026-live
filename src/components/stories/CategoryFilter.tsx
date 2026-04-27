"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CATEGORY_META, CATEGORY_ORDER, StoryCategory } from "@/lib/stories/categories";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  counts: Record<string, number>;
  total: number;
}

export function CategoryFilter({ counts, total }: CategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("cat");

  function setCat(cat: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (cat) params.set("cat", cat);
    else params.delete("cat");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const Pill = ({ value, label, count }: { value: string | null; label: string; count: number }) => (
    <button
      onClick={() => setCat(value)}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-all",
        active === value || (!active && value === null)
          ? "border-secondary bg-secondary text-primary"
          : "border-border bg-card text-foreground hover:border-secondary"
      )}
    >
      {label} <span className="ml-1 text-xs opacity-70">({count})</span>
    </button>
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-6 pb-2 pt-8">
      <span className="mr-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Catégorie :
      </span>
      <Pill value={null} label="Toutes" count={total} />
      {CATEGORY_ORDER.map((cat: StoryCategory) => {
        const c = counts[cat] ?? 0;
        if (c === 0) return null;
        return <Pill key={cat} value={cat} label={CATEGORY_META[cat].label} count={c} />;
      })}
    </div>
  );
}
