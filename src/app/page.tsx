import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="font-display text-7xl text-secondary">
        TDF 2026
      </h1>
      <Button size="lg">
        Suivre la course
      </Button>
    </main>
  );
}
