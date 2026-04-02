"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { User, Search } from "lucide-react";

interface RiderOption {
  id: string;
  firstName: string;
  nickname: string | null;
  teamName: string;
  teamColor: string;
}

export default function ConnexionPage() {
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if already connected
    const token = localStorage.getItem("riderToken");
    if (token) {
      router.push(`/coureur/${token}`);
      return;
    }

    fetch("/api/riders/list")
      .then((res) => res.json())
      .then((data) => {
        setRiders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function handleSelect(riderId: string) {
    setConnecting(riderId);
    const res = await fetch("/api/riders/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ riderId }),
    });

    if (res.ok) {
      const { token } = await res.json();
      localStorage.setItem("riderToken", token);
      router.push(`/coureur/${token}`);
    }
    setConnecting(null);
  }

  const filtered = search
    ? riders.filter(
        (r) =>
          r.firstName.toLowerCase().includes(search.toLowerCase()) ||
          (r.nickname?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : riders;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          <User className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl uppercase">Espace coureur</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sélectionne ton prénom pour accéder à ton espace
        </p>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Chercher un prénom..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Chargement...</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((rider) => (
            <Card
              key={rider.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => handleSelect(rider.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: rider.teamColor }}
                  >
                    {rider.firstName[0]}
                  </div>
                  <div>
                    <p className="font-medium">
                      {rider.firstName}
                      {rider.nickname && (
                        <span className="ml-1 text-muted-foreground">
                          ({rider.nickname})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rider.teamName}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={connecting === rider.id}
                >
                  {connecting === rider.id ? "..." : "C'est moi"}
                </Button>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground">
              Aucun coureur trouvé
            </p>
          )}
        </div>
      )}
    </div>
  );
}
