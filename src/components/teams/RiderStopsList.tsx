import { RiderStopRow } from "@/components/teams/RiderStopRow";

interface Rider {
  id: string;
  firstName: string;
  nickname: string | null;
  slug: string;
  photoUrl: string | null;
  editionCount: number;
  funFacts: Record<string, string> | null;
}

interface RiderStopsListProps {
  riders: Rider[];
  teamColor: string;
}

/**
 * Editorial "stops" layout — one big alternating row per rider (photo +
 * numeral + facts), collapsing to a horizontal snap-scroll carousel below
 * 900px so long rosters (7-8 riders) stay light on mobile.
 */
export function RiderStopsList({ riders, teamColor }: RiderStopsListProps) {
  return (
    <ol className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 min-[900px]:mx-0 min-[900px]:flex-col min-[900px]:gap-24 min-[900px]:overflow-visible min-[900px]:px-0 min-[900px]:pb-0">
      {riders.map((rider, i) => (
        <RiderStopRow
          key={rider.id}
          index={i + 1}
          firstName={rider.firstName}
          nickname={rider.nickname}
          slug={rider.slug}
          photoUrl={rider.photoUrl}
          teamColor={teamColor}
          editionCount={rider.editionCount}
          funFacts={rider.funFacts}
          reversed={i % 2 === 1}
        />
      ))}
    </ol>
  );
}
