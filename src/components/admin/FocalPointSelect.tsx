"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "center top", label: "Haut" },
  { value: "center 15%", label: "Haut-15%" },
  { value: "center 25%", label: "Haut-25%" },
  { value: "center", label: "Centre" },
  { value: "center 75%", label: "Bas-75%" },
  { value: "center bottom", label: "Bas" },
];

export function FocalPointSelect({
  storyId,
  initial,
}: {
  storyId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState<string>(initial ?? "center 25%");
  const [pending, startTransition] = useTransition();

  async function update(next: string) {
    setValue(next);
    const res = await fetch(`/api/admin/histoires/${storyId}/focal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: next }),
    });
    if (!res.ok) {
      // Revert silently on error
      setValue(initial ?? "center 25%");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <select
      value={value}
      onChange={(e) => update(e.target.value)}
      disabled={pending}
      title="Cadrage de l'image (object-position)"
      className="rounded-md border border-border bg-card px-1.5 py-1 text-[11px] disabled:opacity-50"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
