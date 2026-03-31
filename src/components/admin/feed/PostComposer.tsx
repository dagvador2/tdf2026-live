"use client";

import { useState, useRef } from "react";

interface PostComposerProps {
  stageId: string;
  authorId: string;
  onPosted: () => void;
}

export function PostComposer({
  stageId,
  authorId,
  onPosted,
}: PostComposerProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<"text" | "photo" | "highlight">("text");
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      setPhotoUrl(data.url);
      setType("photo");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    try {
      await fetch("/api/admin/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          stageId,
          authorId,
          type,
          content: content.trim(),
          photoUrl,
        }),
      });
      setContent("");
      setPhotoUrl(null);
      setType("text");
      onPosted();
    } finally {
      setPosting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border bg-white p-4"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Quoi de neuf sur la course ?"
        rows={3}
        className="w-full resize-none rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />

      {photoUrl && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Preview"
            className="h-24 rounded object-cover"
          />
          <button
            type="button"
            onClick={() => setPhotoUrl(null)}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 text-xs text-white"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoUpload(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            {uploading ? "Upload..." : "Photo"}
          </button>

          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as "text" | "photo" | "highlight")
            }
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="text">Texte</option>
            <option value="photo">Photo</option>
            <option value="highlight">Moment fort</option>
            <option value="result">Résultat</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={posting || !content.trim()}
          className="rounded bg-[#F2C200] px-4 py-2 text-sm font-bold text-black hover:bg-yellow-500 disabled:opacity-50"
        >
          {posting ? "Envoi..." : "Publier"}
        </button>
      </div>
    </form>
  );
}
