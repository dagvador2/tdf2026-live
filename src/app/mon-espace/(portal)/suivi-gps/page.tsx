import { redirect } from "next/navigation";
import { getSessionRider } from "@/lib/auth/getSessionRider";
import { BackLink } from "@/components/ui/back-link";
import { Card, CardContent } from "@/components/ui/card";
import { CopyField } from "@/components/coureur/CopyField";
import { Apple, Smartphone, Settings, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

const TRACK_URL = `${
  process.env.NEXT_PUBLIC_APP_URL ?? "https://letourexplorer.com"
}/api/track`;

const APP_STORE_URL = "https://apps.apple.com/app/traccar-client/id843156974";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=org.traccar.client";

export default async function SuiviGpsPage() {
  const result = await getSessionRider();

  if (result.status === "unauthenticated") redirect("/connexion");
  if (result.status !== "rider") redirect("/mon-espace");

  const code = result.rider.traccarDeviceId;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <BackLink href="/mon-espace" label="Mon espace" />

      <div className="mb-6">
        <h1 className="font-display text-3xl uppercase">Suivi GPS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          On utilise l&apos;app <strong>Traccar Client</strong> pour te suivre en
          live. À régler <strong>une seule fois</strong> — ensuite ça tourne en
          arrière-plan, téléphone dans la poche, écran éteint.
        </p>
      </div>

      {/* Étape 1 — Installer */}
      <Card className="mb-4">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg uppercase">1. Installe l&apos;app</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Cherche « Traccar Client » sur le store, ou utilise ces liens :
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Apple className="h-4 w-4" />
              App Store (iPhone)
            </a>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Smartphone className="h-4 w-4" />
              Play Store (Android)
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Étape 2 — Régler */}
      <Card className="mb-4">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg uppercase">2. Règle l&apos;app</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Ouvre les réglages de l&apos;app (icône engrenage) et renseigne :
          </p>

          <div>
            <p className="mb-1 text-sm font-medium">
              Adresse du serveur <span className="text-muted-foreground">(Server URL)</span>
            </p>
            <CopyField value={TRACK_URL} />
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">
              Identifiant de l&apos;appareil{" "}
              <span className="text-muted-foreground">(Device identifier)</span>
            </p>
            {code ? (
              <CopyField value={code} />
            ) : (
              <p className="rounded-md border border-dashed bg-muted px-3 py-2 text-sm text-muted-foreground">
                Ton code n&apos;est pas encore généré — préviens l&apos;orga.
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              C&apos;est <strong>ton</strong> code personnel : ne le partage pas,
              ne mets pas celui d&apos;un autre.
            </p>
          </div>

          <div className="rounded-md bg-muted/60 p-3 text-sm">
            <p className="mb-1 font-medium">Réglages conseillés :</p>
            <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
              <li>Fréquence / intervalle : <strong>10 à 15 s</strong></li>
              <li>Précision : <strong>élevée</strong> (high)</li>
              <li>Distance / angle : laisser à 0</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Étape 3 — Autoriser + démarrer */}
      <Card className="mb-4">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg uppercase">
              3. Autorise & démarre
            </h2>
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              À la demande de localisation, choisis{" "}
              <strong>« Toujours autoriser »</strong> (indispensable pour
              l&apos;arrière-plan).
            </li>
            <li>
              Active le service avec l&apos;<strong>interrupteur en haut</strong>{" "}
              de l&apos;app (il passe au vert / « en ligne »).
            </li>
            <li>
              Tu peux <strong>verrouiller l&apos;écran</strong> et ranger le
              téléphone : ça continue de t&apos;envoyer ta position.
            </li>
            <li>Pense à partir avec la batterie chargée.</li>
          </ul>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Tu n&apos;apparaîtras sur la carte que pendant une étape{" "}
        <strong>en direct</strong>. Rien à relancer entre les étapes : laisse
        l&apos;app réglée.
      </p>
    </div>
  );
}
