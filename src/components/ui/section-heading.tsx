import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  kicker: string;
  title: string;
  /** "dark" for headings placed on bleu-nuit backgrounds */
  tone?: "light" | "dark";
  className?: string;
}

export function SectionHeading({
  kicker,
  title,
  tone = "light",
  className,
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div className={cn("mb-8", className)}>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
        {kicker}
      </p>
      <h2
        className={cn(
          "mt-2 font-display text-3xl uppercase md:text-4xl",
          dark ? "text-white" : "text-secondary"
        )}
      >
        {title}
      </h2>
    </div>
  );
}
