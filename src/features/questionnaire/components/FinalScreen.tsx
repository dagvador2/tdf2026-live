"use client";

export function FinalScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <div className="text-7xl">🎉</div>
      <h2 className="font-display text-4xl uppercase leading-none tracking-tight text-secondary">
        Merci, ton profil est complet !
      </h2>
      <p className="max-w-xs text-muted-foreground">
        Ce que tu viens de remplir va servir à des trucs… 👀
      </p>
    </div>
  );
}
