"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamStandingsTable } from "./TeamStandingsTable";
import { IndividualStandingsTable } from "./IndividualStandingsTable";
import { ClimberStandingsTable } from "./ClimberStandingsTable";
import { PastisStandings } from "./PastisStandings";
import { Users, User, Mountain, Lightbulb, Wine } from "lucide-react";

interface StandingsTabsProps {
  teamStandings: React.ComponentProps<typeof TeamStandingsTable>["standings"];
  individualStandings: React.ComponentProps<typeof IndividualStandingsTable>["standings"];
  climberStandings: React.ComponentProps<typeof ClimberStandingsTable>["standings"];
  lanterneStandings: React.ComponentProps<typeof IndividualStandingsTable>["standings"];
  pastis: React.ComponentProps<typeof PastisStandings>;
  highlightRiderId?: string;
  highlightTeamId?: string;
}

export function StandingsTabs({
  teamStandings,
  individualStandings,
  climberStandings,
  lanterneStandings,
  pastis,
  highlightRiderId,
  highlightTeamId,
}: StandingsTabsProps) {
  return (
    <Tabs defaultValue="equipe" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="equipe" className="gap-1 text-xs md:text-sm">
          <Users className="h-3.5 w-3.5" />
          <span>Équipe</span>
        </TabsTrigger>
        <TabsTrigger value="individuel" className="gap-1 text-xs md:text-sm">
          <User className="h-3.5 w-3.5" />
          <span>Individuel</span>
        </TabsTrigger>
        <TabsTrigger value="grimpeur" className="gap-1 text-xs md:text-sm">
          <Mountain className="h-3.5 w-3.5" />
          <span>Grimpeur</span>
        </TabsTrigger>
        <TabsTrigger value="lanterne" className="gap-1 text-xs md:text-sm">
          <Lightbulb className="h-3.5 w-3.5" />
          <span>Lanterne</span>
        </TabsTrigger>
        <TabsTrigger value="pastis" className="gap-1 text-xs md:text-sm">
          <Wine className="h-3.5 w-3.5" />
          <span>Apéro</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="equipe" className="mt-4">
        <TeamStandingsTable standings={teamStandings} highlightTeamId={highlightTeamId} />
      </TabsContent>

      <TabsContent value="individuel" className="mt-4">
        <IndividualStandingsTable standings={individualStandings} showStages highlightRiderId={highlightRiderId} />
      </TabsContent>

      <TabsContent value="grimpeur" className="mt-4">
        <ClimberStandingsTable standings={climberStandings} highlightRiderId={highlightRiderId} />
      </TabsContent>

      <TabsContent value="lanterne" className="mt-4">
        <IndividualStandingsTable standings={lanterneStandings} showStages highlightRiderId={highlightRiderId} />
      </TabsContent>

      <TabsContent value="pastis" className="mt-4">
        <PastisStandings
          {...pastis}
          highlightRiderId={highlightRiderId}
          highlightTeamId={highlightTeamId}
        />
      </TabsContent>
    </Tabs>
  );
}
