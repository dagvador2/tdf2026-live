export function Footer() {
  return (
    <footer className="hidden border-t border-border bg-secondary text-secondary-foreground md:block">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <p className="font-display text-lg uppercase">TDF 2026 Live Tracker</p>
            <p className="text-sm text-secondary-foreground/70">
              Tour de France amateur entre amis — Alpes, 20-25 juillet 2026
            </p>
          </div>
          <div className="text-sm text-secondary-foreground/50">
            28 coureurs · 4 équipes · 6 étapes
          </div>
        </div>
      </div>
    </footer>
  );
}
