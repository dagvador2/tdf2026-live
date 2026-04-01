"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface GPXUploadProps {
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

export function GPXUpload({ currentUrl, onUploaded }: GPXUploadProps) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      onUploaded(data.url);
    }
    setUploading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fichier GPX</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentUrl ? (
          <p className="text-sm text-muted-foreground">
            ✅ GPX chargé :{" "}
            <span className="font-mono text-xs">{currentUrl.split("/").pop()}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun fichier GPX uploadé.</p>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".gpx"
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploading && (
            <Button disabled>
              <Upload className="mr-1 h-4 w-4 animate-spin" />
              Upload...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
