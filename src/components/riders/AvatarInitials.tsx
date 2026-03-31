interface AvatarInitialsProps {
  firstName: string;
  photoUrl: string | null;
  teamColor: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "h-10 w-10 text-base",
  md: "h-16 w-16 text-2xl",
  lg: "h-24 w-24 text-4xl",
};

export function AvatarInitials({ firstName, photoUrl, teamColor, size = "md" }: AvatarInitialsProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={firstName}
        className={`rounded-full object-cover ${SIZES[size].split(" ").slice(0, 2).join(" ")}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-display text-white ${SIZES[size]}`}
      style={{ backgroundColor: teamColor }}
    >
      {firstName.charAt(0).toUpperCase()}
    </div>
  );
}
