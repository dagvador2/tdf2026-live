import type { Metadata } from "next";
import { TeamClmOverlay } from "@/components/live/TeamClmOverlay";

export const metadata: Metadata = {
  title: "Overlay CLM équipe — TDF 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { stage?: string };
}

export default function OverlayClassementEquipePage({ searchParams }: Props) {
  const stageNumber = Number(searchParams.stage) || 2;

  return (
    <div style={{ background: "transparent" }}>
      <TeamClmOverlay stageNumber={stageNumber} />
    </div>
  );
}
