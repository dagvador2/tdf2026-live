import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AvatarInitials } from "./AvatarInitials";

interface RiderProfileProps {
  firstName: string;
  nickname: string | null;
  photoUrl: string | null;
  teamName: string;
  teamSlug: string;
  teamColor: string;
  editionCount: number;
}

export function RiderProfile({
  firstName,
  nickname,
  photoUrl,
  teamName,
  teamSlug,
  teamColor,
  editionCount,
}: RiderProfileProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <AvatarInitials
        firstName={firstName}
        photoUrl={photoUrl}
        teamColor={teamColor}
        size="lg"
      />
      <h1 className="mt-4 font-display text-4xl uppercase text-secondary">
        {firstName}
      </h1>
      {nickname && (
        <p className="mt-1 text-lg text-muted-foreground">
          &laquo; {nickname} &raquo;
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <Link href={`/equipes/${teamSlug}`}>
          <Badge
            className="cursor-pointer text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: teamColor }}
          >
            {teamName}
          </Badge>
        </Link>
        <Badge variant="outline">
          {editionCount === 1 ? "1ère édition" : `${editionCount}e édition`}
        </Badge>
      </div>
    </div>
  );
}
