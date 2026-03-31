"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamStandingsTable } from "./TeamStandingsTable";
import { IndividualStandingsTable } from "./IndividualStandingsTable";
import { ClimberStandingsTable } from "./ClimberStandingsTable";
import { Users, User, Mountain, Lightbulb } from "lucide-react";

interface StandingsTabsProps {
  teamStandings: React.ComponentProps<typeof TeamStandingsTable>["standings"];
  individualStandings: React.ComponentProps<typeof IndividualStandingsTable>["standings"];
  climberStandings: React.ComponentProps<typeof ClimberStandingsTable>["standings"];
  lanterneStandings: React.ComponentProps<typeof IndividualStandingsTable>["standings"];
}

export function StandingsTabs({
  teamStandings,
  individualStandings,
  climberStandings,
  lanterneStandings,
}: StandingsTabsProps) {
  return (
    <Tabs defaultValue="equipe" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="equipe" className="gap-1 text-xs md:text-sm">
          <Users className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Équipe</span>
        </TabsTrigger>
        <TabsTrigger value="individuel" className="gap-1 text-xs md:text-sm">
          <User className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Individuel</span>
        </TabsTrigger>
        <TabsTrigger value="grimpeur" className="gap-1 text-xs md:text-sm">
          <Mountain className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Grimpeur</span>
        </TabsTrigger>
        <TabsTrigger value="lanterne" className="gap-1 text-xs md:text-sm">
          <Lightbulb className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Lanterne</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="equipe" className="mt-4">
        <TeamStandingsTable standings={teamStandings} />
      </TabsContent>

      <TabsContent value="individuel" className="mt-4">
        <IndividualStandingsTable standings={individualStandings} showStages />
      </TabsContent>

      <TabsContent value="grimpeur" className="mt-4">
        <ClimberStandingsTable standings={climberStandings} />
      </TabsContent>

      <TabsContent value="lanterne" className="mt-4">
        <IndividualStandingsTable standings={lanterneStandings} showStages />
      </TabsContent>
    </Tabs>
  );
}
