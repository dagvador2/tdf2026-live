"use client";

import { Input } from "@/components/ui/input";
import { FUN_FACT_FIELDS } from "@/lib/utils/constants";

interface FunFactsFormProps {
  value: Record<string, string>;
  onChange: (facts: Record<string, string>) => void;
}

export function FunFactsForm({ value, onChange }: FunFactsFormProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Fun facts</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FUN_FACT_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <label className="text-xs text-muted-foreground">
              {field.label}
            </label>
            <Input
              value={value[field.key] ?? ""}
              onChange={(e) =>
                onChange({ ...value, [field.key]: e.target.value })
              }
              placeholder={field.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
