"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponible (contexte non sécurisé) — l'utilisateur copie à la main
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-md border bg-muted px-3 py-2 font-mono text-sm">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copier"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background transition-colors hover:bg-muted"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
