import { categoryMeta } from "@/lib/stories/categories";

export function CategoryBadge({ category, className = "" }: { category: string; className?: string }) {
  const meta = categoryMeta(category);
  return (
    <span
      className={`inline-block rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${className}`}
      style={{ backgroundColor: meta.badgeBg, color: meta.badgeText }}
    >
      {meta.label}
    </span>
  );
}
