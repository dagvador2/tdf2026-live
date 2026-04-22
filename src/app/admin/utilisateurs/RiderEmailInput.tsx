"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Check, Loader2 } from "lucide-react";
import { setRiderEmail } from "./actions";

export function RiderEmailInput({
  riderId,
  initial,
}: {
  riderId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (value === initial) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await setRiderEmail(riderId, value);
      if (res.ok) {
        setSaved(true);
      } else {
        setError(res.error ?? "Erreur");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          onBlur={handleSave}
          placeholder="email@example.com"
          className="h-8 text-xs"
          type="email"
        />
        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        {saved && !isPending && <Check className="h-3 w-3 text-green-600" />}
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
