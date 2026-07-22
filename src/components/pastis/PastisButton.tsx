"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Loader2, Undo2, X } from "lucide-react";

interface Burst {
  id: number;
  emojis: { dx: number; delay: number }[];
}

/**
 * Auto-déclaration de pastis pour le coureur connecté : selfie OBLIGATOIRE.
 * Flux : 🥃 → prise de photo → aperçu + légende → envoi (upload R2 puis
 * déclaration). Compte tout de suite, avec une pluie de verres 🥃.
 */
export function PastisButton({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextBurstId = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nettoie l'URL objet de l'aperçu
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.preview);
    };
  }, [photo]);

  const spawnBurst = useCallback(() => {
    const id = nextBurstId.current++;
    const emojis = Array.from({ length: 5 }, (_, i) => ({
      dx: (i - 2) * 18 + (Math.random() * 12 - 6),
      delay: Math.random() * 0.15,
    }));
    setBursts((b) => [...b, { id, emojis }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1300);
  }, []);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier
    if (!file) return;
    setError(null);
    setPhoto({ file, preview: URL.createObjectURL(file) });
    setCaption("");
  };

  const cancelPhoto = () => {
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto(null);
    setCaption("");
    setError(null);
  };

  const submit = useCallback(async () => {
    if (!photo) return;
    setPending(true);
    setError(null);
    try {
      // 1) Upload du selfie
      const fd = new FormData();
      fd.append("file", photo.file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) throw new Error("upload");
      const { url } = (await up.json()) as { url: string };

      // 2) Déclaration
      const res = await fetch("/api/pastis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: url, caption: caption.trim() || undefined }),
      });
      if (!res.ok) throw new Error("declare");
      const data = (await res.json()) as { riderCount: number };

      setCount(data.riderCount);
      spawnBurst();
      cancelPhoto();
    } catch {
      setError("Oups, échec de l'envoi. Réessaie.");
    } finally {
      setPending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, caption, spawnBurst]);

  const undo = useCallback(async () => {
    if (count <= 0 || pending) return;
    setPending(true);
    setCount((c) => Math.max(0, c - 1)); // optimiste
    try {
      const res = await fetch("/api/pastis", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = (await res.json()) as { riderCount: number };
        setCount(data.riderCount);
      } else {
        setCount((c) => c + 1);
      }
    } catch {
      setCount((c) => c + 1);
    } finally {
      setPending(false);
    }
  }, [count, pending]);

  return (
    <Card className="mb-6 overflow-hidden border-primary/40 bg-primary/10">
      <CardContent className="p-6 text-center">
        <p className="mb-1 font-display text-lg uppercase">Compteur de pastis</p>
        <p className="mb-4 text-sm text-muted-foreground">
          {count === 0
            ? "Aucun pastis déclaré… pour l'instant."
            : `Tu as descendu ${count} pastis 🥃`}
        </p>

        {/* Input caméra caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={onPickFile}
        />

        {!photo ? (
          <div className="relative mx-auto flex w-fit flex-col items-center">
            {/* Pluie de verres */}
            <div className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center">
              {bursts.map((burst) =>
                burst.emojis.map((e, i) => (
                  <span
                    key={`${burst.id}-${i}`}
                    className="pastis-rise absolute text-2xl"
                    style={{
                      // @ts-expect-error CSS custom properties
                      "--dx": `${e.dx}px`,
                      animationDelay: `${e.delay}s`,
                    }}
                  >
                    🥃
                  </span>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
              className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-primary text-secondary shadow-lg transition-transform active:scale-90 disabled:opacity-70"
              aria-label="Déclarer un pastis avec un selfie"
            >
              <Camera className="h-7 w-7" />
              <span className="mt-1 font-display text-lg leading-none">+1 🥃</span>
            </button>
            <p className="mt-2 text-xs text-muted-foreground">Selfie obligatoire 🤳</p>
          </div>
        ) : (
          <div className="mx-auto max-w-xs space-y-3">
            <div className="relative overflow-hidden rounded-lg border border-border">
              {/* Aperçu — <img> suffit pour un blob local */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.preview}
                alt="Aperçu du selfie"
                className="max-h-64 w-full object-cover"
              />
              <button
                type="button"
                onClick={cancelPhoto}
                disabled={pending}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="Reprendre la photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={280}
              placeholder="Une légende ? (optionnel)"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-display text-lg uppercase text-secondary transition-transform active:scale-95 disabled:opacity-70"
            >
              {pending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Envoi…
                </>
              ) : (
                <>Santé ! +1 🥃</>
              )}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={undo}
          disabled={pending || count <= 0}
          className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Annuler le dernier
        </button>
      </CardContent>

      <style>{`
        @keyframes pastis-rise {
          0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translate(var(--dx), -80px) scale(1.1); opacity: 0; }
        }
        .pastis-rise { animation: pastis-rise 1.2s ease-out forwards; }
      `}</style>
    </Card>
  );
}
