import type { Metadata } from "next";
import { OverlayClassement } from "./OverlayClassement";

export const metadata: Metadata = {
  title: "Overlay classement — TDF 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: {
    mode?: string;
    stage?: string;
    key?: string;
    limit?: string;
  };
}

export default function OverlayClassementPage({ searchParams }: Props) {
  const mode = searchParams.mode === "individual" ? "individual" : "team";
  // Défauts alignés sur le programme : étape 2 = CLM individuel, étape 3 = CLM équipe
  const stage = Number(searchParams.stage) || (mode === "team" ? 3 : 2);
  const limit = Number(searchParams.limit) || (mode === "team" ? 4 : 8);

  return (
    <OverlayClassement
      mode={mode}
      stage={stage}
      accessKey={searchParams.key ?? ""}
      limit={limit}
    />
  );
}
